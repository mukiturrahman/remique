import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { costMicrosFor, quotaVerdict } from '../src/lib/usage-pricing';

describe('costMicrosFor', () => {
  test('charges uncached input, cached input and output at their own rates', () => {
    // gpt-4.1-mini: 0.40 / 0.10 / 1.60 USD per 1M tokens.
    // (10000-4000)*0.40 + 4000*0.10 + 500*1.60 = 2400 + 400 + 800 = 3600
    const cost = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 10_000,
      cachedTokens: 4_000,
      outputTokens: 500,
    });
    assert.equal(cost, 3600);
  });

  test('returns an integer, never a float', () => {
    const cost = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 137,
      cachedTokens: 0,
      outputTokens: 41,
    });
    assert.ok(Number.isInteger(cost), `expected integer, got ${cost}`);
  });

  test('a zero-token call costs nothing', () => {
    assert.equal(
      costMicrosFor('gpt-4.1-mini', { inputTokens: 0, cachedTokens: 0, outputTokens: 0 }),
      0
    );
  });

  test('an unknown model falls back to the most expensive price, never the cheapest', () => {
    const unknown = costMicrosFor('some-future-model', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 1_000,
    });
    const cheapest = costMicrosFor('gpt-5-nano', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 1_000,
    });
    assert.ok(
      unknown > cheapest,
      'unknown models must over-estimate, so a new model cannot silently under-bill'
    );
  });

  test('a model id with a dated suffix resolves to its base price', () => {
    const dated = costMicrosFor('gpt-4.1-mini-2025-04-14', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 0,
    });
    const base = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 0,
    });
    assert.equal(dated, base);
  });

  test('cached tokens exceeding input tokens cannot produce a negative charge', () => {
    // Defensive: a provider bug or a schema change must not credit the user.
    const cost = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 100,
      cachedTokens: 500,
      outputTokens: 0,
    });
    assert.ok(cost >= 0, `expected non-negative, got ${cost}`);
  });
});

describe('quotaVerdict', () => {
  test('allows a user below both caps', () => {
    const v = quotaVerdict({ used: 10, cap: 100 }, { used: 50, cap: 700 });
    assert.equal(v.allowed, true);
    assert.equal(v.window, null);
  });

  test('blocks at exactly the cap, not one token past it', () => {
    const v = quotaVerdict({ used: 100, cap: 100 }, { used: 50, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'daily');
    assert.equal(v.used, 100);
    assert.equal(v.cap, 100);
  });

  test('reports the weekly window when only the weekly cap is crossed', () => {
    const v = quotaVerdict({ used: 10, cap: 100 }, { used: 700, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'weekly');
  });

  test('reports daily first when both are crossed, since it resets sooner', () => {
    const v = quotaVerdict({ used: 200, cap: 100 }, { used: 900, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'daily');
  });

  test('a cap of zero blocks everything', () => {
    const v = quotaVerdict({ used: 0, cap: 0 }, { used: 0, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'daily');
  });
});
