import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-auth';

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
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href={signedIn ? '/admin' : '/admin/login'}
            className="font-display text-lg tracking-tight"
          >
            Remique <span className="text-ink-3">admin</span>
          </Link>
          {signedIn ? (
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="text-sm text-ink-3 hover:text-ink">
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
