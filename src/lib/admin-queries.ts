import { DateTime } from "luxon";
import { db } from "../db";
import {
  users,
  usageEvents,
  subscriptions,
  messages,
  payments,
  documents,
  facts,
  reminders,
} from "../db/schema";
import {
  eq,
  desc,
  asc,
  inArray,
  isNull,
  isNotNull,
  and,
  or,
  sql,
  sum,
  count,
  gte,
  lt,
  not,
  notInArray,
  ilike,
} from "drizzle-orm";
import { env } from "./env";

export type UserSort = "cost" | "recent" | "joined" | "unsubscribed";

/**
 * The window the overview is scoped to.
 *
 * Boundaries are computed in Asia/Dhaka, not UTC. "This month" has to mean the
 * month the operator is living in, or the figure is wrong for the first and
 * last six hours of every month.
 */
export type Period = "all" | "today" | "month" | "30d";

export const ADMIN_TIMEZONE = "Asia/Dhaka";

export const PERIOD_LABELS: Record<Period, string> = {
  all: "All time",
  today: "Today",
  month: "This month",
  "30d": "Last 30 days",
};

export function isPeriod(value: string | undefined): value is Period {
  return (
    value === "all" || value === "today" || value === "month" || value === "30d"
  );
}

/** Null for 'all' — an unbounded window, which Drizzle expresses by omitting the filter. */
export function periodStart(period: Period): Date | null {
  if (period === "all") return null;

  const now = DateTime.now().setZone(ADMIN_TIMEZONE);
  if (period === "today") return now.startOf("day").toJSDate();
  if (period === "month") return now.startOf("month").toJSDate();
  return now.minus({ days: 30 }).toJSDate();
}

/** Rows per page in the user list. */
export const PAGE_SIZE = 50;

const ORDER_BY = {
  cost: desc(users.totalCostMicros),
  recent: desc(users.updatedAt),
  joined: desc(users.createdAt),
  unsubscribed: desc(subscriptions.currentPeriodEnd),
};

export interface ListUsersOptions {
  sort?: UserSort;
  period?: Period;
  limit?: number;
  offset?: number;
  /** Free-text match across name, phone number and email. */
  q?: string;
  /** Restricts the list to the ids the attention query returned. */
  onlyIds?: string[] | null;
}

/**
 * The search clause, or undefined when there is nothing to search for.
 */
function searchWhere(q: string | undefined) {
  const term = q?.trim();
  if (!term) return undefined;

  return or(
    ilike(users.name, `%${term}%`),
    ilike(users.phoneNumber, `%${term}%`),
    ilike(users.email, `%${term}%`),
  );
}

