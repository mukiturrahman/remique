import { FREE_MONTHLY_REMINDER_LIMIT, WEEKLY_FILE_LIMIT, type LockedFeature } from './plan';
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

const SUBSCRIBE_TAILS = {
  never_subscribed: [
    "To unlock your full second brain, just type *subscribe* and I'll take you straight to the subscribe page.",
    "Want the whole second brain? Type *subscribe* and I'll send you right to the subscribe page. 🧠",
    "If you'd like it all unlocked, just type *subscribe* and I'll take you straight there.",
  ],
  expired: [
    "To get your second brain back, just type *renew* and I'll take you straight to the billing page.",
    "Want the whole second brain back? Type *renew* and I'll send you right to the billing page. 🧠",
    "If you'd like it all unlocked again, just type *renew* and I'll take you straight there.",
  ],
};

const FEATURE_OPENERS: Record<LockedFeature, Array<(n: string, reason: 'expired' | 'never_subscribed') => string>> = {
  files: [
    (n, r) => `Sorry mate${n}, I can't save files on the ${r === 'expired' ? 'free' : 'free'} plan 🙂`, // Actually, we shouldn't necessarily say "free plan" if they are expired, but it works. Let's adjust slightly:
    (n, r) => r === 'expired' ? `Ah${n}, keeping files safe is a Pro thing, and your plan just ended 📁` : `Ah${n}, keeping files safe for you is a Pro thing, so I can't hold on to this one on the free plan 📁`,
    (n, r) => r === 'expired' ? `I'd love to keep that for you${n}, but saving files needs an active Pro plan 🙂` : `I'd love to keep that for you${n}, but saving files isn't part of the free plan 🙂`,
  ],
  notes: [
    (n, r) => r === 'expired' ? `Sorry mate${n}, jotting things down needs an active Pro plan 🙂` : `Sorry mate${n}, I can't save notes on the free plan 🙂`,
    (n, r) => r === 'expired' ? `Ah${n}, your Pro plan has ended, so I can't save that note 📝` : `Ah${n}, jotting things down for later is a Pro feature, so I can't save that note on the free plan 📝`,
    (n, r) => r === 'expired' ? `Wish I could keep that for you${n}, but notes are locked without Pro 🙂` : `Wish I could keep that for you${n}, but notes are locked on the free plan 🙂`,
  ],
  documents: [
    (n, r) => r === 'expired' ? `Sorry mate${n}, finding and sending saved files needs an active Pro plan 🙂` : `Sorry mate${n}, finding and sending saved files isn't part of the free plan 🙂`,
    (n, r) => r === 'expired' ? `Ah${n}, your file cabinet is locked because your Pro plan ended 📁` : `Ah${n}, your file cabinet is locked while you're on the free plan 📁`,
    (n, r) => r === 'expired' ? `I can't pull up saved files without Pro${n}, sorry 🙂` : `I can't pull up saved files on the free plan${n}, sorry 🙂`,
  ],
  memory: [
    (n, r) => r === 'expired' ? `Sorry mate${n}, remembering things like that is part of the full second brain, which is locked now 🙂` : `Sorry mate${n}, remembering things like that is part of the full second brain, so I can't keep it on the free plan 🙂`,
    (n, r) => r === 'expired' ? `Ah${n}, I can't hold on to details like that without an active Pro plan 🧠` : `Ah${n}, I can't hold on to details like that on the free plan 🧠`,
    (n, r) => r === 'expired' ? `Wish I could remember that for you${n}, but memory is locked until you renew 🙂` : `Wish I could remember that for you${n}, but memory is locked on the free plan 🙂`,
  ],
};

function nameSuffix(userName: string | null | undefined): string {
  const name = shortName(userName);
  return name ? `, ${name}` : '';
}

export function lockedFeatureMessage(
  feature: LockedFeature,
  userName: string | null | undefined,
  reason: 'expired' | 'never_subscribed' = 'never_subscribed'
): string {
  // Use the 0th item for 'never_subscribed' old default if we want, but pickRandom is fine.
  const opener = pickRandom(FEATURE_OPENERS[feature])(nameSuffix(userName), reason);
  return `${opener} ${pickRandom(SUBSCRIBE_TAILS[reason])}`;
}

export function lockedReminderMessage(
  userName: string | null | undefined,
  reason: 'expired' | 'never_subscribed'
): string {
  const n = nameSuffix(userName);
  const opener = reason === 'expired'
    ? pickRandom([
        `Sorry mate${n}, your Pro plan has ended so I can't set any new reminders 🙂`,
        `Ah${n}, new reminders are locked because your Pro plan expired ⏰`,
        `Wish I could set that for you${n}, but you need an active Pro plan to make new reminders 🙂`,
      ])
    : pickRandom([
        `Sorry mate${n}, I can't set new reminders right now 🙂`,
      ]); // never_subscribed will normally hit the limit instead of this outright lock, but just in case.

  return `${opener} ${pickRandom(SUBSCRIBE_TAILS[reason])}`;
}

export function fileCapMessage(
  userName: string | null | undefined
): string {
  const n = nameSuffix(userName);
  const opener = pickRandom([
    `Sorry mate${n}, you've hit your limit of ${WEEKLY_FILE_LIMIT} saved files on the Weekly plan 📁`,
    `Ah${n}, the Weekly plan only holds ${WEEKLY_FILE_LIMIT} files at a time 😅`,
    `I can't save this one${n} — you've reached the ${WEEKLY_FILE_LIMIT}-file cap for the Weekly plan 🙂`,
  ]);
  return `${opener} If you need unlimited space, type *upgrade* to check out the Monthly plan.`;
}

/**
 * The reply when a request would take a Free user past the monthly limit.
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

  return `${opener} ${pickRandom(SUBSCRIBE_TAILS['never_subscribed'])}`;
}
