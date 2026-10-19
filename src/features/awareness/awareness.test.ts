import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AWARENESS_SLIDES, FORBIDDEN_COPY_TERMS } from './slides';

test('awareness carousel has multiple complete slides', () => {
  assert.ok(AWARENESS_SLIDES.length >= 5);
  for (const slide of AWARENESS_SLIDES) {
    assert.ok(slide.title.trim().length > 0);
    assert.ok(slide.body.trim().length > 0);
  }
});

test('awareness copy covers the key risks', () => {
  const text = AWARENESS_SLIDES.map(
    (slide) => `${slide.title} ${slide.body} ${(slide.points ?? []).join(' ')}`,
  )
    .join(' ')
    .toLowerCase();

  assert.ok(text.includes('kit darurat'));
  assert.ok(text.includes('kata sandi'));
  assert.ok(text.includes('apk'));
  assert.ok(text.includes('toko resmi') || text.includes('google play'));
});

test('awareness copy never leaks technical or infrastructure terms', () => {
  const text = AWARENESS_SLIDES.map(
    (slide) => `${slide.title} ${slide.body} ${(slide.points ?? []).join(' ')}`,
  )
    .join(' ')
    .toLowerCase();

  for (const term of FORBIDDEN_COPY_TERMS) {
    assert.ok(!text.includes(term), `copy must not contain "${term}"`);
  }
});
