import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { COPY, isLang, LANGS } from '../src/lib/i18n/copy';

/**
 * Values that are the same string in both languages on purpose: product names,
 * the language codes on the toggle itself, and the Banglish demo input that is
 * meant to stay Banglish whichever language the page is in.
 */
const SHARED_PATHS = new Set([
  'lang.en',
  'lang.bn',
  'loop.sample',
  'loop.time',
  'loop.timezone',
  'pricing.tier',
  'pricing.planName',
]);

type Node = unknown;

function walk(en: Node, bn: Node, path: string, visit: (path: string, en: string, bn: string) => void) {
  if (typeof en === 'string') {
    assert.equal(typeof bn, 'string', `${path}: bn is not a string`);
    visit(path, en, bn as string);
    return;
  }

  if (Array.isArray(en)) {
    assert.ok(Array.isArray(bn), `${path}: bn is not an array`);
    assert.equal(
      (bn as unknown[]).length,
      en.length,
      `${path}: bn has ${(bn as unknown[]).length} entries, en has ${en.length}`,
    );
    en.forEach((item, i) => walk(item, (bn as unknown[])[i], `${path}.${i}`, visit));
    return;
  }

  const enKeys = Object.keys(en as object).sort();
  const bnKeys = Object.keys(bn as object).sort();
  assert.deepEqual(bnKeys, enKeys, `${path}: key sets differ`);
  for (const key of enKeys) {
    const next = path ? `${path}.${key}` : key;
    walk((en as Record<string, Node>)[key], (bn as Record<string, Node>)[key], next, visit);
  }
}

describe('landing page copy', () => {
  test('bn mirrors en key for key, including array lengths', () => {
    let leaves = 0;
    walk(COPY.en, COPY.bn, '', () => {
      leaves += 1;
    });
    assert.ok(leaves > 100, `expected the dictionary to have real content, walked ${leaves} strings`);
  });

  test('no bn value is left as its english source', () => {
    const untranslated: string[] = [];
    walk(COPY.en, COPY.bn, '', (path, en, bn) => {
      // headlinePrefix is empty in Bangla by design: the verb phrase moves to
      // the suffix, so there is nothing to put before the rotating noun.
      if (path === 'hero.headlinePrefix') return;
      if (SHARED_PATHS.has(path)) return;
      if (en === bn) untranslated.push(path);
    });
    assert.deepEqual(untranslated, []);
  });

  test('bangla headline is a complete sentence without the prefix', () => {
    assert.equal(COPY.bn.hero.headlinePrefix, '');
    assert.ok(COPY.bn.hero.headlineSuffix.length > 0);
    assert.ok(COPY.en.hero.headlinePrefix.length > 0);
  });

  test('bangla is the first language offered', () => {
    assert.deepEqual(LANGS, ['bn', 'en']);
  });

  test('isLang rejects anything that is not a supported language', () => {
    assert.ok(isLang('bn'));
    assert.ok(isLang('en'));
    assert.ok(!isLang('fr'));
    assert.ok(!isLang(null));
    assert.ok(!isLang(undefined));
  });
});
