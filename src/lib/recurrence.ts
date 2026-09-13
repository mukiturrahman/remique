import { DateTime } from 'luxon';

export const RECURRENCE_RULES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

const STEP: Record<string, Parameters<DateTime['plus']>[0]> = {
  DAILY: { days: 1 },
  WEEKLY: { weeks: 1 },
  MONTHLY: { months: 1 },
  YEARLY: { years: 1 },
};

/**
 * The next time a recurring reminder should fire after `from`.
 *
 * Advanced in the user's own zone rather than UTC so a 9 AM daily reminder
 * stays at 9 AM across a DST change instead of drifting an hour.
 *
 * Rolls forward past `after` rather than returning a single step: if delivery
 * was down for three days, a DAILY reminder must resume tomorrow, not fire
 * three times catching up.
 *
 * Returns null for an unknown rule, which is the signal not to reschedule.
 */
export function nextOccurrence(
  from: Date,
  rule: string,
  timezone: string,
  after: Date = new Date()
): Date | null {
  const step = STEP[rule?.trim().toUpperCase()];
  if (!step) return null;

  let next = DateTime.fromJSDate(from).setZone(timezone);
  if (!next.isValid) return null;

  // Bounded so a corrupt date cannot spin here. 400 steps covers a year of
  // dailies, which is far past the point where something else is wrong.
  for (let i = 0; i < 400; i++) {
    next = next.plus(step);
    if (next.toMillis() > after.getTime()) return next.toJSDate();
  }

  return null;
}
