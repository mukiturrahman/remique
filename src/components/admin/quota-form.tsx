'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function QuotaForm({
  userId,
  dailyTokenCap,
  weeklyTokenCap,
  defaultDaily,
  defaultWeekly,
}: {
  userId: string;
  dailyTokenCap: number | null;
  weeklyTokenCap: number | null;
  defaultDaily: number;
  defaultWeekly: number;
}) {
  const router = useRouter();
  const [daily, setDaily] = useState(dailyTokenCap === null ? '' : String(dailyTokenCap));
  const [weekly, setWeekly] = useState(weeklyTokenCap === null ? '' : String(weeklyTokenCap));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    // An empty field means "inherit the global default", which is null on the
    // wire — not zero, which would block the user entirely.
    const response = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyTokenCap: daily.trim() === '' ? null : Number(daily),
        weeklyTokenCap: weekly.trim() === '' ? null : Number(weekly),
      }),
    });

    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'Saved' : (body.error ?? `Failed (${response.status})`));
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="flex gap-4">
        <label className="flex-1 text-sm">
          <span className="block text-ink-2">Daily token cap</span>
          <input
            type="number"
            min={0}
            step={1}
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            placeholder={`${defaultDaily} (default)`}
            className="mt-1 w-full rounded-md border border-line bg-ground px-3 py-2 font-mono text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="block text-ink-2">Weekly token cap</span>
          <input
            type="number"
            min={0}
            step={1}
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
            placeholder={`${defaultWeekly} (default)`}
            className="mt-1 w-full rounded-md border border-line bg-ground px-3 py-2 font-mono text-sm outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ground-2 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save caps'}
        </button>
        <span className="text-xs text-ink-3">Leave blank to inherit the global default.</span>
        {message ? <span className="text-xs text-ink-2">{message}</span> : null}
      </div>
    </form>
  );
}
