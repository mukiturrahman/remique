/**
 * What plan someone is actually on.
 *
 * `planTier` alone is not the answer. Weekly (৳49) and monthly (৳190) are two
 * different products and both store `planTier: 'pro'`, so a badge reading
 * "Pro" hides which one was bought. `planPeriod` is what distinguishes them.
 *
 * `permanent` is not a plan at all — it is the uncapped tier used for the
 * operator's own numbers, so it reads as "Admin" and never wears the brand
 * colour. Jade on this surface means money came in.
 */

export type PlanShape = {
  planTier: string;
  planPeriod: string | null;
  planExpiresAt: Date | null;
};

export type PlanLook = 'paid' | 'internal' | 'lapsed' | 'free';

/**
 * The plan as a word, plus how it should look.
 *
 * The expiry decides live-or-lapsed rather than the tier, because a gateway
 * may or may not reset the tier when a period ends.
 */
export function planLabel({ planTier, planPeriod, planExpiresAt }: PlanShape): {
  label: string;
  look: PlanLook;
} {
  const lapsed = planExpiresAt !== null && planExpiresAt.getTime() < Date.now();

  if (planTier === 'permanent') {
    // An expiry on an internal grant still ends it, so this is checked after
    // the tier but before the free fallback.
    return lapsed ? { label: 'Admin, ended', look: 'lapsed' } : { label: 'Admin', look: 'internal' };
  }

  if (lapsed) return { label: 'Lapsed', look: 'lapsed' };

  if (planTier === 'pro') {
    const period = planPeriod?.toLowerCase();
    if (period === 'weekly') return { label: 'Weekly', look: 'paid' };
    if (period === 'monthly') return { label: 'Monthly', look: 'paid' };
    // Granted by hand with no period set. Says what is true rather than
    // guessing a plan they never bought.
    return { label: 'Pro', look: 'paid' };
  }

  return { label: 'Free', look: 'free' };
}

const LOOK: Record<PlanLook, string> = {
  paid: 'bg-brand-tint text-brand-deep',
  internal: 'border border-line-strong bg-ground text-ink-2',
  lapsed: 'border border-line bg-ground-2 text-ink-2',
  free: '',
};

export function PlanBadge({ user }: { user: PlanShape }) {
  const { label, look } = planLabel(user);

  if (look === 'free') {
    return <span className="text-[13px] text-ink-3">{label}</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-[2px] text-[11.5px] ${LOOK[look]}`}
    >
      {label}
    </span>
  );
}
