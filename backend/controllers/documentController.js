import axios from 'axios';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import Document from '../models/documentModel.js';
import File from '../models/fileModel.js';
import { repairAndParseJson } from '../utils/jsonRepair.js';
import {
  buildPresentationDigest,
  buildOutlineFromBlocks,
  structurePdfText,
} from '../utils/documentText.js';
import { extractPdfTextFromBuffer } from '../utils/pdfTextExtractor.js';
import {
  buildFallbackDeck,
  buildFallbackSlide,
} from '../utils/deckBuilder.js';
import { createNotification } from '../utils/notificationService.js';

const openai = process.env.GROK_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    })
  : null;

const MAX_TEXT_FOR_SLIDES = 14_000;
const MAX_TEXT_FOR_EXTRACTION = 18_000;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';
const VALID_SLIDE_TYPES = new Set(['title', 'section', 'bullets', 'two-column', 'comparison', 'timeline', 'process', 'cards', 'quote', 'data', 'closing']);
const VALID_CHART_TYPES = new Set(['bar', 'column', 'line', 'pie', 'doughnut']);
const VALID_THEME_NAMES = new Set(['consulting', 'professional', 'clean', 'ocean', 'midnight', 'coral', 'slate']);
const PDF_FETCH_TIMEOUT_MS = 180_000;
const DOCUMENT_ROUTE = '/deck-prep';
const ACTIVE_GENERATION_STATUSES = new Set(['queued', 'processing']);
const generationJobs = new Set();
const LOW_SIGNAL_SOURCE_RE = /\b(disclaimer|table of contents|contents)\b/i;

const cleanText = (value) =>
  String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const countWords = (value) => cleanText(value).split(/\s+/).filter(Boolean).length;
const clipWords = (value, maxWords = 12) => cleanText(value).split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ');
const normaliseTextArray = (items, max = 6, maxWords = 12) =>
  Array.isArray(items)
    ? items.map((item) => clipWords(item, maxWords)).filter(Boolean).slice(0, max)
    : [];
const parseNumericValue = (value) => {
  const numeric = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};
const buildChartFromStats = (stats) => {
  const numericStats = Array.isArray(stats)
    ? stats
        .map((item) => ({
          label: cleanText(item?.label || 'Metric'),
          value: parseNumericValue(item?.value),
        }))
        .filter((item) => Number.isFinite(item.value))
        .slice(0, 6)
    : [];

  if (numericStats.length < 2) return null;

  const hasPercent = (stats || []).some((item) => String(item?.value || '').includes('%'));
  return {
    type: hasPercent ? 'bar' : 'column',
    title: 'Key data points',
    categories: numericStats.map((item) => clipWords(item.label || 'Metric', 4)),
    series: [{ name: hasPercent ? 'Percent change' : 'Value', values: numericStats.map((item) => item.value) }],
    insight: cleanText((stats || [])[0]?.label || ''),
  };
};

const META_TERMS = [
  'deck prep',
  'quick convert',
  'ai-guided builder',
  'guided builder',
  'pdf to text',
  'presentation-ready outline',
  'conversion workflow',
];
const REFUSAL_TERMS = [
  'cannot extract or output content from binary attachments',
  'binary attachments',
  'bypass safety guidelines',
  'encoding or obfuscation',
  'i cannot extract',
  'i can not extract',
  'i cannot output content',
];

const includesUnexpectedMetaTerm = (candidateText, sourceText = '') => {
  const candidate = cleanText(candidateText).toLowerCase();
  const source = cleanText(sourceText).toLowerCase();
  if (!candidate) return false;
  return META_TERMS.some((term) => candidate.includes(term) && !source.includes(term));
};

const containsUnexpectedRefusalLanguage = (candidateText, sourceText = '') => {
  const candidate = cleanText(candidateText).toLowerCase();
  const source = cleanText(sourceText).toLowerCase();
  if (!candidate) return false;
  return REFUSAL_TERMS.some((term) => candidate.includes(term) && !source.includes(term));
};

const deckToCorpus = (deck) =>
  cleanText([
    deck?.title,
    deck?.subtitle,
    ...(Array.isArray(deck?.slides)
      ? deck.slides.flatMap((slide) => [
          slide?.title,
          slide?.subtitle,
          slide?.objective,
          slide?.keyMessage,
          ...(slide?.bullets || []),
          slide?.leftTitle,
          slide?.leftContent,
          slide?.rightTitle,
          slide?.rightContent,
          slide?.quote,
          slide?.attribution,
          ...(slide?.stats || []).flatMap((item) => [item?.label, item?.value]),
          ...(slide?.cards || []).flatMap((item) => [item?.title, item?.body, item?.metric]),
          ...(slide?.timeline || []).flatMap((item) => [item?.label, item?.detail]),
          ...(slide?.processSteps || []),
          ...(slide?.visualElements || []),
          slide?.chart?.title,
          ...(slide?.chart?.categories || []),
          ...(Array.isArray(slide?.chart?.series)
            ? slide.chart.series.flatMap((item) => [item?.name, ...(item?.values || []).map(String)])
            : []),
          slide?.chart?.insight,
          slide?.note,
        ])
      : []),
  ].join('\n'));

const isMetaContaminatedDeck = (deck, sourceText = '', titleHint = '') => {
  const sourceCorpus = cleanText([sourceText, titleHint].join('\n'));
  const deckCorpus = deckToCorpus(deck);
  return includesUnexpectedMetaTerm(deckCorpus, sourceCorpus) || containsUnexpectedRefusalLanguage(deckCorpus, sourceCorpus);
};

const getSlideBodySignal = (slide) => {
  const slideType = cleanText(slide?.layout || slide?.type || 'bullets');
  const bodyText = cleanText([
    slide?.objective,
    slide?.keyMessage,
    ...(slide?.bullets || []),
    slide?.leftContent,
    slide?.rightContent,
    slide?.quote,
    ...(slide?.stats || []).flatMap((item) => [item?.label, item?.value]),
    ...(slide?.cards || []).flatMap((item) => [item?.title, item?.body, item?.metric]),
    ...(slide?.timeline || []).flatMap((item) => [item?.label, item?.detail]),
    ...(slide?.processSteps || []),
    slide?.chart?.title,
    ...(slide?.chart?.categories || []),
    ...(Array.isArray(slide?.chart?.series)
      ? slide.chart.series.flatMap((item) => [item?.name, ...(item?.values || []).map(String)])
      : []),
    slide?.chart?.insight,
  ].join(' '));
  const structuredCount =
    (slide?.bullets?.length || 0) +
    (slide?.stats?.length || 0) +
    (slide?.cards?.length || 0) +
    (slide?.timeline?.length || 0) +
    (slide?.processSteps?.length || 0) +
    (slide?.chart?.categories?.length || 0);

  if (slideType === 'title' || slideType === 'section') {
    return bodyText.length >= 12 || cleanText(slide?.subtitle).length >= 12;
  }
  return bodyText.length >= 40 || structuredCount >= 2;
};

