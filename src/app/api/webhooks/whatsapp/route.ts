import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { processIncomingUserMessage } from '@/lib/reminder-service';
import { normalizePhoneNumber } from '@/lib/date-normalizer';
import { createHmac, timingSafeEqual } from 'crypto';

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

    // Step A: Idempotency Check (prevent duplicate webhook processing)
    const existingMessage = await prisma.message.findUnique({
      where: { whatsappMessageId },
    });

    if (existingMessage) {
      console.log(`[Remique] Duplicate message dropped: ${whatsappMessageId}`);
      return NextResponse.json({ status: 'duplicate_dropped' }, { status: 200 });
    }

    // Step B: Upsert User Profile
    const user = await prisma.user.upsert({
      where: { whatsappId: rawSenderNumber },
      update: {
        name: profileName,
        phoneNumber: formattedPhoneNumber,
      },
      create: {
        whatsappId: rawSenderNumber,
        phoneNumber: formattedPhoneNumber,
        name: profileName,
        timezone: 'Asia/Dhaka',
      },
    });

    // Step C: Persist Message Record (without raw payload to save storage)
    await prisma.message.create({
      data: {
        userId: user.id,
        whatsappMessageId,
        direction: 'INBOUND',
        messageText,
      },
    });

    // Step D: Process reminder NLP & QStash asynchronously
    await processIncomingUserMessage(user, messageText);

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('[Remique] Webhook handler error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
