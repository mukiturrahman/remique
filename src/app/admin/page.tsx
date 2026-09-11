import Link from 'next/link';

import { AlertIcon, ArrowIcon, PeopleIcon, SpendIcon } from '@/components/admin/icons';
import { PlanBadge } from '@/components/admin/plan-badge';
import { PeriodControl } from '@/components/admin/period-control';
import { UserSearch } from '@/components/admin/user-search';
import {
  countListedUsers,
  formatCost,
  formatDate,
  formatRevenue,
  formatTokens,
  getAttention,
  getAttentionUserIds,
  getDashboardTotals,
  isPeriod,
  listUsers,
  PAGE_SIZE,
  PERIOD_LABELS,
  type AttentionItem,
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
  { key: 'unsubscribed', label: 'Unsubscribed' },
];

/** The window named the way it reads inside a sentence, not as a control label. */
const PERIOD_PHRASE: Record<Period, string> = {
  all: 'so far',
  today: 'today',
  month: 'this month',
  '30d': 'in the last 30 days',
};

type View = 'everyone' | 'attention';

/** The attention reason, short enough to sit under a door. */
const KIND_NOTE: Record<AttentionItem['kind'], string> = {
  blocked: 'blocked',
  'over-cap': 'at the daily cap',
  lapsed: 'plan ended',
};

function isSort(value: string | undefined): value is UserSort {
  return value === 'cost' || value === 'recent' || value === 'joined' || value === 'unsubscribed';
}

/**
 * A figure inside the standing sentence.
 *
 * Mono and brand-coloured, so the reader's eye lands on the numbers while the
 * sentence around them stays prose. `tabular` keeps the digits aligned when
 * the period changes the figure's width.
 */
function Fig({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'alarm' }) {
  return (
    <span
      className={`tabular font-mono tracking-[-0.02em] ${
        tone === 'alarm' ? 'text-signal-ink' : 'text-brand'
      }`}
    >
      {children}
    </span>
  );
}

