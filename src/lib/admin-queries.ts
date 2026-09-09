import { DateTime } from 'luxon';

import { prisma } from './db';
import { env } from './env';

export type UserSort = 'cost' | 'recent' | 'joined' | 'unsubscribed';

/**
 * The window the overview is scoped to.
 *
 * Boundaries are computed in Asia/Dhaka, not UTC. "This month" has to mean the
 * month the operator is living in, or the figure is wrong for the first and
 * last six hours of every month.
 */
export type Period = 'all' | 'today' | 'month' | '30d';

export const ADMIN_TIMEZONE = 'Asia/Dhaka';

export const PERIOD_LABELS: Record<Period, string> = {
  all: 'All time',
  today: 'Today',
  month: 'This month',
  '30d': 'Last 30 days',
};

export function isPeriod(value: string | undefined): value is Period {
  return value === 'all' || value === 'today' || value === 'month' || value === '30d';
}

/** Null for 'all' — an unbounded window, which Prisma expresses by omitting the filter. */
export function periodStart(period: Period): Date | null {
  if (period === 'all') return null;

  const now = DateTime.now().setZone(ADMIN_TIMEZONE);
  if (period === 'today') return now.startOf('day').toJSDate();
  if (period === 'month') return now.startOf('month').toJSDate();
  return now.minus({ days: 30 }).toJSDate();
}

/** Rows per page in the user list. */
export const PAGE_SIZE = 50;

const ORDER_BY: Record<UserSort, Record<string, 'asc' | 'desc'>> = {
  cost: { totalCostMicros: 'desc' },
  recent: { updatedAt: 'desc' },
  joined: { createdAt: 'desc' },
  unsubscribed: { planExpiresAt: 'desc' },
};

const USER_SELECT = {
  id: true,
  name: true,
  phoneNumber: true,
  email: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  blockedAt: true,
  blockedReason: true,
  totalInputTokens: true,
  totalOutputTokens: true,
  totalCostMicros: true,
  totalLlmCalls: true,
  dailyTokenCap: true,
  weeklyTokenCap: true,
  planTier: true,
  planExpiresAt: true,
  _count: {
    select: { messages: true, documents: true, reminders: true, facts: true },
  },
} as const;

export interface ListUsersOptions {
  sort?: UserSort;
  period?: Period;
  limit?: number;
  offset?: number;
}

/**
 * The user list.
 *
 * When period is 'all', reads the denormalised counters on `users` directly.
 * When period is scoped ('today', 'month', '30d'), aggregates `usage_events`
 * and `messages` for that time window and merges period metrics into each row.
 */
