import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackDeck, buildFallbackSlide } from './deckBuilder.js';

const SOURCE_TEXT = `
FUND PERFORMANCE REVIEW

Revenue increased by 25% in 2025.
Operating cash flow improved by 18%.

GROWTH DRIVERS

- New fund inflows
- Better pricing discipline
- Faster portfolio execution

RISKS

- Delayed collections in one unit
- FX pressure on imported equipment
`;

test('buildFallbackDeck returns a usable slide deck when AI output is unavailable', () => {
  const deck = buildFallbackDeck({
    sourceText: SOURCE_TEXT,
    slideCount: 8,
    theme: 'professional',
    audience: 'executive',
    titleHint: 'performance-review.pdf',
  });

  assert.equal(deck.slides[0].type, 'title');
  assert.equal(deck.slides.at(-1).type, 'closing');
  assert.ok(deck.slides.some((slide) => slide.type === 'data'));
  assert.ok(deck.slides.length >= 6);
});

test('buildFallbackSlide produces valid replacement content', () => {
  const slide = buildFallbackSlide({
    currentSlide: { id: 2, type: 'bullets', title: 'Growth Drivers', bullets: [] },
    sourceText: SOURCE_TEXT,
    instruction: 'Make the slide tighter',
  });

  assert.equal(slide.id, 2);
  assert.equal(slide.type, 'bullets');
  assert.ok(slide.bullets.length > 0);
});



