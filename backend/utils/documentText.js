const PAGE_NUMBER_RE = /^(?:page\s+)?\d+\s*$/i;
const PAGE_OF_RE = /^[-–—\s]*(?:page\s+)?\d+\s+of\s+\d+\s*[-–—\s]*$/i;
const BULLET_RE = /^([-*\u2022\u25E6\u25AA\u2023]|\d+[\.\)]|[A-Za-z][\.\)])\s+/;
const NUMBERED_HEADING_RE = /^((\d+(\.\d+)*)|([IVXLCDM]+))[\.\)]?\s+/i;
const TABLE_RE = /\S+\s{3,}\S+/;
const PDF_NOISE_RE = /^(?:obj|endobj|stream|endstream|xref|trailer|startxref|%pdf-|<<|>>)/i;
const BASE64ISH_RE = /^[A-Za-z0-9+/=]{80,}$/;
const HEXISH_RE = /^(?:[0-9A-Fa-f]{2,}\s*){24,}$/;
const TOC_HINT_RE = /\btable of contents\b/i;
const STRIP_PAGE_DECOR_RE = /^[-–—\s]+|[-–—\s]+$/g;
const MULTI_PAGE_INDEX_RE = /^(?:\d+\s+){2,}\d+$/;
const TOC_ENTRY_RE = /^(?!.*[.!?])[A-Z][A-Za-z0-9/&(),\-\s]{2,80}\s+\d+$/;

const collapseSpaces = (value) => value.replace(/\s+/g, ' ').trim();

const cleanPipeSegment = (value) =>
  collapseSpaces(
    String(value || '')
      .replace(/^\d+\s+/, '')
      .replace(/\s+\d+$/g, '')
      .replace(/[|]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
  );

const buildRepeatedPipeSegments = (lines) => {
  const counts = new Map();

  lines
    .map((line) => collapseSpaces(String(line || '').replace(STRIP_PAGE_DECOR_RE, '')))
    .filter((line) => line.includes('|'))
    .forEach((line) => {
      line
        .split('|')
        .map(cleanPipeSegment)
        .filter((segment) => segment.length >= 12)
        .forEach((segment) => {
          const key = segment.toLowerCase();
          counts.set(key, (counts.get(key) || 0) + 1);
        });
    });

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([segment]) => segment)
  );
};

const normalizePipeLine = (line, repeatedSegments) => {
  const raw = collapseSpaces(String(line || '').replace(STRIP_PAGE_DECOR_RE, ''));
  if (!raw.includes('|')) return raw;

  const parts = raw
    .split('|')
    .map(cleanPipeSegment)
    .filter(Boolean);

  if (!parts.length) return '';

  const uniqueParts = parts.filter((part) => !repeatedSegments.has(part.toLowerCase()));
  if (uniqueParts.length === 1) return uniqueParts[0];
  if (uniqueParts.length > 1) return uniqueParts[uniqueParts.length - 1];

  const shortestUseful = parts
    .filter((part) => part.length >= 4)
    .sort((a, b) => a.length - b.length)[0];
  return shortestUseful || '';
};

const isTableOfContentsNoise = (line) => {
  const value = collapseSpaces(String(line || '').replace(STRIP_PAGE_DECOR_RE, ''));
  if (!value) return false;
  if (TOC_HINT_RE.test(value)) return true;
  if (TOC_ENTRY_RE.test(value)) return true;
  if (MULTI_PAGE_INDEX_RE.test(value)) return true;
  const standaloneNumbers = value.match(/\b\d+\b/g) || [];
  if (standaloneNumbers.length >= 4 && /\b(foreword|contents|introduction|summary|chapter|section)\b/i.test(value)) {
    return true;
  }
  return false;
};

const isNoiseLine = (line) => {
  const value = collapseSpaces(String(line || ''));
  if (!value) return false;
  if (PDF_NOISE_RE.test(value)) return true;
  if (BASE64ISH_RE.test(value) && !/[aeiou]{3,}/i.test(value)) return true;
  if (HEXISH_RE.test(value)) return true;
  const cidMatches = value.match(/cid:\d+/gi) || [];
  if (cidMatches.length >= 2) return true;
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  const digits = (value.match(/[0-9]/g) || []).length;
  const spaces = (value.match(/\s/g) || []).length;
  const symbols = value.length - letters - digits - spaces;
  if (value.length >= 70 && letters < 10 && symbols > value.length * 0.3) return true;
  if (value.length >= 90 && digits > letters * 2 && spaces < 3) return true;
  return false;
};

const isUpperHeading = (line) => {
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4 || letters.length > 80) return false;
  return letters === letters.toUpperCase();
};

