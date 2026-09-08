import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import crypto from 'node:crypto';

import {
  generateRequestId,
  generateBdappsSignature,
  buildBdappsAuthorizationUrl,
} from '../src/lib/bdapps/signer';
import {
  normalizeBdPhoneNumber,
} from '../src/lib/bdapps/subscription-service';
import {
  BDAPPS_ERROR_CODES,
  BDAPPS_PLANS,
} from '../src/lib/bdapps/types';

describe('bdApps requestId generator', () => {
  test('generates exactly 15 numeric characters', () => {
    const id = generateRequestId();
    assert.equal(id.length, 15);
    assert.match(id, /^\d{15}$/);
  });

  test('formats prefix from date YYMMDDHHmmss', () => {
    const fixedDate = new Date('2026-09-08T18:45:30.123Z');
    const id = generateRequestId(fixedDate);
    assert.equal(id.length, 15);
    // 2026 -> 26, 09 -> 09, 08 -> 08, 18 -> 18, 45 -> 45, 30 -> 30 => "260908184530" (12 digits) + 3 random digits
    assert.ok(id.startsWith('260908184530'));
  });

  test('successive calls produce unique requestIds', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateRequestId());
    }
    assert.equal(ids.size, 50);
  });
});

describe('bdApps signature computation', () => {
  test('computes correct lowercase SHA-512 hex string of length 128', () => {
    const apiKey = 'test_api_key_123';
    const requestTime = '2026-09-08T18:00:00.000Z';
    const apiSecret = 'test_api_secret_456';

    const sig = generateBdappsSignature(apiKey, requestTime, apiSecret);
    assert.equal(sig.length, 128);
    assert.match(sig, /^[0-9a-f]{128}$/);

    const expected = crypto
      .createHash('sha512')
      .update(`${apiKey}|${requestTime}|${apiSecret}`, 'utf8')
      .digest('hex')
      .toLowerCase();

    assert.equal(sig, expected);
  });

  test('changes completely when any parameter changes', () => {
    const sig1 = generateBdappsSignature('keyA', '2026-09-08T18:00:00.000Z', 'secret');
    const sig2 = generateBdappsSignature('keyB', '2026-09-08T18:00:00.000Z', 'secret');
    const sig3 = generateBdappsSignature('keyA', '2026-09-08T18:00:01.000Z', 'secret');

    assert.notEqual(sig1, sig2);
    assert.notEqual(sig1, sig3);
  });
});

describe('bdApps authorization URL builder', () => {
  test('constructs valid authorization URL with required query parameters', () => {
    const res = buildBdappsAuthorizationUrl({
      apiKey: 'app_key_abc',
      apiSecret: 'secret_xyz',
      redirectUrl: 'https://remique.com/api/billing/bdapps/callback',
      requestId: '260908180000123',
      requestTime: '2026-09-08T18:00:00.000Z',
      authBaseUrl: 'https://user.bdapps.com/sdk/subscription/authorize',
    });

    assert.equal(res.requestId, '260908180000123');
    assert.equal(res.requestTime, '2026-09-08T18:00:00.000Z');
    assert.ok(res.signature.length === 128);

    const parsed = new URL(res.url);
    assert.equal(parsed.origin, 'https://user.bdapps.com');
    assert.equal(parsed.pathname, '/sdk/subscription/authorize');
    assert.equal(parsed.searchParams.get('apiKey'), 'app_key_abc');
    assert.equal(parsed.searchParams.get('requestId'), '260908180000123');
    assert.equal(parsed.searchParams.get('requestTime'), '2026-09-08T18:00:00.000Z');
    assert.equal(parsed.searchParams.get('signature'), res.signature);
    assert.equal(
      parsed.searchParams.get('redirectUrl'),
      'https://remique.com/api/billing/bdapps/callback'
    );
  });

  test('throws descriptive error if credentials are missing', () => {
    assert.throws(
      () =>
        buildBdappsAuthorizationUrl({
          apiKey: '',
          apiSecret: '',
          redirectUrl: 'https://example.com/callback',
        }),
      /Missing credentials/
    );
  });
});

describe('bdApps phone number normalization', () => {
  test('normalizes 11-digit local format 017xxxxxxxx', () => {
    const res = normalizeBdPhoneNumber('01712345678');
    assert.equal(res.raw, '8801712345678');
    assert.equal(res.formatted, '+8801712345678');
  });

  test('normalizes with country code without plus 88017xxxxxxxx', () => {
    const res = normalizeBdPhoneNumber('8801712345678');
    assert.equal(res.raw, '8801712345678');
    assert.equal(res.formatted, '+8801712345678');
  });

  test('handles spaces and dashes gracefully', () => {
    const res = normalizeBdPhoneNumber('+880 1712-345678');
    assert.equal(res.raw, '8801712345678');
    assert.equal(res.formatted, '+8801712345678');
  });
});

describe('bdApps error codes and plans dictionary', () => {
  test('contains standard E1001-E1012 error codes', () => {
    assert.ok(BDAPPS_ERROR_CODES.E1001);
    assert.ok(BDAPPS_ERROR_CODES.E1002);
    assert.ok(BDAPPS_ERROR_CODES.E1005);
    assert.ok(BDAPPS_ERROR_CODES.E1012);
  });

  test('defines weekly and monthly plans', () => {
    assert.equal(BDAPPS_PLANS.weekly.amount, 49);
    assert.equal(BDAPPS_PLANS.weekly.durationDays, 7);
    assert.equal(BDAPPS_PLANS.monthly.amount, 190);
    assert.equal(BDAPPS_PLANS.monthly.durationDays, 30);
  });
});
