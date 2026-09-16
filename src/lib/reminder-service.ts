type User = typeof users.$inferSelect;
type ConversationState = typeof conversationStates.$inferSelect;
type Document = typeof documents.$inferSelect;
type Fact = typeof facts.$inferSelect;
type Reminder = typeof reminders.$inferSelect;
import { db } from '../db';
import { sql, and, or, eq, gt, gte, lt, lte, inArray, desc, asc, not, notInArray, isNotNull } from 'drizzle-orm';
import { users, reminders, conversationStates, notes, facts, messages, documents, subscriptions } from '../db/schema';
import { parseUserMessage } from './llm';
import { validateAndNormalizeDate } from './date-normalizer';
import { cancelScheduledDelivery, scheduleDelayedReminder } from './qstash';
import { replyToUser, replyWithButtons, replyWithMedia } from './conversation-log';
import {
  AWAITING_REQUEST,
  BUTTON_LABEL_ELSE,
  BUTTON_LABEL_REQUEST,
  LABEL_DOCUMENT,
  LABEL_OR_REQUEST,
  chosenLabel,
  decideLabelReply,
  fileNoun,
  labelChoiceButtons,
  labelClarificationFallback,
  looksLikeDiscard,
  parseLabelButton,
  requestButtonTitle,
  resolveLabelChoice,
} from './label-intent';
import type { LabelChoice } from '../types/llm.types';
import { fetchMedia, MediaTooLargeError } from './whatsapp-media';
import { putDocument, getDocumentUrl, deleteDocument, extensionForMimeType } from './storage';
import { recordUsage } from './usage';
import { env } from './env';
import type { PipelineMessage } from './message-pipeline';
import type { ParsedAssistantResponse } from '../types/llm.types';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';
import {
  conflictConfirmedMessage,
  conflictDeclinedMessage,
  conflictWarningMessage,
  doneMessage,
  shortName,
  snoozeMessage,
} from './reminder-voice';
import {
  FREE_MONTHLY_REMINDER_LIMIT,
  hasSecondBrain,
  isOwnNameFact,
  lockedFeatureFor,
  monthWindow,
  reminderAllowance,
} from './plan';
import { lockedFeatureMessage, reminderLimitMessage } from './plan-voice';

/**
 * How many saved documents are offered to the model as retrieval candidates.
 *
 * Bounded because every candidate is a prompt line the user pays for on every
 * single message. If someone ever stores more than this, the oldest fall out of
 * reach and this needs to become a real search rather than a bigger number.
 */
const DOCUMENT_CANDIDATE_LIMIT = 20;

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
const FACT_LIMIT = 30;
const NOTE_LIMIT = 20;

/**
 * How many earlier messages are replayed to the model as conversation context.
 *
 * Both directions, so roughly four exchanges. Enough to resolve "another one"
 * or "make it 9pm" against what was actually said; short enough that it does
 * not crowd out KNOWN FACTS or the document list.
 */
export const RECENT_TURNS_LIMIT = 10;

/**
 * Max age of conversation turns replayed to the model.
 *
 * Messages older than 15 minutes belong to an earlier interaction. Dropping
 * them stops stale context from leaking into fresh tasks, avoids ambiguous
 * referents ("cancel that" acting on a task settled hours ago), and saves
 * hundreds of tokens on every fresh session.
 */
export const RECENT_TURNS_MAX_AGE_MS = 15 * 60 * 1000;

/** How many future reminders beyond today the model is shown. */
const UPCOMING_CONTEXT_LIMIT = 10;

/**
 * Accepts a bare "yes" to a suggested document.
 *
 * The model usually returns send_documents for an agreement, but a one-word
 * reply carries almost no signal and sometimes lands as general_reply. This is
 * the deterministic backstop, not the primary path.
 */
const AFFIRMATIVE =
  /^(y|ya|yes|yeah|yep|yup|sure|ok|okay|please|send|send it|send them|do it|ha|haa|hae|hyan|hmm|accha|acha|thik|জি|হ্যাঁ|হ্যা|পাঠাও)\b/i;