/** Combines the filters that can apply at once, dropping the ones that are off. */
function composeWhere(...clauses: Array<any>) {
  const live = clauses.filter(Boolean);
  if (live.length === 0) return undefined;
  if (live.length === 1) return live[0];
  return and(...live);
}
export async function listUsers(options: ListUsersOptions = {}) {
  const {
    sort = "cost",
    period = "all",
    limit = PAGE_SIZE,
    offset = 0,
    q,
    onlyIds,
  } = options;
  const start = periodStart(period);

  const baseWhere = composeWhere(
    sort === "unsubscribed"
      ? and(
          isNotNull(subscriptions.currentPeriodEnd),
          lt(subscriptions.currentPeriodEnd, new Date()),
          start ? gte(subscriptions.currentPeriodEnd, start) : undefined,
        )
      : undefined,
    searchWhere(q),
    onlyIds ? inArray(users.id, onlyIds) : undefined,
  );

  const USER_SELECT = {
    id: users.id,
    name: users.name,
    phoneNumber: users.phoneNumber,
    email: users.email,
    timezone: users.timezone,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    blockedAt: users.blockedAt,
    blockedReason: users.blockedReason,
    totalInputTokens: users.totalInputTokens,
    totalOutputTokens: users.totalOutputTokens,
    totalCostMicros: users.totalCostMicros,
    totalLlmCalls: users.totalLlmCalls,
    dailyTokenCap: users.dailyTokenCap,
    weeklyTokenCap: users.weeklyTokenCap,
    planTier: sql<string>`COALESCE(${subscriptions.planTier}, 'free')`,
    planPeriod: subscriptions.planPeriod,
    planExpiresAt: subscriptions.currentPeriodEnd,
  };

  if (!start || period === "all") {
    const fetchedUsers = await db
      .select({
        ...USER_SELECT,
        _count_messages: sql<number>`(SELECT count(*) FROM ${messages} WHERE ${messages.userId} = ${users.id})::int`,
        _count_documents: sql<number>`(SELECT count(*) FROM ${documents} WHERE ${documents.userId} = ${users.id})::int`,
        _count_reminders: sql<number>`(SELECT count(*) FROM ${reminders} WHERE ${reminders.userId} = ${users.id})::int`,
        _count_facts: sql<number>`(SELECT count(*) FROM ${facts} WHERE ${facts.userId} = ${users.id})::int`,
      })
      .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(baseWhere)
      .orderBy(ORDER_BY[sort] ?? ORDER_BY.cost)
      .limit(limit)
      .offset(offset);

    return fetchedUsers.map((u) => ({
      ...u,
      _count: {
        messages: u._count_messages,
        documents: u._count_documents,
        reminders: u._count_reminders,
        facts: u._count_facts,
      },
      periodTokens: u.totalInputTokens + u.totalOutputTokens,
      periodCostMicros: u.totalCostMicros,
      periodMessages: u._count_messages,
      periodLlmCalls: u.totalLlmCalls,
    }));
  }

  type SelectedUser = {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
    blockedAt: Date | null;
    blockedReason: string | null;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostMicros: number;
    totalLlmCalls: number;
    dailyTokenCap: number | null;
    weeklyTokenCap: number | null;
    planTier: string;
    planPeriod: string | null;
    planExpiresAt: Date | null;
    _count_messages: number;
    _count_documents: number;
    _count_reminders: number;
    _count_facts: number;
  };

  let pageUsers: SelectedUser[] = [];

  if (sort === "cost" && !baseWhere) {
    const periodUsage = await db
      .select({
        userId: usageEvents.userId,
        costMicros: sum(usageEvents.costMicros).mapWith(Number),
      })
      .from(usageEvents)
      .where(gte(usageEvents.createdAt, start))
      .groupBy(usageEvents.userId);

    const sortedActive = periodUsage.sort(
      (a, b) => (b.costMicros ?? 0) - (a.costMicros ?? 0),
    );
    const activeUserIds = sortedActive.map((u) => u.userId);

    const pageUserIds: string[] = [];
    if (offset < activeUserIds.length) {
      pageUserIds.push(...activeUserIds.slice(offset, offset + limit));
    }

    const needed = limit - pageUserIds.length;
    if (needed > 0) {
      const inactiveOffset = Math.max(0, offset - activeUserIds.length);
      const inactiveUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          activeUserIds.length > 0
            ? notInArray(users.id, activeUserIds)
            : undefined,
        )
        .orderBy(desc(users.totalCostMicros))
        .limit(needed)
        .offset(inactiveOffset);
      pageUserIds.push(...inactiveUsers.map((u) => u.id));
    }

    if (pageUserIds.length === 0) {
      return [];
    }

    const fetchedUsers = await db
      .select({
        ...USER_SELECT,
        _count_messages: sql<number>`(SELECT count(*) FROM ${messages} WHERE ${messages.userId} = ${users.id})::int`,
        _count_documents: sql<number>`(SELECT count(*) FROM ${documents} WHERE ${documents.userId} = ${users.id})::int`,
        _count_reminders: sql<number>`(SELECT count(*) FROM ${reminders} WHERE ${reminders.userId} = ${users.id})::int`,
        _count_facts: sql<number>`(SELECT count(*) FROM ${facts} WHERE ${facts.userId} = ${users.id})::int`,
      })
      .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(inArray(users.id, pageUserIds));

    const userMap = new Map(fetchedUsers.map((u) => [u.id, u]));
    pageUsers = pageUserIds
      .map((id) => userMap.get(id))
      .filter((u): u is SelectedUser => Boolean(u));
  } else {
    pageUsers = await db
      .select({
        ...USER_SELECT,
        _count_messages: sql<number>`(SELECT count(*) FROM ${messages} WHERE ${messages.userId} = ${users.id})::int`,
        _count_documents: sql<number>`(SELECT count(*) FROM ${documents} WHERE ${documents.userId} = ${users.id})::int`,
        _count_reminders: sql<number>`(SELECT count(*) FROM ${reminders} WHERE ${reminders.userId} = ${users.id})::int`,
        _count_facts: sql<number>`(SELECT count(*) FROM ${facts} WHERE ${facts.userId} = ${users.id})::int`,
      })
      .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(baseWhere)
      .orderBy(ORDER_BY[sort] ?? ORDER_BY.recent)
      .limit(limit)
      .offset(offset);
  }

  if (pageUsers.length === 0) {
    return [];
  }

  const pageUserIds = pageUsers.map((u) => u.id);

  const [usageGroups, messageGroups] = await Promise.all([
    db
      .select({
        userId: usageEvents.userId,
        inputTokens: sum(usageEvents.inputTokens).mapWith(Number),
        cachedTokens: sum(usageEvents.cachedTokens).mapWith(Number),
        outputTokens: sum(usageEvents.outputTokens).mapWith(Number),
        costMicros: sum(usageEvents.costMicros).mapWith(Number),
        count: count(usageEvents.id),
      })
      .from(usageEvents)
      .where(
        and(
          inArray(usageEvents.userId, pageUserIds),
          gte(usageEvents.createdAt, start),
        ),
      )
      .groupBy(usageEvents.userId),
    db
      .select({
        userId: messages.userId,
        count: count(messages.id),
      })
      .from(messages)
      .where(
        and(
          inArray(messages.userId, pageUserIds),
          gte(messages.createdAt, start),
        ),
      )
      .groupBy(messages.userId),
  ]);

  const usageMap = new Map<string, { tokens: number; costMicros: number; calls: number }>(
    usageGroups.map((g) => [
      g.userId,
      {
        tokens:
          (g.inputTokens ?? 0) - (g.cachedTokens ?? 0) + (g.outputTokens ?? 0),
        costMicros: g.costMicros ?? 0,
        calls: g.count,
      },
    ]),
  );

  const messagesMap = new Map(messageGroups.map((g) => [g.userId, g.count]));

  return pageUsers.map((u) => {
    const usage = usageMap.get(u.id);
    return {
      ...u,
      _count: {
        messages: u._count_messages,
        documents: u._count_documents,
        reminders: u._count_reminders,
        facts: u._count_facts,
      },
      periodTokens: usage?.tokens ?? 0,
      periodCostMicros: usage?.costMicros ?? 0,
      periodMessages: messagesMap.get(u.id) ?? 0,
      periodLlmCalls: usage?.calls ?? 0,
    };
  });
}

