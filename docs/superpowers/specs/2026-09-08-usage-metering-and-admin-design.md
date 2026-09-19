# Usage Metering, Admin Dashboard, and User Data Deletion

**Date:** 2026-09-08
**Status:** Draft — awaiting review
**Scope of this document:** Full walkthrough of the system as it runs today, a
decomposition of the requested work into five sub-projects, and complete
implementation specs for the first three (A: usage metering, B: user blocking,
C: admin dashboard). D and E are scoped but not specified — each gets its own
design cycle.

---

## Part 0 — Why this work exists

Every inbound WhatsApp message costs exactly one OpenAI call. The number of
tokens that call consumed is read off the API response and written to
`console.log` at [`src/lib/llm.ts:560`](../../../src/lib/llm.ts). It is never
persisted. Nothing in the database, and therefore nothing in any dashboard,
can answer "how much has this user cost us."

The only spend control that exists is `MAX_MESSAGES_PER_HOUR = 100` in
[`src/lib/message-pipeline.ts:24`](../../../src/lib/message-pipeline.ts). It
counts *messages*, not tokens. A user sending 100 short messages and a user
sending 100 messages that each drag 40 saved facts, 20 documents and a long
history into the prompt are treated identically, and the second one can cost
20–50x the first.

---

## Part 1 — The system as it runs today

Nothing in this part is proposed. This is a reading of the current source, so
it can be used as an operations reference.

### 1.1 Deployment topology

Two clouds, deliberately split:

| Component | Runs on | Source |
|---|---|---|
| `remique-webhook` Lambda | AWS `ap-southeast-1` | `src/aws/webhook/index.ts` |
| `remique-inbound.fifo` SQS queue | AWS `ap-southeast-1` | — (console-managed) |
| `remique-worker` Lambda | AWS `ap-southeast-1` | `src/aws/worker/index.ts` |
| Landing page + job routes | Vercel | `src/app/**` |
| Postgres | Supabase | `prisma/schema.prisma` |
| Document blobs | S3 (`S3_BUCKET_DOCUMENTS`) | `src/lib/storage.ts` |
| Delayed delivery | Upstash QStash | `src/lib/qstash.ts` |

The AWS worker and the Vercel job routes both import the same `src/lib/*`
modules. `scripts/build-lambdas.sh` bundles them into the Lambda zips.

### 1.2 Inbound message — step by step, with timing

**Step 1 — user sends.** User types in the WhatsApp thread with
**+880 1853-501469**. Meta's Cloud API POSTs a JSON payload to the
`remique-webhook` Lambda Function URL.

**Step 2 — webhook Lambda. Target < 150ms.**
File: [`src/aws/webhook/index.ts`](../../../src/aws/webhook/index.ts)

- `GET` request → Meta's subscription handshake. Compares
  `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN`, echoes `hub.challenge`
  back as `text/plain`. Wrong token → `403`.
