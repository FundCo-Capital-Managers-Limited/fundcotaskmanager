import {
  buildPresentationDigest,
  buildOutlineFromBlocks,
  extractNumericHighlights,
  sectionizeText,
  splitSentences,
  structurePdfText,
} from './documentText.js';

const VALID_SLIDE_TYPES = new Set([
  'title',
  'section',
  'bullets',
  'two-column',
  'comparison',
  'timeline',
  'process',
  'cards',
  'quote',
  'data',
  'closing',
]);

const LOW_SIGNAL_HEADING_RE = /^(disclaimer|table of contents|contents|copyright notice)$/i;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const cleanPhrase = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[.;:!?]+$/g, '')
    .trim();

const clipWords = (value, maxWords = 18) => {
  const words = cleanPhrase(value).split(' ').filter(Boolean);
  return words.slice(0, maxWords).join(' ');
};

const uniqueList = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = cleanPhrase(item).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseNumericValue = (value) => {
  const numeric = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const inferPurpose = (text) => {
  const lower = String(text || '').toLowerCase();
  if (/\b(thesis|methodology|literature|research|study|journal|hypothesis)\b/.test(lower)) return 'academic';
  if (/\b(api|architecture|system|workflow|implementation|platform|integration|deployment)\b/.test(lower)) return 'technical';
  if (/\b(revenue|market|portfolio|strategy|investment|growth|cost|financial|operating)\b/.test(lower)) return 'business';
  if (/\b(board|executive|leadership|decision|recommendation)\b/.test(lower)) return 'executive';
  return 'professional';
};

const inferAudience = (requestedAudience, purpose) => {
  const cleanAudience = cleanPhrase(requestedAudience || '').toLowerCase();
  if (cleanAudience) return cleanAudience;
  if (purpose === 'academic') return 'academic stakeholders';
  if (purpose === 'technical') return 'technical leadership';
  if (purpose === 'executive') return 'executive leadership';
  return 'business stakeholders';
};

const visualElementsForType = (type, hasChart = false) => {
  const map = {
    title: ['full-bleed title band', 'short subtitle', 'subtle brand accent'],
    section: ['section divider', 'large section label', 'clean whitespace'],
    bullets: ['highlight callout', 'simple icons', 'priority emphasis'],
    'two-column': ['split content panels', 'contrast headers', 'callout strip'],
    comparison: ['comparison table', 'left-right headers', 'decision callouts'],
    timeline: ['timeline nodes', 'phase labels', 'milestone markers'],
    process: ['connected steps', 'flow arrows', 'outcome callout'],
    cards: ['content cards', 'icon chips', 'metric highlights'],
    quote: ['pull quote styling', 'source attribution', 'accent rule'],
    data: hasChart ? ['chart', 'metric callouts', 'insight box'] : ['metric cards', 'number callouts', 'insight box'],
    closing: ['summary list', 'final emphasis panel', 'next-step cue'],
  };
  return map[type] || ['clean hierarchy', 'supporting icons'];
};

const pickTitle = ({ titleHint, sections, rawText }) => {
  if (cleanPhrase(titleHint)) return cleanPhrase(titleHint).replace(/\.pdf$/i, '');
  const firstHeading = cleanPhrase(sections.find((section) => section.heading)?.heading || '');
  if (firstHeading) return firstHeading;
  const firstSentence = splitSentences(rawText)[0] || '';
  return clipWords(firstSentence || 'Document Presentation', 8) || 'Document Presentation';
};

const buildSectionBullets = (section, max = 7) => {
  const heading = cleanPhrase(section.heading || '');
  const stripHeadingPrefix = (value) => {
    const phrase = cleanPhrase(value);
    if (!heading) return phrase;
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return cleanPhrase(phrase.replace(new RegExp(`^${escaped}\\s*[:\\-]?\\s*`, 'i'), ''));
  };
  const bulletCandidates = uniqueList([
    ...section.bullets,
    ...section.paragraphs.flatMap((paragraph) => splitSentences(paragraph).slice(0, 3)),
  ])
    .map(stripHeadingPrefix)
    .map((item) => clipWords(item, 18));
  return bulletCandidates.filter(Boolean).slice(0, max);
};

const splitBulletsToColumns = (bullets) => {
  const midpoint = Math.ceil(bullets.length / 2);
  return {
    leftContent: bullets.slice(0, midpoint).map((item) => `- ${item}`).join('\n'),
    rightContent: bullets.slice(midpoint).map((item) => `- ${item}`).join('\n'),
  };
};

const buildCardsFromBullets = (bullets) =>
  bullets.slice(0, 4).map((bullet, index) => {
    const parts = splitSentences(bullet);
    const title = clipWords(parts[0] || bullet, 6) || `Point ${index + 1}`;
    const body = clipWords(parts.slice(1).join(' ') || bullet, 26) || bullet;
    return { title, body, metric: '' };
  });

const buildTimelineFromBullets = (bullets) =>
  bullets.slice(0, 5).map((bullet, index) => ({
    label: `Phase ${index + 1}`,
    detail: clipWords(bullet, 14) || `Step ${index + 1}`,
  }));

const buildProcessSteps = (bullets) =>
  bullets.slice(0, 5).map((bullet) => clipWords(bullet, 12)).filter(Boolean);

const buildComparisonColumns = (bullets) => {
  const midpoint = Math.ceil(Math.max(bullets.length, 2) / 2);
  return {
    leftTitle: 'Current state',
    rightTitle: 'Recommended state',
    leftContent: bullets.slice(0, midpoint).map((item) => `- ${item}`).join('\n') || '- Current approach',
    rightContent: bullets.slice(midpoint).map((item) => `- ${item}`).join('\n') || '- Proposed approach',
  };
};

const buildChartFromStats = (stats) => {
  const cleanStats = Array.isArray(stats) ? stats : [];
  const numericStats = cleanStats
    .map((item) => ({
      label: cleanPhrase(item?.label || 'Metric'),
      value: parseNumericValue(item?.value),
      raw: cleanPhrase(item?.value || ''),
    }))
    .filter((item) => Number.isFinite(item.value));

  if (numericStats.length < 2) return null;

  const hasPercent = cleanStats.some((item) => String(item?.value || '').includes('%'));
  return {
    type: hasPercent ? 'bar' : 'column',
    title: 'Key data points',
    categories: numericStats.map((item) => clipWords(item.label || 'Metric', 4)),
    series: [
      {
        name: hasPercent ? 'Percent change' : 'Value',
        values: numericStats.map((item) => item.value),
      },
    ],
    insight: cleanStats[0]?.label || '',
  };
};

const buildClosingBullets = (sections) =>
  uniqueList(
    sections.flatMap((section) => buildSectionBullets(section).slice(0, 2))
  )
    .slice(0, 5)
    .map((item) => clipWords(item, 14));

const isLowSignalSection = (section) => {
  const heading = cleanPhrase(section?.heading || '');
  const sample = [
    ...(section?.paragraphs || []).slice(0, 2),
    ...(section?.bullets || []).slice(0, 4),
  ].join(' ');

  if (LOW_SIGNAL_HEADING_RE.test(heading)) return true;
  if (!heading && /disclaimer|provided as is|all reasonable precautions/i.test(sample)) return true;
  return false;
};

const chooseLayout = (section, index, stats, bullets) => {
  const heading = cleanPhrase(section.heading || '').toLowerCase();
  if (/\b(timeline|roadmap|milestone|phase|journey)\b/.test(heading)) return 'timeline';
  if (/\b(process|workflow|system|method|approach|steps?)\b/.test(heading)) return 'process';
  if (/\b(compare|comparison|versus| vs |option|alternative|benchmark)\b/.test(heading)) return 'comparison';
  if (stats.length >= 3) return 'data';
  if (bullets.length >= 3 && bullets.length <= 4) return 'cards';
  if (bullets.length >= 6 && index % 2 === 1) return 'two-column';
  return 'bullets';
};

const buildStoryArc = (purpose) => {
  if (purpose === 'academic') {
    return ['Context', 'Research focus', 'Evidence', 'Implications', 'Conclusion'];
  }
  if (purpose === 'technical') {
    return ['Context', 'Problem', 'System view', 'Recommendation', 'Next steps'];
  }
  return ['Context', 'Problem', 'Insight', 'Recommendation', 'Conclusion'];
};

const normalizeSlide = (slide, id) => ({
  id,
  type: VALID_SLIDE_TYPES.has(slide.type) ? slide.type : 'bullets',
  layout: cleanPhrase(slide.layout || slide.type || 'bullets') || 'bullets',
  title: cleanPhrase(slide.title) || `Slide ${id}`,
  subtitle: cleanPhrase(slide.subtitle || ''),
  objective: cleanPhrase(slide.objective || ''),
  keyMessage: cleanPhrase(slide.keyMessage || ''),
  bullets: Array.isArray(slide.bullets) ? uniqueList(slide.bullets).map((item) => clipWords(item, 18)).slice(0, 7) : [],
  leftTitle: cleanPhrase(slide.leftTitle || ''),
  leftContent: String(slide.leftContent || '').trim(),
  rightTitle: cleanPhrase(slide.rightTitle || ''),
  rightContent: String(slide.rightContent || '').trim(),
  quote: cleanPhrase(slide.quote || ''),
  attribution: cleanPhrase(slide.attribution || ''),
  stats: Array.isArray(slide.stats)
    ? slide.stats
        .filter((item) => item && (item.value || item.label))
        .slice(0, 4)
        .map((item) => ({
          value: cleanPhrase(item.value || ''),
          label: cleanPhrase(item.label || ''),
        }))
    : [],
  cards: Array.isArray(slide.cards)
    ? slide.cards
        .filter((item) => item && (item.title || item.body || item.metric))
        .slice(0, 4)
        .map((item, index) => ({
          title: cleanPhrase(item.title || `Point ${index + 1}`),
          body: cleanPhrase(item.body || ''),
          metric: cleanPhrase(item.metric || ''),
        }))
    : [],
  timeline: Array.isArray(slide.timeline)
    ? slide.timeline
        .filter((item) => item && (item.label || item.detail))
        .slice(0, 5)
        .map((item, index) => ({
          label: cleanPhrase(item.label || `Phase ${index + 1}`),
          detail: cleanPhrase(item.detail || ''),
        }))
    : [],
  processSteps: Array.isArray(slide.processSteps)
    ? slide.processSteps.map((item) => clipWords(item, 12)).filter(Boolean).slice(0, 5)
    : [],
  visualElements: Array.isArray(slide.visualElements)
    ? slide.visualElements.map((item) => cleanPhrase(item)).filter(Boolean).slice(0, 6)
    : [],
  chart: slide.chart && Array.isArray(slide.chart.categories) && Array.isArray(slide.chart.series)
    ? {
        type: ['bar', 'column', 'line', 'pie', 'doughnut'].includes(String(slide.chart.type || '').toLowerCase())
          ? String(slide.chart.type).toLowerCase()
          : 'column',
        title: cleanPhrase(slide.chart.title || ''),
        categories: slide.chart.categories.map((item) => clipWords(item, 4)).filter(Boolean).slice(0, 6),
        series: slide.chart.series
          .filter((series) => series && series.name && Array.isArray(series.values))
          .slice(0, 3)
          .map((series) => ({
            name: cleanPhrase(series.name),
            values: series.values.map((value) => Number(value)).filter((value) => Number.isFinite(value)).slice(0, 6),
          }))
          .filter((series) => series.values.length),
        insight: cleanPhrase(slide.chart.insight || ''),
      }
    : null,
  note: String(slide.note || '').trim(),
});

export const buildFallbackDeck = ({
  sourceText,
  slideCount = 12,
  theme = 'consulting',
  audience = 'business',
  titleHint = '',
}) => {
  const normalizedSourceText = structurePdfText(sourceText).text || String(sourceText || '');
  const presentationDigest = buildPresentationDigest(normalizedSourceText, 14000);
  const { text } = structurePdfText(normalizedSourceText);
  const rawSections = sectionizeText(normalizedSourceText).filter(
    (section) => section.heading || section.paragraphs.length || section.bullets.length
  );
  const sections = rawSections.some((section) => !isLowSignalSection(section))
    ? rawSections.filter((section) => !isLowSignalSection(section))
    : rawSections;
  const purpose = inferPurpose(text);
  const effectiveAudience = inferAudience(audience, purpose);
  const storyArc = buildStoryArc(purpose);
  const title = pickTitle({ titleHint, sections, rawText: text });
  const totalSlidesTarget = clamp(Number(slideCount) || 12, 6, 30);
  const includeSummary = totalSlidesTarget >= 8;
  const contentBudget = Math.max(1, totalSlidesTarget - (includeSummary ? 3 : 2));
  const candidates = [];

  sections.forEach((section, index) => {
    const heading = cleanPhrase(section.heading || storyArc[Math.min(index + 1, storyArc.length - 1)] || `Topic ${index + 1}`);
    const bullets = buildSectionBullets(section);
    const stats = extractNumericHighlights(
      `${section.paragraphs.join(' ')} ${section.bullets.join(' ')}`,
      4
    );
    const layout = chooseLayout(section, index, stats, bullets);
    const visualElements = visualElementsForType(layout, layout === 'data');
    const keyMessage = clipWords(section.paragraphs[0] || bullets[0] || heading, 22);

    if (layout === 'data') {
      candidates.push({
        type: 'data',
        layout,
        title: heading || `Data slide ${index + 1}`,
        subtitle: 'Key evidence from the source document',
        objective: `Show the most important evidence for ${heading.toLowerCase()}`,
        keyMessage,
        stats,
        chart: buildChartFromStats(stats),
        visualElements,
        note: 'Use a clean consulting-style data panel with one clear takeaway and supporting commentary.',
      });
      return;
    }

    if (layout === 'cards') {
      candidates.push({
        type: 'cards',
        layout,
        title: heading || `Key ideas ${index + 1}`,
        objective: `Break ${heading.toLowerCase()} into digestible themes`,
        keyMessage,
        cards: buildCardsFromBullets(bullets.length ? bullets : [keyMessage]),
        visualElements,
        note: 'Use three to four cards with strong spacing and enough body copy to make each idea useful in a real meeting.',
      });
      return;
    }

    if (layout === 'timeline') {
      candidates.push({
        type: 'timeline',
        layout,
        title: heading || `Timeline ${index + 1}`,
        objective: `Explain the sequence for ${heading.toLowerCase()}`,
        keyMessage,
        timeline: buildTimelineFromBullets(bullets.length ? bullets : [keyMessage]),
        visualElements,
        note: 'Use a horizontal timeline with clear milestones, dates or phases, and concise supporting detail.',
      });
      return;
    }

    if (layout === 'process') {
      candidates.push({
        type: 'process',
        layout,
        title: heading || `Process ${index + 1}`,
        objective: `Explain how ${heading.toLowerCase()} works`,
        keyMessage,
        processSteps: buildProcessSteps(bullets.length ? bullets : [keyMessage]),
        visualElements,
        note: 'Use connected steps with directional flow, short supporting text, and one outcome callout.',
      });
      return;
    }

    if (layout === 'comparison') {
      const comparison = buildComparisonColumns(bullets.length ? bullets : [keyMessage, 'Recommended action']);
      candidates.push({
        type: 'comparison',
        layout,
        title: heading || `Comparison ${index + 1}`,
        objective: `Compare the current and target state for ${heading.toLowerCase()}`,
        keyMessage,
        ...comparison,
        visualElements,
        note: 'Use a sharp left-right comparison with decision-oriented headings.',
      });
      return;
    }

    if (layout === 'two-column') {
      const cols = splitBulletsToColumns(bullets.length ? bullets : [keyMessage]);
      candidates.push({
        type: 'two-column',
        layout,
        title: heading || `Topic ${index + 1}`,
        objective: `Present ${heading.toLowerCase()} across two clear dimensions`,
        keyMessage,
        leftTitle: 'What matters',
        rightTitle: 'Implications',
        leftContent: cols.leftContent,
        rightContent: cols.rightContent,
        visualElements,
        note: 'Use balanced two-column panels and keep copy concise.',
      });
      return;
    }

    candidates.push({
      type: 'bullets',
      layout: 'bullets',
      title: heading || `Topic ${index + 1}`,
      objective: `Summarize the most important points for ${heading.toLowerCase()}`,
      keyMessage,
      bullets: bullets.length ? bullets : [keyMessage, 'Supporting evidence', 'Recommended next step'],
      visualElements,
      note: 'Use an insight headline, substantial bullets with enough detail to stand on their own, and one highlight callout.',
    });
  });

  const contentSlides = candidates.slice(0, contentBudget);
  while (contentSlides.length < contentBudget) {
    const outline = buildOutlineFromBlocks(text, { maxSections: 1, maxBulletsPerSection: 6 });
    const fallbackBullets = outline
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2))
      .slice(0, 6);

    contentSlides.push({
      type: 'cards',
      layout: 'cards',
      title: contentSlides.length ? `Supporting Themes ${contentSlides.length}` : 'Executive Summary',
      objective: 'Condense the document into clear decision themes',
      keyMessage: 'Capture the highest-value insights in a consulting-ready structure',
      cards: buildCardsFromBullets(fallbackBullets.length ? fallbackBullets : ['Main point', 'Supporting evidence', 'Next action']),
      visualElements: visualElementsForType('cards'),
      note: 'Use concise cards with enough explanation to stand on their own.',
    });
  }

  const summaryBullets = uniqueList(
    sections.flatMap((section) => buildSectionBullets(section).slice(0, 2))
  ).slice(0, 4);

  const slides = [
    {
      type: 'title',
      layout: 'title',
      title,
      subtitle: `${purpose[0].toUpperCase()}${purpose.slice(1)} presentation for ${effectiveAudience}`,
      objective: 'Set the tone and frame the presentation',
      keyMessage: 'Create a credible first impression with a clear title and subtitle',
      visualElements: visualElementsForType('title'),
      note: 'Apply a consulting-style title slide with strong hierarchy and restrained use of color.',
    },
    ...(includeSummary ? [{
      type: 'cards',
      layout: 'cards',
      title: 'Executive Summary',
      objective: 'Give the audience the story in one slide',
      keyMessage: 'Surface the most important insights before the deeper analysis',
      cards: buildCardsFromBullets(summaryBullets.length ? summaryBullets : ['Main point', 'Supporting evidence', 'Recommendation']),
      visualElements: visualElementsForType('cards'),
      note: 'Use three or four summary cards with high-signal messages and short supporting detail.',
    }] : []),
    ...contentSlides,
    {
      type: 'closing',
      layout: 'closing',
      title: 'Key Takeaways',
      objective: 'Close with the main implications and the next step',
      keyMessage: 'Leave the audience with a clear conclusion and action bias',
      bullets: buildClosingBullets(sections).length ? buildClosingBullets(sections) : ['Core point', 'Execution priority', 'Recommended next step'],
      visualElements: visualElementsForType('closing'),
      note: 'Use a clean close with concise takeaways and a confident final cue.',
    },
  ].map((slide, index) => normalizeSlide(slide, index + 1));

  return {
    title,
    theme,
    purpose,
    audience: effectiveAudience,
    storyArc,
    slides,
    meta: {
      generator: 'fallback',
      purpose,
      audience: effectiveAudience,
      contentBudget,
    },
  };
};

