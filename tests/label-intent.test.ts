import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  AWAITING_REQUEST,
  BUTTON_LABEL_ELSE,
  BUTTON_LABEL_NAME,
  BUTTON_LABEL_REQUEST,
  LABEL_DOCUMENT,
  LABEL_OR_REQUEST,
  chosenLabel,
  decideLabelReply,
  describePendingContext,
  labelChoiceButtons,
  labelClarificationFallback,
  looksLikeLabel,
  parseLabelButton,
  requestButtonTitle,
  resolveLabelChoice,
} from '../src/lib/label-intent';

const DOC = '79faa776-7f93-4ffa-b3e5-bf698b746abf';

describe('looksLikeLabel', () => {
  test('accepts plain names', () => {
    for (const text of [
      'passport',
      'watch pic',
      'NID front',
      'electricity bill sept',
      'call it watch pic',
      'save this as passport',
      'this is my passport',
      'eta amar NID',
      '"Tin certificate"',
    ]) {
      assert.ok(looksLikeLabel(text), text);
    }
  });

  test('rejects requests, questions and chatter', () => {
    for (const text of [
      'remind me to repair my watch',
      'i well replr it tomorrow',
      'i will repair it tomorrow',
      'what is on today?',
      'set a reminder at 5pm',
      'cancel my 5pm',
      'kalke 10 tay mone koriye dio',
      'send me my passport',
      'ok',
      'yes',
    ]) {
      assert.ok(!looksLikeLabel(text), text);
    }
  });

  test('rejects long sentences', () => {
    assert.ok(!looksLikeLabel('the receipt from the watch shop in dhanmondi near the mall'));
  });
});

describe('decideLabelReply', () => {
  // Regression for the screenshot: the reply to "what should I call this?"
  // was a reminder request, and it was saved as the image's name.
  test('a reminder request is never saved as the name', () => {
    const decision = decideLabelReply(
      { intent: 'create_reminder', label_reply: null, document_label: null },
      'remind me to repair my watch'
    );
    assert.deepEqual(decision, { kind: 'ask' });
  });

  test('a command is asked about even when the model calls it a name', () => {
    const decision = decideLabelReply(
      { intent: 'save_document', label_reply: 'name', document_label: 'watch' },
      'remind me to repair my watch'
    );
    assert.deepEqual(decision, { kind: 'ask' });
  });

  test('other_request and unclear verdicts ask', () => {
    for (const label_reply of ['other_request', 'unclear'] as const) {
      const decision = decideLabelReply(
        { intent: 'general_reply', label_reply, document_label: null },
        'i will repair it tomorrow'
      );
      assert.deepEqual(decision, { kind: 'ask' }, label_reply);
    }
  });

  test('an explicit naming uses the cleaned name', () => {
    const decision = decideLabelReply(
      { intent: 'save_document', label_reply: 'name', document_label: 'watch pic' },
      'call it watch pic'
    );
    assert.deepEqual(decision, { kind: 'name', label: 'watch pic' });
  });

  test('a one-word name still works when the model skips the verdict', () => {
    const decision = decideLabelReply(
      { intent: 'general_reply', label_reply: null, document_label: null },
      'passport'
    );
    assert.deepEqual(decision, { kind: 'name', label: 'passport' });
  });

  test('once they chose to name it, an odd-looking name is taken', () => {
    // Without this, "tomorrow's ticket" trips the request checks and loops the
    // user back into the question they just answered.
    const decision = decideLabelReply(
      { intent: 'general_reply', label_reply: 'unclear', document_label: null },
      "tomorrow's ticket",
      true
    );
    assert.deepEqual(decision, { kind: 'name', label: "tomorrow's ticket" });
  });

  test('once they chose to name it, a clear new request still asks', () => {
    const decision = decideLabelReply(
      { intent: 'create_reminder', label_reply: 'other_request', document_label: null },
      'remind me at 5pm',
      true
    );
    assert.deepEqual(decision, { kind: 'ask' });
  });
});

describe('resolveLabelChoice', () => {
  test("the model's choice wins", () => {
    assert.equal(resolveLabelChoice({ label_choice: 'name_file' }, true), 'name_file');
  });

  test('a bare yes with no verdict agrees to the request', () => {
    assert.equal(resolveLabelChoice({ label_choice: null }, true), 'do_request');
  });

  test('anything else with no verdict is handled fresh', () => {
    assert.equal(resolveLabelChoice({ label_choice: null }, false), 'something_else');
  });
});

