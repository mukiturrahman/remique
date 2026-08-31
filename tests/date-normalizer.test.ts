import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateAndNormalizeDate, normalizePhoneNumber } from '../src/lib/date-normalizer';
import { DateTime } from 'luxon';

describe('Remique Date Normalizer & Validator', () => {
  it('should successfully validate future ISO timestamp in Asia/Dhaka', () => {
    const futureIso = DateTime.now().setZone('Asia/Dhaka').plus({ days: 1, hours: 2 }).toISO();
    const result = validateAndNormalizeDate(futureIso, 'Asia/Dhaka');

    assert.strictEqual(result.isValid, true);
    assert.ok(result.scheduledAtUtc);
    assert.ok(result.scheduledAtLocalFormatted);
  });

  it('should reject past timestamps', () => {
    const pastIso = DateTime.now().setZone('Asia/Dhaka').minus({ hours: 2 }).toISO();
    const result = validateAndNormalizeDate(pastIso, 'Asia/Dhaka');

    assert.strictEqual(result.isValid, false);
    assert.ok(result.errorMessage?.toLowerCase().includes('passed') || result.errorMessage?.toLowerCase().includes('past'));
  });

  it('should reject null or empty timestamps', () => {
    const result = validateAndNormalizeDate(null, 'Asia/Dhaka');
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errorMessage?.includes('Missing'));
  });

  it('should correctly normalize Bangladeshi phone numbers to E.164', () => {
    assert.strictEqual(normalizePhoneNumber('01712345678'), '+8801712345678');
    assert.strictEqual(normalizePhoneNumber('8801812345678'), '+8801812345678');
    assert.strictEqual(normalizePhoneNumber('+8801912345678'), '+8801912345678');
    assert.strictEqual(normalizePhoneNumber('01600000000'), '+8801600000000');
  });
});
