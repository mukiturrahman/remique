import { DateTime } from 'luxon';
import type { ParsedAssistantResponse } from '../types/llm.types';

/**
 * What the Free plan includes, and what it does not.
 *
 * Kept free of database and network imports so the rules can be unit tested
 * directly. The queries that feed these functions live in reminder-service.
 */

/** New reminders a Free user may ask for per calendar month. */
export const FREE_MONTHLY_REMINDER_LIMIT = 5;

/**
 * How a reminder row came to exist.
 *
 * Only `user` counts toward the monthly limit. A snooze is the same reminder
 * pushed back, and a recurring series is one request that keeps firing — if
 * either counted, a single "every morning" reminder would use up the month in
 * five days.
 */
export type ReminderSource = 'user' | 'snooze' | 'recurrence';

/** The second-brain features a Free user is refused, each with its own reply. */
export type LockedFeature = 'files' | 'notes' | 'documents' | 'memory';

export function hasSecondBrain(
  user: { planTier: string; planExpiresAt: Date | null },
  now: Date = new Date()
): boolean {
  if (user.planTier === 'permanent') return true;
  if (user.planTier !== 'pro') return false;
  return !user.planExpiresAt || user.planExpiresAt >= now;
}

/**
 * The calendar month the limit is counted over, in the user's own timezone.
 *
 * A Dhaka user's month starts at midnight Dhaka time on the 1st, not at
 * midnight UTC, which would otherwise hand them a fresh allowance at 6 AM.
 */
export function monthWindow(timezone: string, now: Date = new Date()) {
  const start = DateTime.fromJSDate(now).setZone(timezone).startOf('month');
  const resetsAt = start.plus({ months: 1 });

  return {
    start: start.toJSDate(),
    resetsAt: resetsAt.toJSDate(),
    monthName: start.toFormat('LLLL'),
    resetsOnLabel: resetsAt.toFormat('LLL d'),
  };
}

/**
 * All or nothing: a request for two alerts with one left creates neither.
 *
 * Creating only the first would leave the user with half an event and no
 * clear idea which half.
 */
export function reminderAllowance(
  used: number,
  requested: number,
  limit: number = FREE_MONTHLY_REMINDER_LIMIT
): { allowed: boolean; remaining: number } {
  const remaining = Math.max(0, limit - used);
  return { allowed: requested <= remaining, remaining };
}

const SELF_SUBJECTS = new Set(['me', 'user', 'i']);

/**
 * The one fact a Free user still gets remembered.
 *
 * Their name is how every reply addresses them, so dropping it would make the
 * free experience feel colder without protecting anything worth paying for.
 */
export function isOwnNameFact(subject: string, predicate: string): boolean {
  return predicate === 'name' && SELF_SUBJECTS.has(subject);
}

/**
 * Which locked feature a parsed message is reaching for, or null if none.
 *
 * A plain chat that happens to teach a durable fact ("my girlfriend is
 * Ayesha") is a memory request: the model would otherwise answer "got it",
 * which is a promise the Free plan does not keep. A reminder that also teaches
 * a fact is not — the reminder is still created and the fact is quietly
 * skipped, rather than refusing something the user is entitled to.
 */
export function lockedFeatureFor(parsed: ParsedAssistantResponse): LockedFeature | null {
  switch (parsed.intent) {
    case 'save_note':
      return 'notes';
    case 'save_document':
      return 'files';
    case 'list_documents':
    case 'send_documents':
      return 'documents';
    case 'recall_memory':
      return 'memory';
    case 'general_reply': {
      const teachesFact = (parsed.facts ?? []).some((fact) => {
        const subject = fact?.subject?.trim().toLowerCase() ?? '';
        const predicate = fact?.predicate?.trim().toLowerCase() ?? '';
        return subject && predicate && !isOwnNameFact(subject, predicate);
      });
      return teachesFact ? 'memory' : null;
    }
    default:
      return null;
  }
}
