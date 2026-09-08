import { prisma } from './db';
import { env } from './env';

export type UserSort = 'cost' | 'recent' | 'joined';

const ORDER_BY: Record<UserSort, Record<string, 'asc' | 'desc'>> = {
  cost: { totalCostMicros: 'desc' },
  recent: { updatedAt: 'desc' },
  joined: { createdAt: 'desc' },
};

/**
 * The user list.
 *
 * Reads the denormalised counters on `users` and never aggregates
 * `usage_events` — avoiding a groupBy over every event ever recorded is the
 * entire reason those counters exist.
 */
export async function listUsers(options: { sort?: UserSort; limit?: number; offset?: number } = {}) {
  const { sort = 'cost', limit = 50, offset = 0 } = options;

  return prisma.user.findMany({
    orderBy: ORDER_BY[sort] ?? ORDER_BY.cost,
    take: limit,
    skip: offset,
    select: {
      id: true,
      name: true,
      phoneNumber: true,
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
      _count: {
        select: { messages: true, documents: true, reminders: true, facts: true },
      },
    },
  });
}

export type UserListRow = Awaited<ReturnType<typeof listUsers>>[number];

export interface DashboardTotals {
  users: number;
  blocked: number;
  /** Users whose paid period has already ended. See getDashboardTotals(). */
  unsubscribed: number;
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
 * Every count here is a database aggregate. Deriving them from the 100 rows
 * `listUsers` returns would silently under-report the moment there are 101
 * users.
 */
export async function getDashboardTotals(): Promise<DashboardTotals> {
  const now = new Date();

  const [users, blocked, unsubscribed, tokenAgg, revenueByCurrency] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { blockedAt: { not: null } } }),

    // "Unsubscribed" = a paid period that has already ended. Keyed on
    // planExpiresAt rather than planTier so it still counts correctly if a
    // future gateway resets the tier to "free" on lapse.
    prisma.user.count({ where: { planExpiresAt: { not: null, lt: now } } }),

    prisma.user.aggregate({
      _sum: { totalInputTokens: true, totalOutputTokens: true, totalCostMicros: true },
    }),

    // Grouped, because adding up two currencies produces a number that means
    // nothing. Only PAID counts — a PENDING or FAILED row is not revenue.
    prisma.payment.groupBy({
      by: ['currency'],
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
  ]);

  // The largest single-currency total is the headline. With one currency —
  // which is the case today and for the foreseeable future — this is simply
  // the total.
  const ranked = revenueByCurrency
    .map((row) => ({ currency: row.currency, amount: Number(row._sum.amount ?? 0) }))
    .sort((a, b) => b.amount - a.amount);

  return {
    users,
    blocked,
    unsubscribed,
    tokens: (tokenAgg._sum.totalInputTokens ?? 0) + (tokenAgg._sum.totalOutputTokens ?? 0),
    tokenCostMicros: tokenAgg._sum.totalCostMicros ?? 0,
    revenue: ranked[0]?.amount ?? 0,
    revenueCurrency: ranked[0]?.currency ?? 'BDT',
    revenueMixedCurrency: ranked.length > 1,
  };
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
  const monthAgo = new Date(now - 30 * DAY_MS);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  const [
    messages,
    documents,
    facts,
    activeReminders,
    pastReminders,
    recentUsage,
    dailyAgg,
    weeklyAgg,
  ] = await Promise.all([
    prisma.message.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        direction: true,
        messageText: true,
        createdAt: true,
        processedAt: true,
        processingError: true,
        mediaType: true,
      },
    }),
    prisma.document.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fact.findMany({
      where: { userId: id },
      orderBy: { updatedAt: 'desc' },
    }),
    // "What reminder is active" — the question the dashboard has to answer.
    prisma.reminder.findMany({
      where: { userId: id, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.reminder.findMany({
      where: { userId: id, status: { not: 'SCHEDULED' } },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    }),
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

  return {
    user,
    messages,
    documents,
    facts,
    activeReminders,
    pastReminders,
    usageByDay: bucketByDay(recentUsage),
    // Not named `window`: destructuring that in a component shadows the DOM
    // global and trips lint rules for no benefit.
    usageWindow: {
      dailyTokens: tokensIn(dailyAgg),
      dailyCap: user.dailyTokenCap ?? env.DEFAULT_DAILY_TOKEN_CAP,
      dailyCostMicros: dailyAgg._sum.costMicros ?? 0,
      weeklyTokens: tokensIn(weeklyAgg),
      weeklyCap: user.weeklyTokenCap ?? env.DEFAULT_WEEKLY_TOKEN_CAP,
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
 * Buckets into 30 UTC days, including days with no traffic.
 *
 * The gaps matter: a bar chart that silently omits quiet days makes sporadic
 * use look continuous.
 */
function bucketByDay(
  events: Array<{ createdAt: Date; inputTokens: number; outputTokens: number; costMicros: number }>
): UsageDay[] {
  const buckets = new Map<string, UsageDay>();
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { day: key, tokens: 0, costMicros: 0 });
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
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
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
