import { FREE_MONTHLY_REMINDER_LIMIT, type LockedFeature } from './plan';
import { shortName } from './reminder-voice';

/**
 * What a Free user hears when they reach for something the plan does not
 * include.
 *
 * Deliberately not model-generated: every one of these has to end with the
 * "subscribe" shortcut, and a model cannot be trusted to include it every
 * time. Variety comes from several phrasings, the same way reminder-voice
 * does it.
 */

function pickRandom<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

/** The one-word way out. Matched by the billing shortcut in reminder-service. */
const SUBSCRIBE_TAILS = [
  "To unlock your full second brain, just type *subscribe* and I'll take you straight to the subscribe page.",
  "Want the whole second brain? Type *subscribe* and I'll send you right to the subscribe page. 🧠",
  "If you'd like it all unlocked, just type *subscribe* and I'll take you straight there.",
];

const FEATURE_OPENERS: Record<LockedFeature, Array<(n: string) => string>> = {
  files: [
    (n) => `Sorry mate${n}, I can't save files on the free plan 🙂`,
    (n) => `Ah${n}, keeping files safe for you is a Pro thing, so I can't hold on to this one on the free plan 📁`,
    (n) => `I'd love to keep that for you${n}, but saving files isn't part of the free plan 🙂`,
  ],
  notes: [
    (n) => `Sorry mate${n}, I can't save notes on the free plan 🙂`,
    (n) => `Ah${n}, jotting things down for later is a Pro feature, so I can't save that note on the free plan 📝`,
    (n) => `Wish I could keep that for you${n}, but notes are locked on the free plan 🙂`,
  ],
  documents: [
    (n) => `Sorry mate${n}, finding and sending saved files isn't part of the free plan 🙂`,
    (n) => `Ah${n}, your file cabinet is locked while you're on the free plan 📁`,
    (n) => `I can't pull up saved files on the free plan${n}, sorry 🙂`,
  ],
  memory: [
    (n) => `Sorry mate${n}, remembering things like that is part of the full second brain, so I can't keep it on the free plan 🙂`,
    (n) => `Ah${n}, I can't hold on to details like that on the free plan 🧠`,
    (n) => `Wish I could remember that for you${n}, but memory is locked on the free plan 🙂`,
  ],
};

function nameSuffix(userName: string | null | undefined): string {
  const name = shortName(userName);
  return name ? `, ${name}` : '';
}

export function lockedFeatureMessage(
  feature: LockedFeature,
  userName: string | null | undefined
): string {
  const opener = pickRandom(FEATURE_OPENERS[feature])(nameSuffix(userName));
  return `${opener} ${pickRandom(SUBSCRIBE_TAILS)}`;
}

/**
 * The reply when a request would take a Free user past the monthly limit.
 *
 * With some left, it says exactly how many ("you've got 1 left this month"),
 * because "you've hit your limit" would be false and they could still set a
 * smaller request.
 */
export function reminderLimitMessage(
  userName: string | null | undefined,
  params: { requested: number; remaining: number; monthName: string; resetsOnLabel: string }
): string {
  const n = nameSuffix(userName);
  const { requested, remaining, monthName, resetsOnLabel } = params;
  const limit = FREE_MONTHLY_REMINDER_LIMIT;

  const opener =
    remaining === 0
      ? pickRandom([
          `Oh no${n}, you've used all ${limit} of your free reminders for ${monthName} 😅 They reset on ${resetsOnLabel}.`,
          `That's your ${limit} free reminders for ${monthName} all used up${n} 🙂 Fresh ones arrive on ${resetsOnLabel}.`,
          `Ah${n}, you've set all ${limit} free reminders for ${monthName} already 😅 You'll get new ones on ${resetsOnLabel}.`,
        ])
      : pickRandom([
          `Ah${n}, that's ${requested} reminders, but you've got ${remaining} left this month on the free plan 😅`,
          `So close${n}! That needs ${requested} reminders and you've got ${remaining} left this month 🙂`,
        ]);

  return `${opener} ${pickRandom(SUBSCRIBE_TAILS)}`;
}
