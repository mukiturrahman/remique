/**
 * The words a reminder arrives in, and the words it is acknowledged with.
 *
 * Deliberately not model-generated. Delivery is time-sensitive and runs on the
 * QStash callback path, so an LLM call there would add latency and a failure
 * mode to the one message that absolutely has to arrive. Variety comes from
 * having several phrasings rather than from a model.
 */

/** Stable per-string pick, so one reminder always reads the same way. */
function pickStable<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

function pickRandom<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

/** First name only — "Mukitur Rahman Ashik" is not how anyone is addressed. */
export function shortName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first && first.length > 1 ? first : null;
}

/** Titles are user-typed, so only the first letter is touched. */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "in 15 minutes" / "in 1 hour" — how long until the thing itself. */
function untilPhrase(offsetMinutes: number | null): string | null {
  if (!offsetMinutes || offsetMinutes <= 0) return null;
  if (offsetMinutes % 60 === 0) {
    const hours = offsetMinutes / 60;
    return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `in ${offsetMinutes} minutes`;
}

const HABIT_OPENERS = [
  (t: string, n: string) => `Time for ${t}${n}.`,
  (t: string, n: string) => `${sentenceCase(t)} time${n}.`,
  (t: string, n: string) => `Don't forget ${t}${n}.`,
];

const TASK_OPENERS = [
  (t: string, n: string) => `Please try to ${t} when you get a chance${n}.`,
  (t: string, n: string) => `Time to ${t}${n}.`,
  (t: string, n: string) => `Nudge${n} — ${t}.`,
];

const GENERAL_OPENERS = [
  (t: string, n: string) => `Here's your reminder${n}: ${t}.`,
  (t: string, n: string) => `Reminder${n} — ${t}.`,
  (t: string, n: string) => `You asked me to remind you${n}: ${t}.`,
];

/**
 * The body of a delivered reminder.
 *
 * Buttons are attached separately, so this ends with the question they answer.
 */
export function deliveryMessage(reminder: {
  id: string;
  title: string;
  category: string;
  anchorAt: Date | null;
  anchorTitle: string | null;
  offsetMinutes: number | null;
}, userName: string | null): string {
  const name = shortName(userName);
  const suffix = name ? `, ${name}` : '';
  const title = reminder.title.trim();

  // An alert about a separate event leads with how long until the event, which
  // is the only thing the user actually needs to know at that moment.
  const until = untilPhrase(reminder.offsetMinutes);
  if (reminder.anchorAt && until) {
    const what = reminder.anchorTitle?.trim() || title;
    return `${sentenceCase(what)} starts ${until}${suffix}.\n\nDone or need more time?`;
  }

  const openers =
    reminder.category === 'HABIT'
      ? HABIT_OPENERS
      : reminder.category === 'BIRTHDAY'
        ? [(t: string, n: string) => `🎂 ${sentenceCase(t)} is today${n}.`]
        : reminder.category === 'MEETING'
          ? [(t: string, n: string) => `Heads up${n} — ${sentenceCase(t)}.`]
          : reminder.category === 'TASK'
            ? TASK_OPENERS
            : GENERAL_OPENERS;

  const opener = pickStable(openers, reminder.id);
  return `${opener(title, suffix)}\n\nDone or need more time?`;
}

const DONE_LINES = [
  (n: string) => `Nice one${n}. ✅ Marked as done.`,
  (n: string) => `You're on a roll${n}! ✅ Ticked off.`,
  (n: string) => `Done and dusted${n}. ✅`,
  (n: string) => `Love it. ✅ Marked as done${n}.`,
  (n: string) => `That's one off the list${n}. ✅`,
];

/** Acknowledgement for a Done tap. Random, so it does not read as a receipt. */
export function doneMessage(userName: string | null): string {
  const name = shortName(userName);
  return pickRandom(DONE_LINES)(name ? `, ${name}` : '');
}

const SNOOZE_LINES = [
  (n: string, w: string) => `No worries${n} — I'll nudge you again ${w}.`,
  (n: string, w: string) => `Sure thing. Back to you ${w}${n}.`,
  (n: string, w: string) => `Parked it${n}. I'll remind you ${w}.`,
];

export function snoozeMessage(userName: string | null, whenPhrase: string): string {
  const name = shortName(userName);
  return pickRandom(SNOOZE_LINES)(name ? `, ${name}` : '', whenPhrase);
}
