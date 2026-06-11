import test from 'node:test';
import assert from 'node:assert/strict';
import { repairAndParseJson } from './jsonRepair.js';

test('repairAndParseJson handles fenced JSON with trailing prose', () => {
  const raw = [
    '```json',
    '{',
    '  "title": "Deck",',
    '  "slides": [{"id": 1, "type": "title", "title": "Hello"}],',
    '}',
    '```',
    'extra text',
  ].join('\n');

  const parsed = repairAndParseJson(raw);
  assert.equal(parsed.title, 'Deck');
  assert.equal(parsed.slides[0].title, 'Hello');
});

test('repairAndParseJson repairs single quotes and missing closers', () => {
  const parsed = repairAndParseJson("{title:'Deck', slides:[{id:1,type:'title',title:'Hello'}");
  assert.equal(parsed.title, 'Deck');
  assert.equal(parsed.slides[0].type, 'title');
});



