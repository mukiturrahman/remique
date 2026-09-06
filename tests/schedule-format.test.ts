import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { DateTime } from 'luxon';

import { describeOffset, buildGroupedList } from '../src/lib/reminder-service';

const TZ = 'Asia/Dhaka';

function at(offsetDays: number, hour: number, minute = 0) {
  return DateTime.now().setZone(TZ).startOf('day')
    .plus({ days: offsetDays }).set({ hour, minute }).toJSDate();
}

function row(title: string, when: Date, extra: Partial<{
  anchorAt: Date | null; offsetMinutes: number | null; recurrenceRule: string | null;
}> = {}) {
  return {
    title, scheduledAt: when,
    anchorAt: extra.anchorAt ?? null,
    offsetMinutes: extra.offsetMinutes ?? null,
    recurrenceRule: extra.recurrenceRule ?? null,
  };
}

describe('describeOffset', () => {
  test('names an alert the way the user refers to it', () => {
    assert.equal(describeOffset(15), '15 minutes before');
    assert.equal(describeOffset(30), '30 minutes before');
    assert.equal(describeOffset(60), '1 hour before');
    assert.equal(describeOffset(120), '2 hours before');
  });

  test('a standalone reminder has no offset to name', () => {
    assert.equal(describeOffset(null), null);
    assert.equal(describeOffset(0), null);
    assert.equal(describeOffset(undefined), null);
  });
});

describe('buildGroupedList', () => {
  test('groups under Today and Tomorrow headings', () => {
    const out = buildGroupedList(
      [row('Take a shower', at(0, 16, 24)), row('Meeting with John', at(1, 20))],
      TZ
    );
    assert.match(out, /\*Today \(/);
    assert.match(out, /\*Tomorrow \(/);
    assert.match(out, /Take a shower/);
  });

  test('an anchored alert shows both its time and the event time', () => {
    const out = buildGroupedList(
      [row('Meeting with John', at(1, 20), { anchorAt: at(1, 21), offsetMinutes: 60 })],
      TZ
    );
    // "8:00 PM — Meeting with John at 9:00 PM (1 hour before)"
    assert.match(out, /Meeting with John at .*9:00 PM/);
    assert.match(out, /1 hour before/);
  });

  // The invariant positional references depend on: what the user reads top to
  // bottom must be the same order parked in ConversationState. If grouping
  // ever reordered rows, "remove the 2nd one" would hit the wrong row.
  test('flattened reading order matches input order across day headings', () => {
    const rows = [
      row('first', at(0, 9)),
      row('second', at(1, 8)),
      row('third', at(1, 9)),
      row('fourth', at(3, 10)),
    ];
    const out = buildGroupedList(rows, TZ);
    const seen = out.split('\n').filter((l) => l.startsWith('• '));
    assert.equal(seen.length, 4);
    assert.deepEqual(
      seen.map((l) => l.match(/(first|second|third|fourth)/)![1]),
      ['first', 'second', 'third', 'fourth']
    );
  });

  test('a far-off day is headed by its weekday, not Today or Tomorrow', () => {
    const out = buildGroupedList([row('flight', at(4, 22))], TZ);
    assert.doesNotMatch(out, /Today|Tomorrow/);
    assert.match(out, /\*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \(/);
  });

  test('recurrence is marked so a daily habit is not read as a one-off', () => {
    const out = buildGroupedList([row('brush teeth', at(0, 10), { recurrenceRule: 'DAILY' })], TZ);
    assert.match(out, /daily/);
  });
});