const NEGATIVE =
  /^(n|no|nope|nah|never|nevermind|never mind|leave it|cancel|skip|stop|dont|don't|not now|na|thak|lagbe na|দরকার নাই|না)\b/i;

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
  activeState: ConversationState | null | undefined,
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


/** Default hour for "remind me tomorrow" when no time is implied. */
const SNOOZE_TOMORROW_HOUR = 9;

export const BUTTON_DONE = 'done';
export const BUTTON_SNOOZE_HOUR = 'snooze60';
export const BUTTON_SNOOZE_TOMORROW = 'snoozetom';

/** Builds the three reply buttons attached to a delivered reminder. */
export function reminderActionButtons(reminderId: string) {
  return [
    { id: `${BUTTON_DONE}:${reminderId}`, title: 'Done' },
    { id: `${BUTTON_SNOOZE_HOUR}:${reminderId}`, title: 'Remind in 1 hour' },
    { id: `${BUTTON_SNOOZE_TOMORROW}:${reminderId}`, title: 'Remind tomorrow' },
  ];
}

/**
 * Handles a tap on Done / Remind in 1 hour / Remind tomorrow.
 *
 * Snoozing creates a NEW one-shot rather than moving the delivered row. The
 * original has already been sent, and for a recurring reminder its next
 * occurrence is queued the moment it is delivered — moving it would either
 * lose that link or fire the series twice.
 */
async function handleButtonTap(user: User, buttonReplyId: string): Promise<void> {
  const [action, reminderId] = buttonReplyId.split(':');

  const reminder = reminderId
    ? await db.query.reminders.findFirst({ where: (r, { eq, and }) => and(eq(r.id, reminderId), eq(r.userId, user.id)) })
    : null;

  if (!reminder) {
    console.warn(`[Remique] button tap for unknown reminder: ${buttonReplyId}`);
    await replyToUser(user, "I can't find that one anymore — it may have been cancelled.");
    return;
  }

  if (action === BUTTON_DONE) {
    if (reminder.status === 'DONE') {
      await replyToUser(user, 'Already marked that one done.');
      return;
    }

    (await db.update(reminders).set({ status: 'DONE', completedAt: new Date() }).where(eq(reminders.id, reminder.id)).returning())[0];

    console.log(`[Remique] reminder ${reminder.id} marked DONE`);
    await replyToUser(user, doneMessage(user.name));
    return;
  }

  const snoozeTo =
    action === BUTTON_SNOOZE_HOUR
      ? DateTime.now().setZone(user.timezone).plus({ hours: 1 })
      : action === BUTTON_SNOOZE_TOMORROW
        ? DateTime.now()
            .setZone(user.timezone)
            .plus({ days: 1 })
            .set({ hour: SNOOZE_TOMORROW_HOUR, minute: 0, second: 0, millisecond: 0 })
        : null;

  if (!snoozeTo) {
    console.warn(`[Remique] unrecognised button action: ${buttonReplyId}`);
    await replyToUser(user, "I didn't catch that one. Mind telling me what you need?");
    return;
  }

  const snoozed = (await db.insert(reminders).values({ userId: user.id, title: reminder.title, originalMessage: reminder.originalMessage, scheduledAt: snoozeTo.toJSDate(), timezone: user.timezone, category: reminder.category, anchorAt: reminder.anchorAt, anchorTitle: reminder.anchorTitle, offsetMinutes: reminder.offsetMinutes, groupId: reminder.groupId, source: 'snooze', status: 'SCHEDULED' }).returning())[0];

  console.log(
    `[Remique] reminder ${reminder.id} snoozed -> ${snoozed.id} at ${snoozeTo.toISO()}`
  );

  await replyToUser(
    user,
    snoozeMessage(user.name, friendlyWhen(snoozed.scheduledAt, user.timezone))
  );

  await scheduleReminderDelivery(snoozed.id, snoozed.scheduledAt);
}

/** Shapes a stored reminder for the prompt's schedule block. */
function toScheduleEntry(r: {
  title: string;
  scheduledAt: Date;
  anchorAt: Date | null;
  offsetMinutes: number | null;
  category: string;
  recurrenceRule: string | null;
}) {
  return {
    title: r.title,
    scheduledAt: r.scheduledAt,
    anchorAt: r.anchorAt,
    offsetMinutes: r.offsetMinutes,
    category: r.category,
    recurrenceRule: r.recurrenceRule,
  };
}

function firstName(user: User): string | null {
  return shortName(user.name);
}

/**
 * "today at 5 PM" / "tomorrow at 11:00 AM" / "Fri, Sep 11 at 9 PM".
 *
 * People say "tomorrow", not "Mon, Sep 7". Absolute dates are kept for
 * anything past tomorrow, where a weekday alone is ambiguous.
 */
function friendlyWhen(when: Date, timezone: string): string {
  const local = DateTime.fromJSDate(when).setZone(timezone);
  const days = local.startOf('day').diff(
    DateTime.now().setZone(timezone).startOf('day'),
    'days'
  ).days;
  const time = local.toFormat('h:mm a');

  if (days === 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  if (days > 1 && days < 7) return `${local.toFormat('cccc')} at ${time}`;
  return `${local.toFormat('LLL d')} at ${time}`;
}

/** "30 minutes before" / "1 hour before" — how the user refers to an alert. */
export function describeOffset(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'} before`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'} before`;
}

/**
 * A schedule grouped under Today / Tomorrow / weekday headings.
 *
 * Rows arrive already sorted by time, and grouping by day preserves that
 * order, so the flattened reading order matches the order parked in
 * ConversationState. That equality is what lets "remove the 2nd one" work
 * across day headings without printing numbers.
 */
export function buildGroupedList(
  rows: Array<{
    title: string;
    scheduledAt: Date;
    anchorAt: Date | null;
    offsetMinutes: number | null;
    recurrenceRule: string | null;
  }>,
  timezone: string
): string {
  const today = DateTime.now().setZone(timezone).startOf('day');
  const sections: string[] = [];
  let currentKey = '';
  let lines: string[] = [];

  const flush = () => {
    if (lines.length) sections.push(`${currentKey}\n${lines.join('\n')}`);
    lines = [];
  };

  for (const row of rows) {
    const local = DateTime.fromJSDate(row.scheduledAt).setZone(timezone);
    const days = local.startOf('day').diff(today, 'days').days;

    const heading =
      days === 0
        ? `*Today (${local.toFormat('LLLL d')})*`
        : days === 1
          ? `*Tomorrow (${local.toFormat('LLLL d')})*`
          : `*${local.toFormat('cccc')} (${local.toFormat('LLLL d')})*`;

    if (heading !== currentKey) {
      flush();
      currentKey = heading;
    }

    const repeat = row.recurrenceRule ? ` _(${row.recurrenceRule.toLowerCase()})_` : '';
    lines.push(`• ${formatReminderLine(row, timezone)}${repeat}`);
  }

  flush();
  return sections.join('\n\n');
}

/** One line in a list or confirmation, showing the anchor when there is one. */
function formatReminderLine(
  r: { title: string; scheduledAt: Date; anchorAt: Date | null; offsetMinutes: number | null },
  timezone: string
): string {
  const at = DateTime.fromJSDate(r.scheduledAt).setZone(timezone).toFormat('h:mm a');
  const offset = describeOffset(r.offsetMinutes);

  if (r.anchorAt) {
    const anchor = DateTime.fromJSDate(r.anchorAt).setZone(timezone).toFormat('h:mm a');
    return `${at} — ${r.title} at ${anchor}${offset ? ` (${offset})` : ''}`;
  }

  return `${at} — ${r.title}`;
}

/**
 * Per-turn bookkeeping that flows set and the wrapper acts on once the turn
 * has been answered.
 */
interface TurnContext {
  /**
   * An unnamed file whose naming question was put aside so another request
   * could be handled first. The user is asked for its name afterwards.
   */
  deferredDocumentId: string | null;
}

/** What a parked "do that, name the file, or something else?" question holds. */
interface LabelOrRequestData {
  documentId: string;
  mediaType?: string | null;
  originalMessage: string;
  requestText?: string | null;
}

export async function processIncomingUserMessage(
  user: User,
  message: PipelineMessage,
  prefetchedState?: ConversationState | null
) {
  const startState =
    prefetchedState !== undefined ? prefetchedState : ((await loadActiveState(user.id)) ?? null);

  // A file put aside on an earlier turn rides along on whatever question was
  // open since, and comes back once that question is answered.
  const carried = (startState?.pendingData as { deferredDocumentId?: unknown } | null)
    ?.deferredDocumentId;
  const turn: TurnContext = { deferredDocumentId: typeof carried === 'string' ? carried : null };

  await handleTurn(user, message, startState, turn);

  if (turn.deferredDocumentId && hasSecondBrain(user)) {
    await followUpDeferredDocument(user, turn.deferredDocumentId);
  }
}

async function handleTurn(
  user: User,
  message: PipelineMessage,
  prefetchedState: ConversationState | null | undefined,
  turn: TurnContext
): Promise<void> {
  const userMessage = message.messageText;

  // A tap on one of our own buttons carries exactly what was meant, so it is
  // handled before any context is loaded or the model is called. Sending
  // "Done" through an LLM would cost a request to rediscover something we
  // already encoded in the button id.
  if (message.buttonReplyId) {
    const labelButton = parseLabelButton(message.buttonReplyId);
    if (labelButton) {
      await handleLabelButton(user, message, labelButton.action, labelButton.documentId, turn);
    } else {
      await handleButtonTap(user, message.buttonReplyId);
    }
    return;
  }

  // ── Quick billing commands (handled without an LLM call) ────────
  const normalized = userMessage.trim().toLowerCase();
  if (/^(upgrade|subscribe|pricing|plans?|pro|প্রো|প্ল্যান)\b/i.test(normalized)) {
    const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
    const cleanPhone = user.phoneNumber.replace(/^\+/, '');
    const checkoutUrl = `${appUrl}/pricing?phone=${cleanPhone}`;

    await replyToUser(
      user,
      `🌟 *Remique Pro Plans* 🌟\n\n` +
        `• *Weekly:* ৳49 / week\n` +
        `• *Monthly:* ৳190 / month\n\n` +
        `Unlimited reminders, your full second brain (notes, memory and saved files), zero token caps, and priority queue.\n\n` +
        `Subscribe securely with bKash Auto-Pay:\n${checkoutUrl}`
    );
    return;
  }

  if (/^(cancel subscription|stop subscription|cancel pro)\b/i.test(normalized)) {
    const { cancelSubscription } = await import('./bdapps/subscription-service');
    const res = await cancelSubscription(user.id);
    if (!res.success) {
      await replyToUser(user, "You don't have an active subscription right now. You are on the Free tier.");
    } else {
      await replyToUser(
        user,
        "Your Pro subscription has been cancelled. You can resubscribe anytime by messaging *pro*."
      );
    }
    return;
  }

  const secondBrain = hasSecondBrain(user);

  if (/^(subscription status|my plan|billing status|account status)\b/i.test(normalized)) {
    const isPro = user.planTier === 'pro';
    const expires = user.planExpiresAt
      ? user.planExpiresAt.toLocaleDateString('en-GB')
      : 'N/A';

    let features: string;
    if (secondBrain) {
      features = `• Features: Unlimited reminders and your full second brain\n\nTo cancel anytime, reply "cancel subscription".`;
    } else {
      const used = await countUserRemindersThisMonth(db, user);
      features =
        `• Reminders: ${Math.min(used, FREE_MONTHLY_REMINDER_LIMIT)} of ${FREE_MONTHLY_REMINDER_LIMIT} used this month\n` +
        `• Notes, memory and saved files: locked\n\n` +
        `To unlock your full second brain, just type *subscribe*.`;
    }

    await replyToUser(
      user,
      `📋 *Your Account Status*\n\n` +
        `• Plan: *${secondBrain ? 'Pro' : 'Free'}*\n` +
        (isPro ? `• Active until: ${expires}\n` : '') +
        features
    );
    return;
  }

  // A file from a Free user is refused before the model call and before the
  // download: storing it would cost S3 and tokens for something we then decline.
  if (!secondBrain && message.mediaId) {
    await replyToUser(user, lockedFeatureMessage('files', user.name));
    return;
  }

  const activeState =
    prefetchedState !== undefined ? prefetchedState : await loadActiveState(user.id);

  // Notes and document labels are both prompt context, so they are read
  // together — this is on the user's critical path.
  const dayStart = DateTime.now().setZone(user.timezone).startOf('day').toJSDate();
  const dayEnd = DateTime.now().setZone(user.timezone).endOf('day').toJSDate();
  const sessionCutoff = new Date(Date.now() - RECENT_TURNS_MAX_AGE_MS);

  // A Free user's notes, facts and files are not loaded at all. The rows stay
  // in the database (they come back on resubscribing), but the model must not
  // answer from data the plan has locked.
  const [userNotes, userFacts, recentMessages, todayReminders, upcomingContext, userDocuments] =
    await Promise.all([
    secondBrain ? db.query.notes.findMany({ where: (n, { eq }) => eq(n.userId, user.id), orderBy: (n, { desc }) => desc(n.createdAt), limit: NOTE_LIMIT }) : Promise.resolve([]),
    secondBrain ? db.query.facts.findMany({ where: (f, { eq }) => eq(f.userId, user.id), orderBy: (f, { desc }) => desc(f.updatedAt), limit: FACT_LIMIT }) : Promise.resolve([]),
    // The message being answered is already persisted, so it is excluded here —
    // otherwise the model sees the current question twice and treats its own
    // input as prior context. Messages older than the session cutoff are
    // dropped so settled conversations from hours ago do not burn tokens or
    // confuse referents in fresh tasks.
    db.query.messages.findMany({ where: (m, { and, eq, not, gte }) => and(eq(m.userId, user.id), not(eq(m.id, message.id)), gte(m.createdAt, sessionCutoff)), orderBy: (m, { desc }) => desc(m.createdAt), limit: RECENT_TURNS_LIMIT, columns: { direction: true, messageText: true } }),
    // The schedule itself. Without this the model answers "do I have anything
    // today?" from nothing, so it either refuses or invents — and it cannot
    // offer the useful extra ("the only thing you've got is...").
    db.query.reminders.findMany({ where: (r, { and, eq, gte, lte }) => and(eq(r.userId, user.id), eq(r.status, 'SCHEDULED'), gte(r.scheduledAt, dayStart), lte(r.scheduledAt, dayEnd)), orderBy: (r, { asc }) => asc(r.scheduledAt) }),
    db.query.reminders.findMany({ where: (r, { and, eq, gt }) => and(eq(r.userId, user.id), eq(r.status, 'SCHEDULED'), gt(r.scheduledAt, dayEnd)), orderBy: (r, { asc }) => asc(r.scheduledAt), limit: UPCOMING_CONTEXT_LIMIT }),
    secondBrain ? db.query.documents.findMany({ where: (d, { and, eq, isNotNull }) => and(eq(d.userId, user.id), isNotNull(d.label)), orderBy: (d, { desc }) => desc(d.createdAt), limit: DOCUMENT_CANDIDATE_LIMIT }) : Promise.resolve([]),
  ]);

  const notesText = userNotes.map((n) => n.content);

  const { parsed, usage } = await parseUserMessage(userMessage, user.timezone, {
    pendingContext: activeState?.pendingData,
    pendingIntent: activeState?.pendingIntent ?? null,
    savedNotes: notesText,
    userName: user.name,
    userPlan: secondBrain ? `Pro (${user.planPeriod || 'monthly'})` : 'Free',
    isSubscribed: secondBrain,
    remindersToday: todayReminders.map(toScheduleEntry),
    upcomingReminders: upcomingContext.map(toScheduleEntry),
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

  // Not awaited on the reply path: the model has answered and the user is
  // waiting. `recordUsage` swallows its own errors, so a floating rejection is
  // not possible here.
  if (usage) {
    void recordUsage({
      userId: user.id,
      messageId: message.id,
      purpose: 'parse',
      model: env.OPENAI_MODEL,
      usage,
    });
  }

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
      `labelReply=${parsed.label_reply ?? null} ` +
      `labelChoice=${parsed.label_choice ?? null} ` +
      `hasMedia=${Boolean(message.mediaId)}`
  );

  // Runs for every intent, before any branch returns. A message that creates a
  // reminder can also teach a birthday, and the fact must survive either way.
  await persistFacts(user.id, message.id, parsed, secondBrain);

  // ─── Free plan: second-brain requests get a friendly refusal ────────
  // Before any flow runs, so the model's own reply ("saved it!") is never
  // sent for something that was not saved.
  const locked = secondBrain ? null : lockedFeatureFor(parsed);
  if (locked) {
    console.log(`[Remique] free plan refused feature=${locked} intent=${parsed.intent}`);
    await replyToUser(user, lockedFeatureMessage(locked, user.name));
    return;
  }

  // ─── Flow G: An actual file arrived ─────────────────────────────────
  // Runs before every other branch. An uncaptioned image sets
  // needs_clarification, and without this the reminder clarification flow
  // below would swallow it and ask about a time that was never mentioned.
  if (message.mediaId) {
    await handleIncomingFile(user, message, parsed.document_label ?? null);
    return;
  }

  // ─── Flow G2: "Don't save that, I sent it by mistake" ───────────────
  // Before every reminder flow. A message about the file was once answered by
  // the cancel flow ("you don't have any reminders to cancel") because
  // discarding was not something the bot could do at all.
  const unnamedDocumentId =
    activeState?.pendingIntent === LABEL_DOCUMENT || activeState?.pendingIntent === LABEL_OR_REQUEST
      ? ((activeState.pendingData as { documentId?: string } | null)?.documentId ?? null)
      : turn.deferredDocumentId;

  if (
    secondBrain &&
    unnamedDocumentId &&
    (parsed.discard_file || parsed.label_choice === 'discard' || looksLikeDiscard(userMessage))
  ) {
    await discardDocument(user, unnamedDocumentId, activeState, turn);
    return;
  }

  // ─── Flow H: The answer to "what should I call this?" ───────────────
  // Document flows below need the second brain. A Free user can only have one
  // of these states parked if they downgraded mid-conversation; the message
  // then falls through to ordinary handling instead.
  //
  // A reply is not the name just because a name was asked for: "remind me to
  // repair my watch" was once saved as a filename here. Anything that is not
  // plainly a name is asked about, and neither saved nor acted on.
  if (secondBrain && activeState?.pendingIntent === LABEL_DOCUMENT && userMessage.trim()) {
    const pending = activeState.pendingData as {
      documentId?: string;
      mediaType?: string | null;
      confirmed?: boolean;
    } | null;

    if (pending?.documentId) {
      const decision = decideLabelReply(parsed, userMessage, Boolean(pending.confirmed));
      console.log(
        `[Remique] label reply verdict=${parsed.label_reply ?? 'none'} decision=${decision.kind}`
      );

      if (decision.kind === 'name') {
        await saveDocumentLabel(user, pending.documentId, decision.label);
        return;
      }

      const requestTitle = requestButtonTitle(parsed);
      // Only a question written for this situation is used. Without a verdict
      // the model was not thinking about the file, and its question may be
      // "what time?" — which skips straight past what they meant.
      const question =
        (parsed.label_reply && parsed.clarification_question?.trim()) ||
        labelClarificationFallback(userMessage, pending.mediaType, Boolean(requestTitle));

      await parkState(user.id, LABEL_OR_REQUEST, {
        documentId: pending.documentId,
        mediaType: pending.mediaType ?? null,
        originalMessage: userMessage,
        requestText: parsed.request_restatement?.trim() || null,
      } satisfies LabelOrRequestData);

      await replyWithButtons(
        user,
        question,
        labelChoiceButtons(pending.documentId, requestTitle, pending.mediaType)
      );
      return;
    }
  }

  // ─── Flow H2: "Set that reminder" / "Name the image" / something else ─
  if (secondBrain && activeState?.pendingIntent === LABEL_OR_REQUEST) {
    const pending = activeState.pendingData as LabelOrRequestData | null;

    if (pending?.documentId) {
      const choice = resolveLabelChoice(
        parsed,
        AFFIRMATIVE.test(userMessage.trim()),
        looksLikeDiscard(userMessage)
      );

      if (choice === 'discard') {
        await discardDocument(user, pending.documentId, activeState, turn);
        return;
      }

      console.log(`[Remique] label choice=${choice} verdict=${parsed.label_choice ?? 'none'}`);

      const handled = await applyLabelChoice(
        user,
        message,
        pending,
        choice,
        { label: parsed.document_label, restatement: parsed.request_restatement },
        turn
      );
      if (handled) return;
      // "Something else": this message is itself the new request, and the
      // flows below already have its parse.
    }
  }

  // ─── Flow J: "Yes, send that one" after a near-match offer ──────────
  if (secondBrain && activeState?.pendingIntent === 'confirm_documents') {
    const pending = activeState.pendingData as { documentIds?: string[] } | null;
    const ids = pending?.documentIds ?? [];
    const agreed = parsed.intent === 'send_documents' || AFFIRMATIVE.test(userMessage.trim());

    if (ids.length > 0 && agreed) {
      const byId = new Map(userDocuments.map((d) => [d.id, d]));
      const confirmed = ids.map((id) => byId.get(id)).filter((d): d is Document => Boolean(d));

      await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));

      if (confirmed.length > 0) {
        await deliverDocuments(user, confirmed);
        return;
      }
    }
  }

  // ─── Flow K: "Yes, add both" or "No, keep clear" for same-time conflict ──
  if (activeState?.pendingIntent === 'confirm_conflict') {
    const pending = activeState.pendingData as {
      pendingReminder?: {
        title: string;
        originalMessage: string;
        scheduledAt: string;
        category: string;
        recurrenceRule: string | null;
        anchorAt: string | null;
        anchorTitle: string | null;
        offsetMinutes: number | null;
        groupId: string | null;
      };
      conflictingTitle?: string;
      whenPhrase?: string;
    } | null;

    if (pending?.pendingReminder) {
      const trimmed = userMessage.trim();
      const isAffirmative =
        AFFIRMATIVE.test(trimmed) ||
        /\b(both|keep both|add it|yes|same time|double|do it|save it|proceed|hae|thik|thik ache)\b/i.test(trimmed);
      const isNegative =
        NEGATIVE.test(trimmed) ||
        /\b(don't|dont|never mind|nevermind|leave it|cancel|skip|no|na|lagbe na)\b/i.test(trimmed);

      if (isAffirmative) {
        const item = pending.pendingReminder;
        const result = await insertUserReminders(user, secondBrain, [{ userId: user.id, title: item.title, originalMessage: item.originalMessage, scheduledAt: new Date(item.scheduledAt), timezone: user.timezone, category: normalizeCategory(item.category), recurrenceRule: item.recurrenceRule, anchorAt: item.anchorAt ? new Date(item.anchorAt) : null, anchorTitle: item.anchorTitle, offsetMinutes: item.offsetMinutes, groupId: item.groupId, status: 'SCHEDULED' }]);

        if (!result.ok) {
          await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
          await replyToUser(user, limitReply(user, 1, result.remaining));
          return;
        }

        const [reminder] = result.rows;

        await Promise.all([
          scheduleReminderDelivery(reminder.id, reminder.scheduledAt),
          db.delete(conversationStates).where(eq(conversationStates.userId, user.id)),
        ]);

        const when = friendlyWhen(reminder.scheduledAt, user.timezone);
        await replyToUser(
          user,
          conflictConfirmedMessage(
            user.name,
            pending.conflictingTitle || 'your existing reminder',
            item.title,
            when
          )
        );
        return;
      }

      if (isNegative) {
        await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
        await replyToUser(
          user,
          conflictDeclinedMessage(
            user.name,
            pending.conflictingTitle || 'your existing reminder',
            pending.whenPhrase || 'that time'
          )
        );
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
    // A bare "yes" must never push files. It reached here once because the
    // assistant offered something it cannot do ("want me to help you prepare
    // for it?"), the user agreed, and the model mapped the agreement onto the
    // only actionable thing in its context — the document list.
    const hasDocumentContext =
      activeState?.pendingIntent === 'document_list' ||
      activeState?.pendingIntent === 'confirm_documents';
    const words = userMessage.trim().split(/\s+/);
    const bareAffirmative = words.length <= 3 && AFFIRMATIVE.test(userMessage.trim());

    if (bareAffirmative && !hasDocumentContext) {
      console.log('[Remique] refused to send documents on a bare affirmative');
      await replyToUser(
        user,
        "Happy to help — I can set a reminder, move one, or send you a file you've saved. Which would you like?"
      );
      return;
    }

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
    (await db.insert(conversationStates).values({ userId: user.id, 
pendingIntent: 'create_reminder',
        pendingData: { partialTitle: parsed.title, userMessage },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), }).onConflictDoUpdate({ target: conversationStates.userId, set: { 
pendingIntent: 'create_reminder',
        pendingData: { partialTitle: parsed.title, userMessage },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), } }).returning())[0];

    const question = parsed.clarification_question || 'What time should Remique remind you?';
    await replyToUser(user, question);
    return;
  }

  // ─── Flow B: Create Reminder(s) ─────────────────────────────────────
  // One message can ask for several alerts around one event ("remind me 15
  // and 30 mins before"). The event is the anchor; the alerts hang off it and
  // share a group so a later edit can name its siblings.
  if (parsed.intent === 'create_reminder') {
    const requested = parsed.reminders?.length
      ? parsed.reminders
      : parsed.scheduled_iso
        ? [
            {
              title: parsed.title || 'Reminder',
              scheduled_iso: parsed.scheduled_iso,
              offset_minutes: null,
              category: parsed.category ?? null,
              recurrence: parsed.recurrence ?? null,
            },
          ]
        : [];

    if (requested.length > 0) {
      // Checked up front as well as at insert, so a Free user who has run out
      // is not asked "keep both?" about a clash only to be refused after "yes".
      if (!secondBrain) {
        const used = await countUserRemindersThisMonth(db, user);
        const allowance = reminderAllowance(used, requested.length);
        if (!allowance.allowed) {
          await replyToUser(user, limitReply(user, requested.length, allowance.remaining));
          return;
        }
      }

      const anchorParsed = parsed.anchor_iso
        ? DateTime.fromISO(parsed.anchor_iso, { zone: user.timezone })
        : null;
      const anchorAt = anchorParsed?.isValid ? anchorParsed.toJSDate() : null;
      const anchorTitle = parsed.anchor_title?.trim() || null;

      // A group is only meaningful when several alerts share an event, or when
      // one alert has an anchor a later message might add siblings to.
      const groupId = requested.length > 1 || anchorAt ? randomUUID() : null;

      // Check for same-time conflict with an existing scheduled reminder
      if (requested.length === 1 && activeState?.pendingIntent !== 'confirm_conflict') {
        const first = requested[0];
        const validated = validateAndNormalizeDate(first.scheduled_iso, user.timezone);
        if (validated.isValid && validated.scheduledAtUtc) {
          const conflicting = await db.query.reminders.findFirst({ where: (r, { and, eq }) => and(eq(r.userId, user.id), eq(r.status, 'SCHEDULED'), eq(r.scheduledAt, validated.scheduledAtUtc!)), orderBy: (r, { desc }) => desc(r.createdAt) });

          if (conflicting) {
            const newTitle = first.title?.trim() || anchorTitle || 'Reminder';
            const when = friendlyWhen(validated.scheduledAtUtc, user.timezone);

            (await db.insert(conversationStates).values({ userId: user.id, 
pendingIntent: 'confirm_conflict',
                pendingData: {
                  pendingReminder: {
                    title: newTitle,
                    originalMessage: userMessage,
                    scheduledAt: validated.scheduledAtUtc.toISOString(),
                    category: normalizeCategory(first.category ?? parsed.category),
                    recurrenceRule: normalizeRecurrence(first.recurrence ?? parsed.recurrence),
                    anchorAt: anchorAt ? anchorAt.toISOString() : null,
                    anchorTitle,
                    offsetMinutes:
                      typeof first.offset_minutes === 'number' && first.offset_minutes > 0
                        ? first.offset_minutes
                        : null,
                    groupId,
                  },
                  conflictingTitle: conflicting.title,
                  whenPhrase: when,
                },
                expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), }).onConflictDoUpdate({ target: conversationStates.userId, set: { 
pendingIntent: 'confirm_conflict',
                pendingData: {
                  pendingReminder: {
                    title: newTitle,
                    originalMessage: userMessage,
                    scheduledAt: validated.scheduledAtUtc.toISOString(),
                    category: normalizeCategory(first.category ?? parsed.category),
                    recurrenceRule: normalizeRecurrence(first.recurrence ?? parsed.recurrence),
                    anchorAt: anchorAt ? anchorAt.toISOString() : null,
                    anchorTitle,
                    offsetMinutes:
                      typeof first.offset_minutes === 'number' && first.offset_minutes > 0
                        ? first.offset_minutes
                        : null,
                    groupId,
                  },
                  conflictingTitle: conflicting.title,
                  whenPhrase: when,
                },
                expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), } }).returning())[0];

            await replyToUser(
              user,
              conflictWarningMessage(user.name, conflicting.title, newTitle, when)
            );
            return;
          }
        }
      }

      const created: Array<{
        id: string;
        title: string;
        scheduledAt: Date;
        anchorAt: Date | null;
        offsetMinutes: number | null;
      }> = [];
      const rejected: string[] = [];

      const rows: NewReminder[] = [];

      for (const item of requested) {
        const validated = validateAndNormalizeDate(item.scheduled_iso, user.timezone);

        if (!validated.isValid) {
          rejected.push(validated.errorMessage || 'Invalid reminder time.');
          continue;
        }

        const offset =
          typeof item.offset_minutes === 'number' && item.offset_minutes > 0
            ? item.offset_minutes
            : null;

        rows.push({ userId: user.id, title: item.title?.trim() || anchorTitle || 'Reminder', originalMessage: userMessage, scheduledAt: validated.scheduledAtUtc!, timezone: user.timezone, category: normalizeCategory(item.category ?? parsed.category), recurrenceRule: normalizeRecurrence(item.recurrence ?? parsed.recurrence), anchorAt: anchorAt ?? null, anchorTitle: anchorTitle ?? null, offsetMinutes: offset, groupId: groupId ?? null, status: 'SCHEDULED' });
      }

      if (rows.length === 0) {
        await replyToUser(user, `⚠️ ${rejected[0] || 'Invalid reminder time.'}`);
        return;
      }

      const result = await insertUserReminders(user, secondBrain, rows);

      if (!result.ok) {
        await replyToUser(user, limitReply(user, rows.length, result.remaining));
        return;
      }

      for (const reminder of result.rows) {
        created.push({
          id: reminder.id,
          title: reminder.title,
          scheduledAt: reminder.scheduledAt,
          anchorAt: reminder.anchorAt,
          offsetMinutes: reminder.offsetMinutes,
        });
      }

      console.log(
        `[Remique] created ${created.length} reminder(s) group=${groupId ?? '-'} ` +
          `anchor=${anchorAt?.toISOString() ?? '-'} rejected=${rejected.length}`
      );

      await replyToUser(
        user,
        buildCreationConfirmation(user, created, anchorAt, anchorTitle, rejected)
      );

      await Promise.all([
        ...created.map((c) => scheduleReminderDelivery(c.id, c.scheduledAt)),
        db.delete(conversationStates).where(eq(conversationStates.userId, user.id)),
      ]);
      return;
    }
  }

  // ─── Flow C: List Reminders ─────────────────────────────────────────
  if (parsed.intent === 'list_reminders') {
    // A question about the schedule ("do I have anything today?") gets a
    // conversational answer, not a bulleted dump. The model has the real
    // schedule in context, so it is answering from truth rather than guessing.
    if (!parsed.wants_full_list && parsed.reply_text?.trim()) {
      await replyToUser(user, parsed.reply_text.trim());
      return;
    }

    let categoryFilter = normalizeCategoryFilter(parsed.filter_categories);
    // The LLM sometimes hallucinates the destructive cancel rule (TASK|HABIT|GENERAL)
    // into the list rule. If it asked to list "reminders" (which maps to those three),
    // we override to null to ensure the listing remains inclusive of meetings/birthdays.
    if (
      categoryFilter &&
      categoryFilter.length === 3 &&
      categoryFilter.includes('TASK') &&
      categoryFilter.includes('HABIT') &&
      categoryFilter.includes('GENERAL')
    ) {
      categoryFilter = null;
    }
    const windowStart = parseFilterBound(parsed.filter_start_iso, user.timezone);
    const windowEnd = parseFilterBound(parsed.filter_end_iso, user.timezone);
    const now = new Date();

    // A window that has already begun is clamped to now: "today" asked at 6 PM
    // means the rest of today, not this morning's reminders that already fired.
    const lowerBound = windowStart && windowStart > now ? windowStart : now;

    const upcoming = await db.query.reminders.findMany({ where: (r, { and, eq, gte, lte, inArray }) => and(eq(r.userId, user.id), eq(r.status, 'SCHEDULED'), gte(r.scheduledAt, lowerBound), windowEnd ? lte(r.scheduledAt, windowEnd) : undefined, categoryFilter ? inArray(r.category, categoryFilter) : undefined), orderBy: (r, { asc }) => asc(r.scheduledAt), limit: REMINDER_LIST_LIMIT });

    const noun = describeCategories(categoryFilter);

    // The window is described back to the user so a filtered empty result is
    // not mistaken for "you have nothing at all".
    const windowLabel = windowEnd
      ? ` ${DateTime.fromJSDate(lowerBound).setZone(user.timezone).toFormat('LLL d')}` +
        `–${DateTime.fromJSDate(windowEnd).setZone(user.timezone).toFormat('LLL d')}`
      : '';

    if (upcoming.length === 0) {
      const emptyName = firstName(user);
      await replyToUser(
        user,
        `Nothing on your plate${emptyName ? `, ${emptyName}` : ''} — no ${noun}` +
          `${windowLabel ? ` for${windowLabel}` : ' coming up'}. Want me to add something?`
      );
      return;
    }

    // The next message is often "remove the 2nd one", and 2 has to mean the
    // second row the user actually saw — not the second row of some later query.
    (await db.insert(conversationStates).values({ userId: user.id, 
pendingIntent: 'reminder_list',
        pendingData: { reminderIds: upcoming.map((r) => r.id) },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), }).onConflictDoUpdate({ target: conversationStates.userId, set: { 
pendingIntent: 'reminder_list',
        pendingData: { reminderIds: upcoming.map((r) => r.id) },
        expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), } }).returning())[0];

    const listName = firstName(user);
    await replyToUser(
      user,
      `Here's a look at your upcoming ${noun}${listName ? `, ${listName}` : ''} 📋:\n\n` +
        `${buildGroupedList(upcoming, user.timezone)}\n\n` +
        `And that's everything on your plate right now! ✨`
    );
    return;
  }

  // ─── Flow K: Reschedule an existing reminder ─────────────────────────
  // Moves the row the user already has. Targets it by position, by name, or by
  // its offset ("the 30 mins one") — the last of which is why offsets are
  // stored at all: the title is "Meeting with John" and contains no "30 mins".
  if (parsed.intent === 'reschedule_reminder') {
    const pendingChoice =
      activeState?.pendingIntent === 'reschedule_choice'
        ? (activeState.pendingData as { reminderIds?: string[]; scheduledIso?: string } | null)
        : null;

    const listed = resolveListedReminderIds(activeState, parsed.reminder_indices);
    const listProblem = positionProblemMessage(listed, 'move');
    if (listProblem) {
      await replyToUser(user, listProblem);
      return;
    }
    const listedIds = listed.kind === 'resolved' ? listed.ids : null;

    const categoryFilter = normalizeCategoryFilter(parsed.filter_categories);
    const titleQuery = parsed.title?.trim() || null;
    const targetOffset =
      typeof parsed.target_offset_minutes === 'number' && parsed.target_offset_minutes > 0
        ? parsed.target_offset_minutes
        : null;
    const newOffset =
      typeof parsed.new_offset_minutes === 'number' && parsed.new_offset_minutes > 0
        ? parsed.new_offset_minutes
        : null;

    // Candidates are resolved BEFORE any new time is required. "change the 30
    // mins to 1 hour" names no clock time at all — the new time is derived
    // from the anchor once we know which alert is meant.
    const candidates = await db.query.reminders.findMany({ where: (r, { and, eq, gte, inArray, ilike }) => and(eq(r.userId, user.id), eq(r.status, 'SCHEDULED'), gte(r.scheduledAt, new Date()), listedIds ? inArray(r.id, listedIds) : undefined, pendingChoice?.reminderIds?.length ? inArray(r.id, pendingChoice.reminderIds) : undefined, categoryFilter ? inArray(r.category, categoryFilter) : undefined, targetOffset ? eq(r.offsetMinutes, targetOffset) : undefined, titleQuery ? ilike(r.title, `%${titleQuery}%`) : undefined), orderBy: (r, { asc }) => asc(r.scheduledAt) });

    if (candidates.length === 0) {
      const label = describeOffset(targetOffset) ?? (titleQuery ? `*${titleQuery}*` : null);
      await replyToUser(
        user,
        label
          ? `I couldn't find a reminder matching ${label}. 🗓️`
          : "I couldn't find which one you want to move. Which is it? 🗓️"
      );
      return;
    }

    if (candidates.length > 1) {
      const iso = parsed.scheduled_iso || pendingChoice?.scheduledIso || null;
      (await db.insert(conversationStates).values({ userId: user.id, 
pendingIntent: 'reschedule_choice',
          pendingData: { reminderIds: candidates.map((c) => c.id), scheduledIso: iso },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), }).onConflictDoUpdate({ target: conversationStates.userId, set: { 
pendingIntent: 'reschedule_choice',
          pendingData: { reminderIds: candidates.map((c) => c.id), scheduledIso: iso },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), } }).returning())[0];

      const options = candidates
        .map((c, i) => `${i + 1}. ${formatReminderLine(c, user.timezone)}`)
        .join('\n');
      await replyToUser(user, `Which one should I move?\n\n${options}`);
      return;
    }

    const target = candidates[0];
    const previous = DateTime.fromJSDate(target.scheduledAt).setZone(user.timezone);

    let newScheduledAt: Date | null = null;
    let updatedOffset = target.offsetMinutes;

    // An offset change against a known anchor fully determines the new time,
    // so no clock time needs to have been said.
    if (newOffset && target.anchorAt) {
      newScheduledAt = DateTime.fromJSDate(target.anchorAt)
        .minus({ minutes: newOffset })
        .toJSDate();
      updatedOffset = newOffset;
    } else {
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

      newScheduledAt = validated.scheduledAtUtc!;

      // Only a date was given, so keep the hour the user already chose rather
      // than silently dragging a 9 PM meeting to 9 AM.
      if (parsed.new_date_only) {
        const kept = DateTime.fromJSDate(newScheduledAt)
          .setZone(user.timezone)
          .set({ hour: previous.hour, minute: previous.minute, second: 0, millisecond: 0 });
        if (kept.toMillis() > Date.now()) newScheduledAt = kept.toJSDate();
      }

      // Moving an anchored alert by clock time changes how far ahead it sits.
      if (target.anchorAt) {
        const gap = Math.round(
          (target.anchorAt.getTime() - newScheduledAt.getTime()) / 60000
        );
        updatedOffset = gap > 0 ? gap : null;
      }
    }

    if (target.qstashMessageId) {
      await cancelScheduledDelivery(target.qstashMessageId);
    }

    (await db.update(reminders).set({ scheduledAt: newScheduledAt, offsetMinutes: updatedOffset, qstashMessageId: null }).where(eq(reminders.id, target.id)).returning())[0];

    await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));

    console.log(
      `[Remique] rescheduled ${target.id} ${target.scheduledAt.toISOString()} -> ` +
        `${newScheduledAt.toISOString()} offset=${target.offsetMinutes ?? '-'}->${updatedOffset ?? '-'}`
    );

    // Siblings are restated so a group edit reads as a whole schedule, not an
    // isolated row: "...you'll still get the 15-minute heads-up at 8:45 PM".
    const siblings = target.groupId
      ? await db.query.reminders.findMany({ where: (r, { and, eq, not }) => and(eq(r.userId, user.id), eq(r.groupId, target.groupId!), eq(r.status, 'SCHEDULED'), not(eq(r.id, target.id))), orderBy: (r, { asc }) => asc(r.scheduledAt) })
      : [];

    await replyToUser(
      user,
      buildRescheduleConfirmation(user, target, newScheduledAt, updatedOffset, previous, siblings)
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
    const cancelOffset =
      typeof parsed.target_offset_minutes === 'number' && parsed.target_offset_minutes > 0
        ? parsed.target_offset_minutes
        : null;
    const now = new Date();
    const lowerBound = windowStart && windowStart > now ? windowStart : now;

    
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
      parsed.cancel_all || categoryFilter || windowEnd || titleQuery || cancelOffset
    );

    let baseWhere = [
        eq(reminders.userId, user.id),
        eq(reminders.status, 'SCHEDULED')
    ];
    if (lowerBound) baseWhere.push(gte(reminders.scheduledAt, lowerBound));
    if (windowEnd) baseWhere.push(lte(reminders.scheduledAt, windowEnd));
    if (categoryFilter) baseWhere.push(inArray(reminders.category, categoryFilter));
    if (cancelOffset) baseWhere.push(eq(reminders.offsetMinutes, cancelOffset));
    if (titleQuery) baseWhere.push(sql`lower(${reminders.title}) LIKE lower(${'%' + titleQuery + '%'})`);

    const finalWhere = and(...baseWhere);

    const targets = picked.kind === 'resolved'
      ? await db.query.reminders.findMany({ where: (r, { and, eq, inArray }) => and(inArray(r.id, picked.ids), eq(r.userId, user.id), eq(r.status, 'SCHEDULED')), orderBy: (r, { asc }) => asc(r.scheduledAt) })
      : isScoped
      ? await db.query.reminders.findMany({ where: finalWhere, orderBy: (r, { asc }) => asc(r.scheduledAt) })
      : await db.query.reminders.findMany({ where: finalWhere, orderBy: (r, { desc }) => desc(r.createdAt), limit: 1 });

    if (targets.length === 0) {
      const noun = describeCategories(categoryFilter);
      await replyToUser(user, `You don't have any upcoming ${noun} to cancel. 🗓️`);
      return;
    }

    const cancelled = await db.update(reminders).set({ status: 'CANCELLED' }).where(and(inArray(reminders.id, targets.map(t => t.id)), eq(reminders.status, 'SCHEDULED')));

    console.log(
      `[Remique] cancel byIndex=${JSON.stringify(parsed.reminder_indices ?? null)} ` +
        `scoped=${isScoped} categories=${categoryFilter?.join('|') ?? 'ALL'} ` +
        `title=${JSON.stringify(titleQuery)} matched=${targets.length} cancelled=${cancelled.count}`
    );

    // The confirmation is built from the rows that were actually updated, never
    // from the model's reply_text. The old flow let the model announce a bulk
    // cancel that never happened.
    const groupIds = [...new Set(targets.map((t) => t.groupId).filter(Boolean))] as string[];

    // What survives in the same event, so removing one alert of two does not
    // read as removing the meeting.
    const survivors = groupIds.length
      ? await db.query.reminders.findMany({ where: (r, { and, eq, inArray, notInArray }) => and(eq(r.userId, user.id), inArray(r.groupId, groupIds), eq(r.status, 'SCHEDULED'), notInArray(r.id, targets.map(t => t.id))), orderBy: (r, { asc }) => asc(r.scheduledAt) })
      : [];

    const name = firstName(user);
    const lines = targets
      .map((r) => `• ${formatReminderLine(r, user.timezone)}`)
      .join('\n');

    const head =
      targets.length === 1
        ? `Got it! 🗑️ I've cancelled *${targets[0].title}* at ` +
          `${DateTime.fromJSDate(targets[0].scheduledAt).setZone(user.timezone).toFormat('h:mm a')}.`
        : `Done${name ? `, ${name}` : ''}! 🧹 Cancelled ${targets.length} reminders for you:\n${lines}`;

    const rest = survivors
      .map((sib) => {
        const at = DateTime.fromJSDate(sib.scheduledAt).setZone(user.timezone).toFormat('h:mm a');
        const label = describeOffset(sib.offsetMinutes);
        return label ? `the ${label} heads-up at ${at}` : `${sib.title} at ${at}`;
      })
      .join(', and ');

    await replyToUser(user, survivors.length ? `${head}\n\nDon't worry, you'll still get ${rest}.` : head);
    return;
  }

  // ─── Flow E: Save Note ──────────────────────────────────────────────
  if (parsed.intent === 'save_note' && parsed.note_content) {
    (await db.insert(notes).values({ userId: user.id, content: parsed.note_content }).returning())[0];

    await replyToUser(
      user,
      parsed.reply_text || '✅ I have saved that to your memory.'
    );
    return;
  }

  if (parsed.intent === 'cancel_subscription') {
    (await db.update(users).set({ planTier: 'free' }).where(eq(users.id, user.id)).returning())[0];

    await db.update(subscriptions).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'ACTIVE')));

    await replyToUser(
      user,
      "Your subscription has been cancelled. I'll stop messaging you for now. You can always subscribe again on our website! 👋"
    );
    return;
  }

  // ─── Flow F: General Reply / Knowledge Base Answer ───────────────────
  if ((parsed.intent === 'general_reply' || parsed.intent === 'recall_memory') && parsed.reply_text) {
    await replyToUser(user, parsed.reply_text);
    return;
  }

  // ─── Fallback ────────────────────────────────────────────────────────
  // A Free user is only shown examples their plan actually includes.
  const examples = secondBrain
    ? `• _"Remind me tomorrow at 10 AM to call Aovin"_\n• _"My wifi password is password123"_\n• _"What is my wifi password?"_\n• _"Cancel my last reminder"_\n• 📁 Send me a file with a caption like _"save this as a dollar document"_\n• _"What dollar documents do I have?"_`
    : `• _"Remind me tomorrow at 10 AM to call Aovin"_\n• _"What do I have this week?"_\n• _"Move my dentist reminder to 5 PM"_\n• _"Cancel my last reminder"_`;

  await replyToUser(
    user,
    `Hi! I'm *Remique* 🔔 — your AI personal assistant.\n\nTry sending:\n${examples}`
  );
}