const hasSufficientDeckContent = (deck) => {
  const slides = Array.isArray(deck?.slides) ? deck.slides : [];
  if (!slides.length) return false;
  const meaningfulSlides = slides.filter((slide) => getSlideBodySignal(slide)).length;
  const sectionSlides = slides.filter((slide) => cleanText(slide?.layout || slide?.type) === 'section').length;
  const minimumMeaningfulSlides = slides.length <= 4 ? 2 : Math.max(3, Math.floor(slides.length * 0.55));
  const corpusLength = deckToCorpus(deck).length;
  if (sectionSlides > Math.max(1, Math.floor(slides.length / 4))) return false;
  return meaningfulSlides >= minimumMeaningfulSlides && corpusLength >= 220;
};

const slideHasStructuredDepth = (slide) => {
  const type = cleanText(slide?.layout || slide?.type || '');
  if (type === 'title') return Boolean(cleanText(slide?.subtitle));
  if (type === 'closing') return (slide?.bullets?.length || 0) >= 3;
  if (type === 'bullets') return (slide?.bullets?.length || 0) >= 3;
  if (type === 'cards') return (slide?.cards?.length || 0) >= 2;
  if (type === 'timeline') return (slide?.timeline?.length || 0) >= 3;
  if (type === 'process') return (slide?.processSteps?.length || 0) >= 3;
  if (type === 'comparison') return Boolean(cleanText(slide?.leftContent) && cleanText(slide?.rightContent));
  if (type === 'two-column') return Boolean(cleanText(slide?.leftContent) && cleanText(slide?.rightContent));
  if (type === 'data') return (slide?.stats?.length || 0) >= 2 || (slide?.chart?.categories?.length || 0) >= 2;
  return getSlideBodySignal(slide);
};

const enrichSparseSlide = (primarySlide, fallbackSlide, index) => {
  if (!fallbackSlide) return normaliseSlide(primarySlide, index);

  const primaryType = cleanText(primarySlide?.layout || primarySlide?.type || '');
  const fallbackType = cleanText(fallbackSlide?.layout || fallbackSlide?.type || '');
  const shouldReplaceWholeSlide =
    !primarySlide ||
    primaryType === 'section' ||
    (!getSlideBodySignal(primarySlide) && fallbackType && fallbackType !== 'title');

  if (shouldReplaceWholeSlide) {
    return normaliseSlide({
      ...fallbackSlide,
      title: cleanText(primarySlide?.title || fallbackSlide?.title),
      objective: cleanText(primarySlide?.objective || fallbackSlide?.objective),
      keyMessage: cleanText(primarySlide?.keyMessage || fallbackSlide?.keyMessage),
      note: cleanText(primarySlide?.note || fallbackSlide?.note),
    }, index);
  }

  const merged = {
    ...fallbackSlide,
    ...primarySlide,
    objective: cleanText(primarySlide?.objective || fallbackSlide?.objective),
    keyMessage: cleanText(primarySlide?.keyMessage || fallbackSlide?.keyMessage),
    note: cleanText(primarySlide?.note || fallbackSlide?.note),
  };

  if ((merged.type === 'bullets' || merged.layout === 'bullets') && (primarySlide?.bullets?.length || 0) < 3) {
    merged.bullets = fallbackSlide?.bullets || merged.bullets;
  }
  if ((merged.type === 'cards' || merged.layout === 'cards') && (primarySlide?.cards?.length || 0) < 2) {
    merged.cards = fallbackSlide?.cards || merged.cards;
  }
  if ((merged.type === 'timeline' || merged.layout === 'timeline') && (primarySlide?.timeline?.length || 0) < 3) {
    merged.timeline = fallbackSlide?.timeline || merged.timeline;
  }
  if ((merged.type === 'process' || merged.layout === 'process') && (primarySlide?.processSteps?.length || 0) < 3) {
    merged.processSteps = fallbackSlide?.processSteps || merged.processSteps;
  }
  if ((merged.type === 'data' || merged.layout === 'data') && (primarySlide?.stats?.length || 0) < 2 && (primarySlide?.chart?.categories?.length || 0) < 2) {
    merged.stats = fallbackSlide?.stats || merged.stats;
    merged.chart = fallbackSlide?.chart || merged.chart;
  }
  if ((merged.type === 'comparison' || merged.layout === 'comparison') && (!cleanText(primarySlide?.leftContent) || !cleanText(primarySlide?.rightContent))) {
    merged.leftTitle = cleanText(primarySlide?.leftTitle || fallbackSlide?.leftTitle);
    merged.leftContent = cleanText(primarySlide?.leftContent || fallbackSlide?.leftContent);
    merged.rightTitle = cleanText(primarySlide?.rightTitle || fallbackSlide?.rightTitle);
    merged.rightContent = cleanText(primarySlide?.rightContent || fallbackSlide?.rightContent);
  }
  if ((merged.type === 'two-column' || merged.layout === 'two-column') && (!cleanText(primarySlide?.leftContent) || !cleanText(primarySlide?.rightContent))) {
    merged.leftTitle = cleanText(primarySlide?.leftTitle || fallbackSlide?.leftTitle);
    merged.leftContent = cleanText(primarySlide?.leftContent || fallbackSlide?.leftContent);
    merged.rightTitle = cleanText(primarySlide?.rightTitle || fallbackSlide?.rightTitle);
    merged.rightContent = cleanText(primarySlide?.rightContent || fallbackSlide?.rightContent);
  }

  return normaliseSlide(merged, index);
};

