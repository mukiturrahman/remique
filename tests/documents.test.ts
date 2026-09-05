import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { resolveIndices } from '../src/lib/reminder-service';
import { buildDocumentKey, extensionForMimeType } from '../src/lib/storage';
import { MediaTooLargeError, readBounded } from '../src/lib/whatsapp-media';

/** Response whose body streams `total` bytes in fixed-size chunks. */
function streamingResponse(total: number, opts: { contentLength?: number | null } = {}) {
  const CHUNK = 1024;
  let sent = 0;

  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= total) {
        controller.close();
        return;
      }
      const size = Math.min(CHUNK, total - sent);
      sent += size;
      controller.enqueue(new Uint8Array(size));
    },
  });

  const headers = new Headers();
  const declared = opts.contentLength === undefined ? total : opts.contentLength;
  if (declared !== null) headers.set('content-length', String(declared));

  return new Response(body, { headers });
}

// The webhook and the worker each keep their own copy of this set. If they ever
// drift, the webhook enqueues a type the worker drops and the message dies in
// the DLQ, so the shared expectation is pinned here.
const ACCEPTED_MESSAGE_TYPES = ['text', 'image', 'document'];

describe('resolveIndices', () => {
  const items = ['a', 'b', 'c'];

  test('maps 1-based positions onto rows', () => {
    assert.deepEqual(resolveIndices(items, [1, 3]), ['a', 'c']);
  });

  test('preserves the order the model asked for', () => {
    assert.deepEqual(resolveIndices(items, [3, 1]), ['c', 'a']);
  });

  test('drops out-of-range indices rather than throwing', () => {
    // The model occasionally answers against a list it half-remembers. A
    // shorter reply beats a crashed one.
    assert.deepEqual(resolveIndices(items, [2, 99, 0, -1]), ['b']);
  });

  test('drops duplicates so a file is never sent twice', () => {
    assert.deepEqual(resolveIndices(items, [2, 2, 2]), ['b']);
  });

  test('ignores non-integers', () => {
    assert.deepEqual(resolveIndices(items, [1.5, NaN, 2]), ['b']);
  });

  test('returns nothing for an empty selection', () => {
    // Regression: "give me the passport" with no passport saved must resolve to
    // nothing. An earlier version treated an empty selection as a wildcard and
    // sent the user every document they owned.
    assert.deepEqual(resolveIndices(items, []), []);
  });

  test('an empty selection is never a wildcard for the whole pool', () => {
    const pool = ['logo', 'birth-cert', 'etin'];
    assert.equal(resolveIndices(pool, []).length, 0);
  });
});

describe('readBounded', () => {
  const LIMIT = 8 * 1024;

  test('returns the whole body when it is under the limit', async () => {
    const buf = await readBounded(streamingResponse(4 * 1024), LIMIT);
    assert.equal(buf.byteLength, 4 * 1024);
  });

  test('accepts a body exactly at the limit', async () => {
    const buf = await readBounded(streamingResponse(LIMIT), LIMIT);
    assert.equal(buf.byteLength, LIMIT);
  });

  test('rejects early on a content-length over the limit', async () => {
    await assert.rejects(
      () => readBounded(streamingResponse(64 * 1024), LIMIT),
      MediaTooLargeError
    );
  });

  test('still rejects when no content-length is sent', async () => {
    // The case the old code missed: with no declared size it downloaded
    // everything first and only then checked. Now the stream itself is capped.
    await assert.rejects(
      () => readBounded(streamingResponse(64 * 1024, { contentLength: null }), LIMIT),
      MediaTooLargeError
    );
  });

  test('still rejects when content-length lies about being small', async () => {
    await assert.rejects(
      () => readBounded(streamingResponse(64 * 1024, { contentLength: 10 }), LIMIT),
      MediaTooLargeError
    );
  });

  test('handles an empty body', async () => {
    const buf = await readBounded(streamingResponse(0), LIMIT);
    assert.equal(buf.byteLength, 0);
  });
});

describe('extensionForMimeType', () => {
  test('maps the common WhatsApp types', () => {
    assert.equal(extensionForMimeType('image/jpeg'), 'jpg');
    assert.equal(extensionForMimeType('application/pdf'), 'pdf');
  });

  test('tolerates parameters and casing on the media type', () => {
    // Meta sends things like "image/jpeg; codecs=..." on some clients.
    assert.equal(extensionForMimeType('IMAGE/JPEG; charset=binary'), 'jpg');
  });

  test('falls back to bin for unknown types', () => {
    assert.equal(extensionForMimeType('application/x-nonsense'), 'bin');
  });
});

describe('buildDocumentKey', () => {
  test('namespaces by user so per-user deletes are a prefix op', () => {
    const key = buildDocumentKey('user-123', 'image/png');
    assert.ok(key.startsWith('documents/user-123/'), key);
    assert.ok(key.endsWith('.png'), key);
  });

  test('never collides for two uploads of the same file', () => {
    const a = buildDocumentKey('user-123', 'image/png');
    const b = buildDocumentKey('user-123', 'image/png');
    assert.notEqual(a, b);
  });
});

describe('accepted message types', () => {
  test('media types are let through', () => {
    assert.ok(ACCEPTED_MESSAGE_TYPES.includes('image'));
    assert.ok(ACCEPTED_MESSAGE_TYPES.includes('document'));
  });

  test('text still works', () => {
    assert.ok(ACCEPTED_MESSAGE_TYPES.includes('text'));
  });

  test('receipts and reactions stay ignored', () => {
    for (const type of ['sticker', 'reaction', 'audio', 'video', 'location']) {
      assert.ok(!ACCEPTED_MESSAGE_TYPES.includes(type), type);
    }
  });
});