export type UserListRow = Awaited<ReturnType<typeof listUsers>>[number];

export async function countListedUsers(
  options: Pick<ListUsersOptions, "sort" | "period" | "q" | "onlyIds"> = {},
): Promise<number> {
  const { sort = "cost", period = "all", q, onlyIds } = options;
  const start = periodStart(period);

  const [res] = await db
    .select({ count: count() })
    .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(composeWhere(
        sort === "unsubscribed"
          ? and(
              isNotNull(subscriptions.currentPeriodEnd),
              lt(subscriptions.currentPeriodEnd, new Date()),
              start ? gte(subscriptions.currentPeriodEnd, start) : undefined,
            )
          : undefined,
        searchWhere(q),
        onlyIds ? inArray(users.id, onlyIds) : undefined,
      ),
    );

  return res.count;
}
const PLAN_WORD: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

export type AttentionKind = "blocked" | "lapsed" | "over-cap";

export interface AttentionItem {
  id: string;
  name: string | null;
  phoneNumber: string;
  kind: AttentionKind;
  reason: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAttention(limit = 12): Promise<AttentionItem[]> {
  const dayAgo = new Date(Date.now() - DAY_MS);

  const [blocked, lapsed, dayUsage] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        blockedAt: users.blockedAt,
        blockedReason: users.blockedReason,
      })
      .from(users)
      .where(isNotNull(users.blockedAt))
      .orderBy(desc(users.blockedAt))
      .limit(limit),
    db
      .select({
        id: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        planTier: sql<string>`COALESCE(${subscriptions.planTier}, 'free')`,
        planPeriod: subscriptions.planPeriod,
        planExpiresAt: subscriptions.currentPeriodEnd,
      })
      .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(and(isNotNull(subscriptions.currentPeriodEnd),
          lt(subscriptions.currentPeriodEnd, new Date()),
          not(eq(subscriptions.planTier, "free")),
        ),
      )
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(limit),
    db
      .select({
        userId: usageEvents.userId,
        inputTokens: sum(usageEvents.inputTokens).mapWith(Number),
        outputTokens: sum(usageEvents.outputTokens).mapWith(Number),
      })
      .from(usageEvents)
      .where(gte(usageEvents.createdAt, dayAgo))
      .groupBy(usageEvents.userId),
  ]);

  const items: AttentionItem[] = blocked.map((u) => ({
    id: u.id,
    name: u.name,
    phoneNumber: u.phoneNumber,
    kind: "blocked" as const,
    reason: u.blockedReason
      ? `Blocked ${formatDate(u.blockedAt!)} — ${u.blockedReason}`
      : `Blocked ${formatDate(u.blockedAt!)}, still cut off`,
  }));

  const heaviest = dayUsage
    .map((g) => ({
      userId: g.userId,
      tokens: (g.inputTokens ?? 0) + (g.outputTokens ?? 0),
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 50);

  if (heaviest.length > 0) {
    const capped = await db
      .select({
        id: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        dailyTokenCap: users.dailyTokenCap,
        planTier: sql<string>`COALESCE(${subscriptions.planTier}, 'free')`,
      })
      .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(
        inArray(
          users.id,
          heaviest.map((h) => h.userId),
        ),
      );

    const capById = new Map<string, typeof capped[number]>(capped.map((u) => [u.id, u]));

    for (const { userId, tokens } of heaviest) {
      const user = capById.get(userId);
      if (!user) continue;

      const unlimited =
        user.planTier === "permanent" || user.planTier === "pro";
      const cap =
        user.dailyTokenCap ?? (unlimited ? null : env.DEFAULT_DAILY_TOKEN_CAP);
      if (cap === null || tokens < cap * 0.9) continue;

      items.push({
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        kind: "over-cap",
        reason:
          tokens >= cap
            ? `Over the daily cap — ${formatTokens(tokens)} of ${formatTokens(cap)}, replies are being refused`
            : `Close to the daily cap — ${formatTokens(tokens)} of ${formatTokens(cap)} in 24 hours`,
      });
    }
  }

  for (const u of lapsed) {
    items.push({
      id: u.id,
      name: u.name,
      phoneNumber: u.phoneNumber,
      kind: "lapsed",
      reason:
        u.planTier === "permanent"
          ? `Admin access ended ${formatDate(u.planExpiresAt!)}`
          : `${PLAN_WORD[u.planPeriod?.toLowerCase() ?? ""] ?? "Pro"} plan ended ${formatDate(u.planExpiresAt!)}`,
    });
  }

  const seen = new Set<string>();
  return items
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .slice(0, limit);
}

export async function getAttentionUserIds(): Promise<string[]> {
  const items = await getAttention(200);
  return items.map((item) => item.id);
}

export interface DashboardTotals {
  period: Period;
  hasEverBeenPaid: boolean;
  users: number;
  newUsers: number;
  blocked: number;
  activeRecently: number;
  unsubscribed: number;
  topSpender: { id: string; name: string | null; costMicros: number } | null;
  messages: number;
  tokens: number;
  tokenCostMicros: number;
  revenue: number;
  revenueCurrency: string;
  revenueMixedCurrency: boolean;
}

async function topSpenderIn(
  start: Date | null,
): Promise<{ id: string; name: string | null; costMicros: number } | null> {
  if (!start) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        totalCostMicros: users.totalCostMicros,
      })
      .from(users)
      .where(gte(users.totalCostMicros, 0))
      .orderBy(desc(users.totalCostMicros))
      .limit(1);

    return user
      ? { id: user.id, name: user.name, costMicros: user.totalCostMicros }
      : null;
  }

  const [top] = await db
    .select({
      userId: usageEvents.userId,
      costMicros: sum(usageEvents.costMicros).mapWith(Number),
    })
    .from(usageEvents)
    .where(gte(usageEvents.createdAt, start))
    .groupBy(usageEvents.userId)
    .orderBy(desc(sum(usageEvents.costMicros)))
    .limit(1);

  if (!top || !top.costMicros) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, top.userId))
    .limit(1);

  return user
    ? { id: user.id, name: user.name, costMicros: top.costMicros }
    : null;
}
export async function getDashboardTotals(
  period: Period = "all",
): Promise<DashboardTotals> {
  const now = new Date();
  const start = periodStart(period);

  const inWindow = start ? gte(users.createdAt, start) : undefined;
  const eventsInWindow = start ? gte(usageEvents.createdAt, start) : undefined;
  const messagesInWindow = start ? gte(messages.createdAt, start) : undefined;
  const paymentsInWindow = start ? gte(payments.createdAt, start) : undefined;

const [{ count: totalUsers }] = await db.select({ count: count() }).from(users);

const [{ count: newUsersCount }] = await db.select({ count: count() }).from(users).where(inWindow);

const [{ count: blockedCount }] = await db
    .select({ count: count() })
    .from(users)
    .where(isNotNull(users.blockedAt));

const [{ count: activeCount }] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.updatedAt, new Date(now.getTime() - 7 * DAY_MS)));