describe('chosenLabel', () => {
  test('pointing at the file is not a name', () => {
    for (const text of ['the image', 'image', 'it', 'the photo', '']) {
      assert.equal(chosenLabel(text), null, text);
    }
    assert.equal(chosenLabel(null), null);
  });

  test('strips naming filler', () => {
    assert.equal(chosenLabel('call it watch receipt'), 'watch receipt');
  });
});

describe('labelChoiceButtons', () => {
  test('offers the request, naming, and something else', () => {
    const buttons = labelChoiceButtons(DOC, 'Set reminder', 'image');
    assert.deepEqual(
      buttons.map((b) => b.title),
      ['Set reminder', 'Name the image', 'Something else']
    );
  });

  test('drops the request button when there is nothing to offer', () => {
    const buttons = labelChoiceButtons(DOC, null, 'document');
    assert.deepEqual(
      buttons.map((b) => b.title),
      ['Name the file', 'Something else']
    );
  });

  // Meta rejects the whole message over 20 characters, so the question would
  // never arrive.
  test('titles stay within the 20-character limit', () => {
    for (const b of labelChoiceButtons(DOC, 'A very long request button title', 'image')) {
      assert.ok(b.title.length <= 20, `${b.title} is ${b.title.length} chars`);
    }
  });

  test('ids round-trip to their action and document', () => {
    const [request, name, other] = labelChoiceButtons(DOC, 'Set reminder', 'image');
    assert.deepEqual(parseLabelButton(request.id), { action: BUTTON_LABEL_REQUEST, documentId: DOC });
    assert.deepEqual(parseLabelButton(name.id), { action: BUTTON_LABEL_NAME, documentId: DOC });
    assert.deepEqual(parseLabelButton(other.id), { action: BUTTON_LABEL_ELSE, documentId: DOC });
  });
});

describe('parseLabelButton', () => {
  test('ignores reminder buttons so they keep their own handler', () => {
    assert.equal(parseLabelButton(`done:${DOC}`), null);
    assert.equal(parseLabelButton(`snooze60:${DOC}`), null);
  });

  test('ignores a label action with no document', () => {
    assert.equal(parseLabelButton(BUTTON_LABEL_REQUEST), null);
  });
});

describe('requestButtonTitle', () => {
  test("uses the model's title when it fits", () => {
    assert.equal(
      requestButtonTitle({ intent: 'create_reminder', request_button_title: 'Remind me' }),
      'Remind me'
    );
  });

  test('falls back to the intent when the title is too long or missing', () => {
    assert.equal(
      requestButtonTitle({
        intent: 'create_reminder',
        request_button_title: 'Set a reminder to repair the watch',
      }),
      'Set reminder'
    );
    assert.equal(
      requestButtonTitle({ intent: 'save_note', request_button_title: null }),
      'Save note'
    );
  });

  test('offers nothing for plain chat', () => {
    assert.equal(requestButtonTitle({ intent: 'general_reply', request_button_title: null }), null);
  });
});

describe('labelClarificationFallback', () => {
  test("mirrors the user's words and lists the options", () => {
    const text = labelClarificationFallback('remind me to repair my watch', 'image', true);
    assert.match(text, /"remind me to repair my watch"/);
    assert.match(text, /name the image/);
    assert.match(text, /something else/);
  });
});

describe('describePendingContext', () => {
  test('says in words that a name is awaited', () => {
    const line = describePendingContext(LABEL_DOCUMENT, { documentId: DOC, mediaType: 'image' });
    assert.ok(line?.includes('waiting for its name'), line ?? '');
    assert.ok(line?.includes('image'), line ?? '');
    assert.ok(!line?.includes(DOC), 'the raw id tells the model nothing');
  });

  test('carries the original message into the choice question', () => {
    const line = describePendingContext(LABEL_OR_REQUEST, {
      documentId: DOC,
      mediaType: 'image',
      originalMessage: 'remind me to repair my watch',
    });
    assert.ok(line?.includes('"remind me to repair my watch"'), line ?? '');
    assert.ok(line?.includes('label_choice'), line ?? '');
  });

  test('awaiting a request is handled normally', () => {
    const line = describePendingContext(AWAITING_REQUEST, { deferredDocumentId: DOC });
    assert.ok(line?.includes('normally'), line ?? '');
  });

  test('other states keep their JSON, minus the deferred file', () => {
    const line = describePendingContext('create_reminder', {
      partialTitle: 'Call mum',
      deferredDocumentId: DOC,
    });
    assert.equal(line, 'PENDING CONTEXT: {"partialTitle":"Call mum"}');
  });

  test('nothing pending renders nothing', () => {
    assert.equal(describePendingContext(null, undefined), null);
  });
});
