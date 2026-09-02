import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyQStashRequest } from '@/lib/qstash';
import { processIncomingUserMessage } from '@/lib/reminder-service';
import { WhatsAppApiError } from '@/lib/whatsapp';

// All the slow, fallible work lives here: Gemini parsing, reminder scheduling
// and the WhatsApp reply. QStash retries this with backoff, so a cold start or
// a transient upstream error no longer costs the user their reply.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let messageId: string | undefined;

  try {
    const rawBody = await request.text();
    const auth = await verifyQStashRequest(
      request.headers.get('upstash-signature'),
      rawBody,
      request.url
    );

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = JSON.parse(rawBody) as { messageId?: string };
    messageId = parsed.messageId;

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { user: true },
    });

    if (!message) {
      // Nothing to retry against — ack so QStash stops.
      console.error(`[Remique] process-message: unknown messageId ${messageId}`);
      return NextResponse.json({ status: 'unknown_message' }, { status: 200 });
    }

    if (message.processedAt) {
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    if (!message.user) {
      console.error(`[Remique] process-message: message ${messageId} has no linked user`);
      await prisma.message.update({
        where: { id: messageId },
        data: { processedAt: new Date(), processingError: 'No linked user' },
      });
      return NextResponse.json({ status: 'no_user' }, { status: 200 });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { attempts: { increment: 1 } },
    });

    await processIncomingUserMessage(message.user, message.messageText);

    // Only now is the message truly answered.
    await prisma.message.update({
      where: { id: messageId },
      data: { processedAt: new Date(), processingError: null },
    });

    return NextResponse.json({ status: 'processed', messageId }, { status: 200 });
  } catch (error: any) {
    const isPermanent = error instanceof WhatsAppApiError && !error.isRetryable;

    console.error(
      `[Remique] process-message failed messageId=${messageId ?? '-'} ` +
        `permanent=${isPermanent} error=${error?.message}`
    );

    if (messageId) {
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            processingError: error?.message?.slice(0, 500) ?? 'Unknown processing error',
            // A permanent failure (bad token, bad recipient, unapproved template)
            // will fail identically on every retry — burn it down instead of
            // making QStash grind through its backoff schedule.
            ...(isPermanent ? { processedAt: new Date() } : {}),
          },
        });
      } catch (dbError: any) {
        console.error('[Remique] Failed to record processing error:', dbError?.message);
      }
    }

    if (isPermanent) {
      return NextResponse.json({ status: 'permanent_failure' }, { status: 200 });
    }

    // Non-2xx tells QStash to retry.
    return NextResponse.json({ status: 'error', error: error?.message }, { status: 500 });
  }
}
