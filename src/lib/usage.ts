import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { usageEvents, users } from '../db/schema';
import { env } from './env';
import { costMicrosFor, quotaVerdict, type QuotaVerdict, type TokenUsage } from './usage-pricing';

export interface RecordUsageParams {
  userId: string;
  messageId?: string | null;
  purpose?: string;
  model: string;
  usage: TokenUsage;
}

export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const { userId, messageId = null, purpose = 'parse', model, usage } = params;
  const costMicros = costMicrosFor(model, usage);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(usageEvents).values({
        userId,
        messageId,
        purpose,
        provider: 'openai',
        model,
        inputTokens: usage.inputTokens,
        cachedTokens: usage.cachedTokens,
        outputTokens: usage.outputTokens,
        costMicros,
      });

      await tx.update(users)
        .set({
          totalInputTokens: sql`${users.totalInputTokens} + ${usage.inputTokens}`,
          totalOutputTokens: sql`${users.totalOutputTokens} + ${usage.outputTokens}`,
          totalCostMicros: sql`${users.totalCostMicros} + ${costMicros}`,
          totalLlmCalls: sql`${users.totalLlmCalls} + 1`,
        })
        .where(eq(users.id, userId));
    });
  } catch (error: any) {
    console.error(
      `[Remique] Failed to record usage userId=${userId} model=${model} ` +
        `cost=${costMicros}µ: ${error?.message}`
    );
  }
}

import { type PlanState, isLapsed as planIsLapsed } from './plan';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function checkQuota(
  user: {
    id: string;
    dailyTokenCap: number | null;
    weeklyTokenCap: number | null;
  },
  plan: PlanState
): Promise<QuotaVerdict> {
  const isLapsed = planIsLapsed(plan);
  const isUnlimited = (plan.planTier === 'permanent' || plan.planTier === 'pro') && !isLapsed;

  if (isUnlimited && user.dailyTokenCap === null && user.weeklyTokenCap === null) {
    return { allowed: true, window: null, used: 0, cap: Infinity };
  }

  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const weekAgo = new Date(now - 7 * DAY_MS);

  const [dailyRes, weeklyRes] = await Promise.all([
    db.select({
      input: sql<number>`COALESCE(SUM(input_tokens), 0)`,
      cached: sql<number>`COALESCE(SUM(cached_tokens), 0)`,
      output: sql<number>`COALESCE(SUM(output_tokens), 0)`,
    }).from(usageEvents).where(and(eq(usageEvents.userId, user.id), gte(usageEvents.createdAt, dayAgo))),
    
    db.select({
      input: sql<number>`COALESCE(SUM(input_tokens), 0)`,
      cached: sql<number>`COALESCE(SUM(cached_tokens), 0)`,
      output: sql<number>`COALESCE(SUM(output_tokens), 0)`,
    }).from(usageEvents).where(and(eq(usageEvents.userId, user.id), gte(usageEvents.createdAt, weekAgo))),
  ]);

  const dailyUsed = Number(dailyRes[0]?.input || 0) - Number(dailyRes[0]?.cached || 0) + Number(dailyRes[0]?.output || 0);
  const weeklyUsed = Number(weeklyRes[0]?.input || 0) - Number(weeklyRes[0]?.cached || 0) + Number(weeklyRes[0]?.output || 0);

  const dailyCap = user.dailyTokenCap ?? (isUnlimited ? Infinity : env.DEFAULT_DAILY_TOKEN_CAP);
  const weeklyCap = user.weeklyTokenCap ?? (isUnlimited ? Infinity : env.DEFAULT_WEEKLY_TOKEN_CAP);

  return quotaVerdict(
    { used: dailyUsed, cap: dailyCap },
    { used: weeklyUsed, cap: weeklyCap }
  );
}
