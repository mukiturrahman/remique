import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { DateTime } from 'luxon';
import { Receiver } from '@upstash/qstash';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('upstash-signature');

    // Verify QStash cryptographic signature if keys are configured
    if (env.QSTASH_CURRENT_SIGNING_KEY && signature) {
      const receiver = new Receiver({
        currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY || env.QSTASH_CURRENT_SIGNING_KEY,
      });

      const isValid = await receiver.verify({
        signature,
        body: rawBody,
        url: request.url,
      });

      if (!isValid) {
        console.error('[Remique] QStash signature verification failed');
        return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
      }
    }

    const { reminderId } = JSON.parse(rawBody) as { reminderId: string };
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

    if (isWithin24h) {
      // Send free-form text inside 24h window
      await sendWhatsAppMessage(
        reminder.user.phoneNumber,
        `🔔 *Remique Reminder:*\n${reminder.title}`
      );
    } else {
      // Send approved Utility Template outside 24h window
      await sendWhatsAppTemplate(
        reminder.user.phoneNumber,
        'reminder_alert',
        'en',
        [reminder.title]
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
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
