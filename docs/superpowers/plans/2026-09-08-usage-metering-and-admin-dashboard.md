# Usage Metering, Blocking, and Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record what every user costs us in OpenAI tokens, stop a user who exceeds a token cap or has been blocked before their message reaches the model, and give the operator a password-gated `/admin` dashboard to see and control all of it.

**Architecture:** One Prisma migration adds a `usage_events` table, denormalized cost counters on `User`, blocking columns, per-user quota overrides, and unused billing columns. `parseUserMessage` starts returning its token usage instead of only logging it; `reminder-service` writes it. `runMessagePipeline` gains two rejection gates ahead of the model call. The dashboard is server components in the existing Next.js app behind an HMAC-signed session cookie checked in middleware.

**Tech Stack:** Next.js 15.1.11 App Router, React 19, Prisma 6 / Postgres (Supabase), Tailwind 3, `node:test` via `tsx`, Web Crypto. **No new npm dependencies.**

**Spec:** [`docs/superpowers/specs/2026-09-08-usage-metering-and-admin-design.md`](../specs/2026-09-08-usage-metering-and-admin-design.md)

## Global Constraints

- **No new npm dependencies.** Not for charting, not for auth, not for tables. Hard constraint.
- **Tests must not touch the database.** `src/lib/db.ts` instantiates `PrismaClient` at import time, so any module a test imports must not transitively import `db.ts`. This is why pure logic lives in `usage-pricing.ts` and DB writes live in `usage.ts`.
- **Next 15 async APIs.** `params` is a `Promise` in every page and route handler. `cookies()` and `headers()` are async. Awaiting them is not optional.
- **`src/lib/admin-auth.ts` must read `process.env` directly, never import `src/lib/env.ts`.** `env.ts` throws in production when unrelated vars are missing, and it runs in Edge middleware where those vars may be absent. Dragging it into middleware turns a missing `DATABASE_URL` into a dead admin panel.
- **Money is integer micros.** `costMicros` = USD × 1,000,000. Never a float.
- **Recording usage must never throw into the reply path.** Losing an accounting row beats failing a turn the user already waited for.
- Existing code style: single quotes in `src/lib/*` (except `llm.ts`, which uses double), 2-space indent, comments explain *why* not *what*.
- Test imports use relative paths (`../src/lib/x`), not the `@/` alias.
- Timezone default is `Asia/Dhaka`.

---

## Task 0: Branch

- [ ] **Step 1: Cut a branch off main**

```bash
git checkout -b feat/usage-metering-and-admin
```

- [ ] **Step 2: Commit the spec, which is currently untracked**

```bash
git add docs/superpowers/specs/2026-09-08-usage-metering-and-admin-design.md docs/superpowers/plans/2026-09-08-usage-metering-and-admin-dashboard.md
git commit -m "docs: spec and plan for usage metering, blocking and admin dashboard"
```

---

## Task 1: Schema and environment

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/env.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma models `UsageEvent` and the new `User` fields — `blockedAt`, `blockedReason`, `blockNoticeSentAt`, `totalInputTokens`, `totalOutputTokens`, `totalCostMicros`, `totalLlmCalls`, `dailyTokenCap`, `weeklyTokenCap`, `planTier`, `planPeriod`, `planStartedAt`, `planExpiresAt`. Env fields `DEFAULT_DAILY_TOKEN_CAP: number`, `DEFAULT_WEEKLY_TOKEN_CAP: number`, `ADMIN_PASSWORD?: string`, `ADMIN_SESSION_SECRET?: string`.

- [ ] **Step 1: Add the `UsageEvent` model to `prisma/schema.prisma`**

Append after the `Document` model:

```prisma
// One row per paid API call, not per message. A message that triggers a
// vision call and a parse call must produce two rows, or the cost of images
// can never be separated from the cost of text.
model UsageEvent {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")

  // The inbound message that caused the call. Nullable because a future
  // background call (a summarisation pass, an embedding job) has no inbound
  // message to point at.
  messageId     String?  @map("message_id")

  // What the call was for: "parse" today; "vision", "transcribe", "embed"
  // later. A plain string rather than an enum so adding a purpose does not
  // need a migration.
  purpose       String   @default("parse")

  provider      String   @default("openai")
  model         String

  inputTokens   Int      @map("input_tokens")

  // The discounted portion of inputTokens — the static system prompt, once
  // OpenAI has seen it recently. Stored separately because the cost is
  // (inputTokens - cachedTokens) at full rate plus cachedTokens at the
  // discounted one.
  cachedTokens  Int      @default(0) @map("cached_tokens")
  outputTokens  Int      @map("output_tokens")

  // USD * 1_000_000, integer. Floats must never hold money, and one
  // gpt-4.1-mini call is a fraction of a cent, so cents is too coarse.
  // Computed at write time so a later price change cannot rewrite history.
  costMicros    Int      @map("cost_micros")

  createdAt     DateTime @default(now()) @map("created_at")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([createdAt])
  @@map("usage_events")
}
```

- [ ] **Step 2: Add the new `User` fields**

In `prisma/schema.prisma`, replace the `User` model's relation block (the lines from `reminders` through `facts`) with:

```prisma
  // ── Blocking ──────────────────────────────────────────────────
  // Null means active. A timestamp means blocked, and when.
  blockedAt         DateTime? @map("blocked_at")
  blockedReason     String?   @map("blocked_reason")

  // Set when the "your access is paused" notice has been delivered, so it is
  // sent exactly once no matter how many messages follow. Cleared on unblock.
  blockNoticeSentAt DateTime? @map("block_notice_sent_at")

  // ── Denormalised usage totals ─────────────────────────────────
  // Kept alongside usage_events so the admin user list is one query instead
  // of a groupBy over every event ever recorded. Incremented in the same
  // transaction as the UsageEvent insert.
  totalInputTokens  Int @default(0) @map("total_input_tokens")
  totalOutputTokens Int @default(0) @map("total_output_tokens")
  totalCostMicros   Int @default(0) @map("total_cost_micros")
  totalLlmCalls     Int @default(0) @map("total_llm_calls")

  // ── Per-user quota overrides ──────────────────────────────────
  // Null means "use the global env default". A paid plan later writes a
  // bigger number here and needs no code change.
  dailyTokenCap     Int? @map("daily_token_cap")
  weeklyTokenCap    Int? @map("weekly_token_cap")

  // ── Billing scaffolding, deliberately unused ──────────────────
  // Landed now so billing does not need a second migration. Nothing reads
  // these until a payment gateway exists.
  planTier          String    @default("free") @map("plan_tier")
  planPeriod        String?   @map("plan_period")
  planStartedAt     DateTime? @map("plan_started_at")
  planExpiresAt     DateTime? @map("plan_expires_at")

  reminders         Reminder[]
  messages          Message[]
  conversationState ConversationState?
  notes             Note[]
  documents         Document[]
  facts             Fact[]
  usageEvents       UsageEvent[]
```

