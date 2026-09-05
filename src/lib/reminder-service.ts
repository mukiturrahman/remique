import { ConversationState, User } from '@prisma/client';
import { prisma } from './db';
import { parseUserMessage } from './llm';
import { validateAndNormalizeDate } from './date-normalizer';
import { scheduleDelayedReminder } from './qstash';
import { sendWhatsAppMessage } from './whatsapp';
import { DateTime } from 'luxon';

export async function processIncomingUserMessage(
  user: User,
  userMessage: string,
  prefetchedState?: ConversationState | null
) {
  const activeState =
    prefetchedState !== undefined
      ? prefetchedState
      : await prisma.conversationState.findFirst({
          where: {
            userId: user.id,
            expiresAt: { gt: new Date() },
          },
        });

  // Fetch all user notes to inject as context
  const userNotes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  const notesText = userNotes.map((n) => n.content);

  const parsed = await parseUserMessage(
    userMessage,
    user.timezone,
    activeState?.pendingData,
    notesText
  );

  // ─── Flow A: Clarification Required ────────────────────────────────
  if (parsed.needs_clarification || parsed.intent === 'clarification_required') {
    await prisma.conversationState.upsert({
      where: { userId: user.id },
      update: {
        pendingIntent: 'create_reminder',
        pendingData: { partialTitle: parsed.title, userMessage },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
      },
      create: {
        userId: user.id,
        pendingIntent: 'create_reminder',
        pendingData: { partialTitle: parsed.title, userMessage },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
      },
    });

    const question = parsed.clarification_question || 'What time should Remique remind you?';
    await sendWhatsAppMessage(user.phoneNumber, question);
    return;
  }

  // ─── Flow B: Create Reminder ────────────────────────────────────────
  if (parsed.intent === 'create_reminder' && parsed.scheduled_iso) {
    const validated = validateAndNormalizeDate(parsed.scheduled_iso, user.timezone);

    if (!validated.isValid) {
      await sendWhatsAppMessage(
        user.phoneNumber,
        `⚠️ ${validated.errorMessage || 'Invalid reminder time.'}`
      );
      return;
    }

    const title = parsed.title || 'Reminder';

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

    const confirmMsg =
      parsed.reply_text ||
      `Done! 🔔 Remique will remind you on ${validated.scheduledAtLocalFormatted} to *${title}*.`;

    await sendWhatsAppMessage(user.phoneNumber, confirmMsg);

    await Promise.all([
      scheduleReminderDelivery(reminder.id, validated.scheduledAtUtc!),
      prisma.conversationState.deleteMany({ where: { userId: user.id } }),
    ]);
    return;
  }

  // ─── Flow C: List Reminders ─────────────────────────────────────────
  if (parsed.intent === 'list_reminders') {
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
  if (parsed.intent === 'cancel_reminder') {
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

  // ─── Flow E: Save Note ──────────────────────────────────────────────
  if (parsed.intent === 'save_note' && parsed.note_content) {
    await prisma.note.create({
      data: {
        userId: user.id,
        content: parsed.note_content,
      },
    });

    await sendWhatsAppMessage(
      user.phoneNumber,
      parsed.reply_text || '✅ I have saved that to your memory.'
    );
    return;
  }

  // ─── Flow F: General Reply / Knowledge Base Answer ───────────────────
  if (parsed.intent === 'general_reply' && parsed.reply_text) {
    await sendWhatsAppMessage(user.phoneNumber, parsed.reply_text);
    return;
  }

  // ─── Fallback ────────────────────────────────────────────────────────
  await sendWhatsAppMessage(
    user.phoneNumber,
    `Hi! I'm *Remique* 🔔 — your AI personal assistant.\n\nTry sending:\n• _"Remind me tomorrow at 10 AM to call Aovin"_\n• _"My wifi password is password123"_\n• _"What is my wifi password?"_\n• _"Cancel my last reminder"_`
  );
}

/**
 * Registers the delivery callback for an already-persisted reminder.
 *
 * Runs after the user has been confirmed, so it never throws: a reminder left
 * SCHEDULED with a null qstashMessageId is precisely the state the sweeper's
 * deferred pass claims, which is also how reminders beyond the QStash holding
 * window are handled. Failing here delays the schedule by one sweep, it does
 * not lose the reminder.
 */
async function scheduleReminderDelivery(reminderId: string, scheduledAtUtc: Date): Promise<void> {
  try {
    const qstashMsgId = await scheduleDelayedReminder(reminderId, scheduledAtUtc);

    if (!qstashMsgId) {
      console.log(
        `[Remique] Reminder ${reminderId} is beyond the QStash window — deferred to the sweeper.`
      );
      return;
    }

    await prisma.reminder.update({
      where: { id: reminderId },
      data: { qstashMessageId: qstashMsgId },
    });
  } catch (schedErr: any) {
    console.error(
      `[Remique] QStash scheduling error for reminder ${reminderId} ` +
        `(left for the sweeper): ${schedErr?.message}`
    );
  }
}