const isLikelyHeading = (line, nextLine = '') => {
  if (!line || line.length > 90) return false;
  if (TABLE_RE.test(line) || BULLET_RE.test(line)) return false;
  if (NUMBERED_HEADING_RE.test(line)) return true;
  if (isUpperHeading(line)) return true;
  if (line.endsWith(':') && line.split(/\s+/).length <= 10) return true;
  if (/^[A-Z][A-Za-z0-9/&(),:\-\s]+$/.test(line) && nextLine && !/[.!?]$/.test(line)) {
    const wordCount = line.split(/\s+/).length;
    const nextStartsNewBlock =
      !nextLine ||
      BULLET_RE.test(nextLine) ||
      NUMBERED_HEADING_RE.test(nextLine) ||
      isUpperHeading(nextLine);
    return wordCount <= 8 && nextStartsNewBlock;
  }
  return false;
};

const tidyHeading = (line) => {
  const trimmed = collapseSpaces(line);
  if (!isUpperHeading(trimmed)) return trimmed;
  return trimmed
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
};

const normalizeLine = (line) =>
  String(line || '')
    .replace(/\u0000/g, '')
    .replace(/\t/g, ' ')
    .replace(/\s+$/g, '')
    .trim();

const mergeParagraphLines = (lines) => {
  let merged = '';
  for (const rawLine of lines) {
    const line = collapseSpaces(rawLine);
    if (!line) continue;
    if (!merged) {
      merged = line;
      continue;
    }
    if (merged.endsWith('-')) {
      merged = `${merged.slice(0, -1)}${line}`;
      continue;
    }
    merged = `${merged} ${line}`;
  }
  return merged
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
};

export const splitSentences = (text) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);

export const parseStructuredBlocks = (rawText) => {
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n');
  const repeatedPipeSegments = buildRepeatedPipeSegments(lines);

  const blocks = [];
  let paragraphBuffer = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const merged = mergeParagraphLines(paragraphBuffer);
    if (merged) blocks.push({ type: 'paragraph', text: merged });
    paragraphBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    let current = normalizeLine(lines[index]);
    const next = normalizeLine(lines[index + 1] || '');
    let forcedHeading = false;

    if (current.includes('|')) {
      const normalizedPipeLine = normalizePipeLine(current, repeatedPipeSegments);
      if (!normalizedPipeLine) {
        flushParagraph();
        continue;
      }
      if (normalizedPipeLine !== current) forcedHeading = true;
      current = normalizedPipeLine;
    }

    if (!current || PAGE_NUMBER_RE.test(current) || PAGE_OF_RE.test(current)) {
      flushParagraph();
      continue;
    }

    if (isTableOfContentsNoise(current)) {
      flushParagraph();
      continue;
    }

    if (isNoiseLine(current)) {
      flushParagraph();
      continue;
    }

    if (TABLE_RE.test(current)) {
      flushParagraph();
      blocks.push({ type: 'table', text: current });
      continue;
    }

    if (forcedHeading || isLikelyHeading(current, next)) {
      flushParagraph();
      blocks.push({ type: 'heading', text: tidyHeading(current.replace(/:+$/, '')) });
      continue;
    }

    if (BULLET_RE.test(current)) {
      flushParagraph();
      blocks.push({ type: 'bullet', text: collapseSpaces(current.replace(BULLET_RE, '')) });
      continue;
    }

    paragraphBuffer.push(current);
  }

  flushParagraph();
  return blocks;
};

