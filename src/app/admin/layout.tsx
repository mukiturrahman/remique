import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { BellMark, SignOutIcon } from '@/components/admin/icons';
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-auth';
import { ADMIN_TIMEZONE } from '@/lib/admin-queries';

export const metadata: Metadata = {
  title: 'Remique Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The login page shares this shell, so the header has to know whether anyone
  // is actually signed in — otherwise it offers "Sign out" to someone who is
  // looking at the sign-in form.
  const store = await cookies();
  const signedIn = await verifySessionToken(store.get(ADMIN_COOKIE)?.value);

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-ground/95 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href={signedIn ? '/admin' : '/admin/login'}
            className="group flex items-center gap-2.5 rounded-[6px] outline-none"
          >
            <BellMark className="h-[26px] w-[26px]" />
            <span className="font-display text-[19px] font-semibold tracking-tight">Remique</span>
            <span className="rounded-full border border-line px-2 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink-3 transition-colors group-hover:border-line-strong group-hover:text-ink-2">
              admin
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <span className="hidden font-mono text-[11.5px] uppercase tracking-[0.11em] text-ink-3 sm:block">
              {ADMIN_TIMEZONE.replace('_', ' ')} · UTC+6
            </span>
            {signedIn ? (
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-[6px] text-[14px] text-ink-3 transition-colors hover:text-ink"
                >
                  <SignOutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8">{children}</main>
    </div>
  );
}