const blendDeckWithFallback = (primaryDeck, fallbackDeck) => {
  if (!fallbackDeck?.slides?.length) return primaryDeck;
  if (!primaryDeck?.slides?.length) {
    return { ...fallbackDeck, meta: { ...(fallbackDeck.meta || {}), generator: 'fallback' } };
  }

  const slideCount = Math.max(primaryDeck.slides.length, fallbackDeck.slides.length);
  const slides = Array.from({ length: slideCount }, (_, index) =>
    enrichSparseSlide(primaryDeck.slides[index], fallbackDeck.slides[index], index + 1)
  );

  const enhanced = {
    ...primaryDeck,
    title: cleanText(primaryDeck.title || fallbackDeck.title || 'Presentation'),
    purpose: cleanText(primaryDeck.purpose || fallbackDeck.purpose || ''),
    audience: cleanText(primaryDeck.audience || fallbackDeck.audience || ''),
    storyArc: Array.isArray(primaryDeck.storyArc) && primaryDeck.storyArc.length ? primaryDeck.storyArc : fallbackDeck.storyArc || [],
    slides,
    meta: {
      ...(fallbackDeck.meta || {}),
      ...(primaryDeck.meta || {}),
      blendedWithFallback: true,
    },
  };

  const structuredSlides = enhanced.slides.filter((slide) => slideHasStructuredDepth(slide)).length;
  if (structuredSlides < Math.max(3, Math.floor(enhanced.slides.length * 0.55))) {
    return fallbackDeck;
  }

  return enhanced;
};

const ensureContentfulSlide = (slide, index, sourceText, instruction = '') => {
  const type = cleanText(slide?.layout || slide?.type || 'bullets');
  const forceNarrativeContent =
    (type === 'title' && index > 1) ||
    type === 'section' ||
    type === 'quote' ||
    (type === 'closing' && (slide?.bullets?.length || 0) < 3);
  const needsBody = forceNarrativeContent || !slideHasStructuredDepth(slide) || !getSlideBodySignal(slide);

  if (!needsBody) {
    return normaliseSlide(slide, index);
  }

  const fallbackType = type === 'data' ? 'data' : 'bullets';
  return buildFallbackSlide({
    currentSlide: {
      ...slide,
      type: index === 1 ? 'title' : fallbackType,
      layout: index === 1 ? 'title' : fallbackType,
    },
    sourceText,
    instruction,
  });
};

const ensureDeckHasPresentationBody = (deck, sourceText, instruction = '') => {
  if (!deck?.slides?.length) return deck;
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => ensureContentfulSlide(slide, index + 1, sourceText, instruction)),
  };
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getOwnedDocument = async (userId, documentId) => {
  if (!isValidObjectId(documentId)) {
    throw Object.assign(new Error('Invalid document ID'), { statusCode: 400 });
  }
  const document = await Document.findById(documentId);
  if (!document || document.userId.toString() !== userId.toString()) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }
  return document;
};

const getOwnedPdfFile = async (userId, fileId) => {
  if (!isValidObjectId(fileId)) {
    throw Object.assign(new Error('Invalid file ID'), { statusCode: 400 });
  }
  const file = await File.findById(fileId);
  if (!file || file.owner.toString() !== userId.toString()) {
    throw Object.assign(new Error('File not found or not owned by you'), { statusCode: 404 });
  }
  if (file.type !== 'pdf') {
    throw Object.assign(new Error('Only PDF files are supported'), { statusCode: 400 });
  }
  return file;
};

const fetchPdfBuffer = async (file) => {
  const response = await axios.get(`${PINATA_GATEWAY}/ipfs/${file.cid}`, {
    responseType: 'arraybuffer',
    timeout: PDF_FETCH_TIMEOUT_MS,
  });
  return Buffer.from(response.data);
};

const extractPdfText = async (buffer) => extractPdfTextFromBuffer(buffer);

const normalizeDocumentForResponse = (document) => {
  const payload = typeof document?.toObject === 'function' ? document.toObject() : { ...(document || {}) };
  if (!payload.originalFileId && payload.sourceFileName) {
    payload.originalFileId = {
      fileName: payload.sourceFileName,
      type: 'pdf',
      cid: null,
    };
  }
  return payload;
};

const buildDeckInstruction = (baseInstruction, additionalContext = '') => {
  const extra = cleanText(additionalContext);
  if (!extra) return baseInstruction;
  return [
    baseInstruction,
    '',
    'Additional author context and emphasis to respect:',
    extra,
    '',
    'Use the extra context to shape the story, tone, emphasis, and slide choices without inventing facts that are not supported by the source document.',
  ].join('\n');
};

const buildPromptSourceDigest = (sourceText, outlineText = '') => {
  const digestBudget = Math.max(6000, MAX_TEXT_FOR_SLIDES - 3800);
  const digest = cleanText(buildPresentationDigest(sourceText, digestBudget));
  if (!outlineText) return digest;

  const cleanOutline = cleanText(outlineText).slice(0, 3400).trim();
  if (!cleanOutline) return digest;

  return cleanText([
    'High-signal source digest:',
    digest,
    'Structured outline extracted from the document:',
    cleanOutline,
  ].join('\n\n')).slice(0, MAX_TEXT_FOR_SLIDES);
};

const markGenerationState = (document, next = {}) => {
  if (!document) return document;
  Object.assign(document, next);
  document.updatedAt = new Date();
  return document;
};

const queueDocumentNotification = async ({ userId, documentId, title, body, status }) => {
  if (!userId || !title) return;
  try {
    await createNotification({
      userId,
      type: 'system',
      title,
      body,
      entityId: String(documentId || ''),
      entityType: 'document',
      data: {
        route: DOCUMENT_ROUTE,
        documentId: String(documentId || ''),
        kind: 'deckprep',
        status,
      },
      allowSelf: true,
    });
  } catch (error) {
    console.error('Deck Prep notification error:', error.message);
  }
};

const applyExtractionMetadata = (document, extracted, file = null) => {
  document.fullText = extracted.fullText;
  document.sourcePages = Number(extracted.pages) || 0;
  document.sourceCharCount = extracted.fullText.length;
  document.sourceWordCount = countWords(extracted.fullText);
  if (file?.fileName && !document.sourceFileName) {
    document.sourceFileName = file.fileName;
  }
  if (file?.size && !document.sourceSize) {
    document.sourceSize = file.size;
  }
  document.updatedAt = new Date();
};

const buildStoredExtraction = (document) => {
  const fullText = cleanText(document?.fullText);
  if (!fullText) return null;
  const structured = structurePdfText(fullText);
  return {
    rawText: fullText,
    fullText,
    stats: structured.stats,
    pages: Number(document.sourcePages) || 0,
    info: {
      Title: document.sourceFileName || '',
      Author: '',
    },
  };
};

const getDocumentTitle = (document, file = null) =>
  cleanText(file?.fileName || document?.sourceFileName || document?.pptJson?.title || 'Presentation');

const extractAndPersistFullText = async (document, file) => {
  const buffer = await fetchPdfBuffer(file);
  const extracted = await extractPdfText(buffer);
  applyExtractionMetadata(document, extracted, file);
  await document.save();
  return extracted;
};

