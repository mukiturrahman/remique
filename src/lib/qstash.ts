import { Client, Receiver } from '@upstash/qstash';
import { env } from './env';

let qstashInstance: Client | null = null;
let receiverInstance: Receiver | null = null;

export function getQStashClient(): Client {
  if (!qstashInstance) {
    qstashInstance = new Client({
      token: env.QSTASH_TOKEN,
    });
  }
  return qstashInstance;
}

function getReceiver(): Receiver | null {
  if (!env.QSTASH_CURRENT_SIGNING_KEY) return null;
  if (!receiverInstance) {
    receiverInstance = new Receiver({
      currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY || env.QSTASH_CURRENT_SIGNING_KEY,
    });
  }
  return receiverInstance;
}

export type QStashAuthResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Verifies that a request genuinely came from QStash.
 * Required in production; in dev it verifies only when signing keys are present,
 * so manual curl testing still works.
 */
export async function verifyQStashRequest(
  signature: string | null,
  rawBody: string,
  url: string
): Promise<QStashAuthResult> {
  const receiver = getReceiver();

  if (env.NODE_ENV === 'production') {
    if (!receiver) {
      console.error('[Remique] QSTASH_CURRENT_SIGNING_KEY is not set in production — blocking request.');
      return { ok: false, status: 500, error: 'Server misconfiguration' };
    }
    if (!signature) {
      console.warn('[Remique] Missing upstash-signature header — blocking unauthenticated request.');
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
  }

  if (!receiver || !signature) {
    // Dev only, keys or signature absent — nothing to verify against.
    return { ok: true };
  }

  try {
    const isValid = await receiver.verify({ signature, body: rawBody, url });
    if (!isValid) {
      console.error('[Remique] QStash signature verification failed');
      return { ok: false, status: 401, error: 'Invalid QStash signature' };
    }
  } catch (err: any) {
    console.error('[Remique] QStash signature verification threw:', err?.message);
    return { ok: false, status: 401, error: 'Invalid QStash signature' };
  }

  return { ok: true };
}

function resolveTargetUrl(path: string, appUrl: string): string {
  // Guard: never schedule a QStash callback to localhost — it will always fail.
  const isLocalhost =
    appUrl.includes('localhost') ||
    appUrl.includes('127.0.0.1') ||
    appUrl.includes('::1');

  if (isLocalhost) {
    throw new Error(
      `[Remique] QStash cannot deliver to a loopback address: "${appUrl}". ` +
        'Set NEXT_PUBLIC_APP_URL to your live Vercel deployment URL.'
    );
  }

  return `${appUrl.replace(/\/$/, '')}${path}`;
}

/**
 * Hands an inbound WhatsApp message to the async worker.
 * The webhook must never do Gemini/WhatsApp work inline — this is the handoff.
 */
export async function enqueueInboundMessage(
  messageId: string,
  appUrl: string = env.NEXT_PUBLIC_APP_URL
): Promise<string> {
  const response = await getQStashClient().publishJSON({
    url: resolveTargetUrl('/api/jobs/process-message', appUrl),
    body: { messageId },
    // QStash retries with exponential backoff; a transient Gemini/WhatsApp
    // failure recovers on its own instead of being lost.
    retries: 3,
    deduplicationId: `remique_msg_${messageId}`,
  });

  return response.messageId;
}

export async function scheduleDelayedReminder(
  reminderId: string,
  scheduledAtUtc: Date,
  appUrl: string = env.NEXT_PUBLIC_APP_URL
): Promise<string> {
  const notBeforeUnix = Math.floor(scheduledAtUtc.getTime() / 1000);

  const response = await getQStashClient().publishJSON({
    url: resolveTargetUrl('/api/jobs/send-reminder', appUrl),
    body: { reminderId },
    notBefore: notBeforeUnix,
    deduplicationId: `remique_${reminderId}`,
  });

  return response.messageId;
}