- [ ] **Step 3: Add the four env vars to `src/lib/env.ts`**

In the `envSchema` object, after `AWS_S3_REGION`:

```ts
  // Token ceilings applied per user when User.dailyTokenCap / weeklyTokenCap
  // are null. Coerced because process.env values are always strings.
  DEFAULT_DAILY_TOKEN_CAP: z.coerce.number().int().positive().default(150_000),
  DEFAULT_WEEKLY_TOKEN_CAP: z.coerce.number().int().positive().default(700_000),

  // Admin dashboard. Both must be set or every /admin route returns 404.
  // Read directly from process.env by src/lib/admin-auth.ts — these entries
  // exist so a missing value is visible in the startup validation output.
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional(),
```

- [ ] **Step 4: Add the same four to the fallback object in `src/lib/env.ts`**

The `export const env: Env = _parsed.success ? _parsed.data : { ... }` fallback must list every field or TypeScript fails the build. After `AWS_S3_REGION: process.env.AWS_S3_REGION,`:

```ts
      DEFAULT_DAILY_TOKEN_CAP: Number(process.env.DEFAULT_DAILY_TOKEN_CAP) || 150_000,
      DEFAULT_WEEKLY_TOKEN_CAP: Number(process.env.DEFAULT_WEEKLY_TOKEN_CAP) || 700_000,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
```

- [ ] **Step 5: Regenerate the Prisma client — do NOT touch the database**

```bash
npm run db:generate
```

Expected: `Generated Prisma Client`.

**Do not run `npm run db:push` in this task.** `.env` points `DATABASE_URL` at the
live Supabase instance, and `prisma db push` diffs the whole schema — if the live
database has drifted from `schema.prisma` it can drop columns. The schema is
applied once, deliberately, in the Deployment section, after the exact DDL has
been reviewed. `prisma generate` reads only `schema.prisma`, opens no connection,
and is all every later task needs: `tsc --noEmit` and `npm test` both pass
against the generated client with no database present.

- [ ] **Step 6: Verify the types compile**

```bash
npx tsc --noEmit
```

Expected: no errors. If `Property 'DEFAULT_DAILY_TOKEN_CAP' is missing` appears, Step 4 was skipped.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/env.ts
git commit -m "feat: add usage_events table, blocking and quota columns"
```

---

## Task 2: Pricing and quota logic (pure)

**Files:**
- Create: `src/lib/usage-pricing.ts`
- Test: `tests/usage-pricing.test.ts`

**Interfaces:**
- Consumes: nothing. This module imports nothing from the project — that is what keeps it testable without a database.
- Produces:
  - `export interface TokenUsage { inputTokens: number; cachedTokens: number; outputTokens: number }`
  - `export function costMicrosFor(model: string, usage: TokenUsage): number`
  - `export interface QuotaVerdict { allowed: boolean; window: 'daily' | 'weekly' | null; used: number; cap: number }`
  - `export function quotaVerdict(daily: {used: number; cap: number}, weekly: {used: number; cap: number}): QuotaVerdict`

- [ ] **Step 1: Write the failing test**

Create `tests/usage-pricing.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { costMicrosFor, quotaVerdict } from '../src/lib/usage-pricing';

describe('costMicrosFor', () => {
  test('charges uncached input, cached input and output at their own rates', () => {
    // gpt-4.1-mini: 0.40 / 0.10 / 1.60 USD per 1M tokens.
    // (10000-4000)*0.40 + 4000*0.10 + 500*1.60 = 2400 + 400 + 800 = 3600
    const cost = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 10_000,
      cachedTokens: 4_000,
      outputTokens: 500,
    });
    assert.equal(cost, 3600);
  });

  test('returns an integer, never a float', () => {
    const cost = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 137,
      cachedTokens: 0,
      outputTokens: 41,
    });
    assert.ok(Number.isInteger(cost), `expected integer, got ${cost}`);
  });

  test('a zero-token call costs nothing', () => {
    assert.equal(
      costMicrosFor('gpt-4.1-mini', { inputTokens: 0, cachedTokens: 0, outputTokens: 0 }),
      0
    );
  });

  test('an unknown model falls back to the most expensive price, never the cheapest', () => {
    const unknown = costMicrosFor('some-future-model', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 1_000,
    });
    const cheapest = costMicrosFor('gpt-5-nano', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 1_000,
    });
    assert.ok(
      unknown > cheapest,
      'unknown models must over-estimate, so a new model cannot silently under-bill'
    );
  });

  test('a model id with a dated suffix resolves to its base price', () => {
    const dated = costMicrosFor('gpt-4.1-mini-2025-04-14', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 0,
    });
    const base = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 1_000,
      cachedTokens: 0,
      outputTokens: 0,
    });
    assert.equal(dated, base);
  });

  test('cached tokens exceeding input tokens cannot produce a negative charge', () => {
    // Defensive: a provider bug or a schema change must not credit the user.
    const cost = costMicrosFor('gpt-4.1-mini', {
      inputTokens: 100,
      cachedTokens: 500,
      outputTokens: 0,
    });
    assert.ok(cost >= 0, `expected non-negative, got ${cost}`);
  });
});