export async function listUsers(options: ListUsersOptions = {}) {
  const { sort = 'cost', period = 'all', limit = PAGE_SIZE, offset = 0 } = options;
  const start = periodStart(period);
  
  const baseWhere = sort === 'unsubscribed' ? {
    planExpiresAt: {
      not: null,
      lt: new Date(),
      ...(start ? { gte: start } : {}),
    },
  } : undefined;

  if (!start || period === 'all') {
    const users = await prisma.user.findMany({
      where: baseWhere,
      orderBy: ORDER_BY[sort] ?? ORDER_BY.cost,
      take: limit,
      skip: offset,
      select: USER_SELECT,
    });

    return users.map((u) => ({
      ...u,
      periodTokens: u.totalInputTokens + u.totalOutputTokens,
      periodCostMicros: u.totalCostMicros,
      periodMessages: u._count.messages,
      periodLlmCalls: u.totalLlmCalls,
    }));
  }

  type SelectedUser = Awaited<
    ReturnType<typeof prisma.user.findMany<{ select: typeof USER_SELECT }>>
  >[number];

  let pageUsers: SelectedUser[] = [];

  if (sort === 'cost') {
    // 1. Group usage_events by user for the period to find top spenders in this window
    const periodUsage = await prisma.usageEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: start } },
      _sum: { costMicros: true },
    });

    // Sort active users by period cost descending
    const sortedActive = periodUsage.sort(
      (a, b) => (b._sum.costMicros ?? 0) - (a._sum.costMicros ?? 0)
    );
    const activeUserIds = sortedActive.map((u) => u.userId);

    const pageUserIds: string[] = [];
    if (offset < activeUserIds.length) {
      pageUserIds.push(...activeUserIds.slice(offset, offset + limit));
    }

    const needed = limit - pageUserIds.length;
    if (needed > 0) {
      const inactiveOffset = Math.max(0, offset - activeUserIds.length);
      const inactiveUsers = await prisma.user.findMany({
        where: { id: { notIn: activeUserIds } },
        orderBy: { totalCostMicros: 'desc' },
        skip: inactiveOffset,
        take: needed,
        select: { id: true },
      });
      pageUserIds.push(...inactiveUsers.map((u) => u.id));
    }

    if (pageUserIds.length === 0) {
      return [];
    }

    const fetchedUsers = await prisma.user.findMany({
      where: { id: { in: pageUserIds } },
      select: USER_SELECT,
    });

    const userMap = new Map(fetchedUsers.map((u) => [u.id, u]));
    pageUsers = pageUserIds
      .map((id) => userMap.get(id))
      .filter((u): u is SelectedUser => Boolean(u));
  } else {
    pageUsers = await prisma.user.findMany({
      where: baseWhere,
      orderBy: ORDER_BY[sort] ?? ORDER_BY.recent,
      take: limit,
      skip: offset,
      select: USER_SELECT,
    });
  }

  if (pageUsers.length === 0) {
    return [];
  }

  const pageUserIds = pageUsers.map((u) => u.id);

  // Fetch period usage & message counts for the users on this page
  const [usageGroups, messageGroups] = await Promise.all([
    prisma.usageEvent.groupBy({
      by: ['userId'],
      where: {
        userId: { in: pageUserIds },
        createdAt: { gte: start },
      },
      _sum: { inputTokens: true, cachedTokens: true, outputTokens: true, costMicros: true },
      _count: { id: true },
    }),
    prisma.message.groupBy({
      by: ['userId'],
      where: {
        userId: { in: pageUserIds },
        createdAt: { gte: start },
      },
      _count: { id: true },
    }),
  ]);

  const usageMap = new Map(
    usageGroups.map((g) => [
      g.userId,
      {
        tokens: (g._sum.inputTokens ?? 0) - (g._sum.cachedTokens ?? 0) + (g._sum.outputTokens ?? 0),
        costMicros: g._sum.costMicros ?? 0,
        calls: g._count.id,
      },
    ])
  );

  const messagesMap = new Map(messageGroups.map((g) => [g.userId, g._count.id]));

  return pageUsers.map((u) => {
    const usage = usageMap.get(u.id);
    return {
      ...u,
      periodTokens: usage?.tokens ?? 0,
      periodCostMicros: usage?.costMicros ?? 0,
      periodMessages: messagesMap.get(u.id) ?? 0,
      periodLlmCalls: usage?.calls ?? 0,
    };
  });
}

export type UserListRow = Awaited<ReturnType<typeof listUsers>>[number];


export interface DashboardTotals {
  period: Period;
  /**
   * Whether a PAID payment has EVER been recorded, regardless of the window.
   *
   * Separate from `revenue` on purpose: a period with no revenue and a product
   * with no payment system are different facts, and the UI must not render the
   * second when it means the first.
   */
  hasEverBeenPaid: boolean;
  /** Every user, always — a headcount is a stock, not something a date window changes. */
  users: number;
  /** Users who joined inside the window. Equals `users` when the period is 'all'. */
  newUsers: number;
  blocked: number;
  /** Paid periods that ended inside the window. See getDashboardTotals(). */
  unsubscribed: number;

  // ── Flows: these DO scope to the window ────────────────────────
  tokens: number;
  /** What we paid OpenAI, in USD micros. */
  tokenCostMicros: number;
  /** What customers paid us, in `revenueCurrency`. Zero until a gateway lands. */
  revenue: number;
  revenueCurrency: string;
  /**
   * True when PAID payments exist in more than one currency. The revenue
   * figure then covers only `revenueCurrency` and understates the rest, so the
   * UI has to say so rather than quietly showing a wrong total.
   */
  revenueMixedCurrency: boolean;
}