- `POST` request → the real path:
  1. Extract the **raw** body (base64-decoded if `isBase64Encoded`). The raw
     bytes matter — the HMAC is computed over them, so re-serializing the JSON
     would break the check.
  2. HMAC-SHA256 the raw body with `WHATSAPP_APP_SECRET`, compare against the
     `x-hub-signature-256` header using `timingSafeEqual`
     ([line 61](../../../src/aws/webhook/index.ts)). Mismatch or missing → `403`.
     If `WHATSAPP_APP_SECRET` is unset the check is skipped with a warning —
     dev only.
  3. Filter on `message.type`. Only `text`, `image`, `document`, `interactive`
     proceed ([line 18](../../../src/aws/webhook/index.ts)). Delivery receipts,
     read receipts, reactions and stickers get a `200` so Meta stops retrying,
     and are dropped.
  4. `SendMessage` to SQS FIFO with
     `MessageGroupId = message.from` (the sender's number) and
     `MessageDeduplicationId = message.id` (Meta's globally unique id).
  5. Return `200 accepted`.

This Lambda imports no Prisma, no OpenAI, no Luxon. That is the reason it is
fast enough that Meta never times out and retries.

**Step 3 — the queue.**
`remique-inbound.fifo`, visibility timeout 60s, maxReceiveCount 5, DLQ
`remique-inbound-dlq.fifo`. FIFO by sender number means one user's messages are
processed strictly in order while different users process concurrently.

**Step 4 — worker Lambda. Typically 1–5s wall clock.**
File: [`src/aws/worker/index.ts`](../../../src/aws/worker/index.ts)

Re-parses the payload and extracts the useful text depending on type:
`text.body`, or `interactive.button_reply.title`, or the media `caption`.
Media descriptors (`image` / `document`) are carried separately — Meta's media
IDs expire, so the bytes have to be fetched promptly.

**Step 5 — claim the message. 1 DB write.**
`claimInboundMessage()` —
[`src/lib/message-pipeline.ts:220`](../../../src/lib/message-pipeline.ts)

A single insert creates the `Message` row and, via `connectOrCreate` on
`User.whatsappId`, the `User` row if this is a first-time sender. On a P2002
unique violation it looks the existing row up:

- `processedAt != null` → returns `null`. A genuine duplicate, dropped.
- `processedAt == null` → returns the existing row. A previous attempt died
  before replying; Meta's retry must **not** be dropped.
- Collision was on `whatsappId` instead (two messages from a brand new sender
  arriving simultaneously) → retries the insert once.

**Step 6 — the pipeline.**
`runMessagePipeline()` —
[`src/lib/message-pipeline.ts:52`](../../../src/lib/message-pipeline.ts)

1. Fires `markReadAndShowTyping()` **unawaited** — the user sees the typing
   indicator while the model runs.
2. One `Promise.all` of three independent queries:
   - an optimistic `updateMany` on `attempts` (a concurrent second attempt
     loses this write and bails, which is what prevents double replies),
   - a `count` of this user's inbound messages in the last hour,
   - the active `ConversationState`, if any.
3. **Rate limit.** `recentCount > MAX_MESSAGES_PER_HOUR` → one warning reply
   is sent on the message that crosses the line only, `processedAt` is set,
   done. Checked *before* the model call, so a flood costs one `COUNT`, not
   one OpenAI request.
4. `processIncomingUserMessage()`.
5. On success, `processedAt` is set. Only now is the message answered.
6. On throw, `recordFailure()` classifies:
   - `permanent` (bad request to WhatsApp) → `processedAt` set, burned.
   - `operator` (expired token, missing permission) → `processedAt` left
     **null** so it can be replayed once the credentials are fixed.
   - anything else → `retryable: true`, the worker rethrows, SQS retries up to
     5 times, then DLQ.

**Step 7 — the brain.**
`processIncomingUserMessage()` —
[`src/lib/reminder-service.ts:411`](../../../src/lib/reminder-service.ts)

- A tap on one of our own reply buttons (`done`, `snooze60`, `snoozetom`) is
  handled at [line 217](../../../src/lib/reminder-service.ts) and returns
  before any context load or model call. Zero OpenAI cost.
- Otherwise, one `Promise.all` of six reads builds the prompt context:
  `notes`, `facts`, the last N `messages`, today's `SCHEDULED` reminders,
  upcoming reminders, and labelled `documents`.

**Step 8 — the model call. Usually the largest slice of latency.**
`parseUserMessage()` — [`src/lib/llm.ts:404`](../../../src/lib/llm.ts),
request built at [line 540](../../../src/lib/llm.ts).

- `client.responses.create({ model: env.OPENAI_MODEL, instructions:
  SYSTEM_INSTRUCTIONS, input: inputText, ... })`
- Strict `json_schema` output named `assistant_extraction`.
- `reasoning: { effort: "minimal" }` on models that support it, otherwise
  `temperature: 0.1`.
- Intents returned: `create_reminder`, `list_reminders`, `cancel_reminder`,
  `reschedule`, `list_documents`, `send_documents`, `general_reply`.
- **[Line 560](../../../src/lib/llm.ts): `response.usage` is read and logged.
  `input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`. Then
  discarded.** This is the gap Part 3 closes.
- Any thrown error returns a hardcoded `general_reply` fallback rather than
  failing the turn.

**Step 9 — act on the intent.**

| Intent | Effect |
|---|---|
| `create_reminder` | `Reminder` row → `scheduleReminderDelivery()` ([line 1606](../../../src/lib/reminder-service.ts)) → QStash publish targeting `/api/jobs/send-reminder` |
| `list_reminders` | Grouped list built by `buildGroupedList()` ([line 351](../../../src/lib/reminder-service.ts)) |
| `cancel_reminder` | Status → `CANCELLED`, QStash message cancelled |
| `list_documents` | `formatDocumentList()` ([line 1420](../../../src/lib/reminder-service.ts)) |
| `send_documents` | `deliverDocuments()` ([line 1549](../../../src/lib/reminder-service.ts)) → presigned S3 URL (15 min TTL) → WhatsApp media send |
| `general_reply` | Just the model's `reply_text` |

Independently of intent, any facts extracted from the message are upserted by
`persistFacts()` ([line 1274](../../../src/lib/reminder-service.ts)) on the
unique key `[userId, subject, predicate]` — restating a fact overwrites it
rather than adding a rival copy.

Inbound media goes through `handleIncomingFile()`
([line 1344](../../../src/lib/reminder-service.ts)): download from Meta
([`src/lib/whatsapp-media.ts`](../../../src/lib/whatsapp-media.ts)) → `putDocument()`
to S3 under `documents/{userId}/{uuid}.{ext}` → `Document` row. If the image
arrived with no caption the `label` is left null and asked for on the next turn.

**Step 10 — reply.**
`replyToUser()` / `replyWithButtons()` / `replyWithMedia()` —
[`src/lib/conversation-log.ts`](../../../src/lib/conversation-log.ts). Each
sends via the WhatsApp API and writes an `OUTBOUND` `Message` row so the next
turn's history is two-sided.

### 1.3 Scheduled delivery and recovery — the Vercel routes

| Route | File | Trigger | What it does |
|---|---|---|---|
| `POST /api/jobs/send-reminder` | [`src/app/api/jobs/send-reminder/route.ts`](../../../src/app/api/jobs/send-reminder/route.ts) | QStash, at `scheduledAt` | Verifies QStash signature, sends the reminder with `done` / `snooze60` / `snoozetom` buttons, sets `SENT`, schedules the next occurrence if `recurrenceRule` is set |
| `POST /api/jobs/sweep` | [`src/app/api/jobs/sweep/route.ts`](../../../src/app/api/jobs/sweep/route.ts) | QStash schedule, ~1/min | Replays messages unprocessed > 5 min; resets reminders stuck in `PROCESSING` > 10 min; deletes unlabeled `Document` rows and their S3 objects after 24h. Batches of 25 |
| `GET /api/health` | [`src/app/api/health/route.ts`](../../../src/app/api/health/route.ts) | Manual / uptime monitor | Shallow by default; `?deep=1` gated by `HEALTH_CHECK_SECRET` |

### 1.4 What does not exist today

- No token or cost persistence of any kind.
- No admin authentication, no admin route, no admin UI.
- No `blocked` flag on `User`, no way to stop a specific user.
- No plan, quota, billing period, or payment model.
- No user-facing delete command. Documents are only removed by the 24h orphan
  sweep, and only when they were never labelled.
- No encryption at rest beyond what Supabase and S3 provide by default.

---

## Part 2 — Decomposition

Five sub-projects. Each gets its own design and implementation cycle.

| | Sub-project | Depends on | Status |
|---|---|---|---|
| **A** | **Usage metering** — persist tokens and cost per model call, roll up per user | — | Specified below |
| **B** | **Block enforcement** — `User.blocked`, checked before the model call | — | Specified below |
| **C** | **Admin dashboard** — password-gated `/admin` in the Next.js app | A, B | Specified below |
| **D** | **User data deletion** — new chat intent, deletes DB row and S3 object | — | Scoped, not specified |
| **E** | **Billing scaffolding** — plan / quota / period columns, no gateway | A | Schema stub inside A's migration |

A and B ship together: both are pipeline edits and both land in one migration
alongside E's stub columns, so there is no second migration when billing
arrives. C ships immediately after, in the same branch — it reads the columns
A creates and writes the flags B enforces, so it cannot land first.

---

## Part 3 — Spec: A (usage metering) + B (blocking)

### 3.1 Schema changes

One Prisma migration. All of it.

```prisma
// New. One row per paid API call, not per message — a message that
// triggers a vision call and a parse call must produce two rows, or
// the cost of images can never be separated from the cost of text.
model UsageEvent {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")

  // The inbound message that caused the call. Nullable because a future
  // background call (a summarization pass, an embedding job) has no
  // inbound message to point at.
  messageId     String?  @map("message_id")

  // What the call was for: "parse" today. "vision", "transcribe",
  // "embed" later. A plain string rather than an enum so adding a
  // purpose does not need a migration.
  purpose       String   @default("parse")

  provider      String   @default("openai")
  model         String

  inputTokens   Int      @map("input_tokens")
  // The discounted portion of inputTokens — the static system prompt,
  // once OpenAI has seen it recently. Stored separately because cost is
  // (inputTokens - cachedTokens) * full + cachedTokens * discounted.
  cachedTokens  Int      @default(0) @map("cached_tokens")
  outputTokens  Int      @map("output_tokens")

  // USD * 1_000_000, integer. Floats must never hold money, and a single
  // gpt-4.1-mini call is a fraction of a cent, so cents is too coarse.
  // Computed at write time from the price table, so a later price change
  // does not silently rewrite history.
  costMicros    Int      @map("cost_micros")

  createdAt     DateTime @default(now()) @map("created_at")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([createdAt])
  @@map("usage_events")
}

model User {
  // ... existing fields unchanged ...

  // ── B: blocking ───────────────────────────────────────────────
  // Null means active. A timestamp means blocked, and when.
  blockedAt        DateTime? @map("blocked_at")
  blockedReason    String?   @map("blocked_reason")
  // Set when the "your access is paused" notice has been delivered, so
  // it is sent exactly once no matter how many messages follow.
  blockNoticeSentAt DateTime? @map("block_notice_sent_at")

  // ── A: denormalized totals ────────────────────────────────────
  // Kept alongside usage_events so the admin user list is one query
  // instead of a groupBy over every event ever recorded. Incremented
  // in the same transaction as the UsageEvent insert.
  totalInputTokens  Int @default(0) @map("total_input_tokens")
  totalOutputTokens Int @default(0) @map("total_output_tokens")
  totalCostMicros   Int @default(0) @map("total_cost_micros")
  totalLlmCalls     Int @default(0) @map("total_llm_calls")

  // ── A: per-user quota overrides ───────────────────────────────
  // Null means "use the global env default". A paid plan later just
  // writes a bigger number here; no code change.
  dailyTokenCap    Int? @map("daily_token_cap")
  weeklyTokenCap   Int? @map("weekly_token_cap")

  // ── E: billing scaffolding, unused for now ────────────────────
  // Included in this migration so billing does not need a second one.
  // Nothing reads these until the gateway lands.
  planTier         String    @default("free") @map("plan_tier")
  planPeriod       String?   @map("plan_period")      // "daily" | "weekly"
  planStartedAt    DateTime? @map("plan_started_at")
  planExpiresAt    DateTime? @map("plan_expires_at")

  usageEvents      UsageEvent[]
}
```

### 3.2 New module: `src/lib/usage.ts`

Single owner of pricing and recording. Nothing else computes cost.

```ts
// USD per 1M tokens. Update when OpenAI changes prices; existing rows
// keep the cost they were written with.
const PRICES: Record<string, { input: number; cached: number; output: number }>

export function costMicrosFor(model, usage): number
export async function recordUsage(params: {
  userId: string;
  messageId?: string | null;
  purpose?: string;
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}): Promise<void>

export async function getWindowTokens(userId: string, since: Date): Promise<number>
export interface QuotaVerdict { allowed: boolean; window: 'daily' | 'weekly' | null; used: number; cap: number }
export async function checkQuota(user: User): Promise<QuotaVerdict>
```

`recordUsage` runs `prisma.$transaction([insert usageEvent, update user
counters])`. It must **never throw into the reply path** — a failure to record
usage is logged and swallowed, because losing an accounting row is strictly
better than failing a turn the user already paid for in latency.

An unknown model falls back to the most expensive entry in `PRICES` and logs a
warning. Under-charging silently is the failure mode that matters.

### 3.3 Threading usage out of the LLM call

`parseUserMessage()` currently returns `ParsedAssistantResponse` and has no
`userId`. Two options; taking the second.

- **Rejected:** pass `userId` into `parseUserMessage` and record inside
  `llm.ts`. Makes the parser depend on Prisma and on the user model, which it
  currently does not, and makes it untestable without a database.
- **Taken:** change the return type to
  `{ parsed: ParsedAssistantResponse; usage: LlmUsage | null }`.
  `llm.ts` stays pure. `reminder-service.ts` — which already has `user` and
  `message` in hand — calls `recordUsage()`. One call site to update
  ([`reminder-service.ts:494`](../../../src/lib/reminder-service.ts)), one
  fallback path to cover.

The existing `console.log` at [`llm.ts:562`](../../../src/lib/llm.ts) stays. It
is useful in CloudWatch when the DB write is the thing that broke.

### 3.4 Enforcement points in the pipeline

Both checks go in `runMessagePipeline()`
([`src/lib/message-pipeline.ts:52`](../../../src/lib/message-pipeline.ts)), in
this order, all **before** `processIncomingUserMessage()` so a rejected message
never reaches OpenAI.

```
1. message.processedAt set?        → already_processed        (exists)
2. user missing?                   → no_user                  (exists)
3. NEW: user.blockedAt set?        → blocked
4. optimistic attempts claim       → not_claimable            (exists)
5. message count > 100/hr?         → rate_limited             (exists)
6. NEW: daily/weekly token cap?    → quota_exceeded
7. processIncomingUserMessage()                               (exists)
```

**Step 3 — blocked.** No LLM call, no context reads. If
`blockNoticeSentAt` is null, send one short notice and stamp it. Every message
after that is claimed, marked `processedAt`, and dropped silently — zero cost
per message, and no retry loop. Unblocking from the dashboard clears both
`blockedAt` and `blockNoticeSentAt`, so a later re-block notifies again.

`PipelineStatus` gains `'blocked'` and `'quota_exceeded'`; both are
`retryable: false`.

**Step 6 — quota.** `checkQuota()` sums `usage_events.inputTokens +
outputTokens` for the user over the last 24h and the last 7 days, against
`user.dailyTokenCap ?? env.DEFAULT_DAILY_TOKEN_CAP` and the weekly equivalent.
Over either cap → one notice naming the window and when it resets, then silent
drops for the rest of the window. Uses the `[userId, createdAt]` index.

This is a check on tokens *already spent*, so a single very large message can
overshoot the cap. That is accepted: the alternative is estimating tokens
before the call, which is guesswork, and the overshoot is bounded by the model
context window.

### 3.5 New environment variables

| Var | Where it must be set | Purpose |
|---|---|---|
| `DEFAULT_DAILY_TOKEN_CAP` | `remique-worker` Lambda, Vercel | Fallback when `User.dailyTokenCap` is null. Suggested start: `150000` |
| `DEFAULT_WEEKLY_TOKEN_CAP` | `remique-worker` Lambda, Vercel | Suggested start: `700000` |
| `ADMIN_PASSWORD` | Vercel only | Sub-project C. Not needed for A+B |

All added to the `envSchema` in
[`src/lib/env.ts`](../../../src/lib/env.ts) as optional with defaults, matching
the existing pattern.

### 3.6 Testing

Existing tests are `tsx --test` in `tests/`, no DB. New file
`tests/usage.test.ts` covering pure functions only:

- `costMicrosFor` — known model, cached-token discount applied to the right
  slice, unknown model falls back to the most expensive price and warns.
- Quota verdict logic given synthetic `(used, cap)` pairs, including exactly-at-cap.
- Block-notice logic: notice on the first blocked message, silence after.

Pipeline integration is verified manually against staging — the existing
pipeline has no DB-backed test harness and this spec does not add one.

### 3.7 Files touched

| File | Change |
|---|---|
| `prisma/schema.prisma` | New `UsageEvent` model; new `User` columns (A + B + E stub) |
| `src/lib/usage.ts` | **New.** Price table, `recordUsage`, `checkQuota` |
| `src/lib/llm.ts` | Return `{ parsed, usage }` instead of `parsed` |
| `src/lib/reminder-service.ts` | Update the one `parseUserMessage` call site; call `recordUsage` |
| `src/lib/message-pipeline.ts` | Block check (step 3), quota check (step 6), two new `PipelineStatus` values |
| `src/lib/env.ts` | Two new optional vars with defaults |
| `tests/usage.test.ts` | **New** |

### 3.8 Manual deployment steps for A+B

Run in this order. Steps 3 and 4 are the ones that are easy to forget — the
Lambda zips do not update themselves when Vercel deploys.

```bash
# 1. Apply the migration against Supabase
npm run db:push

# 2. Regenerate the Prisma client
npm run db:generate

# 3. Rebuild the Lambda bundles (includes the new Prisma client + usage.ts)
npm run build:aws
```

4. In the AWS console, upload `dist/aws/remique-worker.zip` to the
   `remique-worker` Lambda. The webhook Lambda is unchanged and does not need
   redeploying.
5. Add `DEFAULT_DAILY_TOKEN_CAP` and `DEFAULT_WEEKLY_TOKEN_CAP` to the
   `remique-worker` Lambda environment variables **and** to Vercel.
6. Deploy Vercel (`git push`, or the dashboard).
7. Verify: send one message to the bot, then confirm a row landed —
   `select * from usage_events order by created_at desc limit 1;`

---

## Part 4 — Spec: C (admin dashboard)

Ships after A+B, in the same branch. It reads the columns A+B create and
writes the flags B enforces.

### 4.1 Threat model, stated plainly

`/admin` sits on the public marketing domain and reads every user's messages,
phone numbers and files. It is a single shared password with no second factor.
That is an accepted trade for a one-operator product, but it means the
following are requirements, not polish:

- The password is compared in constant time, never logged, and never placed in
  a cookie.
- The session cookie carries a signed expiry, not the password. Forging it
  requires the signing secret.
- If either secret env var is missing, every admin route returns **404**, not
  500 and not a login form. An unconfigured deploy must not advertise that an
  admin surface exists.
- `noindex` on the pages and an `X-Robots-Tag: noindex` response header from
  middleware.
- The real defense is a high-entropy `ADMIN_PASSWORD`. The login limiter below
  is best-effort only — see 4.3.

### 4.2 Session mechanism

Two new env vars, both Vercel-only (the Lambdas never serve HTTP):

| Var | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Compared against the submitted password. Missing → admin routes 404 |
| `ADMIN_SESSION_SECRET` | HMAC key for the session cookie. Missing → admin routes 404 |

Cookie `remique_admin`, value `<expiryMs>.<hmacHex>` where the HMAC is
SHA-256 over the expiry string keyed by `ADMIN_SESSION_SECRET`. Flags:
`httpOnly`, `secure`, `sameSite=lax`, `path=/`, 12 hour lifetime.

New module `src/lib/admin-auth.ts` implements sign and verify using **Web
Crypto** (`globalThis.crypto.subtle`), not `node:crypto`. Middleware runs on
the Edge runtime in Next 15.1 and cannot import `node:crypto`; Web Crypto is
global in both Edge and Node 20, so one implementation serves middleware and
route handlers alike.

```ts
export function adminConfigured(): boolean
export async function createSessionToken(): Promise<string>
export async function verifySessionToken(token: string | undefined): Promise<boolean>
export async function passwordMatches(submitted: string): Promise<boolean>
export const ADMIN_COOKIE = 'remique_admin'
```

`passwordMatches` compares HMACs of the two strings rather than the strings
themselves, which makes the comparison constant-time and length-independent
without hand-rolling a byte loop.

### 4.3 Middleware

New file `src/middleware.ts` (the project uses a `src/` directory, so
middleware belongs there, not at the repo root).

```ts
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

Order of checks:

1. `adminConfigured()` false → rewrite to a 404. Applies to `/admin/login` too.
2. Path is `/admin/login` or `/api/admin/login` → allow through. Otherwise the
   login page is unreachable.
3. Valid `remique_admin` cookie → allow, with `X-Robots-Tag: noindex` added.
4. No valid cookie, path under `/api/admin` → `401` JSON. An expired session
   during a block toggle should surface as an error, not an HTML redirect the
   `fetch` cannot parse.
5. No valid cookie, path under `/admin` → redirect to `/admin/login`.

**Login rate limiting.** `POST /api/admin/login` keeps a per-instance
in-memory `Map` of failed attempts by IP, 10 per 15 minutes. This is
best-effort: Vercel runs many instances and they do not share memory, so a
determined attacker gets 10 attempts *per instance*. It stops casual scanning,
not a real brute force. The password carrying the actual security burden is
stated in 4.1 and repeated in the deployment steps.

### 4.4 Routes

| Route | File | Method | Purpose |
|---|---|---|---|
| `/admin/login` | `src/app/admin/login/page.tsx` | GET | Password form |
| `/admin` | `src/app/admin/page.tsx` | GET | User list |
| `/admin/users/[id]` | `src/app/admin/users/[id]/page.tsx` | GET | One user in full |
| `/api/admin/login` | `src/app/api/admin/login/route.ts` | POST | Sets the session cookie |
| `/api/admin/logout` | `src/app/api/admin/logout/route.ts` | POST | Clears it |
| `/api/admin/users/[id]/block` | `src/app/api/admin/users/[id]/block/route.ts` | POST | `{ blocked: boolean, reason?: string }` |
| `/api/admin/users/[id]/quota` | `src/app/api/admin/users/[id]/quota/route.ts` | POST | `{ dailyTokenCap: number\|null, weeklyTokenCap: number\|null }` |

Every admin page sets `export const runtime = 'nodejs'` and
`export const dynamic = 'force-dynamic'` — Prisma cannot run on Edge, and a
cached admin page would show stale token counts.

In Next 15 `params` is a Promise in both pages and route handlers, so every
`[id]` handler destructures with
`const { id } = await params;`. This differs from Next 14 and is the single
most likely thing to get wrong here.

### 4.5 Data reads — `src/lib/admin-queries.ts`

All Prisma reads for the dashboard live in one module so the pages stay
presentational and the queries are testable in isolation.

**`listUsers({ sort, limit, offset })`** — one `findMany` over `users`
selecting the denormalized counters plus `_count` of `messages`, `documents`,
and `reminders`. No aggregate over `usage_events`; that is exactly what the
counters on `User` exist to avoid. Sortable by `totalCostMicros`,
`createdAt`, or `updatedAt`. Default: cost descending, so the expensive users
are the first thing on screen.

**`getUserDetail(id)`** — one `Promise.all`:

- the `User` row,
- last 100 `messages` ordered newest first, both directions,
- all `documents` with `label`, `mimeType`, `sizeBytes`, `createdAt`,
- all `facts`,
- `reminders` split into `SCHEDULED` (this is the "what reminder is active"
  the dashboard has to answer) and everything else, capped at 100,
- `usage_events` for the last 30 days, grouped by day, for the chart,
- rolling 24h and 7d token sums, so the detail page shows how close this user
  is to their caps right now.

Returns `null` for an unknown id, which the page turns into `notFound()`.

### 4.6 UI

Server components for everything that renders. Two small client components
only, because they need `onClick`:

- `src/components/admin/block-toggle.tsx` — a button that POSTs to the block
  route and calls `router.refresh()`. Blocking asks for confirmation first;
  unblocking does not.
- `src/components/admin/quota-form.tsx` — two number inputs, empty means
  "inherit the global default".

Styling reuses the existing tokens from `tailwind.config.ts` — `ground`,
`ink`, `line`, `brand`, `signal` — with `font-mono` for every number. It is an
internal tool: a table, hairline rules, no cards, no charting library. The 30
day usage chart is inline SVG bars, consistent with the codebase already
drawing its own icons rather than pulling a dependency.

No new npm dependencies. That is a hard constraint, not a preference.

### 4.7 Testing

`tests/admin-auth.test.ts`, pure functions only, no DB and no HTTP:

- A token signed now verifies; the same token with a flipped byte does not.
- A token whose expiry is in the past fails verification.
- A token signed with a different secret fails verification.
- `passwordMatches` true for the exact password, false for a prefix, false for
  a longer string with the password as its prefix.
- `adminConfigured()` false when either var is missing.

Page rendering and middleware redirects are verified manually against the dev
server; the project has no React test harness and this spec does not add one.

### 4.8 Files touched

| File | Change |
|---|---|
| `src/lib/admin-auth.ts` | **New.** Web Crypto sign/verify, constant-time password compare |
| `src/lib/admin-queries.ts` | **New.** `listUsers`, `getUserDetail` |
| `src/middleware.ts` | **New.** Gate `/admin` and `/api/admin` |
| `src/app/admin/layout.tsx` | **New.** Shell, `robots: noindex` metadata |
| `src/app/admin/login/page.tsx` | **New** |
| `src/app/admin/page.tsx` | **New.** User list |
| `src/app/admin/users/[id]/page.tsx` | **New.** User detail |
| `src/components/admin/block-toggle.tsx` | **New.** Client component |
| `src/components/admin/quota-form.tsx` | **New.** Client component |
| `src/app/api/admin/login/route.ts` | **New** |
| `src/app/api/admin/logout/route.ts` | **New** |
| `src/app/api/admin/users/[id]/block/route.ts` | **New** |
| `src/app/api/admin/users/[id]/quota/route.ts` | **New** |
| `src/lib/env.ts` | `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` |
| `tests/admin-auth.test.ts` | **New** |

### 4.9 Deliberately out of scope for C

- Deleting a user's data from the dashboard. Deletion is sub-project D and
  belongs to the user, over WhatsApp, with a confirmation turn.
- Multiple operator accounts, roles, or an audit log of admin actions.
- Editing reminders or replying to a user from the dashboard.

---

## Part 5 — Scoped, not yet specified

### D — User data deletion over WhatsApp

**Decided:** a new `delete_documents` LLM intent plus a confirmation turn, not
a slash command. It reuses the resolution machinery `send_documents` already
has — the model matches "delete my eTin" to a `Document` row by meaning, not
spelling.

Flow: user asks → bot names the exact file and its upload date and asks with
`yes` / `no` reply buttons → on `yes`, delete the S3 object via
`deleteDocument()` ([`src/lib/storage.ts`](../../../src/lib/storage.ts)) and
then the `Document` row. S3 first: an orphaned DB row pointing at a missing
object is a visible bug, whereas an orphaned S3 object is invisible and costs
pennies.

Also in D's scope: deleting *facts* ("forget my company name") and a full
account wipe. `onDelete: Cascade` already covers the DB side of a full wipe;
S3 needs a prefix delete on `documents/{userId}/`.

### E — Billing scaffolding

The `planTier` / `planPeriod` / `planStartedAt` / `planExpiresAt` columns land
in A's migration and stay unread. When the gateway arrives, a paid plan writes
`planTier`, `planExpiresAt`, and a larger `dailyTokenCap` — the enforcement
code in `checkQuota()` needs no change.

Deliberately **not** in scope now: a payment provider, a `Payment` or
`Subscription` table, webhook handling, invoices, or any UI. Naming the
columns now is the entire commitment.

### Encryption at rest

Noted as a future requirement. Data is stored plaintext today. Whenever it
happens, the natural boundary is `Document.s3Key` contents (S3 SSE-KMS, a
bucket-level setting, no code change) and the `Fact.value` / `Note.content`
columns (application-level, and it will break the LLM prompt context path,
which reads those values in cleartext to build the prompt). That second half is
its own design problem and is not solved by turning a flag on.

---

## Open questions

1. Suggested starting caps of 150k tokens/day and 700k/week are a guess. What
   monthly OpenAI spend is the ceiling? That number sets the caps.
2. Should the daily/weekly window be rolling (last 24h) or calendar-aligned to
   `Asia/Dhaka` midnight? Rolling is simpler and specified above; calendar
   matches how a "daily plan" will be sold.
3. `MAX_MESSAGES_PER_HOUR = 100` was raised for testing and the comment says to
   lower it before real users. Does it stay at 100 now that a token cap exists,
   or drop back down?
