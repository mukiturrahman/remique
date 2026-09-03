import { NextRequest, NextResponse, after } from 'next/server';
import { Prisma } from '@prisma/client';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { enqueueInboundMessage } from '@/lib/qstash';
import { normalizePhoneNumber } from '@/lib/date-normalizer';
import { runMessagePipeline, type PipelineMessage } from '@/lib/message-pipeline';
import { createHmac, timingSafeEqual } from 'crypto';

// One invocation answers the message.
//
// Meta still gets its 200 before any slow work starts: everything before the
// response is a signature check and a single write. The Gemini call, the
// reminder row, the QStash schedule and the WhatsApp reply then run in `after()`
// — same function instance, no queue hop, no second cold start. That removes a
// whole round trip through QStash plus a cold Lambda from the user's wait.
//
// /api/jobs/process-message is still there, but only as the retry path: if the
// inline attempt fails transiently we hand the message to QStash, and the
// sweeper picks up anything that dies without either.
export const runtime = 'nodejs';
// Covers the response *and* the `after()` work, which runs inside the same
// invocation and is billed against this limit.
export const maxDuration = 60;

// ─────────────────────────────────────────────
// Helper: Validate Meta's x-hub-signature-256
// ─────────────────────────────────────────────
async function verifyMetaSignature(request: NextRequest, rawBody: string): Promise<boolean> {
  // If App Secret is not configured, skip verification in dev, block in prod.
  if (!env.WHATSAPP_APP_SECRET) {
    if (env.NODE_ENV === 'production') {
      console.error('[Remique] WHATSAPP_APP_SECRET is not set — blocking unauthenticated request.');
      return false;
    }
    console.warn('[Remique] WHATSAPP_APP_SECRET not set, skipping HMAC check (dev only).');
    return true;
  }

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature || !signature.startsWith('sha256=')) {
    console.warn('[Remique] Missing or malformed x-hub-signature-256 header.');
    return false;
  }

  const expectedHmac = createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  const expectedSignature = `sha256=${expectedHmac}`;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    // Buffers differ in length — definitely invalid
    return false;
  }
}

// ─────────────────────────────────────────────
// 1. Meta Webhook Verification Handshake (GET)
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[Remique] WhatsApp Webhook Handshake verified successfully.');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Remique] Webhook verification failed. Invalid token.');
  return new NextResponse('Forbidden', { status: 403 });
}

// ─────────────────────────────────────────────
// 2. Incoming WhatsApp Message Ingestion (POST)
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Cryptographically verify this request is genuinely from Meta
    const isAuthentic = await verifyMetaSignature(request, rawBody);
    if (!isAuthentic) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    const contact = change?.contacts?.[0];

    // If event is not an incoming text message (e.g. delivery receipt), ignore and return 200
    if (!message || message.type !== 'text') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const whatsappMessageId = message.id;
    const rawSenderNumber = message.from;
    const formattedPhoneNumber = normalizePhoneNumber(rawSenderNumber);
    const messageText = message.text?.body?.trim() || '';
    const profileName = contact?.profile?.name || 'User';

    // ─── Persist the inbound message (one round trip) ──────────────────
    // User upsert, message insert and the duplicate check used to be three
    // separate queries in front of the ack. connectOrCreate collapses the first
    // two, and the unique index on whatsappMessageId does the duplicate check
    // for free — we only pay for a lookup when it actually fires.
    const claimed = await claimInboundMessage({
      whatsappMessageId,
      rawSenderNumber,
      formattedPhoneNumber,
      messageText,
      profileName,
    });

    if (!claimed) {
      console.log(`[Remique] Duplicate message dropped: ${whatsappMessageId}`);
      return NextResponse.json({ status: 'duplicate_dropped' }, { status: 200 });
    }

    // ─── Ack Meta now, finish the reminder in this same invocation ─────
    after(() => processInline(claimed, profileName, formattedPhoneNumber));

    return NextResponse.json({ status: 'accepted', messageId: claimed.id }, { status: 200 });
  } catch (error: any) {
    // Returning 500 is deliberate: it makes Meta retry, and because the message
    // row is still unprocessed the retry now does real work instead of being
    // swallowed by the duplicate check.
    console.error('[Remique] Webhook handler error:', error?.message, error);
    return NextResponse.json(
      { status: 'error', message: error?.message },
      { status: 500 }
    );
  }
}

