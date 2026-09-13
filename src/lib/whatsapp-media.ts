import { env } from './env';
import { GRAPH_BASE, WhatsAppApiError } from './whatsapp';

/**
 * Ceiling on what we will pull into memory and push to S3.
 *
 * Meta's own limits are higher (100 MB for documents), but this runs inside the
 * SQS worker Lambda where the whole file is buffered. A user who sends a 90 MB
 * video should get a polite refusal, not an OOM kill that sends the message to
 * the DLQ and silently drops their file.
 */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

export class MediaTooLargeError extends Error {
  readonly sizeBytes: number;

  constructor(sizeBytes: number) {
    super(`Media is ${sizeBytes} bytes, over the ${MAX_MEDIA_BYTES} byte limit`);
    this.name = 'MediaTooLargeError';
    this.sizeBytes = sizeBytes;
  }
}

export interface MediaHandle {
  url: string;
  mimeType: string;
  /** null when Meta did not report a usable size. Never treated as zero. */
  sizeBytes: number | null;
  sha256?: string;
}

/**
 * Reads a response body, aborting as soon as it exceeds `limit`.
 *
 * The point is to bound memory by what we actually receive rather than by what
 * the sender claims. Meta's `file_size` is a hint, not a guarantee, and reading
 * the whole body before checking its length would mean buffering up to their
 * 100 MB ceiling to discover we did not want it.
 */
export async function readBounded(response: Response, limit: number): Promise<Buffer> {
  // Cheap pre-check. Skipped silently when absent or chunked.
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    throw new MediaTooLargeError(declared);
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;

    if (total > limit) {
      // Stop pulling bytes off the wire; we already know the answer.
      await reader.cancel().catch(() => {});
      throw new MediaTooLargeError(total);
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

/**
 * Turns a non-2xx Graph response into the same classified error the rest of the
 * WhatsApp client throws, so a bad token here is 'operator' (replayable) rather
 * than being treated as a permanent failure that loses the user's document.
 */
async function graphError(label: string, response: Response): Promise<WhatsAppApiError> {
  const rawBody = await response.text();

  let metaError: any = undefined;
  try {
    metaError = JSON.parse(rawBody)?.error;
  } catch {
    // Non-JSON body (gateway HTML, empty response) — rawBody is carried below.
  }

  console.error(
    `[Remique][WhatsApp] ${label} FAILED ` +
      `http=${response.status} ` +
      `code=${metaError?.code ?? '-'} ` +
      `type=${metaError?.type ?? '-'} ` +
      `message=${JSON.stringify(metaError?.message ?? null)} ` +
      `raw=${rawBody.slice(0, 300)}`
  );

  return new WhatsAppApiError({
    label,
    httpStatus: response.status,
    code: metaError?.code,
    subcode: metaError?.error_subcode,
    errorType: metaError?.type,
    errorMessage: metaError?.message,
    fbtraceId: metaError?.fbtrace_id,
    rawBody,
  });
}

/**
 * Resolves Meta's opaque media ID into a temporary download URL.
 *
 * The returned URL is short-lived and is NOT public — fetching it still needs
 * the access token. See `downloadMedia`.
 */
export async function getMediaHandle(mediaId: string): Promise<MediaHandle> {
  const response = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await graphError(`media-handle:${mediaId}`, response);
  }

  const body = (await response.json()) as {
    url: string;
    mime_type: string;
    file_size: number | string;
    sha256?: string;
  };

  // An absent or unparseable file_size is UNKNOWN, not zero. The previous
  // `Number(x) || 0` collapsed both into a value that always passed the check,
  // so a missing size silently bought a full download.
  const declared = Number(body.file_size);
  const sizeBytes = Number.isFinite(declared) && declared > 0 ? declared : null;

  if (sizeBytes !== null && sizeBytes > MAX_MEDIA_BYTES) {
    throw new MediaTooLargeError(sizeBytes);
  }

  if (sizeBytes === null) {
    // Not fatal — the download is bounded independently — but it means we lost
    // the cheap rejection and are about to pay for bytes to find out.
    console.warn(
      `[Remique][WhatsApp] media ${mediaId} reported no usable file_size ` +
        `(raw=${JSON.stringify(body.file_size)}); relying on the streaming limit.`
    );
  }

  return {
    url: body.url,
    mimeType: body.mime_type,
    sizeBytes,
    sha256: body.sha256,
  };
}

/**
 * Downloads the bytes behind a media handle.
 *
 * The Authorization header is required here too — this is the step that is easy
 * to get wrong, because the URL looks like a plain CDN link but returns 401
 * without the token.
 */
export async function downloadMedia(handle: MediaHandle): Promise<Buffer> {
  const response = await fetch(handle.url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await graphError('media-download', response);
  }

  // Bounded read rather than arrayBuffer(): this caps peak memory at the limit
  // itself, instead of buffering whatever Meta sends and checking afterwards.
  return readBounded(response, MAX_MEDIA_BYTES);
}

/** Convenience: resolve and download in one step. */
export async function fetchMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string; sizeBytes: number }> {
  const handle = await getMediaHandle(mediaId);
  const buffer = await downloadMedia(handle);

  return {
    buffer,
    mimeType: handle.mimeType,
    sizeBytes: buffer.byteLength,
  };
}
