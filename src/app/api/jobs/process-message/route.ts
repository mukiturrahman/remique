import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashRequest } from '@/lib/qstash';
import { loadPipelineMessage, runMessagePipeline } from '@/lib/message-pipeline';

// Retry path only. The webhook now answers the message itself in the same
// invocation (see /api/webhooks/whatsapp), so this route runs only when that
// inline attempt failed transiently or the sweeper replayed a stuck message.
// It executes the identical pipeline, so behaviour cannot drift between them.
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

    const message = await loadPipelineMessage(messageId);

    if (!message) {
      // Nothing to retry against — ack so QStash stops.
      console.error(`[Remique] process-message: unknown messageId ${messageId}`);
      return NextResponse.json({ status: 'unknown_message' }, { status: 200 });
    }

    const result = await runMessagePipeline(message);

    // Only a transient failure is worth another QStash attempt; every other
    // outcome is acked so the retry chain stops burning its backoff schedule.
    const status = result.retryable ? 500 : 200;

    return NextResponse.json(
      { status: result.status, messageId, ...(result.error ? { error: result.error } : {}) },
      { status }
    );
  } catch (error: any) {
    console.error(
      `[Remique] process-message crashed messageId=${messageId ?? '-'} error=${error?.message}`
    );
    // Non-2xx tells QStash to retry.
    return NextResponse.json({ status: 'error', error: error?.message }, { status: 500 });
  }
}