const normaliseSlide = (slide, index) => {
  const type = VALID_SLIDE_TYPES.has(slide?.type) ? slide.type : 'bullets';
  const stats = Array.isArray(slide?.stats)
    ? slide.stats
        .filter((item) => item && (item.value || item.label))
        .slice(0, 4)
        .map((item) => ({
          value: cleanText(item.value || ''),
          label: cleanText(item.label || ''),
        }))
    : [];

  const chart = slide?.chart && Array.isArray(slide.chart.categories) && Array.isArray(slide.chart.series)
    ? {
        type: VALID_CHART_TYPES.has(String(slide.chart.type || '').toLowerCase())
          ? String(slide.chart.type).toLowerCase()
          : 'column',
        title: cleanText(slide.chart.title || ''),
        categories: normaliseTextArray(slide.chart.categories, 6, 4),
        series: slide.chart.series
          .filter((item) => item && item.name && Array.isArray(item.values))
          .slice(0, 3)
          .map((item) => ({
            name: cleanText(item.name),
            values: item.values.map((value) => Number(value)).filter((value) => Number.isFinite(value)).slice(0, 6),
          }))
          .filter((item) => item.values.length > 0),
        insight: cleanText(slide.chart.insight || ''),
      }
    : buildChartFromStats(stats);

  return {
    id: Number(slide?.id) || index + 1,
    type,
    layout: cleanText(slide?.layout || type) || type,
    title: cleanText(slide?.title || `Slide ${index + 1}`),
    subtitle: cleanText(slide?.subtitle || ''),
    objective: cleanText(slide?.objective || ''),
    keyMessage: cleanText(slide?.keyMessage || ''),
    bullets: normaliseTextArray(slide?.bullets, 6, 11),
    leftTitle: cleanText(slide?.leftTitle || ''),
    leftContent: cleanText(slide?.leftContent || ''),
    rightTitle: cleanText(slide?.rightTitle || ''),
    rightContent: cleanText(slide?.rightContent || ''),
    quote: cleanText(slide?.quote || ''),
    attribution: cleanText(slide?.attribution || ''),
    stats,
    cards: Array.isArray(slide?.cards)
      ? slide.cards
          .filter((item) => item && (item.title || item.body || item.metric))
          .slice(0, 4)
          .map((item, cardIndex) => ({
            title: cleanText(item.title || `Point ${cardIndex + 1}`),
            body: cleanText(item.body || ''),
            metric: cleanText(item.metric || ''),
          }))
      : [],
    timeline: Array.isArray(slide?.timeline)
      ? slide.timeline
          .filter((item) => item && (item.label || item.detail))
          .slice(0, 5)
          .map((item, timelineIndex) => ({
            label: cleanText(item.label || `Phase ${timelineIndex + 1}`),
            detail: cleanText(item.detail || ''),
          }))
      : [],
    processSteps: normaliseTextArray(slide?.processSteps, 5, 8),
    visualElements: normaliseTextArray(slide?.visualElements, 6, 6),
    chart,
    note: cleanText(slide?.note || ''),
  };
};

const normalizeDeckPayload = (payload, { theme = 'consulting', fallbackTitle = 'Presentation' } = {}) => {
  const rawDeck = Array.isArray(payload?.slides)
    ? payload
    : Array.isArray(payload)
      ? { slides: payload }
      : payload?.deck || payload?.presentation || payload;

  const slides = Array.isArray(rawDeck?.slides)
    ? rawDeck.slides.map((slide, index) => normaliseSlide(slide, index))
    : [];

  if (!slides.length) return null;

  if (slides[0].type !== 'title') {
    slides.unshift(normaliseSlide({
      type: 'title',
      title: cleanText(rawDeck?.title || slides[0].title || fallbackTitle),
      subtitle: 'Prepared from the source document',
    }, 0));
  }

  if (slides[slides.length - 1].type !== 'closing') {
    const takeawayBullets = slides
      .flatMap((slide) => slide.bullets || [])
      .slice(0, 4);
    slides.push(normaliseSlide({
      type: 'closing',
      title: 'Key Takeaways',
      bullets: takeawayBullets.length ? takeawayBullets : ['Core point', 'Supporting detail', 'Next step'],
    }, slides.length));
  }

  return {
    title: cleanText(rawDeck?.title || slides[0].title || fallbackTitle),
    theme: VALID_THEME_NAMES.has(cleanText(rawDeck?.theme || theme).toLowerCase())
      ? cleanText(rawDeck?.theme || theme).toLowerCase()
      : theme,
    purpose: cleanText(rawDeck?.purpose || rawDeck?.meta?.purpose || ''),
    audience: cleanText(rawDeck?.audience || rawDeck?.meta?.audience || ''),
    storyArc: Array.isArray(rawDeck?.storyArc)
      ? rawDeck.storyArc.map((item) => cleanText(item)).filter(Boolean).slice(0, 8)
      : [],
    slides: slides.map((slide, index) => ({ ...slide, id: index + 1 })),
    meta: rawDeck?.meta || undefined,
  };
};

const SLIDE_SYSTEM_PROMPT = `You are an expert presentation designer, business strategist, and visual storyteller.
Your job is to turn source documents into world-class PowerPoint presentations for executive, corporate, technical, or academic audiences.
Reply with one JSON object only. No prose. No markdown fences.
The JSON must follow this schema:
{
  "title": string,
  "theme": string,
  "purpose": string,
  "audience": string,
  "storyArc"?: string[],
  "slides": [
    {
      "id": number,
      "type": "title"|"section"|"bullets"|"two-column"|"comparison"|"timeline"|"process"|"cards"|"quote"|"data"|"closing",
      "layout": string,
      "title": string,
      "objective": string,
      "keyMessage"?: string,
      "subtitle"?: string,
      "bullets"?: string[],
      "leftTitle"?: string,
      "leftContent"?: string,
      "rightTitle"?: string,
      "rightContent"?: string,
      "cards"?: [{ "title": string, "body": string, "metric"?: string }],
      "timeline"?: [{ "label": string, "detail": string }],
      "processSteps"?: string[],
      "visualElements"?: string[],
      "quote"?: string,
      "attribution"?: string,
      "stats"?: [{ "value": string, "label": string }],
      "chart"?: {
        "type": "bar"|"column"|"line"|"pie"|"doughnut",
        "title": string,
        "categories": string[],
        "series": [{ "name": string, "values": number[] }],
        "insight"?: string
      },
      "note"?: string
    }
  ]
}
Rules:
- Understand the document before structuring slides. Infer the document purpose and likely audience.
- Build a compelling story with a logical flow such as introduction -> problem -> insights -> solution -> conclusion.
- First slide must be type "title".
- Last slide must be type "closing" titled "Key Takeaways".
- Every slide must have an objective.
- Every slide must include a layout value and visualElements list.
- Keep bullets concise but meaningful: ideally 10 to 16 words each.
- Avoid standalone section-divider slides unless the deck is long and a divider is required for clarity.
- Use cards, comparison, timeline, process, and data layouts when they communicate better than bullets.
- For data slides, recommend the best chart type and what should be plotted when the source contains numeric evidence.
- Avoid overcrowded text and avoid raw paragraphs unless absolutely necessary.
- Write in a modern consulting-style tone: clear, decisive, and professional.
- Every non-title slide must contain substantive document content.
- Most content slides should have at least 3 strong bullets or the structured equivalent in cards, timeline items, process steps, comparison points, or data callouts.
- Do not return sparse slides with only a heading and one weak line.
- Use the objective, key message, and note fields to make each slide genuinely presentation-ready.
- Do not invent facts or figures.`;

