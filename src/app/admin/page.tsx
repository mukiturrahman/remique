import Link from 'next/link';

import {
  formatCost,
  formatRevenue,
  formatTokens,
  getDashboardTotals,
  listUsers,
  type UserSort,
} from '@/lib/admin-queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORTS: Array<{ key: UserSort; label: string }> = [
  { key: 'cost', label: 'Cost' },
  { key: 'recent', label: 'Recently active' },
  { key: 'joined', label: 'Newest' },
];

function isSort(value: string | undefined): value is UserSort {
  return value === 'cost' || value === 'recent' || value === 'joined';
}

function SummaryTile({
  label,
  value,
  note,
  muted = false,
}: {
  label: string;
  value: string;
  note?: string;
  /** Dims the figure when it has no real source yet, so a zero does not read
   *  as a measurement. */
  muted?: boolean;
}) {
  return (
    <div className="border-l border-line pl-4 first:border-l-0 first:pl-0">
      <div className="text-xs uppercase tracking-wide text-ink-3">{label}</div>
      <div className={`mt-1 font-mono text-xl ${muted ? 'text-ink-3' : 'text-ink'}`}>{value}</div>
      {note ? <div className="mt-0.5 text-xs text-ink-3">{note}</div> : null}
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  // In Next 15 searchParams is a Promise, like params.
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort: UserSort = isSort(rawSort) ? rawSort : 'cost';

  const [users, totals] = await Promise.all([
    listUsers({ sort, limit: 100 }),
    getDashboardTotals(),
  ]);

  // Zero PAID payments means no gateway has ever written a row, which is a
  // different statement from "we earned nothing". The tiles say so.
  const noPaymentsYet = totals.revenue === 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-display">Overview</h1>
          <p className="mt-1 text-sm text-ink-3">
            Every figure below covers all {totals.users} users, not the {users.length} rows shown.
          </p>
        </div>

        <nav className="flex gap-1 text-sm">
          {SORTS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/admin?sort=${key}`}
              className={
                key === sort
                  ? 'rounded-md bg-brand-tint px-3 py-1.5 text-brand-deep'
                  : 'rounded-md px-3 py-1.5 text-ink-3 hover:text-ink'
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 border-y border-line py-6 md:grid-cols-5">
        <SummaryTile
          label="Total users"
          value={totals.users.toLocaleString()}
          note={totals.blocked > 0 ? `${totals.blocked} blocked` : undefined}
        />
        <SummaryTile
          label="Revenue collected"
          value={formatRevenue(totals.revenue, totals.revenueCurrency)}
          note={
            noPaymentsYet
              ? 'No payment gateway yet'
              : totals.revenueMixedCurrency
                ? `${totals.revenueCurrency} only — other currencies not included`
                : undefined
          }
          muted={noPaymentsYet}
        />
        <SummaryTile label="Tokens used" value={formatTokens(totals.tokens)} />
        <SummaryTile
          label="Token cost"
          value={formatCost(totals.tokenCostMicros)}
          note="What we paid OpenAI"
        />
        <SummaryTile
          label="Unsubscribed"
          value={totals.unsubscribed.toLocaleString()}
          note={noPaymentsYet ? 'No subscriptions yet' : 'Paid period ended'}
          muted={noPaymentsYet}
        />
      </div>

      <h2 className="mt-8 font-display text-lg tracking-tight">Users</h2>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-3">
              <th className="py-2 pr-4 font-medium">User</th>
              <th className="py-2 pr-4 font-medium">Joined</th>
              <th className="py-2 pr-4 text-right font-medium">Messages</th>
              <th className="py-2 pr-4 text-right font-medium">Calls</th>
              <th className="py-2 pr-4 text-right font-medium">Tokens</th>
              <th className="py-2 pr-4 text-right font-medium">Cost</th>
              <th className="py-2 pr-4 text-right font-medium">Files</th>
              <th className="py-2 pr-4 text-right font-medium">Reminders</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line hover:bg-ground-2">
                <td className="py-3 pr-4">
                  <Link href={`/admin/users/${u.id}`} className="hover:text-brand-deep">
                    <span className="block">{u.name ?? 'Unnamed'}</span>
                    <span className="block font-mono text-xs text-ink-3">{u.phoneNumber}</span>
                  </Link>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-ink-3">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="py-3 pr-4 text-right font-mono">{u._count.messages}</td>
                <td className="py-3 pr-4 text-right font-mono">{u.totalLlmCalls}</td>
                <td className="py-3 pr-4 text-right font-mono">
                  {formatTokens(u.totalInputTokens + u.totalOutputTokens)}
                </td>
                <td className="py-3 pr-4 text-right font-mono">{formatCost(u.totalCostMicros)}</td>
                <td className="py-3 pr-4 text-right font-mono">{u._count.documents}</td>
                <td className="py-3 pr-4 text-right font-mono">{u._count.reminders}</td>
                <td className="py-3">
                  {u.blockedAt ? (
                    <span className="rounded bg-signal-ink px-2 py-0.5 text-xs text-white">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-xs text-ink-3">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-3">No users yet.</p>
        ) : null}
      </div>
    </div>
  );
}
