import { ConversationState, Document, User } from '@prisma/client';
import { prisma } from './db';
import { parseUserMessage } from './llm';
import { validateAndNormalizeDate } from './date-normalizer';
import { cancelScheduledDelivery, scheduleDelayedReminder } from './qstash';
import { replyToUser, replyWithMedia } from './conversation-log';
import { fetchMedia, MediaTooLargeError } from './whatsapp-media';
import { putDocument, getDocumentUrl, extensionForMimeType } from './storage';
import type { PipelineMessage } from './message-pipeline';
import type { ParsedAssistantResponse } from '../types/llm.types';
import { DateTime } from 'luxon';

/**
 * How many saved documents are offered to the model as retrieval candidates.
 *
 * Bounded because every candidate is a prompt line the user pays for on every
 * single message. If someone ever stores more than this, the oldest fall out of
 * reach and this needs to become a real search rather than a bigger number.
 */
const DOCUMENT_CANDIDATE_LIMIT = 100;

/** Most files we will push into one thread in response to one request. */
const MAX_DOCUMENTS_PER_SEND = 5;

/**
 * How many stored facts and notes are injected as prompt context.
 *
 * Both were previously unbounded, which was survivable only because nothing
 * wrote to them automatically. Passive fact extraction changes that: a heavy
 * user accumulates hundreds, and every one of them would be re-sent on every
 * message. Most recent wins; beyond this it needs real retrieval, not a
 * bigger number.
 */
const FACT_LIMIT = 60;
const NOTE_LIMIT = 40;

/**
 * How many earlier messages are replayed to the model as conversation context.
 *
 * Both directions, so roughly four exchanges. Enough to resolve "another one"
 * or "make it 9pm" against what was actually said; short enough that it does
 * not crowd out KNOWN FACTS or the document list.
 */
const RECENT_TURNS_LIMIT = 8;

/**
 * Accepts a bare "yes" to a suggested document.
 *
 * The model usually returns send_documents for an agreement, but a one-word
 * reply carries almost no signal and sometimes lands as general_reply. This is
 * the deterministic backstop, not the primary path.
 */
const AFFIRMATIVE =
  /^(y|ya|yes|yeah|yep|yup|sure|ok|okay|please|send|send it|send them|do it|ha|haa|hae|hyan|hmm|accha|acha|thik|জি|হ্যাঁ|হ্যা|পাঠাও)\b/i;

/** Upper bound on one "what's coming up?" answer. */
const REMINDER_LIST_LIMIT = 10;

const REMINDER_CATEGORIES = ['MEETING', 'BIRTHDAY', 'TASK', 'HABIT', 'GENERAL'] as const;
const RECURRENCE_RULES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

type ReminderCategory = (typeof REMINDER_CATEGORIES)[number];

/** Plural nouns for the list header and the empty-state reply. */
const CATEGORY_NOUNS: Record<ReminderCategory, string> = {
  MEETING: 'meetings',
  BIRTHDAY: 'birthdays',
  TASK: 'tasks',
  HABIT: 'routines',
  GENERAL: 'reminders',
};

/**
 * The model is told to return one of a fixed set, but its output is still
 * untrusted input — an unrecognised value falls back rather than throwing.
 */
function normalizeCategory(value: unknown): ReminderCategory {
  const upper = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (REMINDER_CATEGORIES as readonly string[]).includes(upper)
    ? (upper as ReminderCategory)
    : 'GENERAL';
}

/**
 * The kinds a request is scoped to, or null for every kind.
 *
 * The user's model is flat, not nested: "reminders" and "meetings" are peers,
 * so asking about reminders must never surface a meeting. That distinction
 * lives in the prompt; this only sanitises what comes back.
 */
function normalizeCategoryFilter(value: unknown): ReminderCategory[] | null {
  if (!Array.isArray(value)) return null;

  const valid = value
    .map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : ''))
    .filter((v): v is ReminderCategory =>
      (REMINDER_CATEGORIES as readonly string[]).includes(v)
    );

  const unique = [...new Set(valid)];

  // Every kind selected is the same as no filter, and an all-garbage array
  // must not silently become "match nothing".
  if (unique.length === 0 || unique.length === REMINDER_CATEGORIES.length) return null;
  return unique;
}

/** How to name a scope in a reply: "meetings", "reminders", or "items". */
function describeCategories(categories: ReminderCategory[] | null): string {
  if (!categories) return 'reminders';
  if (categories.length === 1) return CATEGORY_NOUNS[categories[0]];

  const set = new Set(categories);
  const isPlainReminders =
    set.size === 3 && set.has('TASK') && set.has('HABIT') && set.has('GENERAL');

  return isPlainReminders ? 'reminders' : 'items';
}

