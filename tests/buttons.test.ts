import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  reminderActionButtons,
  BUTTON_DONE,
  BUTTON_SNOOZE_HOUR,
  BUTTON_SNOOZE_TOMORROW,
} from '../src/lib/reminder-service';

const ID = '79faa776-7f93-4ffa-b3e5-bf698b746abf';

describe('reminderActionButtons', () => {
  test('offers exactly the three actions Meta allows', () => {
    const buttons = reminderActionButtons(ID);
    assert.equal(buttons.length, 3);
    assert.deepEqual(
      buttons.map((b) => b.title),
      ['Done', 'Remind in 1 hour', 'Remind tomorrow']
    );
  });

  // Meta rejects the whole message when a title exceeds 20 characters, rather
  // than truncating it, so the reminder would silently fail to deliver.
  test('titles stay within the 20-character limit', () => {
    for (const b of reminderActionButtons(ID)) {
      assert.ok(b.title.length <= 20, `${b.title} is ${b.title.length} chars`);
    }
  });

  test('each id carries its action and the row it applies to', () => {
    const [done, hour, tomorrow] = reminderActionButtons(ID);
    assert.equal(done.id, `${BUTTON_DONE}:${ID}`);
    assert.equal(hour.id, `${BUTTON_SNOOZE_HOUR}:${ID}`);
    assert.equal(tomorrow.id, `${BUTTON_SNOOZE_TOMORROW}:${ID}`);
  });

  // The handler splits on ":", so an action containing one would misroute the
  // tap to a different branch or a bogus reminder id.
  test('action prefixes contain no separator', () => {
    for (const action of [BUTTON_DONE, BUTTON_SNOOZE_HOUR, BUTTON_SNOOZE_TOMORROW]) {
      assert.doesNotMatch(action, /:/);
    }
  });

  test('ids round-trip back to the reminder they came from', () => {
    for (const b of reminderActionButtons(ID)) {
      const [, reminderId] = b.id.split(':');
      assert.equal(reminderId, ID);
      assert.ok(b.id.length <= 256);
    }
  });
});
