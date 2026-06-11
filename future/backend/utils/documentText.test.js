import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOutlineFromBlocks, sectionizeText, structurePdfText } from './documentText.js';

const SAMPLE_TEXT = `
EXECUTIVE SUMMARY

Revenue increased
by 25% year on year
across the portfolio.

- Margin expansion improved
- Hiring remained controlled

RISKS

Collections slowed in Q4.
`;

test('structurePdfText merges wrapped lines and preserves headings and bullets', () => {
  const result = structurePdfText(SAMPLE_TEXT);
  assert.match(result.text, /Revenue increased by 25% year on year across the portfolio\./);
  assert.match(result.text, /Executive Summary/);
  assert.match(result.text, /- Margin expansion improved/);
  assert.equal(result.stats.headingCount, 2);
});

test('sectionizeText groups content under headings', () => {
  const sections = sectionizeText(SAMPLE_TEXT);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, 'Executive Summary');
  assert.ok(sections[0].paragraphs[0].includes('Revenue increased by 25%'));
});

test('buildOutlineFromBlocks produces deck-ready sections', () => {
  const outline = buildOutlineFromBlocks(SAMPLE_TEXT);
  assert.match(outline, /Executive Summary/);
  assert.match(outline, /- Revenue increased by 25% year on year across/);
});