function normalizeRecurrence(value: unknown): string | null {
  const upper = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (RECURRENCE_RULES as readonly string[]).includes(upper) ? upper : null;
}

/**
 * Resolves "the 2nd one" against the list the user was last shown.
 *
 * Returns a tagged result rather than null-or-ids on purpose. The three ways
 * this can fail are NOT interchangeable, and collapsing them into null is what
 * made "remove the 2nd one" destructive twice: with no parked list it swept
 * every meeting, and with a one-item list it cancelled that item. A position
 * the user named must never silently degrade into some other row.
 */
export type IndexResolution =
  | { kind: 'none' }
  | { kind: 'resolved'; ids: string[] }
  | { kind: 'no_list' }
  | { kind: 'out_of_range'; available: number };

export function resolveListedReminderIds(
  activeState: ConversationState | null,
  indices: number[] | null | undefined
): IndexResolution {
  const wanted = (indices ?? []).filter((n) => Number.isInteger(n));
  if (wanted.length === 0) return { kind: 'none' };

  if (activeState?.pendingIntent !== 'reminder_list') return { kind: 'no_list' };

  const pending = activeState.pendingData as { reminderIds?: string[] } | null;
  const ids = pending?.reminderIds ?? [];
  if (ids.length === 0) return { kind: 'no_list' };

  const picked = resolveIndices(ids, wanted);
  if (picked.length === 0) return { kind: 'out_of_range', available: ids.length };

  return { kind: 'resolved', ids: picked };
}

/**
 * What to say when a position cannot be honoured. Shared by cancel and
 * reschedule so both refuse identically instead of one of them guessing.
 */
export function positionProblemMessage(
  resolution: IndexResolution,
  verb: string
): string | null {
  if (resolution.kind === 'no_list') {
    return `I'm not sure which list you mean. Ask me to show them first, then tell me which one to ${verb}. 🗓️`;
  }

  if (resolution.kind === 'out_of_range') {
    return resolution.available === 1
      ? `There's only 1 on that list, so there's no second one. 🗓️`
      : `That list only has ${resolution.available}. Which one did you mean? 🗓️`;
  }

  return null;
}

/** Parses a model-supplied local ISO timestamp, or null if it is unusable. */
function parseFilterBound(iso: unknown, timezone: string): Date | null {
  if (typeof iso !== 'string' || !iso.trim()) return null;
  const dt = DateTime.fromISO(iso, { zone: timezone });
  return dt.isValid ? dt.toJSDate() : null;
}

