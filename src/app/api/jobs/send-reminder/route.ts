import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage, sendWhatsAppTemplate, WhatsAppApiError } from '@/lib/whatsapp';
import { DateTime } from 'luxon';
import { verifyQStashRequest } from '@/lib/qstash';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let reminderId: string | undefined;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('upstash-signature');

    const auth = await verifyQStashRequest(signature, rawBody, request.url);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = JSON.parse(rawBody) as { reminderId: string };
    reminderId = parsed.reminderId;

    if (!reminderId) {
      return NextResponse.json({ error: 'Missing reminderId' }, { status: 400 });
    }

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { user: true },
    });

    if (!reminder || reminder.status === 'SENT' || reminder.status === 'CANCELLED') {
      return NextResponse.json({ status: 'already_completed' }, { status: 200 });
    }

    // Claim the reminder atomically. The sweeper can re-enqueue a delivery that
    // QStash also still holds, so two workers may race for the same row — the
    // conditional update guarantees only one of them sends.
    const claim = await prisma.reminder.updateMany({
      where: { id: reminderId, status: 'SCHEDULED' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    if (claim.count === 0) {
      return NextResponse.json({ status: 'not_claimable' }, { status: 200 });
    }

    // Check 24-Hour Customer Service Window
    const lastInbound = await prisma.message.findFirst({
      where: { userId: reminder.userId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    });

    const isWithin24h =
      lastInbound &&
      DateTime.now().diff(DateTime.fromJSDate(lastInbound.createdAt), 'hours').hours < 24;

    // ─────────────────────────────────────────────────────────────────
    // Send the reminder — handle delivery failure gracefully
    // ─────────────────────────────────────────────────────────────────
    try {
      if (isWithin24h) {
        await sendWhatsAppMessage(
          reminder.user.phoneNumber,
          `🔔 *Remique Reminder:*\n${reminder.title}`
        );
      } else {
        await sendWhatsAppTemplate(
          reminder.user.phoneNumber,
          'reminder_alert',
          'en',
          [reminder.title]
        );
      }
    } catch (sendError: any) {
      const failureClass =
        sendError instanceof WhatsAppApiError ? sendError.failureClass : 'transient';
      const errorMessage = sendError.message?.slice(0, 500) ?? 'Unknown delivery error';

      console.error(
        `[Remique] Failed to deliver reminder ${reminderId} class=${failureClass}: ${sendError.message}`
      );

      // Only a genuinely bad request is terminal. Transient and operator
      // failures go back to SCHEDULED so the sweeper can retry them once the
      // rate limit clears or the credentials are fixed. The attempts counter
      // bounds how long that goes on.
      await prisma.reminder.update({
        where: { id: reminderId },
        data:
          failureClass === 'permanent'
            ? { status: 'FAILED', errorMessage }
            : { status: 'SCHEDULED', qstashMessageId: null, errorMessage },
      });

      if (failureClass === 'operator') {
        console.error(
          '[Remique] ACTION REQUIRED: reminder delivery rejected by Meta. ' +
            'Reminder left SCHEDULED for the sweeper to retry.'
        );
        return NextResponse.json({ status: 'operator_action_required' }, { status: 200 });
      }

      if (failureClass === 'permanent') {
        return NextResponse.json({ status: 'delivery_failed', error: errorMessage }, { status: 200 });
      }

      return NextResponse.json({ status: 'delivery_failed', error: errorMessage }, { status: 500 });
    }

    // Mark as SENT
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    console.log(`[Remique] Reminder successfully delivered: ${reminderId}`);
    return NextResponse.json({ status: 'sent', reminderId }, { status: 200 });
  } catch (error: any) {
    console.error('[Remique] Error dispatching scheduled reminder:', error);

    // Always clean up stuck PROCESSING records in the outer catch
    if (reminderId) {
      try {
        await prisma.reminder.update({
          where: { id: reminderId },
          data: {
            status: 'FAILED',
            errorMessage: error.message?.slice(0, 500) ?? 'Unexpected error',
          },
        });
      } catch (dbError) {
        console.error('[Remique] Failed to mark reminder as FAILED in DB:', dbError);
      }
    }

    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
