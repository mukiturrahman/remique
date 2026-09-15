'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { button, field, legend } from './controls';
import { CalendarIcon, ChevronDownIcon } from './icons';

const TIERS = [
  { value: 'free', label: 'Free', note: 'Standard token caps apply.' },
  {
    value: 'pro',
    label: 'Pro',
    note: 'A paying customer. No token caps, and the reminder service treats them as paid.',
  },
  {
    value: 'permanent',
    label: 'Admin',
    note: 'Your own numbers and anyone comped. No token caps, but not a paying customer.',
  },
] as const;

/** The two plans that actually exist, mirrored from `src/lib/bdapps/types.ts`. */
const PERIODS = [
  { value: 'weekly', label: 'Weekly · ৳49' },
  { value: 'monthly', label: 'Monthly · ৳190' },
] as const;

export function PlanForm({
  userId,
  planTier,
  planPeriod,
  /** `YYYY-MM-DD` in Asia/Dhaka, or empty when the plan has no end. */
  expiresOn,
}: {
  userId: string;
  planTier: string;
  planPeriod: string | null;
  expiresOn: string;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(TIERS.some((t) => t.value === planTier) ? planTier : 'free');
  // Defaults to monthly so a granted pro always carries a real plan; a bare
  // "Pro" with no period is what the table used to have to show.
  const [period, setPeriod] = useState(planPeriod === 'weekly' ? 'weekly' : 'monthly');
  const [expiry, setExpiry] = useState(expiresOn);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = tier === 'pro';
  const dirty =
    tier !== planTier || expiry !== expiresOn || (isPro && period !== (planPeriod ?? ''));
  const active = TIERS.find((t) => t.value === tier) ?? TIERS[0];

  const dateRef = useRef<HTMLInputElement>(null);

  /** The drawn calendar mark opens the real picker; focus is the fallback. */
  function openPicker() {
    const input = dateRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    // The date field gives a bare calendar day. Pinned to the end of that day
    // in Dhaka, so a plan set to expire "on the 12th" is still live all of the
    // 12th for the person living in it.
    const expiresAt = tier === 'free' || !expiry ? null : `${expiry}T23:59:59+06:00`;

    const response = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, period: isPro ? period : null, expiresAt }),
    }).catch(() => null);

    if (!response) {
      setError('Could not reach the server.');
      setBusy(false);
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? `Failed (${response.status})`);
      setBusy(false);
      return;
    }

    setSaved(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="plan-tier" className={`${legend} block`}>
            Tier
          </label>
          {/* The browser's own chevron and calendar glyph belong to no design
              system. Both controls stay native — they are just wearing this
              one's marks. */}
          <div className="relative mt-2">
            <select
              id="plan-tier"
              value={tier}
              onChange={(e) => {
                setTier(e.target.value);
                setSaved(false);
              }}
              className={`appearance-none pr-10 ${field}`}
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          </div>
        </div>

        <div>
          <label htmlFor="plan-period" className={`${legend} block`}>
            Plan
          </label>
          <div className="relative mt-2">
            <select
              id="plan-period"
              value={isPro ? period : ''}
              disabled={!isPro}
              onChange={(e) => {
                setPeriod(e.target.value);
                setSaved(false);
              }}
              className={`appearance-none pr-10 ${field}`}
            >
              {isPro ? (
                PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))
              ) : (
                <option value="">Not on a paid plan</option>
              )}
            </select>
            <ChevronDownIcon
              className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isPro ? 'text-ink-3' : 'text-line-strong'
              }`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="plan-expiry" className={`${legend} block`}>
            Ends on
          </label>
          <div className="relative mt-2">
            <input
              id="plan-expiry"
              ref={dateRef}
              type="date"
              value={tier === 'free' ? '' : expiry}
              disabled={tier === 'free'}
              onChange={(e) => {
                setExpiry(e.target.value);
                setSaved(false);
              }}
              className={`tabular font-mono pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 ${field}`}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              disabled={tier === 'free'}
              onClick={openPicker}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 transition-colors hover:text-brand disabled:text-line-strong disabled:hover:text-line-strong"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-measure text-[13px] leading-relaxed text-ink-2">
        {active.note}{' '}
        {tier === 'free'
          ? 'Moving someone back to free clears their plan dates as well.'
          : expiry
            ? 'It lapses at the end of that day, Dhaka time, and they appear under Needs attention.'
            : 'With no end date it stays live until you change it by hand.'}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-signal-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={busy || !dirty} className={button.primary}>
          {busy ? 'Saving…' : 'Save plan'}
        </button>
        {saved && !dirty ? (
          <span role="status" className="text-[13px] text-brand-deep">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