/** One of the three doors under the sentence. Hairline-separated, never a card. */
function Door({
  href,
  icon,
  label,
  value,
  note,
  active,
  quiet = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  active: boolean;
  /** True when there is nothing behind this door — it stays readable, not loud. */
  quiet?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className="group flex items-start gap-3 border-t border-line px-1 py-4 transition-colors first:border-t-0 sm:border-t-0 sm:border-l sm:px-5 sm:py-1 sm:first:border-l-0 sm:first:pl-0"
    >
      <span
        className={`mt-[3px] transition-colors ${
          quiet ? 'text-ink-3' : active ? 'text-brand' : 'text-ink-3 group-hover:text-brand'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={`block font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors ${
            active ? 'text-brand' : 'text-ink-3'
          }`}
        >
          {label}
        </span>
        <span
          className={`mt-1 flex items-center gap-1.5 font-display text-[19px] font-semibold tracking-tight ${
            quiet ? 'text-ink-3' : 'text-ink'
          }`}
        >
          {value}
          <ArrowIcon className="h-[15px] w-[15px] text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand" />
        </span>
        <span className="mt-0.5 block text-[13px] text-ink-3">{note}</span>
      </span>
    </Link>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <li className="border-t border-line first:border-t-0">
      <Link
        href={`/admin/users/${item.id}`}
        className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 transition-colors hover:bg-ground-2"
      >
        <span className="font-medium text-ink group-hover:text-brand-deep">
          {item.name ?? 'Unnamed'}
        </span>
        <span className="tabular font-mono text-[11.5px] text-ink-3">{item.phoneNumber}</span>
        <span
          className={`text-[13px] ${item.kind === 'lapsed' ? 'text-ink-2' : 'text-signal-ink'}`}
        >
          {item.reason}
        </span>
      </Link>
    </li>
  );
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  // In Next 15 searchParams is a Promise, like params.
  searchParams: Promise<{
    sort?: string;
    period?: string;
    page?: string;
    q?: string;
    view?: string;
  }>;
}) {
  const {
    sort: rawSort,
    period: rawPeriod,
    page: rawPage,
    q: rawQ,
    view: rawView,
  } = await searchParams;

  const sort: UserSort = isSort(rawSort) ? rawSort : 'cost';
  // Both values reach a database query, so both are narrowed to their union
  // before they get there rather than trusted from the URL.
  const period: Period = isPeriod(rawPeriod) ? rawPeriod : 'all';
  const view: View = rawView === 'attention' ? 'attention' : 'everyone';

  // Bounded before it reaches `contains`: an unbounded string from the URL has
  // no business being a LIKE pattern.
  const q = (rawQ ?? '').slice(0, 120).trim();

  // Clamped, not trusted: a negative or non-numeric page must not reach
  // Prisma's `skip`.
  const parsedPage = Number(rawPage);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const attention = await getAttention();
  // Only paid for when the attention view is actually open; the sentence and
  // the door need the count, which the list above already carries.
  const onlyIds = view === 'attention' ? await getAttentionUserIds() : null;

  const [users, totals, matchCount] = await Promise.all([
    listUsers({ sort, period, q, onlyIds, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getDashboardTotals(period),
    countListedUsers({ sort, period, q, onlyIds }),
  ]);

  const pageCount = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  const filtered = q !== '' || view === 'attention';

  const href = (next: {
    sort?: UserSort;
    period?: Period;
    page?: number;
    q?: string;
    view?: View;
  }) => {
    const params = new URLSearchParams();
    params.set('sort', next.sort ?? sort);

    const nextPeriod = next.period ?? period;
    if (nextPeriod !== 'all') params.set('period', nextPeriod);

    const nextQ = next.q ?? q;
    if (nextQ) params.set('q', nextQ);

    const nextView = next.view ?? view;
    if (nextView !== 'everyone') params.set('view', nextView);

    const nextPage = next.page ?? page;
    if (nextPage > 1) params.set('page', String(nextPage));

    return `/admin?${params.toString()}`;
  };

  // "No gateway yet" is a claim about the product, not about this window. A
  // quiet Tuesday must not render as "no payment system exists".
  const noPaymentsYet = !totals.hasEverBeenPaid;
  const phrase = PERIOD_PHRASE[period];
  const people = totals.users === 1 ? 'person has' : 'people have';

  return (
    <div>
      {/* ── The period control ─────────────────────────────────── */}
      <PeriodControl
        periods={PERIODS.map((key) => ({
          key,
          label: PERIOD_LABELS[key],
          href: href({ period: key, page: 1 }),
        }))}
        current={period}
      />

      {/* ── The standing sentence ────────────────────────────────
          Keyed on the period so React replaces the node rather than editing
          its text: the rise keyframe replays, and the sentence visibly
          rewrites itself instead of blinking to a new number.

          Deliberately not height-floored. The all-time phrasing runs two lines
          and the dated ones run three, so the doors do shift once when the
          period changes. Reserving the taller height would trade that single
          transient move for a permanent gap under the shorter sentence, which
          every visit would pay for. */}
      <section
        key={period}
        className="animate-[remique-rise_620ms_cubic-bezier(0.16,1,0.3,1)_both] pt-9 motion-reduce:animate-none"
      >
        <h1 className="max-w-[26ch] font-display text-[27px] font-semibold leading-[1.16] tracking-display sm:text-[34px] lg:text-[40px]">
          {period === 'all' ? (
            <>
              <Fig>{totals.users.toLocaleString()}</Fig> {people} used Remique, sending{' '}
              <Fig>{totals.messages.toLocaleString()}</Fig> messages.
            </>
          ) : totals.newUsers > 0 ? (
            <>
              <Fig>{totals.users.toLocaleString()}</Fig> {people} used Remique.{' '}
              <Fig>{totals.newUsers.toLocaleString()}</Fig> joined {phrase}, and{' '}
              <Fig>{totals.messages.toLocaleString()}</Fig> messages came through.
            </>
          ) : (
            <>
              <Fig>{totals.users.toLocaleString()}</Fig> {people} used Remique. Nobody new{' '}
              {phrase}, and <Fig>{totals.messages.toLocaleString()}</Fig> messages came through.
            </>
          )}
        </h1>

        <p className="mt-4 max-w-measure text-[15.5px] leading-relaxed text-ink-2">
          The models burned{' '}
          <span className="tabular font-mono text-ink">{formatTokens(totals.tokens)}</span> tokens{' '}
          {phrase}, costing{' '}
          <span className="tabular font-mono text-ink">{formatCost(totals.tokenCostMicros)}</span>.{' '}
          {noPaymentsYet ? (
            <>Nothing has come back the other way — there is no payment gateway yet.</>
          ) : (
            <>
              Customers paid{' '}
              <span className="tabular font-mono text-ink">
                {formatRevenue(totals.revenue, totals.revenueCurrency)}
              </span>
              {totals.revenueMixedCurrency
                ? ` — ${totals.revenueCurrency} only, other currencies are not in that figure.`
                : '.'}
            </>
          )}
        </p>

        {attention.length > 0 ? (
          <p className="mt-3 text-[15.5px] leading-relaxed">
            <Link
              href={href({ view: 'attention', page: 1 })}
              className="text-signal-ink underline decoration-signal-ink/35 underline-offset-[0.22em] transition-colors hover:decoration-signal-ink"
            >
              <span className="tabular font-mono">{attention.length}</span>{' '}
              {attention.length === 1 ? 'person needs' : 'people need'} you right now.
            </Link>
          </p>
        ) : null}
      </section>

      {/* ── The three doors ─────────────────────────────────────
          Each one carries a fact the sentence above did not say. A door that
          repeats the sentence's own figure is a metric tile, and this page
          exists to refuse those. */}
      <nav aria-label="Views" className="mt-10 sm:grid sm:grid-cols-3">
        <Door
          href={href({ view: 'everyone', sort: 'recent', page: 1, q: '' })}
          icon={<PeopleIcon className="h-[19px] w-[19px]" />}
          label="Everyone"
          value={`${totals.activeRecently.toLocaleString()} active`}
          note={
            totals.blocked > 0
              ? `in the last 7 days · ${totals.blocked} blocked`
              : 'in the last 7 days · nobody blocked'
          }
          active={view === 'everyone' && sort === 'recent'}
          quiet={totals.activeRecently === 0}
        />
        <Door
          href={href({ view: 'everyone', sort: 'cost', page: 1, q: '' })}
          icon={<SpendIcon className="h-[19px] w-[19px]" />}
          label="Spend"
          // Cost keeps the headline here even though the sentence says it too:
          // the operator asked for three questions of equal weight, and a door
          // whose headline is a person answers a different one.
          value={formatCost(totals.tokenCostMicros)}
          note={
            totals.topSpender
              ? `${totals.topSpender.name ?? 'Unnamed'} is the heaviest, at ${formatCost(totals.topSpender.costMicros)}`
              : `no model calls ${phrase}`
          }
          active={view === 'everyone' && sort === 'cost'}
          quiet={!totals.topSpender}
        />
        <Door
          href={href({ view: 'attention', page: 1, q: '' })}
          icon={<AlertIcon className="h-[19px] w-[19px]" />}
          label="Needs attention"
          value={attention.length > 0 ? (attention[0].name ?? 'Unnamed') : 'None'}
          note={
            attention.length > 0
              ? `${KIND_NOTE[attention[0].kind]}${
                  attention.length > 1 ? ` · ${attention.length - 1} more` : ''
                }`
              : 'nothing is wrong'
          }
          active={view === 'attention'}
          quiet={attention.length === 0}
        />
      </nav>

      {/* ── The attention list, only when that door is open ────── */}
      {view === 'attention' ? (
        <section className="mt-12">
          <h2 className="font-display text-[19px] font-semibold tracking-tight">Needs attention</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Blocked users first, then anyone at their daily cap, then plans that have ended.
          </p>

          {attention.length === 0 ? (
            <p className="mt-6 border-t border-line py-10 text-center text-[14px] text-ink-3">
              Nobody is blocked, nobody is at their cap, and no plan has lapsed.
            </p>
          ) : (
            <ul className="mt-4 border-t border-line">
              {attention.map((item) => (
                <AttentionRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* ── The table ──────────────────────────────────────────── */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-[19px] font-semibold tracking-tight">
              {view === 'attention' ? 'Those users in full' : 'Everyone'}
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">
              {q
                ? `${matchCount.toLocaleString()} ${matchCount === 1 ? 'match' : 'matches'} for “${q}”.`
                : period === 'all'
                  ? 'Lifetime activity and spend, per person.'
                  : `Usage columns cover ${PERIOD_LABELS[period].toLowerCase()}, with all-time figures underneath.`}
            </p>
          </div>

          <UserSearch q={q} sort={sort} period={period} clearHref={href({ q: '', page: 1 })} />
        </div>

        <nav
          aria-label="Sort users"
          className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2"
        >
          <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            Sort
          </span>
          {SORTS.map(({ key, label }) => (
            <Link
              key={key}
              href={href({ sort: key, page: 1 })}
              aria-current={key === sort ? 'true' : undefined}
              className={
                key === sort
                  ? 'rounded-full border border-line-strong px-3 py-1 text-[13px] text-ink'
                  : 'rounded-full border border-transparent px-3 py-1 text-[13px] text-ink-3 transition-colors hover:border-line hover:text-ink'
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        {users.length === 0 ? (
          <div className="mt-6 border-t border-line py-16 text-center">
            <p className="font-display text-[19px] font-semibold tracking-tight text-ink">
              {q
                ? `Nothing matches “${q}”.`
                : page > 1
                  ? 'No users on this page.'
                  : filtered
                    ? 'Nothing here.'
                    : 'No one has messaged Remique yet.'}
            </p>
            <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-relaxed text-ink-2">
              {q ? (
                'Search matches name, phone number and email. Partial numbers work.'
              ) : page > 1 ? (
                'Go back a page.'
              ) : filtered ? (
                'Open Everyone to see the full list.'
              ) : (
                <>
                  A user appears here the first time they message the bot on WhatsApp — there is
                  nothing to create by hand.
                </>
              )}
            </p>
            {(q || page > 1 || filtered) && (
              <Link
                href={href({ q: '', page: 1, view: 'everyone' })}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[14px] font-medium text-white shadow-lift transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-brand-deep hover:shadow-panel active:translate-y-px active:shadow-press"
              >
                Show everyone
                <ArrowIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Below `sm` the nine-column table is a horizontal scrollbar
                pretending to be a layout, so the same rows collapse into one
                hairline entry each. */}
            <ul className="mt-3 border-t border-line sm:hidden">
              {users.map((u) => (
                <li key={u.id} className="border-b border-line">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="block py-3.5 transition-colors hover:bg-ground-2"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium text-ink">{u.name ?? 'Unnamed'}</span>
                      <span
                        className={`shrink-0 text-[11.5px] ${
                          u.blockedAt ? 'text-signal-ink' : 'text-ink-3'
                        }`}
                      >
                        {u.blockedAt ? 'Blocked' : `seen ${formatDate(u.updatedAt)}`}
                      </span>
                    </div>
                    <div className="tabular mt-1 font-mono text-[11.5px] text-ink-3">
                      {u.phoneNumber}
                    </div>
                    <div className="tabular mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-ink-2">
                      <span>{u.periodMessages.toLocaleString()} msg</span>
                      <span>{formatTokens(u.periodTokens)} tokens</span>
                      <span className="text-ink">{formatCost(u.periodCostMicros)}</span>
                      <PlanBadge user={u} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-2 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[58rem] table-fixed border-collapse text-[14px]">
              <colgroup>
                <col className="w-[21%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-line-strong text-left font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink-3">
                  <th scope="col" className="py-2.5 pr-4 font-normal">
                    User
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-normal">
                    Joined
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-normal">
                    Plan &amp; cap
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-normal">
                    Messages
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-normal">
                    Tokens
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-normal">
                    Cost
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-normal">
                    Files
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-normal">
                    Reminders
                  </th>
                  <th scope="col" className="py-2.5 font-normal">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isUnlimited = u.planTier === 'permanent' || u.planTier === 'pro';
                  const effectiveDailyCap = u.dailyTokenCap ?? (isUnlimited ? null : 150_000);
                  const quiet = period !== 'all';

                  return (
                    <tr
                      key={u.id}
                      className="border-b border-line transition-colors hover:bg-ground-2 focus-within:bg-ground-2"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block rounded-[6px] transition-colors hover:text-brand-deep"
                        >
                          <span className="block font-medium text-ink">{u.name ?? 'Unnamed'}</span>
                          <span className="tabular block font-mono text-[11.5px] text-ink-3">
                            {u.phoneNumber}
                          </span>
                          {u.email ? (
                            <span className="block truncate font-mono text-[10.5px] text-ink-3">
                              {u.email}
                            </span>
                          ) : null}
                        </Link>
                      </td>

                      <td className="tabular py-3 pr-4 font-mono text-[11.5px] text-ink-3">
                        <div>{formatDate(u.createdAt)}</div>
                        <div className="mt-0.5 text-ink-3/80">last seen {formatDate(u.updatedAt)}</div>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-col items-start gap-1">
                          <PlanBadge user={u} />
                          <span className="tabular font-mono text-[11.5px] text-ink-3">
                            {isUnlimited
                              ? 'no cap'
                              : `${formatTokens(effectiveDailyCap)} / day`}
                          </span>
                        </div>
                      </td>

                      <td className="tabular py-3 pr-4 text-right font-mono">
                        <div
                          className={
                            quiet && u.periodMessages === 0 ? 'text-ink-3' : 'font-medium text-ink'
                          }
                        >
                          {u.periodMessages.toLocaleString()}
                        </div>
                        {quiet ? (
                          <div className="mt-0.5 text-[11.5px] text-ink-3">
                            {u._count.messages.toLocaleString()} all time
                          </div>
                        ) : null}
                      </td>

                      <td className="tabular py-3 pr-4 text-right font-mono">
                        <div
                          className={
                            quiet && u.periodTokens === 0 ? 'text-ink-3' : 'font-medium text-ink'
                          }
                        >
                          {formatTokens(u.periodTokens)}
                        </div>
                        {quiet ? (
                          <div className="mt-0.5 text-[11.5px] text-ink-3">
                            {formatTokens(u.totalInputTokens + u.totalOutputTokens)} all time
                          </div>
                        ) : null}
                      </td>

                      <td className="tabular py-3 pr-4 text-right font-mono">
                        <div
                          className={
                            quiet && u.periodCostMicros === 0 ? 'text-ink-3' : 'font-medium text-ink'
                          }
                        >
                          {formatCost(u.periodCostMicros)}
                        </div>
                        {quiet ? (
                          <div className="mt-0.5 text-[11.5px] text-ink-3">
                            {formatCost(u.totalCostMicros)} all time
                          </div>
                        ) : null}
                      </td>

                      <td className="tabular py-3 pr-4 text-right font-mono text-ink-2">
                        {u._count.documents}
                      </td>
                      <td className="tabular py-3 pr-4 text-right font-mono text-ink-2">
                        {u._count.reminders}
                      </td>

                      <td className="py-3">
                        {u.blockedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-signal-ink">
                            <span className="h-1.5 w-1.5 rounded-full bg-signal-ink" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}

        {pageCount > 1 ? (
          <div className="mt-5 flex items-center justify-between gap-4 text-[14px]">
            <span className="tabular text-ink-3">
              Page {page} of {pageCount} · {users.length} of {matchCount.toLocaleString()} shown
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={href({ page: page - 1 })}
                  className="rounded-full border border-line px-4 py-1.5 transition-colors hover:border-line-strong hover:bg-ground-2"
                >
                  Previous
                </Link>
              ) : null}
              {page < pageCount ? (
                <Link
                  href={href({ page: page + 1 })}
                  className="rounded-full border border-line px-4 py-1.5 transition-colors hover:border-line-strong hover:bg-ground-2"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