/**
 * The figures across the whole table, not the page being shown.
 *
 * Split deliberately into stocks and flows. Headcount and block count are
 * stocks — "how many users did I have in March" is not a question this answers,
 * and pretending otherwise would need daily snapshots we do not keep. Revenue,
 * tokens and cost are flows and scope to the window.
 *
 * The flow figures come from `usage_events` and `payments` rather than the
 * denormalised counters on `users`, because those counters are lifetime totals
 * and cannot be sliced by date at all.
 */
export async function getDashboardTotals(period: Period = 'all'): Promise<DashboardTotals> {
  const now = new Date();
  const start = periodStart(period);

  // Every window ends at "now", so the upper bound is implicit everywhere.
  const inWindow = start ? { gte: start } : undefined;

  const [users, newUsers, blocked, unsubscribed, usageAgg, revenueByCurrency, paidEver] =
    await Promise.all([
    prisma.user.count(),
    start ? prisma.user.count({ where: { createdAt: inWindow } }) : prisma.user.count(),
    prisma.user.count({ where: { blockedAt: { not: null } } }),

    // "Unsubscribed" = a paid period that has already ended. Keyed on
    // planExpiresAt rather than planTier so it still counts correctly if a
    // future gateway resets the tier to "free" on lapse.
    prisma.user.count({
      where: { planExpiresAt: { not: null, lt: now, ...(start ? { gte: start } : {}) } },
    }),

    prisma.usageEvent.aggregate({
      where: start ? { createdAt: inWindow } : undefined,
      _sum: { inputTokens: true, cachedTokens: true, outputTokens: true, costMicros: true },
    }),

    // Grouped, because adding up two currencies produces a number that means
    // nothing. Only PAID counts — a PENDING or FAILED row is not revenue.
    prisma.payment.groupBy({
      by: ['currency'],
      where: { status: 'PAID', ...(start ? { createdAt: inWindow } : {}) },
      _sum: { amount: true },
    }),

    // Deliberately unscoped. Answers "has money ever moved", which is what
    // decides whether a zero means "nothing this week" or "no gateway yet".
    prisma.payment.count({ where: { status: 'PAID' } }),
    ]);

  // The largest single-currency total is the headline. With one currency —
  // which is the case today and for the foreseeable future — this is simply
  // the total.
  const ranked = revenueByCurrency
    .map((row) => ({ currency: row.currency, amount: Number(row._sum.amount ?? 0) }))
    .sort((a, b) => b.amount - a.amount);

  const inTokens = usageAgg._sum.inputTokens ?? 0;
  const cachedTokens = usageAgg._sum.cachedTokens ?? 0;
  const outTokens = usageAgg._sum.outputTokens ?? 0;

  return {
    period,
    hasEverBeenPaid: paidEver > 0,
    users,
    newUsers,
    blocked,
    unsubscribed,
    tokens: inTokens - cachedTokens + outTokens,
    tokenCostMicros: usageAgg._sum.costMicros ?? 0,
    revenue: ranked[0]?.amount ?? 0,
    revenueCurrency: ranked[0]?.currency ?? 'BDT',
    revenueMixedCurrency: ranked.length > 1,
  };
}

/**
 * Dates and times throughout the dashboard, rendered in Asia/Dhaka.
 *
 * Not UTC. The operator reads these sitting in Dhaka, and UTC is six hours
 * behind — a message sent at 1:22 PM was being displayed as 07:22, and
 * anything after 6 PM local was being dated to the previous day.
 */
export function formatDate(value: Date): string {
  return DateTime.fromJSDate(value).setZone(ADMIN_TIMEZONE).toFormat('yyyy-LL-dd');
}

export function formatDateTime(value: Date): string {
  return DateTime.fromJSDate(value).setZone(ADMIN_TIMEZONE).toFormat('yyyy-LL-dd HH:mm');
}

