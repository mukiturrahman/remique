import Link from 'next/link';

import {
  formatCost,
  formatDate,
  formatRevenue,
  formatTokens,
  getDashboardTotals,
  isPeriod,
  listUsers,
  PAGE_SIZE,
  PERIOD_LABELS,
  type Period,
  type UserSort,
} from '@/lib/admin-queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERIODS: Period[] = ['all', 'today', 'month', '30d'];

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

/**
 * What plan a user is on, and whether it is still live.
 *
 * `planTier` alone is not enough: a gateway may or may not reset the tier when
 * a period lapses, so the expiry date is what decides whether to show this as
 * active or lapsed.
 */
function PlanBadge({ tier, expiresAt }: { tier: string; expiresAt: Date | null }) {
  const lapsed = expiresAt !== null && expiresAt.getTime() < Date.now();

  if (tier === 'free' && !lapsed) {
    return <span className="text-xs text-ink-3">Free</span>;
  }

  if (lapsed) {
    return (
      <span className="rounded bg-ground-3 px-2 py-0.5 text-xs text-ink-2">
        Lapsed
      </span>
    );
  }

  return (
    <span className="rounded bg-brand-tint px-2 py-0.5 text-xs capitalize text-brand-deep">
      {tier}
    </span>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  // In Next 15 searchParams is a Promise, like params.
  searchParams: Promise<{ sort?: string; period?: string; page?: string }>;
}) {
  const { sort: rawSort, period: rawPeriod, page: rawPage } = await searchParams;
  const sort: UserSort = isSort(rawSort) ? rawSort : 'cost';
  // Both values reach a database query, so both are narrowed to their union
  // before they get there rather than trusted from the URL.
  const period: Period = isPeriod(rawPeriod) ? rawPeriod : 'all';

  // Clamped, not trusted: a negative or non-numeric page must not reach
  // Prisma's `skip`.
  const parsedPage = Number(rawPage);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [users, totals] = await Promise.all([
    listUsers({ sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getDashboardTotals(period),
  ]);

  const pageCount = Math.max(1, Math.ceil(totals.users / PAGE_SIZE));
  const href = (next: { sort?: UserSort; period?: Period; page?: number }) => {
    const params = new URLSearchParams();
    params.set('sort', next.sort ?? sort);
    const nextPeriod = next.period ?? period;
    if (nextPeriod !== 'all') params.set('period', nextPeriod);
    const nextPage = next.page ?? page;
    if (nextPage > 1) params.set('page', String(nextPage));
    return `/admin?${params.toString()}`;
  };

  // "No gateway yet" is a claim about the product, not about this window. A
  // quiet Tuesday must not render as "no payment system exists".
  const noPaymentsYet = !totals.hasEverBeenPaid;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-display">Overview</h1>
          <p className="mt-1 text-sm text-ink-3">
            {period === 'all'
              ? `All ${totals.users} users, all time.`
              : `Revenue, tokens and cost cover ${PERIOD_LABELS[period].toLowerCase()}. Headcount is always current.`}
          </p>
        </div>

        <nav className="flex gap-1 text-sm">
          {PERIODS.map((key) => (
            <Link
              key={key}
              href={href({ period: key, page: 1 })}
              className={
                key === period
                  ? 'rounded-md bg-brand-tint px-3 py-1.5 text-brand-deep'
                  : 'rounded-md px-3 py-1.5 text-ink-3 hover:text-ink'
              }
            >
              {PERIOD_LABELS[key]}
            </Link>
          ))}
        </nav>

        <nav className="flex gap-1 text-sm">
          {SORTS.map(({ key, label }) => (
            <Link
              key={key}
              href={href({ sort: key, page: 1 })}
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
          note={
            [
              period !== 'all' ? `+${totals.newUsers} new` : null,
              totals.blocked > 0 ? `${totals.blocked} blocked` : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
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
          note={
            noPaymentsYet
              ? 'No subscriptions yet'
              : period === 'all'
                ? 'Paid period ended'
                : `Lapsed ${PERIOD_LABELS[period].toLowerCase()}`
          }
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
              <th className="py-2 pr-4 font-medium">Plan</th>
              <th className="py-2 pr-4 text-right font-medium">Messages</th>
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
                  {formatDate(u.createdAt)}
                </td>
                <td className="py-3 pr-4">
                  <PlanBadge tier={u.planTier} expiresAt={u.planExpiresAt} />
                </td>
                <td className="py-3 pr-4 text-right font-mono">{u._count.messages}</td>
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
          <p className="py-12 text-center text-sm text-ink-3">
            {page > 1 ? 'No users on this page.' : 'No users yet.'}
          </p>
        ) : null}

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-3">
            Page {page} of {pageCount} · showing {users.length} of {totals.users}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={href({ page: page - 1 })}
                className="rounded-md border border-line px-3 py-1.5 hover:bg-ground-2"
              >
                Previous
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={href({ page: page + 1 })}
                className="rounded-md border border-line px-3 py-1.5 hover:bg-ground-2"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
