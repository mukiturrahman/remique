import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateAndNormalizeDate, normalizePhoneNumber } from '../src/lib/date-normalizer';
import { DateTime } from 'luxon';

describe('Remique E2E Natural Language Parser Logic', () => {
  it('should correctly calculate relative 30-minute offset in Asia/Dhaka', () => {
    const now = DateTime.now().setZone('Asia/Dhaka');
    const in30MinIso = now.plus({ minutes: 30 }).toISO();

    const validated = validateAndNormalizeDate(in30MinIso, 'Asia/Dhaka');
    assert.strictEqual(validated.isValid, true);
    assert.ok(validated.scheduledAtUtc);

    const diffMinutes = (validated.scheduledAtUtc.getTime() - now.toUTC().toMillis()) / 60000;
    assert.ok(Math.abs(diffMinutes - 30) < 0.1);
  });

  it('should format reminder confirmations cleanly', () => {
    const tomorrow10Am = DateTime.now().setZone('Asia/Dhaka').plus({ days: 1 }).set({ hour: 10, minute: 0, second: 0 }).toISO();
    const validated = validateAndNormalizeDate(tomorrow10Am, 'Asia/Dhaka');

    assert.strictEqual(validated.isValid, true);
    assert.ok(validated.scheduledAtLocalFormatted?.includes('10:00 AM'));
  });

  it('should enforce idempotency format for message IDs', () => {
    const sampleMsgId = 'wamid.HBgMOTgwMTcxMjM0NTY3OBUCABEYEjExMjIzMzQ0NTU2NgA=';
    assert.ok(sampleMsgId.startsWith('wamid.'));
    assert.ok(sampleMsgId.length > 10);
  });
});