/**
 * The reply after moving one alert.
 *
 * Names the alert the way the user referred to it ("the 1-hour heads-up")
 * rather than quoting a clock time back, and restates what did NOT move, so
 * the whole event stays legible after a change to one part of it.
 */
function buildRescheduleConfirmation(
  user: User,
  target: { title: string; anchorAt: Date | null; offsetMinutes: number | null },
  newScheduledAt: Date,
  newOffset: number | null,
  previous: DateTime,
  siblings: Array<{ title: string; scheduledAt: Date; anchorAt: Date | null; offsetMinutes: number | null }>
): string {
  const name = firstName(user);
  const tz = user.timezone;
  const when = DateTime.fromJSDate(newScheduledAt).setZone(tz);
  const oldLabel = describeOffset(target.offsetMinutes);
  const newLabel = describeOffset(newOffset);

  const head =
    oldLabel && newLabel && oldLabel !== newLabel
      ? `Got it${name ? `, ${name}` : ''}! 🔄 The ${oldLabel} heads-up for *${target.title}* is now ` +
        `${newLabel} — I'll remind you at ${when.toFormat('h:mm a')}.`
      : `All set${name ? `, ${name}` : ''}! 🗓️ Moved *${target.title}* to ` +
        `${friendlyWhen(newScheduledAt, user.timezone)}.`;

  if (siblings.length === 0) return head;

  const rest = siblings
    .map((sib) => {
      const at = DateTime.fromJSDate(sib.scheduledAt).setZone(tz).toFormat('h:mm a');
      const label = describeOffset(sib.offsetMinutes);
      return label ? `the ${label} heads-up at ${at}` : `${sib.title} at ${at}`;
    })
    .join(', and ');

  return `${head}\n\nDon't worry, you'll still get ${rest}.`;
}

