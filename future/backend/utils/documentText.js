const PAGE_NUMBER_RE = /^(?:page\s+)?\d+\s*$/i;
const BULLET_RE = /^([-*\u2022\u25E6\u25AA\u2023]|\d+[\.\)]|[A-Za-z][\.\)])\s+/;
const NUMBERED_HEADING_RE = /^((\d+(\.\d+)*)|([IVXLCDM]+))[\.\)]?\s+/i;
const TABLE_RE = /\S+\s{3,}\S+/;
const PDF_NOISE_RE = /^(?:obj|endobj|stream|endstream|xref|trailer|startxref|%pdf-|<<|>>)/i;
const BASE64ISH_RE = /^[A-Za-z0-9+/=]{80,}$/;
const HEXISH_RE = /^(?:[0-9A-Fa-f]{2,}\s*){24,}$/;

const collapseSpaces = (value) => value.replace(/\s+/g, ' ').trim();

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

  const blocks = [];
  let paragraphBuffer = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const merged = mergeParagraphLines(paragraphBuffer);
    if (merged) blocks.push({ type: 'paragraph', text: merged });
    paragraphBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const current = normalizeLine(lines[index]);
    const next = normalizeLine(lines[index + 1] || '');

    if (!current || PAGE_NUMBER_RE.test(current)) {
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

    if (isLikelyHeading(current, next)) {
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
  const sections = sectionizeText(rawText).slice(0, maxSections);

  return sections
    .map((section, index) => {
      const title = section.heading || `Section ${index + 1}`;
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



