/**
 * Pricing and quota arithmetic. Deliberately imports nothing — `src/lib/db.ts`
 * constructs a PrismaClient at import time, so anything a unit test touches has
 * to stay clear of it. The DB writes live in `usage.ts`.
 */

export interface TokenUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

/**
 * USD per 1,000,000 tokens.
 *
 * VERIFY THESE against https://openai.com/api/pricing before trusting the
 * numbers on the dashboard. They are a starting point, not a contract, and
 * OpenAI changes them. Rows already written keep the cost they were written
 * with, so correcting an entry here only affects future calls.
 */
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  'gpt-5-nano': { input: 0.05, cached: 0.005, output: 0.4 },
  'gpt-5-mini': { input: 0.25, cached: 0.025, output: 2.0 },
  'gpt-4.1-nano': { input: 0.1, cached: 0.025, output: 0.4 },
  'gpt-4.1-mini': { input: 0.4, cached: 0.1, output: 1.6 },
  'gpt-4.1': { input: 2.0, cached: 0.5, output: 8.0 },
  'gpt-4o-mini': { input: 0.15, cached: 0.075, output: 0.6 },
  'gpt-4o': { input: 2.5, cached: 1.25, output: 10.0 },
};

/**
 * What an unrecognised model is charged at.
 *
 * The most expensive entry, on purpose. Swapping OPENAI_MODEL to something new
 * and quietly under-billing every user is the failure that costs real money;
 * over-stating it is visible on the dashboard within a day.
 */
const FALLBACK_PRICE = Object.values(PRICES).reduce((worst, p) =>
  p.input + p.output > worst.input + worst.output ? p : worst
);

/**
 * Resolves "gpt-4.1-mini-2025-04-14" to the "gpt-4.1-mini" entry.
 *
 * OpenAI pins dated snapshots of the same model at the same price, so matching
 * on the longest known prefix is both correct and stable across releases.
 */
function priceFor(model: string): { input: number; cached: number; output: number } {
  const exact = PRICES[model];
  if (exact) return exact;

  let best: string | null = null;
  for (const key of Object.keys(PRICES)) {
    if (model.startsWith(key) && (best === null || key.length > best.length)) {
      best = key;
    }
  }

  if (best) return PRICES[best];

  console.warn(
    `[Remique] No price for model "${model}" — charging at the highest known rate. ` +
      'Add it to PRICES in src/lib/usage-pricing.ts.'
  );
  return FALLBACK_PRICE;
}

/**
 * Cost in USD micros (USD * 1e6).
 *
 * `tokens / 1e6 * pricePerMillion * 1e6` reduces to `tokens * pricePerMillion`,
 * which is why there is no division here.
 */
export function costMicrosFor(model: string, usage: TokenUsage): number {
  const price = priceFor(model);

  // Clamped because a cachedTokens larger than inputTokens would otherwise
  // produce a negative charge — a credit — from a provider-side anomaly.
  const cached = Math.max(0, Math.min(usage.cachedTokens, usage.inputTokens));
  const uncached = Math.max(0, usage.inputTokens - cached);
  const output = Math.max(0, usage.outputTokens);

  return Math.round(uncached * price.input + cached * price.cached + output * price.output);
}

export interface QuotaVerdict {
  allowed: boolean;
  /** Which window was crossed. Null when the user is under both. */
  window: 'daily' | 'weekly' | null;
  used: number;
  cap: number;
}

/**
 * Daily is reported first when both are crossed: it resets sooner, so it is the
 * more useful thing to tell the user about.
 */
export function quotaVerdict(
  daily: { used: number; cap: number },
  weekly: { used: number; cap: number }
): QuotaVerdict {
  if (daily.used >= daily.cap) {
    return { allowed: false, window: 'daily', used: daily.used, cap: daily.cap };
  }
  if (weekly.used >= weekly.cap) {
    return { allowed: false, window: 'weekly', used: weekly.used, cap: weekly.cap };
  }
  return { allowed: true, window: null, used: daily.used, cap: daily.cap };
}
