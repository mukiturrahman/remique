'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BlockToggle({ userId, blocked }: { userId: string; blocked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    // Blocking cuts a real person off mid-conversation; unblocking is harmless,
    // so only one direction asks.
    if (!blocked && !confirm('Block this user? They will stop getting replies.')) return;

    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: !blocked }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? `Failed (${response.status})`);
      setBusy(false);
      return;
    }

    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={
          blocked
            ? 'rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ground-2 disabled:opacity-50'
            : 'rounded-md bg-signal-ink px-3 py-1.5 text-sm text-white disabled:opacity-50'
        }
      >
        {busy ? '…' : blocked ? 'Unblock' : 'Block user'}
      </button>
      {error ? <span className="text-xs text-signal-ink">{error}</span> : null}
    </div>
  );
}