const [{ count: unsubscribedCount }] = await db
    .select({ count: count() })
    .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(and(isNotNull(subscriptions.currentPeriodEnd),
            lt(subscriptions.currentPeriodEnd, now),
            start ? gte(subscriptions.currentPeriodEnd, start) : undefined,
        ),
    );

const [{ count: messagesCount }] = await db
    .select({ count: count() })
    .from(messages)
    .where(messagesInWindow);

const [usageAgg] = await db
    .select({
        inputTokens: sum(usageEvents.inputTokens).mapWith(Number),
        cachedTokens: sum(usageEvents.cachedTokens).mapWith(Number),
        outputTokens: sum(usageEvents.outputTokens).mapWith(Number),
        costMicros: sum(usageEvents.costMicros).mapWith(Number),
    })
    .from(usageEvents)
    .where(eventsInWindow);

const revenueByCurrency = await db
    .select({
        currency: payments.currency,
        amount: sum(payments.amount).mapWith(Number),
    })
    .from(payments)
    .where(and(eq(payments.status, "PAID"), paymentsInWindow))
    .groupBy(payments.currency);

const [{ count: paidEverCount }] = await db
    .select({ count: count() })
    .from(payments)
    .where(eq(payments.status, "PAID"));

const topSpender = await topSpenderIn(start);

  const ranked = revenueByCurrency
    .map((row) => ({ currency: row.currency, amount: Number(row.amount ?? 0) }))
    .sort((a, b) => b.amount - a.amount);

  const inTokens = usageAgg?.inputTokens ?? 0;
  const cachedTokens = usageAgg?.cachedTokens ?? 0;
  const outTokens = usageAgg?.outputTokens ?? 0;

  return {
    period,
    hasEverBeenPaid: paidEverCount > 0,
    users: totalUsers,
    newUsers: newUsersCount,
    blocked: blockedCount,
    activeRecently: activeCount,
    unsubscribed: unsubscribedCount,
    topSpender,
    messages: messagesCount,
    tokens: inTokens - cachedTokens + outTokens,
    tokenCostMicros: usageAgg?.costMicros ?? 0,
    revenue: ranked[0]?.amount ?? 0,
    revenueCurrency: ranked[0]?.currency ?? "BDT",
    revenueMixedCurrency: ranked.length > 1,
  };
}