describe('quotaVerdict', () => {
  test('allows a user below both caps', () => {
    const v = quotaVerdict({ used: 10, cap: 100 }, { used: 50, cap: 700 });
    assert.equal(v.allowed, true);
    assert.equal(v.window, null);
  });

  test('blocks at exactly the cap, not one token past it', () => {
    const v = quotaVerdict({ used: 100, cap: 100 }, { used: 50, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'daily');
    assert.equal(v.used, 100);
    assert.equal(v.cap, 100);
  });

  test('reports the weekly window when only the weekly cap is crossed', () => {
    const v = quotaVerdict({ used: 10, cap: 100 }, { used: 700, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'weekly');
  });

  test('reports daily first when both are crossed, since it resets sooner', () => {
    const v = quotaVerdict({ used: 200, cap: 100 }, { used: 900, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'daily');
  });

  test('a cap of zero blocks everything', () => {
    const v = quotaVerdict({ used: 0, cap: 0 }, { used: 0, cap: 700 });
    assert.equal(v.allowed, false);
    assert.equal(v.window, 'daily');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/lib/usage-pricing'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/usage-pricing.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: all `usage-pricing` tests PASS, and the four existing test files still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/usage-pricing.ts tests/usage-pricing.test.ts
git commit -m "feat: token pricing and quota verdict logic"
```

---

## Task 3: Persist usage

**Files:**
- Create: `src/lib/usage.ts`

**Interfaces:**
- Consumes: `costMicrosFor`, `quotaVerdict`, `TokenUsage`, `QuotaVerdict` from Task 2. `prisma` from `./db`. `env` from `./env`.
- Produces:
  - `export async function recordUsage(params: RecordUsageParams): Promise<void>` where `RecordUsageParams = { userId: string; messageId?: string | null; purpose?: string; model: string; usage: TokenUsage }`
  - `export async function checkQuota(user: { id: string; dailyTokenCap: number | null; weeklyTokenCap: number | null }): Promise<QuotaVerdict>`

- [ ] **Step 1: Write the implementation**

There is no unit test for this task — every function here is a database call, and the project has no DB test harness. The logic it depends on is already covered by Task 2. Verification is Step 2 plus the end-to-end check in Task 10.

Create `src/lib/usage.ts`:

```ts
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
 * a turn that otherwise succeeded. Failures are logged loudly enough to find in
 * CloudWatch.
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
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors, all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/usage.ts
git commit -m "feat: persist per-call token usage and read quota windows"
```

---

## Task 4: Return usage from the parser and write it

**Files:**
- Modify: `src/lib/llm.ts` (the `parseUserMessage` signature, the `fallback` value, the success return, the catch return)
- Modify: `src/lib/reminder-service.ts` (the single `parseUserMessage` call site)

**Interfaces:**
- Consumes: `recordUsage` from Task 3, `TokenUsage` from Task 2.
- Produces: `parseUserMessage` now returns `Promise<ParseResult>` where `export interface ParseResult { parsed: ParsedAssistantResponse; usage: TokenUsage | null }`. `usage` is `null` when the call failed or the provider returned no usage block.

- [ ] **Step 1: Change the return type in `src/lib/llm.ts`**

`llm.ts` uses double quotes and 4-space indent — match it, not the rest of `src/lib`.

Add near the other exported interfaces (around `ParseOptions`, line ~385):

```ts
export interface ParseResult {
    parsed: ParsedAssistantResponse;
    /**
     * Null when the call threw or the provider returned no usage block. The
     * caller records nothing rather than recording zero, so a provider outage
     * does not look like free traffic on the dashboard.
     */
    usage: TokenUsage | null;
}
```

And at the top of the file, alongside the existing imports:

```ts
import type { TokenUsage } from "./usage-pricing";
```

- [ ] **Step 2: Change the signature and the three return points**

Change the signature at line ~404 from `): Promise<ParsedAssistantResponse> {` to:

```ts
): Promise<ParseResult> {
```

Then in the `try` block, replace the usage-logging section and both returns. The existing block starting `const usage: any = (response as any).usage;` becomes:

```ts
        // Real token counts per call, so cost is measured from production
        // traffic instead of estimated. `cached` is the discounted portion —
        // the static system prompt, once it has been seen recently.
        const raw: any = (response as any).usage;
        const usage: TokenUsage | null = raw
            ? {
                  inputTokens: raw.input_tokens ?? 0,
                  cachedTokens: raw.input_tokens_details?.cached_tokens ?? 0,
                  outputTokens: raw.output_tokens ?? 0,
              }
            : null;

        if (usage) {
            console.log(
                `[Remique] llm usage model=${env.OPENAI_MODEL} ` +
                    `in=${usage.inputTokens} cached=${usage.cachedTokens} ` +
                    `out=${usage.outputTokens} ` +
                    `notes=${savedNotes.length} facts=${knownFacts.length} ` +
                    `docs=${savedDocuments.length} turns=${recentTurns.length}`,
            );
        }

        const rawText = response.output_text;
        if (!rawText) return { parsed: fallback, usage };

        return { parsed: JSON.parse(rawText) as ParsedAssistantResponse, usage };
    } catch (error: any) {
        console.error("[Remique] OpenAI extraction error:", error?.message);
        return { parsed: fallback, usage: null };
    }
```

Note the `if (!rawText)` branch still returns `usage` — a call that produced no parsable text still burned tokens and must still be billed.

- [ ] **Step 3: Update the call site in `src/lib/reminder-service.ts`**

At line ~494 the current code is `const parsed = await parseUserMessage(userMessage, user.timezone, {`. Change the destructuring and add the recording call immediately after the options object closes:

```ts
  const { parsed, usage } = await parseUserMessage(userMessage, user.timezone, {
```

...and directly after that call's closing `});`:

```ts
  // Not awaited on the reply path: the model has answered and the user is
  // waiting. `recordUsage` swallows its own errors, so a floating rejection is
  // not possible here.
  if (usage) {
    void recordUsage({
      userId: user.id,
      messageId: message.id,
      purpose: 'parse',
      model: env.OPENAI_MODEL,
      usage,
    });
  }
```

- [ ] **Step 4: Add the imports to `src/lib/reminder-service.ts`**

Alongside the existing imports:

```ts
import { recordUsage } from './usage';
import { env } from './env';
```

If `env` is already imported there, do not add it twice — check first with `grep -n "from './env'" src/lib/reminder-service.ts`.

- [ ] **Step 5: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. A `Property 'intent' does not exist on type 'ParseResult'` error means a `parsed.` reference was missed — the destructuring in Step 3 renames nothing, so every existing `parsed.x` in the function still works.

- [ ] **Step 6: Run the tests**

```bash
npm test
```

Expected: all pass. `tests/documents.test.ts` imports from `reminder-service`, so this catches an import cycle if one was introduced.

- [ ] **Step 7: Commit**

```bash
git add src/lib/llm.ts src/lib/reminder-service.ts
git commit -m "feat: record real token usage per parse call"
```

---

## Task 5: Enforce blocking and quota in the pipeline

**Files:**
- Modify: `src/lib/message-pipeline.ts`

**Interfaces:**
- Consumes: `checkQuota` from Task 3.
- Produces: `PipelineStatus` gains `'blocked'` and `'quota_exceeded'`. Both return `retryable: false`.

- [ ] **Step 1: Extend `PipelineStatus`**

At line ~26, add the two new members:

```ts
export type PipelineStatus =
  | 'processed'
  | 'already_processed'
  | 'not_claimable'
  | 'no_user'
  | 'blocked'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'operator_action_required'
  | 'permanent_failure'
  | 'transient_failure';
```

- [ ] **Step 2: Add the block gate**

In `runMessagePipeline`, immediately after the `if (!user) { ... }` block and before `const now = new Date();`:

```ts
  // ── Blocked user ─────────────────────────────────────────────────
  // First, because it is the only check that needs no query at all — the user
  // row is already in hand. A blocked sender must not reach the model, the
  // context reads, or the WhatsApp API.
  if (user.blockedAt) {
    // The notice goes out once. Every message after it is answered with
    // silence, which costs nothing per message and gives a hostile sender no
    // feedback loop to push against.
    if (!user.blockNoticeSentAt) {
      try {
        await replyToUser(
          user,
          'Your access to Remique is paused right now. ' +
            'If you think that is a mistake, reply here and a human will look. 🔒'
        );
        await prisma.user.update({
          where: { id: user.id },
          data: { blockNoticeSentAt: new Date() },
        });
      } catch (notifyError: any) {
        console.error('[Remique] Failed to send block notice:', notifyError?.message);
      }
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { processedAt: new Date(), processingError: 'Blocked' },
    });

    console.warn(`[Remique] Blocked user message dropped userId=${user.id}`);
    return { status: 'blocked', retryable: false };
  }
```

This sits **before** `markReadAndShowTyping` is fired, so a blocked user does not even see the typing indicator.

- [ ] **Step 3: Fold the quota read into the existing `Promise.all`**

The existing `Promise.all` at line ~79 issues three queries. Add `checkQuota` as a fourth so the quota costs no extra round trip:

```ts
  const [claim, recentCount, activeState, quota] = await Promise.all([
    prisma.message.updateMany({
      where: { id: message.id, processedAt: null, attempts: message.attempts },
      data: { attempts: { increment: 1 } },
    }),
    prisma.message.count({
      where: {
        userId: user.id,
        direction: 'INBOUND',
        createdAt: { gte: oneHourAgo },
      },
    }),
    prisma.conversationState.findFirst({
      where: { userId: user.id, expiresAt: { gt: now } },
    }),
    checkQuota(user),
  ]);
```

- [ ] **Step 4: Add the quota gate after the rate-limit block**

Immediately after the existing rate-limit `if (recentCount > MAX_MESSAGES_PER_HOUR) { ... }` block, and before the `try {`:

```ts
  // ── Per-user token quota ─────────────────────────────────────────
  // Checked after the message-count limit because it is the more expensive of
  // the two reads, and after the claim so a rejected message is still marked
  // answered rather than swept and retried forever.
  if (!quota.allowed) {
    console.warn(
      `[Remique] Quota exceeded userId=${user.id} window=${quota.window} ` +
        `used=${quota.used} cap=${quota.cap} messageId=${message.id}`
    );

    // Told once, on the message that crosses the line. Replying to every
    // message past the cap would move the cost from OpenAI to WhatsApp.
    const alreadyToldRecently = await prisma.message.findFirst({
      where: {
        userId: user.id,
        direction: 'INBOUND',
        processingError: 'Quota exceeded',
        createdAt: { gte: oneHourAgo },
      },
      select: { id: true },
    });

    if (!alreadyToldRecently) {
      try {
        const when = quota.window === 'daily' ? 'today' : 'this week';
        await replyToUser(
          user,
          `You have used up your Remique allowance for ${when}. ` +
            'It refills on a rolling basis, so try again a little later. ⏳'
        );
      } catch (notifyError: any) {
        console.error('[Remique] Failed to send quota notice:', notifyError?.message);
      }
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { processedAt: new Date(), processingError: 'Quota exceeded' },
    });

    await typing;
    return { status: 'quota_exceeded', retryable: false };
  }
```

- [ ] **Step 5: Add the import**

At the top of `src/lib/message-pipeline.ts`:

```ts
import { checkQuota } from './usage';
```

`replyToUser` and `prisma` are already imported there.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/message-pipeline.ts
git commit -m "feat: reject blocked and over-quota messages before the model call"
```

---

## Task 6: Admin session auth (pure)

**Files:**
- Create: `src/lib/admin-auth.ts`
- Test: `tests/admin-auth.test.ts`

**Interfaces:**
- Consumes: nothing from the project. Reads `process.env.ADMIN_PASSWORD` and `process.env.ADMIN_SESSION_SECRET` directly — **never** `src/lib/env.ts`, per Global Constraints.
- Produces:
  - `export const ADMIN_COOKIE = 'remique_admin'`
  - `export const SESSION_TTL_MS: number`
  - `export function adminConfigured(): boolean`
  - `export async function createSessionToken(now?: number): Promise<string>`
  - `export async function verifySessionToken(token: string | undefined | null, now?: number): Promise<boolean>`
  - `export async function passwordMatches(submitted: string): Promise<boolean>`

The optional `now` parameters exist so expiry can be tested without waiting 12 hours.

- [ ] **Step 1: Write the failing test**

Create `tests/admin-auth.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

import {
  adminConfigured,
  createSessionToken,
  passwordMatches,
  verifySessionToken,
  SESSION_TTL_MS,
} from '../src/lib/admin-auth';

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple';
  process.env.ADMIN_SESSION_SECRET = 'a-signing-secret';
});

describe('adminConfigured', () => {
  test('true when both secrets are present', () => {
    assert.equal(adminConfigured(), true);
  });

  test('false when the password is missing', () => {
    delete process.env.ADMIN_PASSWORD;
    assert.equal(adminConfigured(), false);
  });

  test('false when the signing secret is missing', () => {
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(adminConfigured(), false);
  });

  test('false when a secret is set but empty', () => {
    process.env.ADMIN_PASSWORD = '';
    assert.equal(adminConfigured(), false);
  });
});

describe('session tokens', () => {
  test('a freshly signed token verifies', async () => {
    const token = await createSessionToken();
    assert.equal(await verifySessionToken(token), true);
  });

  test('a tampered signature does not verify', async () => {
    const token = await createSessionToken();
    const [expiry, sig] = token.split('.');
    const flipped = sig[0] === 'a' ? `b${sig.slice(1)}` : `a${sig.slice(1)}`;
    assert.equal(await verifySessionToken(`${expiry}.${flipped}`), false);
  });

  test('an extended expiry does not verify, because the expiry is signed', async () => {
    const token = await createSessionToken();
    const sig = token.split('.')[1];
    const farFuture = Date.now() + 10 * SESSION_TTL_MS;
    assert.equal(await verifySessionToken(`${farFuture}.${sig}`), false);
  });

  test('an expired token does not verify', async () => {
    const issuedAt = Date.now() - 2 * SESSION_TTL_MS;
    const token = await createSessionToken(issuedAt);
    assert.equal(await verifySessionToken(token), false);
  });

  test('a token signed with a different secret does not verify', async () => {
    const token = await createSessionToken();
    process.env.ADMIN_SESSION_SECRET = 'a-different-secret';
    assert.equal(await verifySessionToken(token), false);
  });

  test('undefined, empty and malformed tokens do not verify', async () => {
    assert.equal(await verifySessionToken(undefined), false);
    assert.equal(await verifySessionToken(null), false);
    assert.equal(await verifySessionToken(''), false);
    assert.equal(await verifySessionToken('garbage'), false);
    assert.equal(await verifySessionToken('...'), false);
    assert.equal(await verifySessionToken('notanumber.abcd'), false);
  });

  test('nothing verifies when admin is not configured', async () => {
    const token = await createSessionToken();
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(await verifySessionToken(token), false);
  });
});

describe('passwordMatches', () => {
  test('true for the exact password', async () => {
    assert.equal(await passwordMatches('correct-horse-battery-staple'), true);
  });

  test('false for a prefix of the password', async () => {
    assert.equal(await passwordMatches('correct-horse'), false);
  });

  test('false for a string that merely starts with the password', async () => {
    assert.equal(await passwordMatches('correct-horse-battery-staple-extra'), false);
  });

  test('false for the empty string', async () => {
    assert.equal(await passwordMatches(''), false);
  });

  test('false when admin is not configured, even for an empty submission', async () => {
    delete process.env.ADMIN_PASSWORD;
    assert.equal(await passwordMatches(''), false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/lib/admin-auth'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/admin-auth.ts`:

```ts
/**
 * Session handling for the admin dashboard.
 *
 * Uses Web Crypto rather than `node:crypto` because this module is imported by
 * `src/middleware.ts`, which Next 15.1 runs on the Edge runtime. Web Crypto is
 * global in both Edge and Node 20, so one implementation serves middleware and
 * route handlers alike.
 *
 * Reads `process.env` directly and never imports `src/lib/env.ts`: that module
 * throws in production when unrelated variables are missing, and Edge
 * middleware may not have them. A missing DATABASE_URL must not take the admin
 * panel down with it.
 */

export const ADMIN_COOKIE = 'remique_admin';

/** Twelve hours. Long enough for a working session, short enough to matter. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function password(): string {
  return process.env.ADMIN_PASSWORD ?? '';
}

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? '';
}

/**
 * Whether the admin surface exists at all.
 *
 * When this is false every admin route returns 404 rather than a login form —
 * an unconfigured deployment must not advertise that an admin panel is there.
 */
export function adminConfigured(): boolean {
  return password().length > 0 && secret().length > 0;
}

async function hmacHex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * `<expiryMs>.<hmacHex>`.
 *
 * The expiry is inside the signed payload, so extending it invalidates the
 * signature. The password itself never enters the cookie.
 */
export async function createSessionToken(now: number = Date.now()): Promise<string> {
  const expiry = String(now + SESSION_TTL_MS);
  return `${expiry}.${await hmacHex(secret(), expiry)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now()
): Promise<boolean> {
  if (!adminConfigured() || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiryRaw, signature] = parts;
  const expiry = Number(expiryRaw);
  if (!Number.isFinite(expiry) || expiry <= now) return false;

  const expected = await hmacHex(secret(), expiryRaw);
  return constantTimeEqual(signature, expected);
}

/**
 * Compares HMACs of the two strings rather than the strings themselves.
 *
 * Both digests are fixed-length hex, so the comparison leaks neither the
 * password's length nor the position of the first differing character.
 */
export async function passwordMatches(submitted: string): Promise<boolean> {
  if (!adminConfigured()) return false;

  const key = secret();
  const [a, b] = await Promise.all([hmacHex(key, submitted), hmacHex(key, password())]);
  return constantTimeEqual(a, b);
}

/** Both arguments are fixed-length hex digests by construction. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: all `admin-auth` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-auth.ts tests/admin-auth.test.ts
git commit -m "feat: HMAC-signed admin session tokens"
```

---

## Task 7: Middleware, login page, login and logout routes

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin/login-form.tsx`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`

**Interfaces:**
- Consumes: `ADMIN_COOKIE`, `SESSION_TTL_MS`, `adminConfigured`, `createSessionToken`, `verifySessionToken`, `passwordMatches` from Task 6.
- Produces: a working login flow. Every later admin page can assume the session is already valid — middleware has run.

- [ ] **Step 1: Create the middleware**

Create `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminConfigured, verifySessionToken } from './lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

/** The two paths that must stay reachable without a session. */
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No secrets configured means the admin surface does not exist. A 404 rather
  // than a 500 or a login form, so an unconfigured deployment gives a scanner
  // nothing to work with.
  if (!adminConfigured()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const valid = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);

  if (valid) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // An expired session during a fetch must surface as an error the caller can
  // read, not an HTML redirect it will try to parse as JSON.
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}
```

- [ ] **Step 2: Create the admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Remique Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-display text-lg tracking-tight">
            Remique <span className="text-ink-3">admin</span>
          </Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="text-sm text-ink-3 hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create the login form client component**

Create `src/components/admin/login-form.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      // refresh() first so the server components re-render with the new
      // cookie; push() alone can land on a cached unauthenticated render.
      router.refresh();
      router.push('/admin');
      return;
    }

    const body = await response.json().catch(() => ({ error: 'Sign in failed' }));
    setError(body.error ?? 'Sign in failed');
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm text-ink-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-ground px-3 py-2 font-mono text-sm outline-none focus:border-brand"
          required
        />
      </div>

      {error ? <p className="text-sm text-signal-ink">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create the login page**

Create `src/app/admin/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/admin/login-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="font-display text-2xl tracking-display">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-ink-3">Remique operator access.</p>
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 5: Create the login route**

Create `src/app/api/admin/login/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, SESSION_TTL_MS, createSessionToken, passwordMatches } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Best-effort brute-force brake.
 *
 * Per-instance and in-memory: Vercel runs many instances and they share
 * nothing, so a determined attacker gets this many attempts *per instance*.
 * It stops casual scanning, not a real brute force. The security actually
 * rests on ADMIN_PASSWORD having enough entropy.
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || record.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (tooManyAttempts(ip)) {
    console.warn(`[Remique] Admin login rate limited ip=${ip}`);
    return NextResponse.json({ error: 'Too many attempts. Wait 15 minutes.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const submitted = typeof body?.password === 'string' ? body.password : '';

  if (!(await passwordMatches(submitted))) {
    console.warn(`[Remique] Failed admin login ip=${ip}`);
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // A success clears the counter so a legitimate operator who fat-fingered it
  // a few times is not locked out afterwards.
  attempts.delete(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}
```

- [ ] **Step 6: Create the logout route**

Create `src/app/api/admin/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Redirects rather than returning JSON because the sign-out control in the
  // admin layout is a plain form, not a fetch — it has no client JS to follow
  // up with.
  const response = NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 });
  response.cookies.set({ name: ADMIN_COOKIE, value: '', path: '/', maxAge: 0 });
  return response;
}
```

- [ ] **Step 7: Add a temporary `/admin` page so the flow is testable**

Create `src/app/admin/page.tsx` as a stub; Task 9 replaces its body entirely.

```tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function AdminHomePage() {
  return <p className="text-sm text-ink-2">Signed in. User list lands in Task 9.</p>;
}
```

- [ ] **Step 8: Verify the whole flow against the dev server**

Add the two secrets to `.env.local` first:

```bash
printf '\nADMIN_PASSWORD=dev-only-change-me-before-deploy\nADMIN_SESSION_SECRET=dev-only-signing-secret\n' >> .env.local
```

Then run `npm run dev` and check, in order:

1. `/admin` with no cookie → redirects to `/admin/login`.
2. Wrong password → the form shows "Incorrect password", no cookie set.
3. Correct password → lands on `/admin` showing the stub text.
4. `curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/admin/users/x/block -X POST` → `401`, not a redirect.
5. Sign out → back at `/admin/login`, and `/admin` redirects again.
6. Comment `ADMIN_PASSWORD` out of `.env.local`, restart, and `/admin` returns **404**, not a login form. Uncomment it afterwards.

- [ ] **Step 9: Commit**

```bash
git add src/middleware.ts src/app/admin src/app/api/admin src/components/admin
git commit -m "feat: password-gated admin session, login and logout"
```

---

## Task 8: Admin queries

**Files:**
- Create: `src/lib/admin-queries.ts`

**Interfaces:**
- Consumes: `prisma` from `./db`, `env` from `./env`.
- Produces:
  - `export type UserSort = 'cost' | 'recent' | 'joined'`
  - `export async function listUsers(options?: { sort?: UserSort; limit?: number; offset?: number }): Promise<UserListRow[]>`
  - `export async function countUsers(): Promise<number>`
  - `export async function getUserDetail(id: string): Promise<UserDetail | null>`

`UserListRow` and `UserDetail` are inferred from the Prisma calls; export both types so the pages can name them.

- [ ] **Step 1: Write the implementation**

Create `src/lib/admin-queries.ts`:

```ts
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
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-queries.ts
git commit -m "feat: admin dashboard queries"
```

---

## Task 9: User list page

**Files:**
- Modify: `src/app/admin/page.tsx` (replacing the Task 7 stub entirely)

**Interfaces:**
- Consumes: `listUsers`, `countUsers`, `formatCost`, `formatTokens`, `UserSort` from Task 8.
- Produces: nothing other tasks consume.

- [ ] **Step 1: Replace `src/app/admin/page.tsx`**

```tsx
import Link from 'next/link';

import { countUsers, formatCost, formatTokens, listUsers, type UserSort } from '@/lib/admin-queries';

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

export default async function AdminUsersPage({
  searchParams,
}: {
  // In Next 15 searchParams is a Promise, like params.
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort: UserSort = isSort(rawSort) ? rawSort : 'cost';

  const [users, total] = await Promise.all([listUsers({ sort, limit: 100 }), countUsers()]);

  const totalCost = users.reduce((sum, u) => sum + u.totalCostMicros, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-display">Users</h1>
          <p className="mt-1 text-sm text-ink-3">
            {total} total · {formatCost(totalCost)} across the {users.length} shown
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

      <div className="mt-8 overflow-x-auto">
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
```

- [ ] **Step 2: Verify against the dev server**

`npm run dev`, sign in, and confirm `/admin` renders the table, that all three sort links change the order, and that a user's name links to `/admin/users/<id>` (which 404s until Task 10 — expected).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: admin user list with cost, tokens and block status"
```

---

## Task 10: User detail page, block toggle and quota override

**Files:**
- Create: `src/app/admin/users/[id]/page.tsx`
- Create: `src/components/admin/block-toggle.tsx`
- Create: `src/components/admin/quota-form.tsx`
- Create: `src/components/admin/usage-chart.tsx`
- Create: `src/app/api/admin/users/[id]/block/route.ts`
- Create: `src/app/api/admin/users/[id]/quota/route.ts`

**Interfaces:**
- Consumes: `getUserDetail`, `formatCost`, `formatTokens`, `UsageDay` from Task 8.
- Produces: nothing other tasks consume. This is the last task.

- [ ] **Step 1: Create the block route**

Create `src/app/api/admin/users/[id]/block/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The session is already verified by src/middleware.ts — this route is only
// reachable with a valid cookie.
export async function POST(
  request: NextRequest,
  // Next 15: params is a Promise. Destructuring it synchronously is the single
  // most common way to break a route handler on this version.
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.blocked !== 'boolean') {
    return NextResponse.json({ error: 'blocked must be a boolean' }, { status: 400 });
  }

  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;

  try {
    await prisma.user.update({
      where: { id },
      data: body.blocked
        ? { blockedAt: new Date(), blockedReason: reason }
        : // Clearing blockNoticeSentAt too, so a later re-block notifies the
          // user again instead of going silently dark on them.
          { blockedAt: null, blockedReason: null, blockNoticeSentAt: null },
    });
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  console.warn(`[Remique] Admin ${body.blocked ? 'blocked' : 'unblocked'} userId=${id}`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create the quota route**

Create `src/app/api/admin/users/[id]/quota/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Null means "inherit the global env default". Anything else must be a non-negative integer. */
function parseCap(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const daily = parseCap(body?.dailyTokenCap);
  const weekly = parseCap(body?.weeklyTokenCap);

  if (daily === undefined || weekly === undefined) {
    return NextResponse.json(
      { error: 'Caps must be a non-negative whole number, or null to inherit the default' },
      { status: 400 }
    );
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { dailyTokenCap: daily, weeklyTokenCap: weekly },
    });
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  console.warn(`[Remique] Admin set caps userId=${id} daily=${daily} weekly=${weekly}`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create the block toggle client component**

Create `src/components/admin/block-toggle.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BlockToggle({ userId, blocked }: { userId: string; blocked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    // Blocking cuts a real person off mid-conversation; unblocking is harmless,
    // so only one direction asks.
    if (!blocked && !confirm('Block this user? They will stop getting replies.')) return;

    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: !blocked }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? `Failed (${response.status})`);
      setBusy(false);
      return;
    }

    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={
          blocked
            ? 'rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ground-2 disabled:opacity-50'
            : 'rounded-md bg-signal-ink px-3 py-1.5 text-sm text-white disabled:opacity-50'
        }
      >
        {busy ? '…' : blocked ? 'Unblock' : 'Block user'}
      </button>
      {error ? <span className="text-xs text-signal-ink">{error}</span> : null}
    </div>
  );
}
```

- [ ] **Step 4: Create the quota form client component**

Create `src/components/admin/quota-form.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function QuotaForm({
  userId,
  dailyTokenCap,
  weeklyTokenCap,
  defaultDaily,
  defaultWeekly,
}: {
  userId: string;
  dailyTokenCap: number | null;
  weeklyTokenCap: number | null;
  defaultDaily: number;
  defaultWeekly: number;
}) {
  const router = useRouter();
  const [daily, setDaily] = useState(dailyTokenCap === null ? '' : String(dailyTokenCap));
  const [weekly, setWeekly] = useState(weeklyTokenCap === null ? '' : String(weeklyTokenCap));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    // An empty field means "inherit the global default", which is null on the
    // wire — not zero, which would block the user entirely.
    const response = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyTokenCap: daily.trim() === '' ? null : Number(daily),
        weeklyTokenCap: weekly.trim() === '' ? null : Number(weekly),
      }),
    });

    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'Saved' : (body.error ?? `Failed (${response.status})`));
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="flex gap-4">
        <label className="flex-1 text-sm">
          <span className="block text-ink-2">Daily token cap</span>
          <input
            type="number"
            min={0}
            step={1}
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            placeholder={`${defaultDaily} (default)`}
            className="mt-1 w-full rounded-md border border-line bg-ground px-3 py-2 font-mono text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="block text-ink-2">Weekly token cap</span>
          <input
            type="number"
            min={0}
            step={1}
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
            placeholder={`${defaultWeekly} (default)`}
            className="mt-1 w-full rounded-md border border-line bg-ground px-3 py-2 font-mono text-sm outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-ground-2 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save caps'}
        </button>
        <span className="text-xs text-ink-3">Leave blank to inherit the global default.</span>
        {message ? <span className="text-xs text-ink-2">{message}</span> : null}
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create the usage chart**

Create `src/components/admin/usage-chart.tsx`. A server component — inline SVG, no library, per the no-new-dependencies constraint.

```tsx
import type { UsageDay } from '@/lib/admin-queries';

export function UsageChart({ days }: { days: UsageDay[] }) {
  const peak = Math.max(1, ...days.map((d) => d.tokens));
  const barWidth = 100 / days.length;

  return (
    <div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-24 w-full" role="img"
           aria-label={`Token use over the last ${days.length} days`}>
        {days.map((day, i) => {
          const height = (day.tokens / peak) * 28;
          return (
            <rect
              key={day.day}
              x={i * barWidth + barWidth * 0.15}
              y={29 - height}
              width={barWidth * 0.7}
              height={Math.max(height, day.tokens > 0 ? 0.4 : 0)}
              className="fill-brand"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-xs text-ink-3">
        <span>{days[0]?.day}</span>
        <span>peak {peak.toLocaleString()} tokens/day</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create the user detail page**

Create `src/app/admin/users/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockToggle } from '@/components/admin/block-toggle';
import { QuotaForm } from '@/components/admin/quota-form';
import { UsageChart } from '@/components/admin/usage-chart';
import { formatCost, formatTokens, getUserDetail } from '@/lib/admin-queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <h2 className="mb-4 font-display text-lg tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-0.5 font-mono text-lg">{value}</div>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { user, messages, documents, facts, activeReminders, pastReminders, usageByDay, usageWindow } =
    detail;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-ink-3 hover:text-ink">
          ← All users
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-display">{user.name ?? 'Unnamed'}</h1>
            <p className="mt-1 font-mono text-sm text-ink-3">
              {user.phoneNumber} · {user.timezone} · joined{' '}
              {user.createdAt.toISOString().slice(0, 10)}
            </p>
            {user.blockedAt ? (
              <p className="mt-2 text-sm text-signal-ink">
                Blocked {user.blockedAt.toISOString().slice(0, 10)}
                {user.blockedReason ? ` — ${user.blockedReason}` : ''}
              </p>
            ) : null}
          </div>
          <BlockToggle userId={user.id} blocked={user.blockedAt !== null} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Lifetime cost" value={formatCost(user.totalCostMicros)} />
        <Stat
          label="Lifetime tokens"
          value={formatTokens(user.totalInputTokens + user.totalOutputTokens)}
        />
        <Stat label="Model calls" value={String(user.totalLlmCalls)} />
        <Stat label="Messages" value={String(messages.length >= 100 ? '100+' : messages.length)} />
      </div>

      <Section title="Current windows">
        <div className="grid grid-cols-2 gap-6">
          <Stat
            label="Last 24 hours"
            value={`${formatTokens(usageWindow.dailyTokens)} / ${formatTokens(usageWindow.dailyCap)}`}
          />
          <Stat
            label="Last 7 days"
            value={`${formatTokens(usageWindow.weeklyTokens)} / ${formatTokens(usageWindow.weeklyCap)}`}
          />
        </div>
        <div className="mt-6">
          <UsageChart days={usageByDay} />
        </div>
      </Section>

      <Section title="Quota">
        <QuotaForm
          userId={user.id}
          dailyTokenCap={user.dailyTokenCap}
          weeklyTokenCap={user.weeklyTokenCap}
          defaultDaily={usageWindow.dailyCap}
          defaultWeekly={usageWindow.weeklyCap}
        />
      </Section>

      <Section title={`Active reminders (${activeReminders.length})`}>
        {activeReminders.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing scheduled.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activeReminders.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-line pb-2">
                <span>
                  {r.title}
                  <span className="ml-2 text-xs text-ink-3">{r.category}</span>
                  {r.recurrenceRule ? (
                    <span className="ml-2 text-xs text-brand-deep">{r.recurrenceRule}</span>
                  ) : null}
                </span>
                <span className="font-mono text-xs text-ink-3">
                  {r.scheduledAt.toISOString().replace('T', ' ').slice(0, 16)} UTC
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Files (${documents.length})`}>
        {documents.length === 0 ? (
          <p className="text-sm text-ink-3">No files saved.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="py-2 pr-4 font-medium">Label</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 text-right font-medium">Size</th>
                <th className="py-2 font-medium">Saved</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-line">
                  <td className="py-2 pr-4">
                    {d.label ?? <span className="text-ink-3">unlabelled — swept after 24h</span>}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-ink-3">{d.mimeType}</td>
                  <td className="py-2 pr-4 text-right font-mono text-xs">
                    {(d.sizeBytes / 1024).toFixed(0)} KB
                  </td>
                  <td className="py-2 font-mono text-xs text-ink-3">
                    {d.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Known facts (${facts.length})`}>
        {facts.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing learned yet.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {facts.map((f) => (
              <li key={f.id}>
                <span className="text-ink-3">{f.subject}.{f.predicate}</span> = {f.value}
                {f.recurring ? <span className="ml-2 text-brand-deep">recurring</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent messages (last 100)">
        <ul className="space-y-2 text-sm">
          {messages.map((m) => (
            <li key={m.id} className="border-b border-line pb-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className={m.direction === 'INBOUND' ? 'text-ink' : 'text-ink-3'}>
                  <span className="mr-2 font-mono text-xs">
                    {m.direction === 'INBOUND' ? '→' : '←'}
                  </span>
                  {m.messageText || <em className="text-ink-3">({m.mediaType ?? 'no text'})</em>}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-3">
                  {m.createdAt.toISOString().replace('T', ' ').slice(0, 16)}
                </span>
              </div>
              {m.processingError ? (
                <div className="mt-1 font-mono text-xs text-signal-ink">{m.processingError}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Past reminders (${pastReminders.length})`}>
        {pastReminders.length === 0 ? (
          <p className="text-sm text-ink-3">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {pastReminders.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-line pb-1">
                <span>
                  {r.title} <span className="ml-2 text-xs text-ink-3">{r.status}</span>
                </span>
                <span className="font-mono text-xs text-ink-3">
                  {r.scheduledAt.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
```

- [ ] **Step 7: Verify types and tests**

```bash
npx tsc --noEmit && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 8: End-to-end verification against the dev server**

`npm run dev`, sign in, and confirm each of these:

1. A user row on `/admin` opens their detail page with reminders, files, facts and messages populated.
2. **Send a real WhatsApp message to the bot** (or wait for one), then reload the detail page: `Lifetime cost`, `Model calls` and the `Last 24 hours` window all move. This is the whole point of the feature — if these stay at zero, Task 4's wiring is wrong.
3. Confirm the row landed: `npx prisma studio`, open `usage_events`, and check the newest row has a non-zero `cost_micros` and a `message_id` that matches the message just sent.
4. Set that user's daily cap to `1`, save, send another WhatsApp message. The bot should reply with the allowance notice, and the message row should carry `processingError = 'Quota exceeded'`. Clear the cap afterwards.
5. Block the user, send a message: one "access is paused" reply, then silence on the next message. Unblock afterwards and confirm replies resume.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin src/app/api/admin src/components/admin
git commit -m "feat: admin user detail with usage chart, block toggle and quota override"
```

---

## Deployment

Run after the branch merges. Steps 4 and 5 are the ones that get forgotten — the Lambda zips do not update when Vercel deploys.

- [ ] **Step 1: Verify the prices before trusting the dashboard**

Check every entry in `PRICES` in `src/lib/usage-pricing.ts` against
<https://openai.com/api/pricing>. They were written from memory and are a
starting point, not a contract. In particular confirm the entry matching
whatever `OPENAI_MODEL` is set to in production.

- [ ] **Step 2: Print the exact DDL before writing anything to the database**

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

Expected: one `CREATE TABLE "usage_events"`, its two `CREATE INDEX` statements,
and a run of `ALTER TABLE "users" ADD COLUMN` lines. **Nothing else.**

If the output contains any `DROP`, the live database has drifted from
`schema.prisma` and `db push` would destroy data. Stop, and apply only the
additive statements by hand instead.

- [ ] **Step 3: Apply the schema**

```bash
npm run db:push && npm run db:generate
```

- [ ] **Step 4: Rebuild the Lambda bundles**

```bash
npm run build:aws
```

- [ ] **Step 5: Upload `dist/aws/remique-worker.zip` to the `remique-worker` Lambda**

Via the AWS console. `remique-webhook` is unchanged and does not need redeploying.

- [ ] **Step 6: Set environment variables**

On the **`remique-worker` Lambda**:
- `DEFAULT_DAILY_TOKEN_CAP`
- `DEFAULT_WEEKLY_TOKEN_CAP`

On **Vercel** (production and preview):
- `DEFAULT_DAILY_TOKEN_CAP`, `DEFAULT_WEEKLY_TOKEN_CAP` — same values
- `ADMIN_PASSWORD` — **generate a high-entropy value**, e.g. `openssl rand -base64 24`. This single string is the only thing protecting every user's messages, phone numbers and files. Do not reuse a password from anywhere else.
- `ADMIN_SESSION_SECRET` — a second independent random value, `openssl rand -hex 32`

- [ ] **Step 7: Deploy Vercel and verify**

Push the branch and let Vercel deploy, then:

```bash
# Should be 200 and a login form
curl -s -o /dev/null -w '%{http_code}\n' https://<your-domain>/admin/login
# Should be 307 to /admin/login, never 200
curl -s -o /dev/null -w '%{http_code}\n' https://<your-domain>/admin
# Should be 401 JSON, never a redirect
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<your-domain>/api/admin/users/x/block
```

- [ ] **Step 8: Confirm production metering**

Send one WhatsApp message to the bot, then:

```sql
select model, input_tokens, cached_tokens, output_tokens, cost_micros, created_at
from usage_events order by created_at desc limit 1;
```

A row here means the whole path works. No row means the worker Lambda is
running the old zip — repeat Steps 4 and 5.

---

## Follow-ups, deliberately not in this plan

- **Sub-project D** (user data deletion over WhatsApp) — spec Part 5.
- **Sub-project E** (payment gateway) — the columns exist; nothing reads them.
- **`MAX_MESSAGES_PER_HOUR = 100`** in `src/lib/message-pipeline.ts:24` still carries a comment saying to lower it before real users. Now that a token cap exists, decide whether it drops back down.
- **Encryption at rest** — noted in the spec, not solved by a flag.