export const structurePdfText = (rawText) => {
  const blocks = parseStructuredBlocks(rawText);
  const paragraphs = blocks.filter((block) => block.type === 'paragraph').length;
  const headings = blocks.filter((block) => block.type === 'heading').length;
  const bullets = blocks.filter((block) => block.type === 'bullet').length;
  const tables = blocks.filter((block) => block.type === 'table').length;

  const text = blocks
    .map((block) => {
      if (block.type === 'heading') return block.text;
      if (block.type === 'bullet') return `- ${block.text}`;
      return block.text;
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text,
    blocks,
    stats: {
      paragraphCount: paragraphs,
      headingCount: headings,
      bulletCount: bullets,
      tableCount: tables,
      blockCount: blocks.length,
    },
  };
};

export const sectionizeText = (rawText) => {
  const { blocks } = structurePdfText(rawText);
  const sections = [];
  let current = { heading: '', paragraphs: [], bullets: [], tables: [] };

  const pushCurrent = () => {
    if (!current.heading && !current.paragraphs.length && !current.bullets.length && !current.tables.length) return;
    sections.push(current);
    current = { heading: '', paragraphs: [], bullets: [], tables: [] };
  };

  for (const block of blocks) {
    if (block.type === 'heading') {
      pushCurrent();
      current.heading = block.text;
      continue;
    }
    if (block.type === 'paragraph') current.paragraphs.push(block.text);
    if (block.type === 'bullet') current.bullets.push(block.text);
    if (block.type === 'table') current.tables.push(block.text);
  }

  pushCurrent();

  return sections.length
    ? sections
    : [{ heading: '', paragraphs: [String(rawText || '').trim()].filter(Boolean), bullets: [], tables: [] }];
};

const compactBullet = (value, maxWords = 12) => {
  const words = collapseSpaces(value)
    .replace(/^[-*\u2022\u25E6\u25AA\u2023]\s*/, '')
    .replace(/[.;:!?]+$/g, '')
    .split(' ')
    .filter(Boolean);
  return words.slice(0, maxWords).join(' ');
};

export const buildOutlineFromBlocks = (rawText, options = {}) => {
  const maxSections = options.maxSections || 8;
  const maxBulletsPerSection = options.maxBulletsPerSection || 6;
  const rawSections = sectionizeText(rawText);
  const sections = rawSections.some((section) => collapseSpaces(section.heading || ''))
    ? rawSections.filter((section) => {
        const heading = collapseSpaces(section.heading || '');
        const sample = [...(section.paragraphs || []).slice(0, 1), ...(section.bullets || []).slice(0, 3)].join(' ');
        if (!heading && /disclaimer|provided as is|all reasonable precautions/i.test(sample)) return false;
        return true;
      }).slice(0, maxSections)
    : rawSections.slice(0, maxSections);

  return sections
    .map((section, index) => {
      const title =
        section.heading ||
        compactBullet(section.paragraphs[0] || section.bullets[0] || `Topic ${index + 1}`, 8) ||
        `Topic ${index + 1}`;
      const bulletSource = [
        ...section.bullets,
        ...section.paragraphs.flatMap((paragraph) => splitSentences(paragraph).slice(0, 2)),
      ]
        .map((item) => compactBullet(item))
        .filter(Boolean)
        .slice(0, maxBulletsPerSection);

      return [
        title,
        ...bulletSource.map((item) => `- ${item}`),
      ].join('\n');
    })
    .join('\n\n')
    .trim();
};

const rankSection = (section) => {
  const heading = collapseSpaces(String(section?.heading || '')).toLowerCase();
  const textSample = [
    ...(section?.paragraphs || []).slice(0, 2),
    ...(section?.bullets || []).slice(0, 4),
  ].join(' ');
  let score = 0;

  if (!heading || /^topic\s+\d+$/i.test(heading)) score -= 2;
  if (/^section\s+\d+$/i.test(heading)) score -= 4;
  if (/executive summary|summary|recommendation|findings|conclusion|roadmap|opportunity|impact/i.test(heading)) score += 4;
  if (/disclaimer|copyright|table of contents|contents|foreword/i.test(heading)) score -= 6;

  score += Math.min(section?.paragraphs?.length || 0, 3);
  score += Math.min(section?.bullets?.length || 0, 4);
  score += Math.min(section?.tables?.length || 0, 2);
  if (/disclaimer|provided as is|all reasonable precautions/i.test(textSample)) score -= 6;
  if (/\b\d[\d,.]*%|\bUSD\b|\bEUR\b|\bMW\b|\bGW\b|\bmillion\b|\bbillion\b/i.test(textSample)) score += 2;

  return score;
};

export const buildPresentationDigest = (rawText, maxChars = 14000) => {
  const { text } = structurePdfText(rawText);
  const rawSections = sectionizeText(rawText)
    .filter((section) => section.heading || section.paragraphs.length || section.bullets.length)
    .map((section, index) => ({ ...section, __index: index, __score: rankSection(section) }));
  const sections = rawSections.some((section) => section.__score > 0)
    ? rawSections.filter((section) => section.__score > 0)
    : rawSections;

  if (!sections.length) {
    return text.slice(0, maxChars);
  }

  const preferred = sections
    .filter((section) => section.__score > 0)
    .sort((a, b) => {
      if (b.__score !== a.__score) return b.__score - a.__score;
      return a.__index - b.__index;
    });

  const ordered = (preferred.length ? preferred : sections)
    .slice(0, Math.min(12, sections.length))
    .sort((a, b) => a.__index - b.__index);

  const parts = [];
  let total = 0;

  for (const section of ordered) {
    const heading = collapseSpaces(section.heading || '');
    const bullets = [
      ...section.bullets.slice(0, 4),
      ...section.paragraphs.flatMap((paragraph) => splitSentences(paragraph).slice(0, 2)),
    ]
      .map((item) => compactBullet(item, 18))
      .filter(Boolean)
      .slice(0, 6);

    const block = [
      heading || `Topic ${section.__index + 1}`,
      ...bullets.map((item) => `- ${item}`),
    ].join('\n');

    if (!block.trim()) continue;
    if (total && total + block.length > maxChars) break;
    parts.push(block);
    total += block.length + 2;
  }

  const digest = parts.join('\n\n').trim();
  return digest || text.slice(0, maxChars);
};

export const extractNumericHighlights = (rawText, limit = 4) => {
  const sentences = splitSentences(rawText);
  const highlights = [];

  for (const sentence of sentences) {
    if (highlights.length >= limit) break;
    const valueMatch = sentence.match(/(\$?\d[\d,]*(?:\.\d+)?%?|\d+\s?(?:years?|months?|days?|x))/i);
    if (!valueMatch) continue;
    const label = collapseSpaces(sentence.replace(valueMatch[0], '').replace(/[.;:]+$/g, ''));
    highlights.push({
      value: valueMatch[0],
      label: label || 'Key metric',
    });
  }

  return highlights;
};



