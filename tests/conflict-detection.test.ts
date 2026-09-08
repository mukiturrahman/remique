import test from 'node:test';
import assert from 'node:assert/strict';
import {
  conflictWarningMessage,
  conflictConfirmedMessage,
  conflictDeclinedMessage,
} from '../src/lib/reminder-voice';

test('conflict voice messages', async (t) => {
  await t.test('conflictWarningMessage formats with emotional tone, titles, and time', () => {
    const msg = conflictWarningMessage('Mukitur Rahman Ashik', 'Team Standup', 'Buy groceries', 'today at 5:00 PM');
    assert.ok(msg.includes('Team Standup'), 'Should include existing reminder title');
    assert.ok(msg.includes('Buy groceries'), 'Should include new reminder title');
    assert.ok(msg.includes('today at 5:00 PM'), 'Should include time');
    assert.ok(msg.includes('Mukitur'), 'Should use user first name');
    assert.ok(/😮|😅|👀|⏰|✨/.test(msg), 'Should include expressive emoji');
  });

  await t.test('conflictWarningMessage works when userName is null', () => {
    const msg = conflictWarningMessage(null, 'Meeting with Boss', 'Dentist', 'tomorrow at 10:00 AM');
    assert.ok(msg.includes('Meeting with Boss'));
    assert.ok(msg.includes('Dentist'));
    assert.ok(!msg.includes('null'));
  });

  await t.test('conflictConfirmedMessage confirms both reminders enthusiastically', () => {
    const msg = conflictConfirmedMessage('Ayesha', 'Team Meeting', 'Doctor Appointment', 'today at 3:00 PM');
    assert.ok(msg.includes('Doctor Appointment'));
    assert.ok(msg.includes('Team Meeting'));
    assert.ok(msg.includes('Ayesha'));
    assert.ok(/🎯|👍|⚡/.test(msg), 'Should include energetic confirmation emoji');
  });

  await t.test('conflictDeclinedMessage confirms keeping the original reminder', () => {
    const msg = conflictDeclinedMessage('Ayesha', 'Team Meeting', 'today at 3:00 PM');
    assert.ok(msg.includes('Team Meeting'));
    assert.ok(msg.includes('Ayesha'));
    assert.ok(/👍|😊/.test(msg), 'Should include friendly reassuring emoji');
  });
});
