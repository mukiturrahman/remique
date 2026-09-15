import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { deliveryMessage, doneMessage, snoozeMessage, shortName } from '../src/lib/reminder-voice';

const base = {
  id: 'r1', title: 'take a shower', category: 'TASK',
  anchorAt: null as Date | null, anchorTitle: null as string | null,
  offsetMinutes: null as number | null,
};

describe('shortName', () => {
  test('addresses people by first name only', () => {
    assert.equal(shortName('Mukitur Rahman Ashik'), 'Mukitur');
    assert.equal(shortName('  Ashik  '), 'Ashik');
  });

  test('falls back to nothing rather than an initial', () => {
    assert.equal(shortName(null), null);
    assert.equal(shortName(''), null);
    assert.equal(shortName('A'), null);
  });
});

describe('deliveryMessage', () => {
  test('uses the name and asks the question the buttons answer', () => {
    const out = deliveryMessage(base, 'Mukitur Rahman Ashik');
    assert.match(out, /Mukitur/);
    assert.doesNotMatch(out, /Rahman|Ashik/);
    assert.match(out, /Done or need more time\?/);
  });

  // A user with no saved name must not get "Time to shower, ." or a dangling comma.
  test('reads correctly when no name is known', () => {
    const out = deliveryMessage(base, null);
    assert.doesNotMatch(out, /,\s*\./);
    assert.doesNotMatch(out, /\s,/);
    assert.match(out, /take a shower/);
  });

  // The only thing that matters at alert time is how long until the event.
  test('an anchored alert leads with time until the event', () => {
    const out = deliveryMessage(
      { ...base, category: 'MEETING', anchorAt: new Date(),
        anchorTitle: 'Meeting with John', offsetMinutes: 15 },
      'Mukitur'
    );
    assert.match(out, /Meeting with John starts in 15 minutes/);
  });

  test('an hour reads as an hour, not sixty minutes', () => {
    const out = deliveryMessage(
      { ...base, anchorAt: new Date(), anchorTitle: 'Standup', offsetMinutes: 60 },
      null
    );
    assert.match(out, /in 1 hour/);
    assert.doesNotMatch(out, /60 minutes/);
  });

  // Same reminder, same wording — a retry or resend must not change voice.
  test('phrasing is stable for a given reminder', () => {
    const a = deliveryMessage(base, 'Mukitur');
    const b = deliveryMessage(base, 'Mukitur');
    assert.equal(a, b);
  });

  test('different reminders do not all read identically', () => {
    const seen = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((id) =>
        deliveryMessage({ ...base, id, title: 'do the thing' }, null)
      )
    );
    assert.ok(seen.size > 1, 'every reminder produced the same sentence');
  });
});

describe('doneMessage', () => {
  test('varies, so it does not read like a receipt', () => {
    const seen = new Set(Array.from({ length: 40 }, () => doneMessage('Mukitur')));
    assert.ok(seen.size > 1, 'done acknowledgement never varied');
  });

  test('always confirms the action, however it is phrased', () => {
    for (let i = 0; i < 20; i++) assert.match(doneMessage('Mukitur'), /✅/);
  });

  test('works without a name', () => {
    const out = doneMessage(null);
    assert.doesNotMatch(out, /,\s*\./);
    assert.match(out, /✅/);
  });
});

describe('snoozeMessage', () => {
  test('always says when it will come back', () => {
    for (let i = 0; i < 20; i++) {
      assert.match(snoozeMessage('Mukitur', 'today at 5:50 PM'), /today at 5:50 PM/);
    }
  });

  test('works without a name', () => {
    const out = snoozeMessage(null, 'tomorrow at 9:00 AM');
    assert.doesNotMatch(out, /,\s*\./);
    assert.match(out, /tomorrow at 9:00 AM/);
  });
});