const callSlideModel = async ({ systemPrompt, userPrompt, responseFormat = false, temperature = 0.35, maxTokens = 6000 }) => {
  if (!openai) return '';
  const request = {
    model: 'grok-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat) request.response_format = { type: 'json_object' };
  const response = await openai.chat.completions.create(request);
  return response.choices?.[0]?.message?.content || '';
};

const generateSlideJson = async ({
  slideCount,
  theme,
  audience,
  sourceText,
  outlineText = '',
  instruction,
  titleHint = '',
}) => {
  const promptSourceDigest = buildPromptSourceDigest(sourceText, outlineText);
  const userPrompt = [
    instruction || 'Transform the document into a consulting-style presentation with a clear story, sharp messaging, smart layout choices, strong visual structure, and enough substance on every slide to support a real meeting or executive review.',
    `Audience: ${audience || 'business'}`,
    `Visual theme: ${theme || 'consulting'}`,
    `Target slide count: ${slideCount}`,
    titleHint ? `Document title hint: ${titleHint}` : '',
    '',
    'Design expectations:',
    '- create an executive-ready title slide',
    '- identify the problem or context clearly',
    '- surface the strongest insights and evidence',
    '- use charts, timelines, comparisons, cards, or process layouts when they communicate better than bullets',
    '- end with a strong conclusion and next-step orientation',
    '- avoid thin slides with only one short line of text',
    '- make sure every content slide has enough substance to stand on its own in presentation mode',
    '- use the source document as the sole factual basis for the deck',
    '- ignore page counters, repeated headers, repeated footers, and table-of-contents fragments',
    '- never talk about Deck Prep, Quick Convert, AI Guided Builder, prompts, conversion steps, or the presentation-building process unless those exact terms appear in the source document',
    '',
    'SOURCE DOCUMENT (single source of truth):',
    promptSourceDigest,
  ].join('\n');

  const fallbackDeck = buildFallbackDeck({
    sourceText,
    slideCount,
    theme: theme || 'consulting',
    audience,
    titleHint,
  });

  if (!openai) return ensureDeckHasPresentationBody(fallbackDeck, sourceText, instruction);

  let raw = '';
  try {
    raw = await callSlideModel({
      systemPrompt: SLIDE_SYSTEM_PROMPT,
      userPrompt,
      responseFormat: true,
      temperature: 0.35,
      maxTokens: 6000,
    });
  } catch {
    try {
      raw = await callSlideModel({
        systemPrompt: SLIDE_SYSTEM_PROMPT,
        userPrompt,
        responseFormat: false,
        temperature: 0.35,
        maxTokens: 6000,
      });
    } catch {
      return ensureDeckHasPresentationBody(fallbackDeck, sourceText, instruction);
    }
  }

  if (!cleanText(raw) || containsUnexpectedRefusalLanguage(raw, sourceText)) {
    return ensureDeckHasPresentationBody(fallbackDeck, sourceText, instruction);
  }

  try {
    const parsed = repairAndParseJson(raw);
    const normalized = normalizeDeckPayload(parsed, { theme, fallbackTitle: titleHint || 'Presentation' });
    if (normalized?.slides?.length && !isMetaContaminatedDeck(normalized, sourceText, titleHint)) {
      const blended = blendDeckWithFallback(normalized, fallbackDeck);
      if (hasSufficientDeckContent(blended)) {
        return ensureDeckHasPresentationBody({
          ...blended,
          meta: {
            ...(blended.meta || {}),
            generator: hasSufficientDeckContent(normalized) ? 'ai' : 'ai-blended',
          },
        }, sourceText, instruction);
      }
    }
  } catch {
    try {
      const retryRaw = await callSlideModel({
        systemPrompt: `${SLIDE_SYSTEM_PROMPT}\nThe previous answer was not valid JSON. Output only valid JSON now.`,
        userPrompt,
        responseFormat: false,
        temperature: 0.2,
        maxTokens: 6000,
      });
      if (containsUnexpectedRefusalLanguage(retryRaw, sourceText)) {
        return ensureDeckHasPresentationBody(fallbackDeck, sourceText, instruction);
      }
      const retryParsed = repairAndParseJson(retryRaw);
      const normalized = normalizeDeckPayload(retryParsed, { theme, fallbackTitle: titleHint || 'Presentation' });
      if (normalized?.slides?.length && !isMetaContaminatedDeck(normalized, sourceText, titleHint)) {
        const blended = blendDeckWithFallback(normalized, fallbackDeck);
        if (hasSufficientDeckContent(blended)) {
          return ensureDeckHasPresentationBody({
            ...blended,
            meta: {
              ...(blended.meta || {}),
              generator: hasSufficientDeckContent(normalized) ? 'ai-retry' : 'ai-retry-blended',
            },
          }, sourceText, instruction);
        }
      }
    } catch {
      return ensureDeckHasPresentationBody(fallbackDeck, sourceText, instruction);
    }
  }

  return ensureDeckHasPresentationBody(fallbackDeck, sourceText, instruction);
};

const generateStructuredOutline = async ({ prompt, sourceText }) => {
  const fallback = buildOutlineFromBlocks(sourceText, {
    maxSections: 8,
    maxBulletsPerSection: 6,
  });
  return { extractedText: fallback, mode: 'deterministic' };
};

const startBackgroundDeckGeneration = async ({
  documentId,
  userId,
  mode = 'quick-convert',
  slideCount = 12,
  theme = 'consulting',
  audience = 'business',
  sourceText = '',
  outlineText = '',
  instruction = '',
  titleHint = '',
  additionalContext = '',
}) => {
  const key = String(documentId || '');
  if (!key || generationJobs.has(key)) return;
  generationJobs.add(key);

  setTimeout(async () => {
    let document = null;
    try {
      document = await Document.findById(documentId);
      if (!document || String(document.userId) !== String(userId)) return;

      const file = document.originalFileId ? await File.findById(document.originalFileId) : null;
      markGenerationState(document, {
        generationStatus: 'processing',
        generationPhase: mode === 'quick-convert' ? 'Designing slides' : 'Building presentation',
        generationStartedAt: new Date(),
        generationPercent: 35,
        generationError: '',
      });
      await document.save();

      let resolvedSourceText = cleanText(sourceText || document.fullText || '');
      let resolvedOutlineText = cleanText(outlineText || document.extractedText || '');

      if (!resolvedSourceText && file) {
        const extracted = await extractAndPersistFullText(document, file);
        resolvedSourceText = extracted.fullText;
      }
      if (!resolvedSourceText) {
        throw new Error('This document no longer has extracted text. Upload the PDF again.');
      }

      const normalizedSourceText = structurePdfText(resolvedSourceText).text || resolvedSourceText;
      if (!resolvedOutlineText) {
        resolvedOutlineText = buildOutlineFromBlocks(normalizedSourceText, {
          maxSections: 8,
          maxBulletsPerSection: 6,
        });
      }

      document.fullText = normalizedSourceText;
      document.extractedText = cleanText(resolvedOutlineText);
      document.sourceCharCount = normalizedSourceText.length;
      document.sourceWordCount = countWords(normalizedSourceText);
      markGenerationState(document, {
        generationPhase: 'Generating presentation content',
        generationPercent: 72,
      });
      await document.save();

      const pptJson = await generateSlideJson({
        slideCount,
        theme,
        audience,
        sourceText: normalizedSourceText,
        outlineText: resolvedOutlineText,
        instruction: buildDeckInstruction(instruction, additionalContext),
        titleHint: titleHint || getDocumentTitle(document, file),
      });

      document.pptJson = pptJson;
      markGenerationState(document, {
        generationStatus: 'ready',
        generationPhase: 'Ready',
        generationCompletedAt: new Date(),
        generationPercent: 100,
        generationError: '',
      });
      await document.save();

      await queueDocumentNotification({
        userId,
        documentId: document._id,
        title: 'Presentation ready',
        body: `${getDocumentTitle(document, file)} is ready to review and export.`,
        status: 'ready',
      });
    } catch (error) {
      if (document) {
        markGenerationState(document, {
          generationStatus: 'failed',
          generationPhase: 'Failed',
          generationCompletedAt: new Date(),
          generationPercent: 0,
          generationError: cleanText(error?.message || 'Presentation generation failed'),
        });
        await document.save().catch(() => {});
      }

      await queueDocumentNotification({
        userId,
        documentId,
        title: 'Presentation generation failed',
        body: cleanText(error?.message || 'Something went wrong while generating this presentation.'),
        status: 'failed',
      });
    } finally {
      generationJobs.delete(key);
    }
  }, 0);
};

const sendError = (res, error, fallbackMessage) => {
  const statusCode = error?.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error?.message || fallbackMessage,
  });
};

