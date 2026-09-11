'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { button, field, legend } from './controls';
import { ArrowIcon } from './icons';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);

    if (response?.ok) {
      // refresh() first so the server components re-render with the new
      // cookie; push() alone can land on a cached unauthenticated render.
      router.refresh();
      router.push('/admin');
      return;
    }

    if (!response) {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
      return;
    }

    const body = await response.json().catch(() => ({ error: 'Sign in failed' }));
    setError(body.error ?? 'Sign in failed');
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="password" className={`${legend} block`}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
          className={`mt-2 font-mono ${field} ${error ? 'border-signal-ink' : ''}`}
          required
        />
      </div>

      {error ? (
        <p id="login-error" role="alert" className="text-[14px] text-signal-ink">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy || password.length === 0} className={`w-full ${button.primary}`}>
        {busy ? 'Checking…' : 'Sign in'}
        {busy ? null : <ArrowIcon className="h-4 w-4" />}
      </button>
    </form>
  );
}
