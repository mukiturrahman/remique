import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  resolveListedReminderIds,
  positionProblemMessage,
} from '../src/lib/reminder-service';

/** Minimal stand-in for the ConversationState row the list flow parks. */
function listState(ids: string[]) {
  return {
    userId: 'u1',
    pendingIntent: 'reminder_list',
    pendingData: { reminderIds: ids },
    expiresAt: new Date(Date.now() + 60_000),
    updatedAt: new Date(),
  } as any;
}

describe('resolveListedReminderIds', () => {
  test('resolves a position against the list that was shown', () => {
    const r = resolveListedReminderIds(listState(['a', 'b', 'c']), [2]);
    assert.deepEqual(r, { kind: 'resolved', ids: ['b'] });
  });

  test('no position given is distinct from a failure', () => {
    assert.deepEqual(resolveListedReminderIds(listState(['a']), null), { kind: 'none' });
    assert.deepEqual(resolveListedReminderIds(listState(['a']), []), { kind: 'none' });
  });

  // Regression: a one-item list plus "the 2nd one" used to fall through to
  // "cancel the most recently created reminder" and destroyed the only row.
  test('out of range never degrades into another row', () => {
    const r = resolveListedReminderIds(listState(['only']), [2]);
    assert.deepEqual(r, { kind: 'out_of_range', available: 1 });
  });

  // Regression: with no parked list, "the 2nd one" fell through to a category
  // sweep and cancelled every meeting.
  test('a position with no list to resolve against is refused', () => {
    assert.deepEqual(resolveListedReminderIds(null, [2]), { kind: 'no_list' });
    assert.deepEqual(
      resolveListedReminderIds({ pendingIntent: 'label_document', pendingData: {} } as any, [2]),
      { kind: 'no_list' }
    );
    assert.deepEqual(resolveListedReminderIds(listState([]), [1]), { kind: 'no_list' });
  });

  test('keeps the valid positions when only some are out of range', () => {
    const r = resolveListedReminderIds(listState(['a', 'b']), [1, 7]);
    assert.deepEqual(r, { kind: 'resolved', ids: ['a'] });
  });

  test('non-integers are ignored rather than throwing', () => {
    assert.deepEqual(resolveListedReminderIds(listState(['a']), [1.5 as any]), { kind: 'none' });
  });
});

describe('positionProblemMessage', () => {
  test('only failures produce a message', () => {
    assert.equal(positionProblemMessage({ kind: 'none' }, 'cancel'), null);
    assert.equal(positionProblemMessage({ kind: 'resolved', ids: ['a'] }, 'cancel'), null);
  });

  test('a single-item list says there is no second one', () => {
    const msg = positionProblemMessage({ kind: 'out_of_range', available: 1 }, 'cancel');
    assert.match(msg!, /only 1|no second/i);
  });

  test('a longer list reports how many there are', () => {
    const msg = positionProblemMessage({ kind: 'out_of_range', available: 4 }, 'cancel');
    assert.match(msg!, /4/);
  });

  test('missing list asks to see them first, using the verb given', () => {
    assert.match(positionProblemMessage({ kind: 'no_list' }, 'move')!, /show them first[\s\S]*move/i);
  });
});