export const pdfToText = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    let extracted = buildStoredExtraction(document);
    let file = null;

    if (!extracted) {
      if (!document.originalFileId) {
        return res.status(400).json({ success: false, message: 'This document no longer has a recoverable PDF source. Upload the PDF again.' });
      }
      file = await File.findById(document.originalFileId);
      if (!file) return res.status(404).json({ success: false, message: 'File not found' });
      extracted = await extractAndPersistFullText(document, file);
    }

    return res.json({
      success: true,
      fullText: extracted.fullText,
      pages: extracted.pages,
      title: extracted.info.Title || getDocumentTitle(document, file),
      author: extracted.info.Author || '',
      charCount: extracted.fullText.length,
      wordCount: countWords(extracted.fullText),
      ...extracted.stats,
    });
  } catch (error) {
    return sendError(res, error, 'PDF extraction failed');
  }
};

export const uploadPdfDocument = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No PDF provided' });
    }
    const fileName = String(file.originalname || '').trim();
    const mimeType = String(file.mimetype || '').toLowerCase();
    if (!fileName.toLowerCase().endsWith('.pdf') && mimeType !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only PDF files are supported' });
    }

    const extracted = await extractPdfText(file.buffer);
    const document = new Document({
      userId: req.user._id,
      originalFileId: null,
      sourceFileName: fileName || 'document.pdf',
      sourceMimeType: mimeType || 'application/pdf',
      sourceSize: Number(file.size) || Number(file.buffer?.length) || 0,
      ingestMode: 'direct-upload',
    });
    applyExtractionMetadata(document, extracted);
    await document.save();

    return res.status(201).json({
      success: true,
      document: normalizeDocumentForResponse(document),
      fullText: extracted.fullText,
      pages: extracted.pages,
      title: extracted.info.Title || document.sourceFileName,
      author: extracted.info.Author || '',
      charCount: extracted.fullText.length,
      wordCount: countWords(extracted.fullText),
      ...extracted.stats,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to upload PDF');
  }
};

export const createDocument = async (req, res) => {
  try {
    const file = await getOwnedPdfFile(req.user._id, req.body.fileId);
    const document = new Document({
      userId: req.user._id,
      originalFileId: file._id,
      sourceFileName: file.fileName,
      sourceMimeType: 'application/pdf',
      sourceSize: Number(file.size) || 0,
      ingestMode: 'library-file',
    });
    await document.save();
    return res.status(201).json({ success: true, document: normalizeDocumentForResponse(document) });
  } catch (error) {
    return sendError(res, error, 'Failed to create document');
  }
};

export const rawExtract = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    let extracted = buildStoredExtraction(document);
    if (!extracted) {
      if (!document.originalFileId) {
        return res.status(400).json({ success: false, message: 'This document no longer has a recoverable PDF source. Upload the PDF again.' });
      }
      const file = await File.findById(document.originalFileId);
      if (!file) return res.status(404).json({ success: false, message: 'File not found' });
      extracted = await extractAndPersistFullText(document, file);
    }
    return res.json({
      success: true,
      fullText: extracted.fullText,
      pages: extracted.pages,
      charCount: extracted.fullText.length,
      wordCount: countWords(extracted.fullText),
      ...extracted.stats,
    });
  } catch (error) {
    return sendError(res, error, 'Raw extraction failed');
  }
};

