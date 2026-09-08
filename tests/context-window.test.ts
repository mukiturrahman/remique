import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { RECENT_TURNS_LIMIT, RECENT_TURNS_MAX_AGE_MS } from '../src/lib/reminder-service';
import { buildInputText } from '../src/lib/llm';

test('RECENT_TURNS constants', async (t) => {
  await t.test('limits turns to 8 messages', () => {
    assert.equal(RECENT_TURNS_LIMIT, 8);
  });

  await t.test('limits conversation session age to 30 minutes', () => {
    assert.equal(RECENT_TURNS_MAX_AGE_MS, 30 * 60 * 1000);
  });
});

test('buildInputText prompt structure for prompt caching', async (t) => {
  const timezone = 'Asia/Dhaka';
  const baseTime = DateTime.fromISO('2026-09-09T10:00:00.000', { zone: timezone });

  const staticOptions = {
    userName: 'Ayesha',
    knownFacts: [
      {
        subject: 'me',
        predicate: 'company',
        value: 'Roveup',
        valueDate: null,
        recurring: false,
      },
    ],
    savedNotes: ['Wifi password is guest123'],
    savedDocuments: [
      {
        id: 'doc-1',
        label: 'Tin Certificate',
        mediaType: 'image',
        createdAt: new Date('2026-09-01T00:00:00Z'),
      },
    ],
    remindersToday: [
      {
        title: 'Team Standup',
        scheduledAt: new Date('2026-09-09T05:00:00Z'),
        anchorAt: null,
        offsetMinutes: null,
        category: 'MEETING',
        recurrenceRule: null,
      },
    ],
    upcomingReminders: [],
  };

  await t.test('places stable sections before dynamic temporal context', () => {
    const prompt = buildInputText('remind me at 5pm', timezone, baseTime, staticOptions);

    const userNamePos = prompt.indexOf('USER NAME: Ayesha');
    const factsPos = prompt.indexOf('KNOWN FACTS:');
    const notesPos = prompt.indexOf("USER'S SAVED NOTES:");
    const docsPos = prompt.indexOf('SAVED DOCUMENTS:');
    const remindersPos = prompt.indexOf('REMINDERS TODAY:');
    const temporalPos = prompt.indexOf('SYSTEM TEMPORAL CONTEXT:');
    const userMsgPos = prompt.indexOf('USER MESSAGE: "remind me at 5pm"');

    // All stable sections must appear in order
    assert.ok(userNamePos !== -1, 'USER NAME missing');
    assert.ok(factsPos !== -1, 'KNOWN FACTS missing');
    assert.ok(notesPos !== -1, "USER'S SAVED NOTES missing");
    assert.ok(docsPos !== -1, 'SAVED DOCUMENTS missing');
    assert.ok(remindersPos !== -1, 'REMINDERS TODAY missing');
    assert.ok(temporalPos !== -1, 'SYSTEM TEMPORAL CONTEXT missing');
    assert.ok(userMsgPos !== -1, 'USER MESSAGE missing');

    // Stable prefix must strictly precede dynamic temporal context and user message
    assert.ok(userNamePos < temporalPos, 'USER NAME should precede temporal context');
    assert.ok(factsPos < temporalPos, 'KNOWN FACTS should precede temporal context');
    assert.ok(notesPos < temporalPos, "USER'S SAVED NOTES should precede temporal context");
    assert.ok(docsPos < temporalPos, 'SAVED DOCUMENTS should precede temporal context');
    assert.ok(remindersPos < temporalPos, 'REMINDERS TODAY should precede temporal context');
    assert.ok(temporalPos < userMsgPos, 'SYSTEM TEMPORAL CONTEXT should precede USER MESSAGE');
  });

  await t.test('ensures static prefix is identical across consecutive messages (cacheable)', () => {
    const timeTurn1 = baseTime;
    const timeTurn2 = baseTime.plus({ seconds: 45 }); // 45 seconds later

    const prompt1 = buildInputText('remind me at 5pm', timezone, timeTurn1, staticOptions);
    const prompt2 = buildInputText('actually make it 6pm', timezone, timeTurn2, staticOptions);

    // Split at the dynamic section
    const prefix1 = prompt1.split('SYSTEM TEMPORAL CONTEXT:')[0];
    const prefix2 = prompt2.split('SYSTEM TEMPORAL CONTEXT:')[0];

    // The entire user profile and static context prefix MUST be byte-for-byte identical
    assert.equal(prefix1, prefix2, 'Static prompt prefix must match exactly for OpenAI prompt caching');
    assert.ok(prefix1.length > 100, 'Prefix should contain meaningful context');
  });

  await t.test('handles empty options gracefully', () => {
    const prompt = buildInputText('hello', timezone, baseTime, {});

    assert.ok(prompt.includes('USER NAME: (unknown - brand new user)'));
    assert.ok(prompt.includes('REMINDERS TODAY:\n- (nothing today)'));
    assert.ok(prompt.includes('UPCOMING REMINDERS:\n- (nothing upcoming)'));
    assert.ok(prompt.includes('USER MESSAGE: "hello"'));
  });
});