export async function processIncomingUserMessage(
  user: User,
  message: PipelineMessage,
  prefetchedState?: ConversationState | null
) {
  const userMessage = message.messageText;

  const activeState =
    prefetchedState !== undefined
      ? prefetchedState
      : await prisma.conversationState.findFirst({
          where: {
            userId: user.id,
            expiresAt: { gt: new Date() },
          },
        });

  // Notes and document labels are both prompt context, so they are read
  // together — this is on the user's critical path.
  const [userNotes, userFacts, recentMessages, userDocuments] = await Promise.all([
    prisma.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: NOTE_LIMIT,
    }),
    prisma.fact.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: FACT_LIMIT,
    }),
    // The message being answered is already persisted, so it is excluded here —
    // otherwise the model sees the current question twice and treats its own
    // input as prior context.
    prisma.message.findMany({
      where: { userId: user.id, id: { not: message.id } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_TURNS_LIMIT,
      select: { direction: true, messageText: true },
    }),
    prisma.document.findMany({
      // Unlabeled rows are mid-flow uploads with no name yet. They are not
      // retrievable and must never appear as a candidate.
      where: { userId: user.id, label: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: DOCUMENT_CANDIDATE_LIMIT,
    }),
  ]);

  const notesText = userNotes.map((n) => n.content);

  const parsed = await parseUserMessage(userMessage, user.timezone, {
    pendingContext: activeState?.pendingData,
    savedNotes: notesText,
    recentTurns: recentMessages
      .slice()
      .reverse()
      .map((m) => ({
        role: m.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
        text: m.messageText,
      })),
    knownFacts: userFacts.map((f) => ({
      subject: f.subject,
      predicate: f.predicate,
      value: f.value,
      valueDate: f.valueDate,
      recurring: f.recurring,
    })),
    savedDocuments: userDocuments.map((d) => ({
      id: d.id,
      label: d.label!,
      mediaType: d.mediaType,
      createdAt: d.createdAt,
    })),
    attachedFile: message.mediaId
      ? { mediaType: message.mediaType || 'file', fileName: message.mediaFilename }
      : null,
  });

  // Flat and greppable. Without the resolved indices on the record, a wrong
  // document selection can only be diagnosed by inferring intent from the
  // order the files arrived in.
  console.log(
    `[Remique] parsed intent=${parsed.intent} ` +
      `docCandidates=${userDocuments.length} ` +
      `docIndices=${JSON.stringify(parsed.document_indices ?? null)} ` +
      `docLabel=${JSON.stringify(parsed.document_label ?? null)} ` +
      `turns=${recentMessages.length} ` +
      `facts=${parsed.facts?.length ?? 0} ` +
      `forget=${parsed.forget_facts?.length ?? 0} ` +
      `hasMedia=${Boolean(message.mediaId)}`
  );

  // Runs for every intent, before any branch returns. A message that creates a
  // reminder can also teach a birthday, and the fact must survive either way.
  await persistFacts(user.id, message.id, parsed);

  // ─── Flow G: An actual file arrived ─────────────────────────────────
  // Runs before every other branch. An uncaptioned image sets
  // needs_clarification, and without this the reminder clarification flow
  // below would swallow it and ask about a time that was never mentioned.
  if (message.mediaId) {
    await handleIncomingFile(user, message, parsed.document_label ?? null);
    return;
  }

  // ─── Flow H: The answer to "what should I call this?" ───────────────
  if (activeState?.pendingIntent === 'label_document') {
    const pending = activeState.pendingData as { documentId?: string } | null;

    if (pending?.documentId) {
      // The label is whatever they just said. Falling back to the raw message
      // matters: a one-word reply like "passport" is a perfectly good name that
      // the model sometimes returns as general_reply instead of a label.
      const label = (parsed.document_label || userMessage).trim();

      if (label) {
        await prisma.document.update({
          where: { id: pending.documentId },
          data: { label },
        });
        await prisma.conversationState.deleteMany({ where: { userId: user.id } });
        await replyToUser(user, `✅ Saved as *${label}*.`);
        return;
      }
    }
  }

  // ─── Flow J: "Yes, send that one" after a near-match offer ──────────
  if (activeState?.pendingIntent === 'confirm_documents') {
    const pending = activeState.pendingData as { documentIds?: string[] } | null;
    const ids = pending?.documentIds ?? [];
    const agreed = parsed.intent === 'send_documents' || AFFIRMATIVE.test(userMessage.trim());

    if (ids.length > 0 && agreed) {
      const byId = new Map(userDocuments.map((d) => [d.id, d]));
      const confirmed = ids.map((id) => byId.get(id)).filter((d): d is Document => Boolean(d));

      await prisma.conversationState.deleteMany({ where: { userId: user.id } });

      if (confirmed.length > 0) {
        await deliverDocuments(user, confirmed);
        return;
      }
    }
  }

  // ─── Flow I: Documents — list, then send ────────────────────────────
  if (parsed.intent === 'list_documents') {
    await handleListDocuments(user, userDocuments, parsed.document_indices ?? []);
    return;
  }

  if (parsed.intent === 'send_documents') {
    await handleSendDocuments(
      user,
      userDocuments,
      activeState,
      parsed.document_indices ?? [],
      parsed.document_suggestions ?? [],
      parsed.reply_text
    );
    return;
  }

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
    await replyToUser(user, question);
    return;
  }

  // ─── Flow B: Create Reminder ────────────────────────────────────────
  if (parsed.intent === 'create_reminder' && parsed.scheduled_iso) {
    const validated = validateAndNormalizeDate(parsed.scheduled_iso, user.timezone);

    if (!validated.isValid) {
      await replyToUser(
        user,
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
        category: normalizeCategory(parsed.category),
        recurrenceRule: normalizeRecurrence(parsed.recurrence),
        status: 'SCHEDULED',
      },
    });

    const confirmMsg =
      parsed.reply_text ||
      `Done! 🔔 Remique will remind you on ${validated.scheduledAtLocalFormatted} to *${title}*.`;

    await replyToUser(user, confirmMsg);

    await Promise.all([
      scheduleReminderDelivery(reminder.id, validated.scheduledAtUtc!),
      prisma.conversationState.deleteMany({ where: { userId: user.id } }),
    ]);
    return;
  }

  // ─── Flow C: List Reminders ─────────────────────────────────────────
  if (parsed.intent === 'list_reminders') {
    const categoryFilter = normalizeCategoryFilter(parsed.filter_categories);
    const windowStart = parseFilterBound(parsed.filter_start_iso, user.timezone);
    const windowEnd = parseFilterBound(parsed.filter_end_iso, user.timezone);
    const now = new Date();

    // A window that has already begun is clamped to now: "today" asked at 6 PM
    // means the rest of today, not this morning's reminders that already fired.
    const lowerBound = windowStart && windowStart > now ? windowStart : now;

    const upcoming = await prisma.reminder.findMany({
      where: {
        userId: user.id,
        status: 'SCHEDULED',
        scheduledAt: { gte: lowerBound, ...(windowEnd ? { lte: windowEnd } : {}) },
        ...(categoryFilter ? { category: { in: categoryFilter } } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      take: REMINDER_LIST_LIMIT,
    });

    const noun = describeCategories(categoryFilter);

    // The window is described back to the user so a filtered empty result is
    // not mistaken for "you have nothing at all".
    const windowLabel = windowEnd
      ? ` ${DateTime.fromJSDate(lowerBound).setZone(user.timezone).toFormat('LLL d')}` +
        `–${DateTime.fromJSDate(windowEnd).setZone(user.timezone).toFormat('LLL d')}`
      : '';

    if (upcoming.length === 0) {
      await replyToUser(
        user,
        `You don't have any ${noun}${windowLabel ? ` for${windowLabel}` : ' coming up'}. 🗓️`
      );
      return;
    }

    const listText = upcoming
      .map((r, i) => {
        const local = DateTime.fromJSDate(r.scheduledAt).setZone(user.timezone);
        const repeat = r.recurrenceRule ? ` _(${r.recurrenceRule.toLowerCase()})_` : '';
        return `${i + 1}. *${r.title}* — ${local.toFormat('ccc, LLL d @ h:mm a')}${repeat}`;
      })
      .join('\n');

    // The next message is often "remove the 2nd one", and 2 has to mean the
    // second row the user actually saw — not the second row of some later query.
    await prisma.conversationState.upsert({
      where: { userId: user.id },
      update: {
        pendingIntent: 'reminder_list',
        pendingData: { reminderIds: upcoming.map((r) => r.id) },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
      },
      create: {
        userId: user.id,
        pendingIntent: 'reminder_list',
        pendingData: { reminderIds: upcoming.map((r) => r.id) },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
      },
    });

    const heading = noun.charAt(0).toUpperCase() + noun.slice(1);
    await replyToUser(user, `📋 *Your ${heading}:*\n\n${listText}`);
    return;
  }

  // ─── Flow K: Reschedule an existing reminder ─────────────────────────
  // Answers "move the meeting with John to Sep 9" by MOVING the row the user
  // already has, rather than creating a rival copy alongside it.
  if (parsed.intent === 'reschedule_reminder') {
    // The follow-up to "which one?" is a bare number or a name, so the parked
    // list is consulted before anything is matched afresh.
    const pendingChoice =
      activeState?.pendingIntent === 'reschedule_choice'
        ? (activeState.pendingData as { reminderIds?: string[]; scheduledIso?: string } | null)
        : null;

    const newIso = parsed.scheduled_iso || pendingChoice?.scheduledIso || null;

    if (!newIso) {
      await replyToUser(
        user,
        parsed.clarification_question || 'What time should I move it to?'
      );
      return;
    }

    const validated = validateAndNormalizeDate(newIso, user.timezone);

    if (!validated.isValid) {
      await replyToUser(user, `⚠️ ${validated.errorMessage || 'Invalid reminder time.'}`);
      return;
    }

    const categoryFilter = normalizeCategoryFilter(parsed.filter_categories);
    const titleQuery = parsed.title?.trim() || null;

    const listed = resolveListedReminderIds(activeState, parsed.reminder_indices);

    const listProblem = positionProblemMessage(listed, 'move');
    if (listProblem) {
      await replyToUser(user, listProblem);
      return;
    }

    const listedIds = listed.kind === 'resolved' ? listed.ids : null;

    const candidates = await prisma.reminder.findMany({
      where: {
        userId: user.id,
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
        ...(listedIds ? { id: { in: listedIds } } : {}),
        ...(pendingChoice?.reminderIds?.length
          ? { id: { in: pendingChoice.reminderIds } }
          : {}),
        ...(categoryFilter ? { category: { in: categoryFilter } } : {}),
        ...(titleQuery
          ? { title: { contains: titleQuery, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (candidates.length === 0) {
      await replyToUser(
        user,
        titleQuery
          ? `I couldn't find anything upcoming matching *${titleQuery}*. 🗓️`
          : "I couldn't find which one you want to move. Which is it? 🗓️"
      );
      return;
    }

    // More than one genuine match. Ask rather than guess — silently moving the
    // wrong meeting is worse than one extra question.
    if (candidates.length > 1) {
      await prisma.conversationState.upsert({
        where: { userId: user.id },
        update: {
          pendingIntent: 'reschedule_choice',
          pendingData: {
            reminderIds: candidates.map((c) => c.id),
            scheduledIso: newIso,
          },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
        },
        create: {
          userId: user.id,
          pendingIntent: 'reschedule_choice',
          pendingData: {
            reminderIds: candidates.map((c) => c.id),
            scheduledIso: newIso,
          },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
        },
      });

      const options = candidates
        .map((c, i) => {
          const local = DateTime.fromJSDate(c.scheduledAt).setZone(user.timezone);
          return `${i + 1}. *${c.title}* — ${local.toFormat('ccc, LLL d @ h:mm a')}`;
        })
        .join('\n');

      await replyToUser(user, `Which one should I move?\n\n${options}`);
      return;
    }

    const target = candidates[0];
    const previous = DateTime.fromJSDate(target.scheduledAt).setZone(user.timezone);

    // "Move it to September 9th" says nothing about the hour, and inventing one
    // silently drags a 9 PM meeting to 9 AM. Keep the time the user already
    // chose and change only the date.
    let newScheduledAt = validated.scheduledAtUtc!;

    if (parsed.new_date_only) {
      const proposed = DateTime.fromJSDate(newScheduledAt).setZone(user.timezone);
      const kept = proposed.set({
        hour: previous.hour,
        minute: previous.minute,
        second: 0,
        millisecond: 0,
      });

      // Only honour it while the result is still in the future — otherwise the
      // original hour has already passed today and the model's guess is better.
      if (kept.toMillis() > Date.now()) newScheduledAt = kept.toJSDate();
    }

    // QStash has no "update": the queued delivery still points at the old time,
    // so it has to be dropped before the new one is armed.
    if (target.qstashMessageId) {
      await cancelScheduledDelivery(target.qstashMessageId);
    }

    await prisma.reminder.update({
      where: { id: target.id },
      data: { scheduledAt: newScheduledAt, qstashMessageId: null },
    });

    await prisma.conversationState.deleteMany({ where: { userId: user.id } });

    console.log(
      `[Remique] rescheduled ${target.id} ${target.scheduledAt.toISOString()} -> ` +
        `${newScheduledAt.toISOString()} dateOnly=${Boolean(parsed.new_date_only)}`
    );

    await replyToUser(
      user,
      `✅ Moved *${target.title}*\nfrom ${previous.toFormat('ccc, LLL d @ h:mm a')}\n` +
        `to ${DateTime.fromJSDate(newScheduledAt).setZone(user.timezone).toFormat('ccc, LLL d @ h:mm a')}.`
    );

    await scheduleReminderDelivery(target.id, newScheduledAt);
    return;
  }

  // ─── Flow D: Cancel Reminder ─────────────────────────────────────────
  if (parsed.intent === 'cancel_reminder') {
    const categoryFilter = normalizeCategoryFilter(parsed.filter_categories);
    const windowStart = parseFilterBound(parsed.filter_start_iso, user.timezone);
    const windowEnd = parseFilterBound(parsed.filter_end_iso, user.timezone);
    const titleQuery = parsed.title?.trim() || null;
    const now = new Date();
    const lowerBound = windowStart && windowStart > now ? windowStart : now;

    const where = {
      userId: user.id,
      status: 'SCHEDULED' as const,
      scheduledAt: { gte: lowerBound, ...(windowEnd ? { lte: windowEnd } : {}) },
      ...(categoryFilter ? { category: { in: categoryFilter } } : {}),
      ...(titleQuery
        ? { title: { contains: titleQuery, mode: 'insensitive' as const } }
        : {}),
    };

    // A scoped cancel ("all", "the meetings", "tomorrow's", a named one) sweeps
    // every match. Only a bare "cancel that" falls back to the single most
    // recent — which is what this branch used to do for EVERY phrasing, so
    // "cancel all the reminders" cancelled exactly one.
    const picked = resolveListedReminderIds(activeState, parsed.reminder_indices);

    // A named position that cannot be honoured is a dead end, never a licence to
    // fall back on category or recency. Refusing costs one message; guessing
    // cancelled two meetings the user wanted to keep.
    const problem = positionProblemMessage(picked, 'cancel');
    if (problem) {
      console.log(
        `[Remique] cancel refused indices=${JSON.stringify(parsed.reminder_indices)} reason=${picked.kind}`
      );
      await replyToUser(user, problem);
      return;
    }

    const isScoped = Boolean(
      parsed.cancel_all || categoryFilter || windowEnd || titleQuery
    );

    const targets = picked.kind === 'resolved'
      ? await prisma.reminder.findMany({
          where: { id: { in: picked.ids }, userId: user.id, status: 'SCHEDULED' },
          orderBy: { scheduledAt: 'asc' },
        })
      : isScoped
      ? await prisma.reminder.findMany({ where, orderBy: { scheduledAt: 'asc' } })
      : await prisma.reminder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 1,
        });

    if (targets.length === 0) {
      const noun = describeCategories(categoryFilter);
      await replyToUser(user, `You don't have any upcoming ${noun} to cancel. 🗓️`);
      return;
    }

    const cancelled = await prisma.reminder.updateMany({
      where: { id: { in: targets.map((t) => t.id) }, status: 'SCHEDULED' },
      data: { status: 'CANCELLED' },
    });

    console.log(
      `[Remique] cancel byIndex=${JSON.stringify(parsed.reminder_indices ?? null)} ` +
        `scoped=${isScoped} categories=${categoryFilter?.join('|') ?? 'ALL'} ` +
        `title=${JSON.stringify(titleQuery)} matched=${targets.length} cancelled=${cancelled.count}`
    );

    // The confirmation is built from the rows that were actually updated, never
    // from the model's reply_text. The old flow let the model announce a bulk
    // cancel that never happened.
    const lines = targets
      .map((r) => {
        const local = DateTime.fromJSDate(r.scheduledAt).setZone(user.timezone);
        return `• *${r.title}* — ${local.toFormat("ccc, LLL d 'at' h:mm a")}`;
      })
      .join('\n');

    await replyToUser(
      user,
      targets.length === 1
        ? `✅ Cancelled:\n${lines}`
        : `✅ Cancelled ${targets.length} of them:\n${lines}`
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

    await replyToUser(
      user,
      parsed.reply_text || '✅ I have saved that to your memory.'
    );
    return;
  }

  // ─── Flow F: General Reply / Knowledge Base Answer ───────────────────
  if (parsed.intent === 'general_reply' && parsed.reply_text) {
    await replyToUser(user, parsed.reply_text);
    return;
  }

  // ─── Fallback ────────────────────────────────────────────────────────
  await replyToUser(
    user,
    `Hi! I'm *Remique* 🔔 — your AI personal assistant.\n\nTry sending:\n• _"Remind me tomorrow at 10 AM to call Aovin"_\n• _"My wifi password is password123"_\n• _"What is my wifi password?"_\n• _"Cancel my last reminder"_\n• 📁 Send me a file with a caption like _"save this as a dollar document"_\n• _"What dollar documents do I have?"_`
  );
}

/**
 * Writes everything this message taught us, and removes what it asked us to forget.
 *
 * Never throws. A bad fact write must not cost the user their reply — the turn
 * has already been parsed and is about to be answered.
 *
 * Every write is logged. Passive extraction means the bot records things the
 * user never explicitly asked it to store, and the unique key means a misparse
 * silently overwrites a good fact, so the log is the only way to trace how a
 * wrong answer got into memory.
 */
/**
 * Predicates that describe a one-off event rather than something durable.
 *
 * The prompt already forbids these, and the model still emits them — it saved
 * "alamin/meeting_time" from "I have a meeting with Alamin at 4pm" even with
 * that exact case written out as a counter-example. The reminder already holds
 * that time; a second stale copy in memory only makes later answers wrong.
 *
 * Birthdays and anniversaries are dates that genuinely stay true, so they are
 * matched first and always allowed through.
 */
const DURABLE_DATE_PREDICATE = /birthday|anniversary/i;
const TRANSIENT_PREDICATE = /meeting|appointment|flight|trip|event|_time$/i;

function isTransientFact(predicate: string): boolean {
  if (DURABLE_DATE_PREDICATE.test(predicate)) return false;
  return TRANSIENT_PREDICATE.test(predicate);
}

async function persistFacts(
  userId: string,
  sourceMessageId: string,
  parsed: ParsedAssistantResponse
): Promise<void> {
  for (const fact of parsed.facts ?? []) {
    const subject = fact?.subject?.trim().toLowerCase();
    const predicate = fact?.predicate?.trim().toLowerCase();
    const value = fact?.value?.trim();

    if (!subject || !predicate || !value) continue;

    if (isTransientFact(predicate)) {
      console.log(`[Remique] fact rejected (transient) ${subject}/${predicate}`);
      continue;
    }

    const parsedDate = fact.value_date ? DateTime.fromISO(fact.value_date) : null;
    const valueDate = parsedDate?.isValid ? parsedDate.toJSDate() : null;

    try {
      await prisma.fact.upsert({
        where: { userId_subject_predicate: { userId, subject, predicate } },
        update: { value, valueDate, recurring: Boolean(fact.recurring), sourceMessageId },
        create: {
          userId,
          subject,
          predicate,
          value,
          valueDate,
          recurring: Boolean(fact.recurring),
          sourceMessageId,
        },
      });
      console.log(`[Remique] fact saved ${subject}/${predicate}=${JSON.stringify(value)}`);
    } catch (error: any) {
      console.warn(`[Remique] fact write failed ${subject}/${predicate}: ${error?.message}`);
    }
  }

  for (const target of parsed.forget_facts ?? []) {
    const subject = target?.subject?.trim().toLowerCase();
    const predicate = target?.predicate?.trim().toLowerCase();

    if (!subject || !predicate) continue;

    try {
      const removed = await prisma.fact.deleteMany({ where: { userId, subject, predicate } });
      console.log(`[Remique] fact forgotten ${subject}/${predicate} rows=${removed.count}`);
    } catch (error: any) {
      console.warn(`[Remique] fact delete failed ${subject}/${predicate}: ${error?.message}`);
    }
  }
}

/**
 * Downloads an inbound file, stores it, and either names it or asks for a name.
 *
 * The bytes are persisted before the label is known. That ordering is
 * deliberate: Meta's media IDs expire, and a user who takes two minutes to
 * answer "what should I call this?" would otherwise lose the file entirely.
 * The cost is an unlabeled row, which the sweeper cleans up after 24 hours.
 */
async function handleIncomingFile(
  user: User,
  message: PipelineMessage,
  parsedLabel: string | null
): Promise<void> {
  let stored;
  let mimeType: string;
  let sizeBytes: number;

  try {
    const media = await fetchMedia(message.mediaId!);
    mimeType = media.mimeType;
    sizeBytes = media.sizeBytes;

    stored = await putDocument({
      userId: user.id,
      body: media.buffer,
      mimeType: media.mimeType,
    });
  } catch (error) {
    if (error instanceof MediaTooLargeError) {
      // The user's fault, not ours, and retrying cannot help. Answer and stop.
      await replyToUser(
        user,
        "That file is too large for me to keep — I can store files up to 20 MB. 📁"
      );
      return;
    }
    // Anything else (expired token, S3 outage) is worth a retry, so it
    // propagates to the pipeline's failure classifier.
    throw error;
  }

  const label = parsedLabel?.trim() || null;

  const document = await prisma.document.create({
    data: {
      userId: user.id,
      label,
      mediaType: message.mediaType || 'document',
      mimeType,
      fileName: message.mediaFilename,
      s3Key: stored.s3Key,
      sizeBytes,
    },
  });

  if (label) {
    await prisma.conversationState.deleteMany({ where: { userId: user.id } });
    await replyToUser(user, `✅ Saved as *${label}*.`);
    return;
  }

  // No caption, or a caption with no usable name in it. Park the document and
  // ask — the reply lands in Flow H.
  await prisma.conversationState.upsert({
    where: { userId: user.id },
    update: {
      pendingIntent: 'label_document',
      pendingData: { documentId: document.id },
      expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
    },
    create: {
      userId: user.id,
      pendingIntent: 'label_document',
      pendingData: { documentId: document.id },
      expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
    },
  });

  await replyToUser(
    user,
    'Got it! 📁 What should I call this so you can ask for it later?'
  );
}

function formatDocumentList(documents: Document[], timezone: string): string {
  return documents
    .map((doc, i) => {
      const when = DateTime.fromJSDate(doc.createdAt).setZone(timezone).toFormat('LLL d, yyyy');
      return `${i + 1}. *${doc.label}* — ${doc.mediaType}, saved ${when}`;
    })
    .join('\n');
}

/**
 * Answers "what X documents do I have?" with a numbered list.
 *
 * The list order is then stored, because the next message is usually "send me
 * 2" — and 2 has to mean the second row the user actually saw, not the second
 * row of some other query.
 */
async function handleListDocuments(
  user: User,
  candidates: Document[],
  indices: number[]
): Promise<void> {
  const matched = resolveIndices(candidates, indices);

  if (matched.length === 0) {
    await replyToUser(
      user,
      "I couldn't find any saved documents matching that. 📁\n\nSend me a file with a caption like _\"save this as a dollar document\"_ and I'll keep it for you."
    );
    return;
  }

  await prisma.conversationState.upsert({
    where: { userId: user.id },
    update: {
      pendingIntent: 'document_list',
      pendingData: { documentIds: matched.map((d) => d.id) },
      expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
    },
    create: {
      userId: user.id,
      pendingIntent: 'document_list',
      pendingData: { documentIds: matched.map((d) => d.id) },
      expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
    },
  });

  await replyToUser(
    user,
    `📁 *Your documents:*\n\n${formatDocumentList(matched, user.timezone)}\n\n` +
      '_Reply with a number to get it, or "send them all"._'
  );
}

/**
 * Delivers files back into the thread.
 *
 * Indices resolve against the list the user was last shown. If that list has
 * expired, they fall back to the full candidate set, which is the best
 * available reading of "send me the dollar document" out of the blue.
 */
async function handleSendDocuments(
  user: User,
  candidates: Document[],
  activeState: ConversationState | null,
  indices: number[],
  suggestions: number[],
  replyText?: string | null
): Promise<void> {
  let pool = candidates;

  if (activeState?.pendingIntent === 'document_list') {
    const pending = activeState.pendingData as { documentIds?: string[] } | null;
    const ids = pending?.documentIds ?? [];

    if (ids.length > 0) {
      const byId = new Map(candidates.map((d) => [d.id, d]));
      const ordered = ids.map((id) => byId.get(id)).filter((d): d is Document => Boolean(d));
      if (ordered.length > 0) pool = ordered;
    }
  }

  // An empty selection means the model found nothing matching what was asked
  // for — NOT "send everything". "Send them all" arrives as every index in the
  // list, per the prompt. Treating empty as a wildcard is how asking for a
  // passport you never saved returned every document you own.
  const matched = resolveIndices(pool, indices);

  if (matched.length === 0) {
    // Nothing matched exactly, but something related exists. Offer it instead
    // of refusing — "you don't have a tin certificate" is technically true and
    // useless when an eTin certificate is sitting right there.
    const suggested = resolveIndices(pool, suggestions);

    if (suggested.length > 0) {
      await prisma.conversationState.upsert({
        where: { userId: user.id },
        update: {
          pendingIntent: 'confirm_documents',
          pendingData: { documentIds: suggested.map((d) => d.id) },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
        },
        create: {
          userId: user.id,
          pendingIntent: 'confirm_documents',
          pendingData: { documentIds: suggested.map((d) => d.id) },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
        },
      });

      const names = suggested.map((d) => `*${d.label}*`).join(', ');
      await replyToUser(
        user,
        replyText || `I don't have that exactly, but I do have ${names}. Want me to send it? 📁`
      );
      return;
    }

    await replyToUser(
      user,
      replyText ||
        "I don't have anything saved under that name. 📁\n\nAsk _\"what documents do I have?\"_ to see the full list."
    );
    return;
  }

  await deliverDocuments(user, matched);
}

/** Pushes resolved files into the thread, bounded by MAX_DOCUMENTS_PER_SEND. */
async function deliverDocuments(user: User, matched: Document[]): Promise<void> {
  const toSend = matched.slice(0, MAX_DOCUMENTS_PER_SEND);

  for (const doc of toSend) {
    const link = await getDocumentUrl(doc.s3Key);

    await replyWithMedia(user, {
      mediaType: doc.mediaType === 'image' ? 'image' : 'document',
      link,
      caption: doc.label ?? undefined,
      // WhatsApp shows this verbatim, so it needs a real extension — a
      // bare label renders as an unopenable, typeless attachment.
      filename:
        doc.fileName ?? `${doc.label ?? 'document'}.${extensionForMimeType(doc.mimeType)}`,
    });
  }

  if (matched.length > toSend.length) {
    await replyToUser(
      user,
      `Sent ${toSend.length}. You have ${matched.length - toSend.length} more matching — ask again to get the rest.`
    );
  }
}

/**
 * Maps 1-based positions from the model back onto real rows.
 *
 * Out-of-range and duplicate numbers are dropped rather than throwing: the
 * model occasionally returns an index for a list it half-remembers, and a
 * silently shorter list is a far better outcome than a crashed reply.
 */
export function resolveIndices<T>(items: T[], indices: number[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];

  for (const index of indices) {
    if (!Number.isInteger(index)) continue;
    if (index < 1 || index > items.length) continue;
    if (seen.has(index)) continue;

    seen.add(index);
    out.push(items[index - 1]);
  }

  return out;
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