/**
 * The reply after creating one or more alerts.
 *
 * Built from the rows actually written, never from the model's reply_text: a
 * confirmation that names a time nothing was scheduled for is worse than a
 * blunt one. When several alerts share an event, the event is stated once and
 * the alerts listed under it, so two rows do not read as a duplicate.
 */
function buildCreationConfirmation(
  user: User,
  created: Array<{ title: string; scheduledAt: Date; anchorAt: Date | null; offsetMinutes: number | null }>,
  anchorAt: Date | null,
  anchorTitle: string | null,
  rejected: string[]
): string {
  const name = firstName(user);
  const tz = user.timezone;
  const askName = name ? '' : '\n\nBy the way, what should I call you? 🤔';
  const tail = (rejected.length > 0 ? `\n\n⚠️ ${rejected[0]}` : '') + askName;

  if (created.length === 1 && !anchorAt) {
    const only = created[0];
    return `Got it${name ? `, ${name}` : ''}! 👍 I'll ping you ${friendlyWhen(only.scheduledAt, tz)} about *${only.title}*.${tail}`;
  }

  if (anchorAt) {
    const anchor = DateTime.fromJSDate(anchorAt).setZone(tz);
    const lines = created
      .map((c) => {
        const at = DateTime.fromJSDate(c.scheduledAt).setZone(tz).toFormat('h:mm a');
        const offset = describeOffset(c.offsetMinutes);
        return `• ${at}${offset ? ` — ${offset}` : ''}`;
      })
      .join('\n');

    const heading =
      created.length === 1 ? 'a heads-up' : `${created.length} heads-ups`;

    return (
      `All set${name ? `, ${name}` : ''}! 📅 *${anchorTitle || created[0].title}* is ` +
      `${friendlyWhen(anchorAt, tz)}, and I'll give you ${heading}:\n${lines}${tail}`
    );
  }

  const lines = created.map((c) => `• ${formatReminderLine(c, tz)}`).join('\n');
  return `Done${name ? `, ${name}` : ''}! ✅ That's ${created.length} reminders set up for you:\n${lines}${tail}`;
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
  parsed: ParsedAssistantResponse,
  secondBrain: boolean
): Promise<void> {
  for (const fact of parsed.facts ?? []) {
    const subject = fact?.subject?.trim().toLowerCase();
    const predicate = fact?.predicate?.trim().toLowerCase();
    const value = fact?.value?.trim();

    if (!subject || !predicate || !value) continue;

    // Memory is part of the second brain. A Free user keeps only their own
    // name, which is how every reply addresses them.
    if (!secondBrain && !isOwnNameFact(subject, predicate)) {
      console.log(`[Remique] fact skipped (free plan) ${subject}/${predicate}`);
      continue;
    }

    if (isTransientFact(predicate)) {
      console.log(`[Remique] fact rejected (transient) ${subject}/${predicate}`);
      continue;
    }

    const parsedDate = fact.value_date ? DateTime.fromISO(fact.value_date) : null;
    const valueDate = parsedDate?.isValid ? parsedDate.toJSDate() : null;

    try {
      (await db.insert(facts).values({ userId, subject, predicate, value, valueDate, recurring: Boolean(fact.recurring), sourceMessageId }).onConflictDoUpdate({ target: [facts.userId, facts.subject, facts.predicate], set: { value, valueDate, recurring: Boolean(fact.recurring), sourceMessageId } }).returning())[0];
      console.log(`[Remique] fact saved ${subject}/${predicate}=${JSON.stringify(value)}`);

      // A name is not just a fact — it is how every later reply addresses
      // them, and `firstName()` reads it off the user row.
      if (predicate === 'name' && (subject === 'me' || subject === 'user' || subject === 'i')) {
        (await db.update(users).set({ name: value }).where(eq(users.id, userId)).returning())[0];
        console.log(`[Remique] user name set to ${JSON.stringify(value)}`);
      }
    } catch (error: any) {
      console.warn(`[Remique] fact write failed ${subject}/${predicate}: ${error?.message}`);
    }
  }

  for (const target of parsed.forget_facts ?? []) {
    const subject = target?.subject?.trim().toLowerCase();
    const predicate = target?.predicate?.trim().toLowerCase();

    if (!subject || !predicate) continue;

    try {
      const removed = await db.delete(facts).where(and(eq(facts.userId, userId), eq(facts.subject, subject), eq(facts.predicate, predicate)));
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

  const document = (await db.insert(documents).values({ userId: user.id, label, mediaType: message.mediaType || 'document', mimeType, fileName: message.mediaFilename, s3Key: stored.s3Key, sizeBytes }).returning())[0];

  if (label) {
    await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
    await replyToUser(user, `✅ Saved as *${label}*.`);
    return;
  }

  // No caption, or a caption with no usable name in it. Park the document and
  // ask — the reply lands in Flow H.
  await parkState(user.id, LABEL_DOCUMENT, {
    documentId: document.id,
    mediaType: document.mediaType,
  });

  await replyToUser(
    user,
    'Got it! 📁 What should I call this so you can ask for it later?'
  );
}

/** The user's unexpired pending question, if any. */
function loadActiveState(userId: string): Promise<ConversationState | undefined> {
  return db.query.conversationStates.findFirst({
    where: (cs, { and, eq, gt }) => and(eq(cs.userId, userId), gt(cs.expiresAt, new Date())),
  });
}

/** Parks one pending question for the user, replacing whatever was there. */
async function parkState(
  userId: string,
  pendingIntent: string,
  pendingData: Record<string, unknown>
): Promise<void> {
  const values = {
    pendingIntent,
    pendingData,
    expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(),
  };
  await db
    .insert(conversationStates)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: conversationStates.userId, set: values });
}