export const buildFallbackSlide = ({ currentSlide, sourceText, instruction = '' }) => {
  const baseType = currentSlide?.type || 'bullets';
  const { text } = structurePdfText(sourceText);
  const sections = sectionizeText(sourceText);
  const primary = sections[0] || { heading: '', paragraphs: [text], bullets: [] };
  const bullets = buildSectionBullets(primary);
  const stats = extractNumericHighlights(text, 4);
  const note = cleanPhrase(instruction);

  let slide;
  switch (baseType) {
    case 'title':
      slide = {
        ...currentSlide,
        subtitle: cleanPhrase(currentSlide?.subtitle || splitSentences(text)[0] || 'Executive summary'),
      };
      break;
    case 'section':
      slide = {
        ...currentSlide,
        subtitle: clipWords(primary.paragraphs[0] || bullets[0] || 'Section summary', 16),
      };
      break;
    case 'cards':
      slide = {
        ...currentSlide,
        cards: buildCardsFromBullets(bullets.length ? bullets : ['Key theme', 'Supporting evidence', 'Recommended action']),
      };
      break;
    case 'timeline':
      slide = {
        ...currentSlide,
        timeline: buildTimelineFromBullets(bullets.length ? bullets : ['Start', 'Middle', 'Finish']),
      };
      break;
    case 'process':
      slide = {
        ...currentSlide,
        processSteps: buildProcessSteps(bullets.length ? bullets : ['Input', 'Analysis', 'Action']),
      };
      break;
    case 'comparison': {
      const comparison = buildComparisonColumns(bullets.length ? bullets : ['Current state', 'Recommended state']);
      slide = { ...currentSlide, ...comparison };
      break;
    }
    case 'two-column': {
      const cols = splitBulletsToColumns(bullets.length ? bullets : ['Key point', 'Supporting detail', 'Recommended action', 'Next step']);
      slide = {
        ...currentSlide,
        leftTitle: currentSlide?.leftTitle || 'Key points',
        rightTitle: currentSlide?.rightTitle || 'Implications',
        leftContent: cols.leftContent,
        rightContent: cols.rightContent,
      };
      break;
    }
    case 'data':
      slide = {
        ...currentSlide,
        stats,
        chart: buildChartFromStats(stats),
      };
      break;
    case 'quote':
      slide = {
        ...currentSlide,
        quote: splitSentences(text)[0] || currentSlide?.quote || currentSlide?.title || 'Key message',
        attribution: currentSlide?.attribution || '',
      };
      break;
    case 'closing':
      slide = {
        ...currentSlide,
        bullets: buildClosingBullets(sections).slice(0, 5),
      };
      break;
    default:
      slide = {
        ...currentSlide,
        bullets: bullets.length ? bullets : ['Key point', 'Supporting detail', 'Recommended action'],
      };
      break;
  }

  return normalizeSlide({
    ...slide,
    note: note || currentSlide?.note || '',
  }, currentSlide?.id || 1);
};
