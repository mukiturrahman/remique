'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { button, field, legend } from './controls';

export function QuotaForm({
  userId,
  dailyTokenCap,
  weeklyTokenCap,
  defaultDaily,
  defaultWeekly,
  isUnlimited = false,
}: {
  userId: string;
  dailyTokenCap: number | null;
  weeklyTokenCap: number | null;
  defaultDaily: number;
  defaultWeekly: number;
  isUnlimited?: boolean;
}) {
  const router = useRouter();
  const [daily, setDaily] = useState(dailyTokenCap === null ? '' : String(dailyTokenCap));
  const [weekly, setWeekly] = useState(weeklyTokenCap === null ? '' : String(weeklyTokenCap));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    daily !== (dailyTokenCap === null ? '' : String(dailyTokenCap)) ||
    weekly !== (weeklyTokenCap === null ? '' : String(weeklyTokenCap));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    // An empty field means "inherit the global default", which is null on the
    // wire — not zero, which would block the user entirely.
    const response = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyTokenCap: daily.trim() === '' ? null : Number(daily),
        weeklyTokenCap: weekly.trim() === '' ? null : Number(weekly),
      }),
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

  const placeholder = isUnlimited ? 'no cap' : null;

  return (
    <form onSubmit={save} className="max-w-xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="daily-cap" className={`${legend} block`}>
            Daily token cap
          </label>
          <input
            id="daily-cap"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={daily}
            onChange={(e) => {
              setDaily(e.target.value);
              setSaved(false);
            }}
            placeholder={placeholder ?? `${defaultDaily.toLocaleString()} by default`}
            className={`tabular mt-2 font-mono ${field}`}
          />
        </div>

        <div>
          <label htmlFor="weekly-cap" className={`${legend} block`}>
            Weekly token cap
          </label>
          <input
            id="weekly-cap"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={weekly}
            onChange={(e) => {
              setWeekly(e.target.value);
              setSaved(false);
            }}
            placeholder={placeholder ?? `${defaultWeekly.toLocaleString()} by default`}
            className={`tabular mt-2 font-mono ${field}`}
          />
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        Leave a field blank to inherit the global default.
        {isUnlimited
          ? ' This plan ignores caps entirely, so a number here only takes effect if the plan changes.'
          : ' Zero is a real cap — it refuses every reply.'}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-signal-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={busy || !dirty} className={button.primary}>
          {busy ? 'Saving…' : 'Save caps'}
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