/** Names a stored file, closes the naming question, and confirms. */
async function saveDocumentLabel(user: User, documentId: string, label: string): Promise<void> {
  await db
    .update(documents)
    .set({ label })
    .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));
  await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
  await replyToUser(user, `✅ Saved as *${label}*.`);
}

/**
 * Handles a tap on "Set reminder" / "Name the image" / "Something else".
 *
 * A tap only counts against the question it came with. An old button further
 * up the chat must not replay a request that was settled long ago.
 */
async function handleLabelButton(
  user: User,
  message: PipelineMessage,
  action: string,
  documentId: string,
  turn: TurnContext
): Promise<void> {
  if (!hasSecondBrain(user)) {
    await replyToUser(user, lockedFeatureMessage('files', user.name));
    return;
  }

  const state = await loadActiveState(user.id);
  const pending =
    state?.pendingIntent === LABEL_OR_REQUEST ? (state.pendingData as LabelOrRequestData | null) : null;

  if (!pending || pending.documentId !== documentId) {
    console.log(`[Remique] stale label button ${action}:${documentId}`);
    await replyToUser(user, "That question has timed out. Mind telling me again what you'd like to do?");
    return;
  }

  if (action === BUTTON_LABEL_ELSE) {
    // Nothing to act on yet. The file stays unnamed and is asked about again
    // once they have said what they actually want.
    await parkState(user.id, AWAITING_REQUEST, { deferredDocumentId: documentId });
    await replyToUser(
      user,
      `No problem, what would you like to do? I'll hold on to the ${fileNoun(pending.mediaType)} until you give it a name.`
    );
    return;
  }

  const choice: LabelChoice = action === BUTTON_LABEL_REQUEST ? 'do_request' : 'name_file';
  await applyLabelChoice(user, message, pending, choice, {}, turn);
}

