import { User } from '@prisma/client';
import { prisma } from './db';
import { parseReminderWithGemini } from './gemini';
import { validateAndNormalizeDate } from './date-normalizer';
import { scheduleDelayedReminder } from './qstash';
import { sendWhatsAppMessage } from './whatsapp';
import { DateTime } from 'luxon';

export async function processIncomingUserMessage(user: User, userMessage: string) {
  // 1. Check for active pending conversation state (e.g. clarification)
  const activeState = await prisma.conversationState.findFirst({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  // 2. Extract structured entities with Gemini
  const geminiResult = await parseReminderWithGemini(
    userMessage,
    user.timezone,
    activeState?.pendingData
  );

  // ─── Flow A: Clarification Required ────────────────────────────────
  if (geminiResult.needs_clarification || geminiResult.intent === 'clarification_required') {
    await prisma.conversationState.upsert({
      where: { userId: user.id },
      update: {
        pendingIntent: 'create_reminder',
        pendingData: { partialTitle: geminiResult.title, userMessage },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
      },
      create: {
        userId: user.id,
        pendingIntent: 'create_reminder',
        pendingData: { partialTitle: geminiResult.title, userMessage },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
      },
    });

    const question = geminiResult.clarification_question || 'What time should Remique remind you?';
    await sendWhatsAppMessage(user.phoneNumber, question);
    return;
  }

  // ─── Flow B: Create Reminder ────────────────────────────────────────
  if (geminiResult.intent === 'create_reminder' && geminiResult.scheduled_iso) {
    const validated = validateAndNormalizeDate(geminiResult.scheduled_iso, user.timezone);

    if (!validated.isValid) {
      await sendWhatsAppMessage(
        user.phoneNumber,
        `⚠️ ${validated.errorMessage || 'Invalid reminder time.'}`
      );
      return;
    }

    const title = geminiResult.title || 'Reminder';

    // Persist reminder in Database
    const reminder = await prisma.reminder.create({
      data: {
        userId: user.id,
        title,
        originalMessage: userMessage,
        scheduledAt: validated.scheduledAtUtc!,
        timezone: user.timezone,
        status: 'SCHEDULED',
      },
    });

    // Schedule delayed HTTP webhook with Upstash QStash.
    // A null id means the reminder is beyond QStash's holding window — the row
    // stays SCHEDULED and the sweeper enqueues it once it comes into range.
    try {
      const qstashMsgId = await scheduleDelayedReminder(reminder.id, validated.scheduledAtUtc!);
      if (qstashMsgId) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { qstashMessageId: qstashMsgId },
        });
      } else {
        console.log(
          `[Remique] Reminder ${reminder.id} is beyond the QStash window — deferred to the sweeper.`
        );
      }
    } catch (schedErr: any) {
      console.error('[Remique] QStash scheduling error:', schedErr.message);
      // Mark as FAILED so the stuck record is visible for debugging
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED', errorMessage: schedErr.message?.slice(0, 500) },
      });
      await sendWhatsAppMessage(
        user.phoneNumber,
        `⚠️ Sorry, I couldn't schedule your reminder due to a technical issue. Please try again.`
      );
      return;
    }

    // Clear any active pending conversation state
    await prisma.conversationState.deleteMany({ where: { userId: user.id } });

    // Send instant confirmation
    const confirmMsg =
      geminiResult.confirmation_phrase ||
      `Done! 🔔 Remique will remind you on ${validated.scheduledAtLocalFormatted} to *${title}*.`;

    await sendWhatsAppMessage(user.phoneNumber, confirmMsg);
    return;
  }

  // ─── Flow C: List Reminders ─────────────────────────────────────────
  if (geminiResult.intent === 'list_reminders') {
    const upcoming = await prisma.reminder.findMany({
      where: {
        userId: user.id,
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    if (upcoming.length === 0) {
      await sendWhatsAppMessage(user.phoneNumber, "You don't have any upcoming reminders! 🗓️");
      return;
    }

    const listText = upcoming
      .map((r, i) => {
        const local = DateTime.fromJSDate(r.scheduledAt).setZone(user.timezone);
        return `${i + 1}. *${r.title}* — ${local.toFormat('ccc, LLL d @ h:mm a')}`;
      })
      .join('\n');

    await sendWhatsAppMessage(user.phoneNumber, `📋 *Your Upcoming Reminders:*\n\n${listText}`);
    return;
  }

  // ─── Flow D: Cancel Reminder ─────────────────────────────────────────
  if (geminiResult.intent === 'cancel_reminder') {
    // Find the most recently created SCHEDULED reminder
    const latestReminder = await prisma.reminder.findFirst({
      where: {
        userId: user.id,
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestReminder) {
      await sendWhatsAppMessage(
        user.phoneNumber,
        "You don't have any upcoming reminders to cancel. 🗓️"
      );
      return;
    }

    await prisma.reminder.update({
      where: { id: latestReminder.id },
      data: { status: 'CANCELLED' },
    });

    const local = DateTime.fromJSDate(latestReminder.scheduledAt).setZone(user.timezone);
    await sendWhatsAppMessage(
      user.phoneNumber,
      `✅ Done! I've cancelled your reminder:\n*${latestReminder.title}* — ${local.toFormat("ccc, LLL d 'at' h:mm a")}`
    );
    return;
  }

  // ─── Flow E: Unknown / Greeting Fallback ────────────────────────────
  await sendWhatsAppMessage(
    user.phoneNumber,
    `Hi! I'm *Remique* 🔔 — your AI reminder assistant.\n\nTry sending:\n• _"Remind me tomorrow at 10 AM to call Aovin"_\n• _"Kalke shokal 10 tay meeting er reminder dao"_\n• _"Remind me in 30 minutes to check the oven"_\n• _"Show my reminders"_\n• _"Cancel my last reminder"_`
  );
}