export function formatDate(value: Date): string {
  return DateTime.fromJSDate(value)
    .setZone(ADMIN_TIMEZONE)
    .toFormat("yyyy-LL-dd");
}

export function formatDateTime(value: Date): string {
  return DateTime.fromJSDate(value)
    .setZone(ADMIN_TIMEZONE)
    .toFormat("yyyy-LL-dd HH:mm");
}

export function formatRevenue(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function countUsers(): Promise<number> {
  const [{ count: c }] = await db.select({ count: count() }).from(users);
  return c;
}

export async function getUserDetail(id: string) {
  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const weekAgo = new Date(now - 7 * DAY_MS);
  const monthAgo = DateTime.now()
    .setZone(ADMIN_TIMEZONE)
    .minus({ days: 29 })
    .startOf("day")
    .toJSDate();

    const [result] = await db.select().from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(eq(users.id, id)).limit(1);
  if (!result) return null;
  const user = { ...result.users, planTier: result.subscriptions?.planTier ?? 'free', planPeriod: result.subscriptions?.planPeriod ?? null, planExpiresAt: result.subscriptions?.currentPeriodEnd ?? null };

  const [
    [{ count: messageCount }],
    recentUsage,
    [dailyAgg],
    [weeklyAgg],
    messagesList,
    documentsList,
    factsList,
    remindersList,
  ] = await Promise.all([
    db.select({ count: count() }).from(messages).where(eq(messages.userId, id)),
    db
      .select({
        createdAt: usageEvents.createdAt,
        inputTokens: usageEvents.inputTokens,
        outputTokens: usageEvents.outputTokens,
        costMicros: usageEvents.costMicros,
      })
      .from(usageEvents)
      .where(
        and(eq(usageEvents.userId, id), gte(usageEvents.createdAt, monthAgo)),
      )
      .orderBy(asc(usageEvents.createdAt)),
    db
      .select({
        inputTokens: sum(usageEvents.inputTokens).mapWith(Number),
        outputTokens: sum(usageEvents.outputTokens).mapWith(Number),
        costMicros: sum(usageEvents.costMicros).mapWith(Number),
      })
      .from(usageEvents)
      .where(
        and(eq(usageEvents.userId, id), gte(usageEvents.createdAt, dayAgo)),
      ),
    db
      .select({
        inputTokens: sum(usageEvents.inputTokens).mapWith(Number),
        outputTokens: sum(usageEvents.outputTokens).mapWith(Number),
        costMicros: sum(usageEvents.costMicros).mapWith(Number),
      })
      .from(usageEvents)
      .where(
        and(eq(usageEvents.userId, id), gte(usageEvents.createdAt, weekAgo)),
      ),
    db
      .select()
      .from(messages)
      .where(eq(messages.userId, id))
      .orderBy(desc(messages.createdAt))
      .limit(1000),
    db
      .select()
      .from(documents)
      .where(eq(documents.userId, id))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(facts)
      .where(eq(facts.userId, id))
      .orderBy(desc(facts.createdAt)),
    db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, id))
      .orderBy(desc(reminders.createdAt)),
  ]);

  const tokensIn = (a: any) => (a?.inputTokens ?? 0) + (a?.outputTokens ?? 0);

  const isUnlimited = user.planTier === "permanent" || user.planTier === "pro";

  return {
    user,
    messageCount,
    messages: messagesList.reverse(),
    documents: documentsList,
    facts: factsList,
    reminders: remindersList,
    usageByDay: bucketByDay(recentUsage),
    usageWindow: {
      dailyTokens: tokensIn(dailyAgg),
      dailyCap:
        user.dailyTokenCap ??
        (isUnlimited ? null : env.DEFAULT_DAILY_TOKEN_CAP),
      globalDailyCap: env.DEFAULT_DAILY_TOKEN_CAP,
      globalWeeklyCap: env.DEFAULT_WEEKLY_TOKEN_CAP,
      dailyCostMicros: dailyAgg?.costMicros ?? 0,
      weeklyTokens: tokensIn(weeklyAgg),
      weeklyCap:
        user.weeklyTokenCap ??
        (isUnlimited ? null : env.DEFAULT_WEEKLY_TOKEN_CAP),
      weeklyCostMicros: weeklyAgg?.costMicros ?? 0,
    },
  };
}

export type UserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;

export interface UsageDay {
  day: string;
  tokens: number;
  costMicros: number;
}

function bucketByDay(
  events: Array<{
    createdAt: Date;
    inputTokens: number;
    outputTokens: number;
    costMicros: number;
  }>,
): UsageDay[] {
  const buckets = new Map<string, UsageDay>();
  const today = DateTime.now().setZone(ADMIN_TIMEZONE).startOf("day");

  for (let i = 29; i >= 0; i--) {
    const key = today.minus({ days: i }).toFormat("yyyy-LL-dd");
    buckets.set(key, { day: key, tokens: 0, costMicros: 0 });
  }

  for (const event of events) {
    const key = DateTime.fromJSDate(event.createdAt)
      .setZone(ADMIN_TIMEZONE)
      .toFormat("yyyy-LL-dd");
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.tokens += event.inputTokens + event.outputTokens;
    bucket.costMicros += event.costMicros;
  }

  return Array.from(buckets.values());
}

export function formatCost(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "Unlimited";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
