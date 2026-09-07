import { prisma } from './db';
import { env } from './env';
import { costMicrosFor, quotaVerdict, type QuotaVerdict, type TokenUsage } from './usage-pricing';

export interface RecordUsageParams {
  userId: string;
  /** The inbound message that caused the call, when there is one. */
  messageId?: string | null;
  /** "parse" today. "vision", "transcribe", "embed" later. */
  purpose?: string;
  model: string;
  usage: TokenUsage;
}

/**
 * Writes one usage row and rolls the user's totals forward.
 *
 * Never throws. This runs after the model has already answered and the user is
 * waiting on a reply — losing an accounting row is strictly better than failing
 * a turn that otherwise succeeded. A rejected transaction is logged loudly
 * enough to find in CloudWatch, but not every loss takes that path: if AWS
 * Lambda freezes the execution environment before this fire-and-forget
 * transaction commits, the row is lost silently and the catch below never
 * runs. Accepted — the design trades losing rows for never failing a turn.
 */
export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const { userId, messageId = null, purpose = 'parse', model, usage } = params;
  const costMicros = costMicrosFor(model, usage);

  try {
    // One transaction so the denormalised counters on `users` can never drift
    // from the rows in `usage_events`.
    await prisma.$transaction([
      prisma.usageEvent.create({
        data: {
          userId,
          messageId,
          purpose,
          provider: 'openai',
          model,
          inputTokens: usage.inputTokens,
          cachedTokens: usage.cachedTokens,
          outputTokens: usage.outputTokens,
          costMicros,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalInputTokens: { increment: usage.inputTokens },
          totalOutputTokens: { increment: usage.outputTokens },
          totalCostMicros: { increment: costMicros },
          totalLlmCalls: { increment: 1 },
        },
      }),
    ]);
  } catch (error: any) {
    console.error(
      `[Remique] Failed to record usage userId=${userId} model=${model} ` +
        `cost=${costMicros}µ: ${error?.message}`
    );
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tokens already spent against the caps.
 *
 * This measures spend that has *happened*, so a single very large message can
 * overshoot its cap. Accepted: estimating a prompt's token count before the
 * call is guesswork, and the overshoot is bounded by the model's context
 * window.
 */
export async function checkQuota(user: {
  id: string;
  dailyTokenCap: number | null;
  weeklyTokenCap: number | null;
}): Promise<QuotaVerdict> {
  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const weekAgo = new Date(now - 7 * DAY_MS);

  const [daily, weekly] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: dayAgo } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.usageEvent.aggregate({
      where: { userId: user.id, createdAt: { gte: weekAgo } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  ]);

  const sum = (a: { _sum: { inputTokens: number | null; outputTokens: number | null } }) =>
    (a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0);

  return quotaVerdict(
    { used: sum(daily), cap: user.dailyTokenCap ?? env.DEFAULT_DAILY_TOKEN_CAP },
    { used: sum(weekly), cap: user.weeklyTokenCap ?? env.DEFAULT_WEEKLY_TOKEN_CAP }
  );
}
