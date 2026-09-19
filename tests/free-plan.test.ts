import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  FREE_MONTHLY_REMINDER_LIMIT,
  hasSecondBrain,
  isOwnNameFact,
  lockedFeatureFor,
  monthWindow,
  reminderAllowance,
  type LockedFeature,
} from '../src/lib/plan';
import { lockedFeatureMessage, reminderLimitMessage } from '../src/lib/plan-voice';
import type { ParsedAssistantResponse } from '../src/types/llm.types';

function parsed(overrides: Partial<ParsedAssistantResponse>): ParsedAssistantResponse {
  return { intent: 'general_reply', timezone: 'Asia/Dhaka', needs_clarification: false, ...overrides };
}

describe('hasSecondBrain', () => {
  const now = new Date('2026-09-16T12:00:00Z');

  test('free users do not have it', () => {
    assert.equal(hasSecondBrain({ planTier: 'free', planPeriod: null, planExpiresAt: null }, now), false);
  });

  test('active pro and permanent users do', () => {
    assert.equal(hasSecondBrain({ planTier: 'pro', planPeriod: 'monthly', planExpiresAt: new Date('2026-10-01') }, now), true);
    assert.equal(hasSecondBrain({ planTier: 'pro', planPeriod: 'monthly', planExpiresAt: null }, now), true);
    assert.equal(hasSecondBrain({ planTier: 'permanent', planPeriod: null, planExpiresAt: null }, now), true);
  });

  test('a lapsed pro plan does not', () => {
    assert.equal(hasSecondBrain({ planTier: 'pro', planPeriod: 'monthly', planExpiresAt: new Date('2026-09-01') }, now), false);
  });
});

describe('reminderAllowance', () => {
  test('allows up to the limit', () => {
    assert.deepEqual(reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT - 1, 1), { allowed: true, remaining: 1 });
  });

  test('refuses the reminder past the limit of the month', () => {
    assert.deepEqual(reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT, 1), { allowed: false, remaining: 0 });
  });

  // Two alerts with one left creates neither, rather than half an event.
  test('is all or nothing for a multi-alert request', () => {
    assert.deepEqual(reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT - 1, 2), { allowed: false, remaining: 1 });
  });

  test('never reports a negative remainder', () => {
    assert.equal(reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT + 4, 1).remaining, 0);
  });
});

describe('monthWindow', () => {
  // 23:30 UTC on Sep 30 is already Oct 1 in Dhaka (UTC+6).
  test('counts the month in the user timezone, not UTC', () => {
    const w = monthWindow('Asia/Dhaka', new Date('2026-09-30T23:30:00Z'));
    assert.equal(w.monthName, 'October');
    assert.equal(w.start.toISOString(), '2026-09-30T18:00:00.000Z');
    assert.equal(w.resetsOnLabel, 'Nov 1');
  });

  test('resets on the 1st of the next month', () => {
    const w = monthWindow('Asia/Dhaka', new Date('2026-09-16T06:00:00Z'));
    assert.equal(w.monthName, 'September');
    assert.equal(w.resetsOnLabel, 'Oct 1');
  });
});

describe('isOwnNameFact', () => {
  test('keeps only the user\'s own name', () => {
    assert.equal(isOwnNameFact('me', 'name'), true);
    assert.equal(isOwnNameFact('girlfriend', 'name'), false);
    assert.equal(isOwnNameFact('me', 'wifi_password'), false);
  });
});

describe('lockedFeatureFor', () => {
  test('maps second-brain intents to their feature', () => {
    assert.equal(lockedFeatureFor(parsed({ intent: 'save_note' })), 'notes');
    assert.equal(lockedFeatureFor(parsed({ intent: 'save_document' })), 'files');
    assert.equal(lockedFeatureFor(parsed({ intent: 'list_documents' })), 'documents');
    assert.equal(lockedFeatureFor(parsed({ intent: 'send_documents' })), 'documents');
    assert.equal(lockedFeatureFor(parsed({ intent: 'recall_memory' })), 'memory');
  });

  test('leaves reminders and plain chat alone', () => {
    assert.equal(lockedFeatureFor(parsed({ intent: 'create_reminder' })), null);
    assert.equal(lockedFeatureFor(parsed({ intent: 'list_reminders' })), null);
    assert.equal(lockedFeatureFor(parsed({ intent: 'general_reply' })), null);
  });

  test('a chat that teaches a fact is a memory request', () => {
    const facts = [{ subject: 'girlfriend', predicate: 'name', value: 'Ayesha', value_date: null, recurring: false }];
    assert.equal(lockedFeatureFor(parsed({ intent: 'general_reply', facts })), 'memory');
  });

  test('telling Remique your own name is not', () => {
    const facts = [{ subject: 'me', predicate: 'name', value: 'Ashik', value_date: null, recurring: false }];
    assert.equal(lockedFeatureFor(parsed({ intent: 'general_reply', facts })), null);
  });

  // The reminder is still created; the birthday fact is just not kept.
  test('a reminder that also teaches a fact is not refused', () => {
    const facts = [{ subject: 'girlfriend', predicate: 'birthday', value: '10 Sep', value_date: '2027-09-10', recurring: true }];
    assert.equal(lockedFeatureFor(parsed({ intent: 'create_reminder', facts })), null);
  });
});

describe('locked messages', () => {
  const features: LockedFeature[] = ['files', 'notes', 'documents', 'memory'];

  // Random phrasing, so sample enough to hit every variant.
  test('every locked-feature message offers the subscribe shortcut', () => {
    for (const feature of features) {
      for (let i = 0; i < 50; i++) {
        const out = lockedFeatureMessage(feature, 'Mukitur Rahman Ashik');
        assert.match(out, /\*subscribe\*/);
        assert.match(out, /Mukitur/);
        assert.match(out, /free plan/i);
      }
    }
  });

  test('names the thing that was actually attempted', () => {
    for (let i = 0; i < 50; i++) {
      assert.match(lockedFeatureMessage('files', null), /file/i);
      assert.match(lockedFeatureMessage('notes', null), /note/i);
    }
  });

  test('reads correctly with no name', () => {
    for (const feature of features) {
      for (let i = 0; i < 50; i++) {
        const out = lockedFeatureMessage(feature, null);
        assert.doesNotMatch(out, /\s,/);
        assert.doesNotMatch(out, /undefined|null/);
      }
    }
  });

  test('limit reached says when it resets', () => {
    for (let i = 0; i < 50; i++) {
      const out = reminderLimitMessage('Ashik', {
        requested: 1, remaining: 0, monthName: 'September', resetsOnLabel: 'Oct 1',
      });
      assert.match(out, new RegExp(`${FREE_MONTHLY_REMINDER_LIMIT}`));
      assert.match(out, /Oct 1/);
      assert.match(out, /\*subscribe\*/);
    }
  });

  test('with some left, says exactly how many', () => {
    for (let i = 0; i < 50; i++) {
      const out = reminderLimitMessage(null, {
        requested: 2, remaining: 1, monthName: 'September', resetsOnLabel: 'Oct 1',
      });
      assert.match(out, /got 1 left this month/);
      assert.match(out, /\*subscribe\*/);
    }
  });
});