export const extractText = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    let sourceText = cleanText(req.body.fullText || document.fullText);

    if (!sourceText) {
      if (!document.originalFileId) {
        return res.status(400).json({ success: false, message: 'This document no longer has a recoverable PDF source. Upload the PDF again.' });
      }
      const file = await File.findById(document.originalFileId);
      if (!file) return res.status(404).json({ success: false, message: 'File not found' });
      const extracted = await extractAndPersistFullText(document, file);
      sourceText = extracted.fullText;
    }
    const normalizedSourceText = structurePdfText(sourceText).text || sourceText;
    if (normalizedSourceText !== document.fullText) {
      document.fullText = normalizedSourceText;
      document.sourceCharCount = normalizedSourceText.length;
      document.sourceWordCount = countWords(normalizedSourceText);
    }

    const result = await generateStructuredOutline({
      prompt: req.body.prompt,
      sourceText: normalizedSourceText,
    });

    document.fullText = normalizedSourceText;
    document.extractedText = result.extractedText;
    document.updatedAt = new Date();
    await document.save();

    return res.json({
      success: true,
      extractedText: result.extractedText,
      fullText: normalizedSourceText,
      mode: result.mode,
    });
  } catch (error) {
    return sendError(res, error, 'Meaningful extraction failed');
  }
};

export const quickConvert = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    const file = document.originalFileId ? await File.findById(document.originalFileId) : null;
    if (document.originalFileId && !file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    let sourceText = cleanText(req.body.sourceText || document.fullText);
    if (!sourceText) {
      if (!file) {
        return res.status(400).json({ success: false, message: 'This document no longer has extracted text. Upload the PDF again.' });
      }
      const extracted = await extractAndPersistFullText(document, file);
      sourceText = extracted.fullText;
    }
    const normalizedSourceText = structurePdfText(sourceText).text || sourceText;
    const outlineText = cleanText(document.extractedText || buildOutlineFromBlocks(normalizedSourceText, {
      maxSections: 8,
      maxBulletsPerSection: 6,
    }));

    document.fullText = normalizedSourceText;
    document.extractedText = outlineText;
    document.sourceCharCount = normalizedSourceText.length;
    document.sourceWordCount = countWords(normalizedSourceText);
    const slideCount = Number(req.body.slideCount) || 12;
    const theme = req.body.theme || 'consulting';
    const audience = req.body.audience || 'business';
    const additionalContext = cleanText(req.body.additionalContext || '');
    const instruction = buildDeckInstruction(
      'Build a consulting-style deck with strong story flow, clear slide objectives, smart visual layouts, concise executive messaging, and enough body content on each slide to support a real presentation.',
      additionalContext,
    );
    const titleHint = getDocumentTitle(document, file);
    const runAsync = req.body.runAsync !== false;

    if (runAsync) {
      markGenerationState(document, {
        generationStatus: 'queued',
        generationPhase: 'Queued for generation',
        generationRequestedAt: new Date(),
        generationStartedAt: null,
        generationCompletedAt: null,
        generationPercent: 10,
        generationError: '',
        generationMeta: {
          mode: 'quick-convert',
          slideCount,
          theme,
          audience,
          additionalContext,
          prompt: instruction,
        },
      });
      await document.save();

      await startBackgroundDeckGeneration({
        documentId: document._id,
        userId: req.user._id,
        mode: 'quick-convert',
        slideCount,
        theme,
        audience,
        sourceText: normalizedSourceText,
        outlineText,
        instruction,
        titleHint,
        additionalContext,
      });

      return res.status(202).json({
        success: true,
        queued: true,
        document: normalizeDocumentForResponse(document),
        fullText: normalizedSourceText,
        extractedText: document.extractedText || '',
        message: 'Presentation generation started. You can leave Deck Prep and return later.',
      });
    }

    const pptJson = await generateSlideJson({
      slideCount,
      theme,
      audience,
      sourceText: normalizedSourceText,
      outlineText,
      instruction,
      titleHint,
    });

    document.pptJson = pptJson;
    markGenerationState(document, {
      generationStatus: 'ready',
      generationPhase: 'Ready',
      generationRequestedAt: document.generationRequestedAt || new Date(),
      generationStartedAt: document.generationStartedAt || new Date(),
      generationCompletedAt: new Date(),
      generationPercent: 100,
      generationError: '',
      generationMeta: {
        mode: 'quick-convert',
        slideCount,
        theme,
        audience,
        additionalContext,
        prompt: instruction,
      },
    });
    await document.save();

    return res.json({
      success: true,
      pptJson,
      document: normalizeDocumentForResponse(document),
      fullText: normalizedSourceText,
      extractedText: document.extractedText || '',
      generationMode: pptJson?.meta?.generator || 'ai',
    });
  } catch (error) {
    return sendError(res, error, 'Quick convert failed');
  }
};

