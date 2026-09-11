'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { button, field, legend } from './controls';

export function BlockToggle({ userId, blocked }: { userId: string; blocked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Blocking cuts a real person off mid-conversation, so it takes a second
  // deliberate press. Inline rather than a window.confirm: the reason is worth
  // capturing, and a browser dialog cannot hold a field.
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  async function send(next: boolean) {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: next, reason: next ? reason : undefined }),
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

    setConfirming(false);
    setReason('');
    router.refresh();
    setBusy(false);
  }

  if (blocked) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        {error ? (
          <span role="alert" className="text-[13px] text-signal-ink">
            {error}
          </span>
        ) : null}
        <button onClick={() => send(false)} disabled={busy} className={button.quiet}>
          {busy ? 'Unblocking…' : 'Unblock'}
        </button>
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        {error ? (
          <span role="alert" className="text-[13px] text-signal-ink">
            {error}
          </span>
        ) : null}
        <button onClick={() => setConfirming(true)} className={button.quiet}>
          Block user
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-[16px] border border-line bg-ground-2 p-4">
      <p className="text-[14px] leading-relaxed text-ink-2">
        Blocking stops every reply. They keep messaging and hear nothing back, apart from one
        notice.
      </p>

      <label htmlFor="block-reason" className={`${legend} mt-4 block`}>
        Reason (optional)
      </label>
      <input
        id="block-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Only you will see this"
        className={`mt-2 ${field} bg-ground`}
        autoFocus
      />

      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-signal-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => send(true)} disabled={busy} className={button.danger}>
          {busy ? 'Blocking…' : 'Block them'}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={busy}
          className={button.quiet}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