/**
 * Acts on the answer to "do that, name the file, or something else?".
 *
 * Returns false when the message should carry on through the normal flows:
 * the "something else" case, where what they said is itself the new request.
 */
async function applyLabelChoice(
  user: User,
  message: PipelineMessage,
  pending: LabelOrRequestData,
  choice: LabelChoice,
  answer: { label?: string | null; restatement?: string | null },
  turn: TurnContext
): Promise<boolean> {
  if (choice === 'do_request') {
    await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
    turn.deferredDocumentId = pending.documentId;

    // Replayed as if they had just said it, so every check a fresh request
    // gets (plan limits, clashes, a missing time) still applies.
    const replay =
      answer.restatement?.trim() || pending.requestText?.trim() || pending.originalMessage;
    console.log(`[Remique] label question resolved, replaying ${JSON.stringify(replay)}`);

    await handleTurn(
      user,
      { ...message, messageText: replay, buttonReplyId: null, mediaId: null },
      null,
      turn
    );
    return true;
  }

  if (choice === 'use_as_name') {
    await saveDocumentLabel(user, pending.documentId, pending.originalMessage.trim().slice(0, 100));
    return true;
  }

  if (choice === 'name_file') {
    const label = chosenLabel(answer.label);
    if (label) {
      await saveDocumentLabel(user, pending.documentId, label);
      return true;
    }

    // They want to name it but have not said what. Their next message is the
    // name, so it is taken without the request checks that led here.
    await parkState(user.id, LABEL_DOCUMENT, {
      documentId: pending.documentId,
      mediaType: pending.mediaType ?? null,
      confirmed: true,
    });
    await replyToUser(user, `Sure, what should I call the ${fileNoun(pending.mediaType)}?`);
    return true;
  }

  await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
  turn.deferredDocumentId = pending.documentId;
  return false;
}