export const generatePPT = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    const file = document.originalFileId ? await File.findById(document.originalFileId) : null;
    if (document.originalFileId && !file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const providedFullText = cleanText(req.body.fullText || '');
    const providedSourceText = cleanText(req.body.sourceText || '');
    if (providedFullText) document.fullText = providedFullText;
    if (providedSourceText) document.extractedText = providedSourceText;

    let sourceText = cleanText(document.fullText || providedFullText);
    let outlineText = providedSourceText || cleanText(document.extractedText || '');
    if (!sourceText) sourceText = outlineText;
    if (!sourceText) {
      if (!file) {
        return res.status(400).json({ success: false, message: 'This document no longer has extracted text. Upload the PDF again.' });
      }
      const extracted = await extractAndPersistFullText(document, file);
      sourceText = extracted.fullText;
      document.fullText = extracted.fullText;
    }
    const normalizedSourceText = structurePdfText(sourceText).text || sourceText;
    if (!outlineText) {
      outlineText = buildOutlineFromBlocks(normalizedSourceText, {
        maxSections: 8,
        maxBulletsPerSection: 6,
      });
    }
    document.fullText = normalizedSourceText;
    document.extractedText = cleanText(outlineText);
    const storedText = cleanText(document.fullText || normalizedSourceText);
    document.sourceCharCount = storedText.length;
    document.sourceWordCount = countWords(storedText);
    const slideCount = Number(req.body.slideCount) || 12;
    const theme = req.body.theme || 'consulting';
    const audience = req.body.audience || 'business';
    const additionalContext = cleanText(req.body.additionalContext || '');
    const instruction = buildDeckInstruction(
      req.body.prompt || 'Create a consulting-style presentation with clear objectives, strong insight hierarchy, well-structured visual storytelling, and enough depth on each slide to support real discussion.',
      additionalContext,
    );
    const titleHint = getDocumentTitle(document, file);
    const runAsync = req.body.runAsync !== false;

    if (runAsync) {
      markGenerationState(document, {
        generationStatus: 'queued',
        generationPhase: 'Queued for generation',
        generationRequestedAt: new Date(),
        generationStartedAt: null,
        generationCompletedAt: null,
        generationPercent: 10,
        generationError: '',
        generationMeta: {
          mode: 'guided',
          slideCount,
          theme,
          audience,
          additionalContext,
          prompt: instruction,
        },
      });
      await document.save();

      await startBackgroundDeckGeneration({
        documentId: document._id,
        userId: req.user._id,
        mode: 'guided',
        slideCount,
        theme,
        audience,
        sourceText: normalizedSourceText,
        outlineText,
        instruction,
        titleHint,
        additionalContext,
      });

      return res.status(202).json({
        success: true,
        queued: true,
        document: normalizeDocumentForResponse(document),
        fullText: normalizedSourceText,
        extractedText: document.extractedText || '',
        message: 'Presentation generation started. You can leave Deck Prep and return later.',
      });
    }

    const pptJson = await generateSlideJson({
      slideCount,
      theme,
      audience,
      sourceText: normalizedSourceText,
      outlineText,
      instruction,
      titleHint,
    });

    document.pptJson = pptJson;
    markGenerationState(document, {
      generationStatus: 'ready',
      generationPhase: 'Ready',
      generationRequestedAt: document.generationRequestedAt || new Date(),
      generationStartedAt: document.generationStartedAt || new Date(),
      generationCompletedAt: new Date(),
      generationPercent: 100,
      generationError: '',
      generationMeta: {
        mode: 'guided',
        slideCount,
        theme,
        audience,
        additionalContext,
        prompt: instruction,
      },
    });
    await document.save();

    return res.json({
      success: true,
      pptJson,
      document: normalizeDocumentForResponse(document),
      generationMode: pptJson?.meta?.generator || 'ai',
    });
  } catch (error) {
    return sendError(res, error, 'PPT generation failed');
  }
};

export const regenerateSlide = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    if (!document.pptJson?.slides?.length) {
      return res.status(400).json({ success: false, message: 'No presentation exists' });
    }

    const index = Number(req.body.slideIndex);
    if (!Number.isInteger(index) || index < 0 || index >= document.pptJson.slides.length) {
      return res.status(400).json({ success: false, message: 'Invalid slide index' });
    }

    const currentSlide = document.pptJson.slides[index];
    const sourceText = cleanText(document.extractedText || document.fullText).slice(0, 6000);

    let nextSlide = null;
    if (openai) {
      const prompt = [
        'Improve this single slide while keeping it grounded in the source context.',
        'Do not mention Deck Prep, Quick Convert, AI Guided Builder, the prompt, or the conversion process unless those exact terms appear in the source text.',
        `Instruction: ${req.body.instruction || 'Make it sharper and more executive-ready.'}`,
        '',
        'Current slide JSON:',
        JSON.stringify(currentSlide, null, 2),
        '',
        'Document context:',
        sourceText,
      ].join('\n');

      try {
        const raw = await callSlideModel({
          systemPrompt: `${SLIDE_SYSTEM_PROMPT}\nReturn one JSON object for a single slide only.`,
          userPrompt: prompt,
          responseFormat: true,
          temperature: 0.3,
          maxTokens: 1400,
        });
        const parsed = repairAndParseJson(raw);
        const candidateSlide = normaliseSlide({ ...currentSlide, ...parsed, id: currentSlide.id }, index);
        const candidateText = cleanText([
          candidateSlide.title,
          candidateSlide.subtitle,
          candidateSlide.objective,
          candidateSlide.keyMessage,
          ...(candidateSlide.bullets || []),
          candidateSlide.leftContent,
          candidateSlide.rightContent,
          candidateSlide.quote,
          ...(candidateSlide.cards || []).flatMap((item) => [item.title, item.body, item.metric]),
          ...(candidateSlide.timeline || []).flatMap((item) => [item.label, item.detail]),
          ...(candidateSlide.processSteps || []),
        ].join(' '));
        nextSlide = containsUnexpectedRefusalLanguage(candidateText, sourceText) || includesUnexpectedMetaTerm(candidateText, sourceText)
          ? null
          : candidateSlide;
      } catch {
        nextSlide = null;
      }
    }

    if (!nextSlide) {
      nextSlide = buildFallbackSlide({
        currentSlide,
        sourceText,
        instruction: req.body.instruction || '',
      });
    }

    const slides = [...document.pptJson.slides];
    slides[index] = { ...nextSlide, id: currentSlide.id };
    document.pptJson = {
      ...document.pptJson,
      slides: slides.map((slide, slideIndex) => ({ ...slide, id: slideIndex + 1 })),
    };
    document.updatedAt = new Date();
    await document.save();

    return res.json({
      success: true,
      slide: document.pptJson.slides[index],
      pptJson: document.pptJson,
    });
  } catch (error) {
    return sendError(res, error, 'Slide regeneration failed');
  }
};

export const saveFullText = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    document.fullText = cleanText(req.body.fullText);
    document.sourceCharCount = document.fullText.length;
    document.sourceWordCount = countWords(document.fullText);
    document.updatedAt = new Date();
    await document.save();
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error, 'Failed to save text');
  }
};

export const savePptJson = async (req, res) => {
  try {
    const document = await getOwnedDocument(req.user._id, req.body.documentId);
    const normalized = normalizeDeckPayload(req.body.pptJson, {
      theme: req.body.pptJson?.theme || document.pptJson?.theme || 'consulting',
      fallbackTitle: req.body.pptJson?.title || document.pptJson?.title || 'Presentation',
    });

    if (!normalized) {
      return res.status(400).json({ success: false, message: 'Invalid presentation payload' });
    }

    document.pptJson = normalized;
    document.updatedAt = new Date();
    await document.save();
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error, 'Failed to save presentation');
  }
};

export const getHistory = async (req, res) => {
  try {
    const histories = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'originalFileId', select: 'fileName cid type uploadedAt' },
        { path: 'templateFileId', select: 'fileName cid type uploadedAt' },
      ]);

    return res.json({ success: true, histories: histories.map(normalizeDocumentForResponse) });
  } catch (error) {
    return sendError(res, error, 'Failed to fetch history');
  }
};

export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('originalFileId', 'fileName cid type')
      .populate('templateFileId', 'fileName cid type');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    return res.json({ success: true, document: normalizeDocumentForResponse(document) });
  } catch (error) {
    return sendError(res, error, 'Failed to fetch document');
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error, 'Failed to delete document');
  }
};