/** `1250` + `"BDT"` -> `"BDT 1,250.00"`. Money we were paid, not token cost. */
export function formatRevenue(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function countUsers(): Promise<number> {
  return prisma.user.count();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** One user, everything the dashboard shows. Null when the id is unknown. */
export async function getUserDetail(id: string) {
  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const weekAgo = new Date(now - 7 * DAY_MS);
  // Aligned to the first bucket's local midnight, not "30 x 24h ago". Those
  // differ by up to a day, and events in the gap matched the query but had no
  // bucket to land in, so `bucketByDay` silently dropped them.
  const monthAgo = DateTime.now()
    .setZone(ADMIN_TIMEZONE)
    .minus({ days: 29 })
    .startOf('day')
    .toJSDate();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  const [
    messageCount,
    recentUsage,
    dailyAgg,
    weeklyAgg,
  ] = await Promise.all([
    // The real total.
    prisma.message.count({ where: { userId: id } }),
    // Raw rows for the 30-day chart. Bucketed in JS rather than SQL so this
    // stays portable and needs no raw query.
    prisma.usageEvent.findMany({
      where: { userId: id, createdAt: { gte: monthAgo } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, inputTokens: true, outputTokens: true, costMicros: true },
    }),
    prisma.usageEvent.aggregate({
      where: { userId: id, createdAt: { gte: dayAgo } },
      _sum: { inputTokens: true, outputTokens: true, costMicros: true },
    }),
    prisma.usageEvent.aggregate({
      where: { userId: id, createdAt: { gte: weekAgo } },
      _sum: { inputTokens: true, outputTokens: true, costMicros: true },
    }),
  ]);

  const tokensIn = (a: typeof dailyAgg) =>
    (a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0);

  const isUnlimited = user.planTier === 'permanent' || user.planTier === 'pro';

  return {
    user,
    messageCount,
    usageByDay: bucketByDay(recentUsage),
    // Not named `window`: destructuring that in a component shadows the DOM
    // global and trips lint rules for no benefit.
    usageWindow: {
      dailyTokens: tokensIn(dailyAgg),
      dailyCap: user.dailyTokenCap ?? (isUnlimited ? null : env.DEFAULT_DAILY_TOKEN_CAP),
      // The env defaults, separate from the effective caps above. The quota
      // form's placeholder means "what you get if you leave this blank", so
      // showing the user's own override there told them clearing the field
      // would keep the override it was about to discard.
      globalDailyCap: env.DEFAULT_DAILY_TOKEN_CAP,
      globalWeeklyCap: env.DEFAULT_WEEKLY_TOKEN_CAP,
      dailyCostMicros: dailyAgg._sum.costMicros ?? 0,
      weeklyTokens: tokensIn(weeklyAgg),
      weeklyCap: user.weeklyTokenCap ?? (isUnlimited ? null : env.DEFAULT_WEEKLY_TOKEN_CAP),
      weeklyCostMicros: weeklyAgg._sum.costMicros ?? 0,
    },
  };
}

export type UserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;

export interface UsageDay {
  /** YYYY-MM-DD in UTC. */
  day: string;
  tokens: number;
  costMicros: number;
}

/**
 * Buckets into 30 Asia/Dhaka days, including days with no traffic.
 *
 * The gaps matter: a bar chart that silently omits quiet days makes sporadic
 * use look continuous.
 */
function bucketByDay(
  events: Array<{ createdAt: Date; inputTokens: number; outputTokens: number; costMicros: number }>
): UsageDay[] {
  const buckets = new Map<string, UsageDay>();
  const today = DateTime.now().setZone(ADMIN_TIMEZONE).startOf('day');

  for (let i = 29; i >= 0; i--) {
    const key = today.minus({ days: i }).toFormat('yyyy-LL-dd');
    buckets.set(key, { day: key, tokens: 0, costMicros: 0 });
  }

  for (const event of events) {
    // Bucketed by Dhaka day so a bar labelled "the 8th" holds the events the
    // operator would call the 8th.
    const key = DateTime.fromJSDate(event.createdAt)
      .setZone(ADMIN_TIMEZONE)
      .toFormat('yyyy-LL-dd');
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.tokens += event.inputTokens + event.outputTokens;
    bucket.costMicros += event.costMicros;
  }

  return [...buckets.values()];
}

/** `1234567` → `"$1.23"`. Used by every page that shows money. */
export function formatCost(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

/** `1234567` → `"1.23M"`. Used by every page that shows token counts. */
export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'Unlimited';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

