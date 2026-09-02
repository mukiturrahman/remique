import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
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

    // Atomically transition status to PROCESSING
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

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
      // Delivery failed — mark as FAILED with the error message for debugging
      console.error(`[Remique] Failed to deliver reminder ${reminderId}:`, sendError.message);
      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'FAILED',
          errorMessage: sendError.message?.slice(0, 500) ?? 'Unknown delivery error',
        },
      });
      return NextResponse.json(
        { status: 'delivery_failed', error: sendError.message },
        { status: 500 }
      );
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