/**
 * Throws away a file the user never named and does not want kept.
 *
 * S3 first, then the row, matching the sweeper: if the object delete fails the
 * row is left behind so the next sweep retries it, where the reverse order
 * would strand the bytes with nothing left pointing at them.
 */
async function discardDocument(
  user: User,
  documentId: string,
  activeState: ConversationState | null | undefined,
  turn: TurnContext
): Promise<void> {
  const document = await db.query.documents.findFirst({
    where: (d, { and, eq }) => and(eq(d.id, documentId), eq(d.userId, user.id)),
  });

  // Nothing further to ask about it.
  turn.deferredDocumentId = null;

  if (
    activeState?.pendingIntent === LABEL_DOCUMENT ||
    activeState?.pendingIntent === LABEL_OR_REQUEST ||
    activeState?.pendingIntent === AWAITING_REQUEST
  ) {
    await db.delete(conversationStates).where(eq(conversationStates.userId, user.id));
  } else if (activeState) {
    // Some other question is open ("what time?"). Only the file rides away.
    const { deferredDocumentId: _discarded, ...rest } = (activeState.pendingData ?? {}) as Record<
      string,
      unknown
    >;
    await db
      .update(conversationStates)
      .set({ pendingData: rest })
      .where(eq(conversationStates.userId, user.id));
  }

  if (document) {
    try {
      await deleteDocument(document.s3Key);
      await db.delete(documents).where(eq(documents.id, document.id));
      console.log(`[Remique] discarded unnamed document ${document.id}`);
    } catch (error: any) {
      // The row stays, so the sweeper clears both later.
      console.warn(`[Remique] discard failed for ${document.id}: ${error?.message}`);
    }
  }

  await replyToUser(user, `Okay, I won't save that ${fileNoun(document?.mediaType)}. 👍`);
}