interface InboundMessageInput {
  whatsappMessageId: string;
  rawSenderNumber: string;
  formattedPhoneNumber: string;
  messageText: string;
  profileName: string;
}

/**
 * Writes the inbound message and returns it with its user attached.
 *
 * Returns null only for a message we have already answered. A row that exists
 * with processedAt = null means a previous attempt died before replying, so the
 * existing row is handed back and processed again — Meta's retry must not be
 * dropped as a duplicate.
 */
async function claimInboundMessage(
  input: InboundMessageInput,
  allowUserRaceRetry = true
): Promise<PipelineMessage | null> {
  try {
    return await prisma.message.create({
      data: {
        whatsappMessageId: input.whatsappMessageId,
        direction: 'INBOUND',
        messageText: input.messageText,
        user: {
          connectOrCreate: {
            where: { whatsappId: input.rawSenderNumber },
            create: {
              whatsappId: input.rawSenderNumber,
              phoneNumber: input.formattedPhoneNumber,
              name: input.profileName,
              timezone: 'Asia/Dhaka',
            },
          },
        },
      },
      include: { user: true },
    });
  } catch (error) {
    const isUniqueViolation =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isUniqueViolation) throw error;

    const existing = await prisma.message.findUnique({
      where: { whatsappMessageId: input.whatsappMessageId },
      include: { user: true },
    });

    if (existing) {
      if (existing.processedAt) return null;
      console.warn(`[Remique] Reprocessing unanswered message ${input.whatsappMessageId}`);
      return existing;
    }

    // The collision was on whatsappId, not on the message: two messages from a
    // brand new sender landed at once and both tried to create the user. The
    // user exists now, so the same insert succeeds on the second pass.
    if (allowUserRaceRetry) {
      return claimInboundMessage(input, false);
    }

    throw error;
  }
}

/**
 * The work that used to live behind QStash. Runs after the 200 is already on
 * the wire, so nothing here delays Meta.
 */
async function processInline(
  message: PipelineMessage,
  profileName: string,
  formattedPhoneNumber: string
): Promise<void> {
  try {
    // Refresh the WhatsApp profile only when it actually changed, and let it run
    // alongside the pipeline instead of in front of it.
    let profileUpdate: Promise<unknown> | null = null;
    const user = message.user;

    if (user && (user.name !== profileName || user.phoneNumber !== formattedPhoneNumber)) {
      user.name = profileName;
      user.phoneNumber = formattedPhoneNumber;
      profileUpdate = prisma.user
        .update({
          where: { id: user.id },
          data: { name: profileName, phoneNumber: formattedPhoneNumber },
        })
        .catch((err: any) =>
          console.error('[Remique] Failed to refresh user profile:', err?.message)
        );
    }

    const result = await runMessagePipeline(message);
    if (profileUpdate) await profileUpdate;

    if (result.retryable) {
      // The inline attempt hit something transient. Hand it to QStash so it gets
      // the retry chain it would have had before, instead of waiting on the
      // five-minute sweeper.
      await handOffToQStash(message.id);
    }
  } catch (error: any) {
    console.error(
      `[Remique] Inline processing crashed messageId=${message.id}: ${error?.message}`
    );
    await handOffToQStash(message.id);
  }
}

async function handOffToQStash(messageId: string): Promise<void> {
  try {
    const qstashMessageId = await enqueueInboundMessage(messageId, { replay: true });
    await prisma.message.update({
      where: { id: messageId },
      data: { qstashMessageId },
    });
    console.warn(`[Remique] Inline attempt failed — retry queued for message ${messageId}`);
  } catch (err: any) {
    // Last line of defence: the row is still unprocessed, so the sweeper will
    // replay it on its next pass.
    console.error(
      `[Remique] Could not queue retry for message ${messageId} (${err?.message}) — ` +
        'left for the sweeper.'
    );
  }
}