/**
 * Asks again for the name of a file that was put aside for another request.
 *
 * If that request left a question of its own open ("what time?"), asking about
 * the file now would talk over it. The file then rides along on that question
 * and is asked about once it has been answered.
 */
async function followUpDeferredDocument(user: User, documentId: string): Promise<void> {
  const document = await db.query.documents.findFirst({
    where: (d, { and, eq }) => and(eq(d.id, documentId), eq(d.userId, user.id)),
  });

  // Named in the meantime, or already swept.
  if (!document || document.label) return;

  const state = await loadActiveState(user.id);

  if (state && state.pendingIntent !== AWAITING_REQUEST) {
    // A newer naming question (another file arrived) takes over.
    if (state.pendingIntent === LABEL_DOCUMENT || state.pendingIntent === LABEL_OR_REQUEST) return;

    const data = (state.pendingData ?? {}) as Record<string, unknown>;
    if (data.deferredDocumentId !== documentId) {
      await db
        .update(conversationStates)
        .set({ pendingData: { ...data, deferredDocumentId: documentId } })
        .where(eq(conversationStates.userId, user.id));
    }
    return;
  }

  await parkState(user.id, LABEL_DOCUMENT, {
    documentId: document.id,
    mediaType: document.mediaType,
  });
  await replyToUser(
    user,
    `Still holding the ${fileNoun(document.mediaType)} you sent 📁 What should I call it?`
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

  (await db.insert(conversationStates).values({ userId: user.id, 
pendingIntent: 'document_list',
      pendingData: { documentIds: matched.map((d) => d.id) },
      expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), }).onConflictDoUpdate({ target: conversationStates.userId, set: { 
pendingIntent: 'document_list',
      pendingData: { documentIds: matched.map((d) => d.id) },
      expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), } }).returning())[0];

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
  activeState: ConversationState | null | undefined,
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
      (await db.insert(conversationStates).values({ userId: user.id, 
pendingIntent: 'confirm_documents',
          pendingData: { documentIds: suggested.map((d) => d.id) },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), }).onConflictDoUpdate({ target: conversationStates.userId, set: { 
pendingIntent: 'confirm_documents',
          pendingData: { documentIds: suggested.map((d) => d.id) },
          expiresAt: DateTime.now().plus({ minutes: 15 }).toJSDate(), } }).returning())[0];

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

type NewReminder = typeof reminders.$inferInsert;

/** Reminders the user asked for this calendar month. Snoozes and repeats are excluded. */
async function countUserRemindersThisMonth(
  executor: Pick<typeof db, 'select'>,
  user: User
): Promise<number> {
  const { start } = monthWindow(user.timezone);
  const [row] = await executor
    .select({ count: sql<number>`count(*)` })
    .from(reminders)
    .where(and(eq(reminders.userId, user.id), eq(reminders.source, 'user'), gte(reminders.createdAt, start)));
  return Number(row?.count ?? 0);
}

type InsertRemindersResult =
  | { ok: true; rows: Reminder[] }
  | { ok: false; remaining: number };

/**
 * Writes reminders the user asked for, enforcing the Free plan limit.
 *
 * For a Free user the count and the insert share one transaction behind a
 * per-user advisory lock. Without it, two messages processed at the same
 * moment would both read "4 used" and both succeed, creating a 6th.
 */
async function insertUserReminders(
  user: User,
  secondBrain: boolean,
  rows: NewReminder[]
): Promise<InsertRemindersResult> {
  if (secondBrain) {
    return { ok: true, rows: await db.insert(reminders).values(rows).returning() };
  }

  return db.transaction(async (tx): Promise<InsertRemindersResult> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);

    const used = await countUserRemindersThisMonth(tx, user);
    const allowance = reminderAllowance(used, rows.length);

    if (!allowance.allowed) {
      console.log(
        `[Remique] free plan reminder limit userId=${user.id} used=${used} requested=${rows.length}`
      );
      return { ok: false, remaining: allowance.remaining };
    }

    return { ok: true, rows: await tx.insert(reminders).values(rows).returning() };
  });
}

function limitReply(user: User, requested: number, remaining: number): string {
  const { monthName, resetsOnLabel } = monthWindow(user.timezone);
  return reminderLimitMessage(user.name, { requested, remaining, monthName, resetsOnLabel });
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

    (await db.update(reminders).set({ qstashMessageId: qstashMsgId }).where(eq(reminders.id, reminderId)).returning())[0];
  } catch (schedErr: any) {
    console.error(
      `[Remique] QStash scheduling error for reminder ${reminderId} ` +
        `(left for the sweeper): ${schedErr?.message}`
    );
  }
}


