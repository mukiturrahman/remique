# Subscription Welcome Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every user who subscribes through bdApps receives a WhatsApp welcome, including website signups who have never messaged the bot, and a failed send is recorded and retried instead of swallowed.

**Architecture:** A pure decision module picks free-form text (inside Meta's 24-hour customer service window) or an approved utility template (outside it), mirroring what `src/app/api/jobs/send-reminder/route.ts` already does for reminders. A thin sender claims the subscription row, sends, and records the outcome on four new `Subscription` columns. The bdApps callback calls the sender inline; the existing QStash sweep retries failures with backoff and also covers subscriptions activated by the webhook.

**Tech Stack:** Next.js 15.1.11 route handlers on Vercel, Prisma 6 (schema applied with `prisma db push`, no migrations directory), WhatsApp Cloud API v22.0, Upstash QStash sweep, `node:test` via `tsx --test`.

**Spec:** No separate spec. Derived from the bdApps TAP review of 2026-09-13, finding "Welcome messages fail quietly": `src/lib/bdapps/subscription-service.ts:369` sends free-form text, which Meta rejects outside the 24-hour window, and the surrounding `try/catch` only logs a warning.

## Global Constraints

- Free-form WhatsApp text only when the user's last INBOUND message is under 23 hours old; otherwise the approved template `subscription_activated`, language `en`.
- The bdApps callback must always redirect. Nothing in the welcome path may throw into it.
- At most one welcome per subscription, even when the callback and the sweep run at the same moment.
- Give up after `MAX_WELCOME_ATTEMPTS = 5`, or immediately on a `permanent` WhatsApp failure.
- Existing ACTIVE subscriptions must never receive a welcome (backfill before deploy).
- Tests run with `npm test`. Pure logic gets unit tests; Prisma and Meta calls are verified manually in Task 6 (the repo has no DB test harness).
- Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| :--- | :--- |
| `src/lib/bdapps/welcome-message.ts` (create) | Pure: window check, text vs template choice, retry/backoff decisions. No Prisma, no fetch. |
| `tests/welcome-message.test.ts` (create) | Unit tests for the module above. |
| `prisma/schema.prisma` (modify) | Four `welcome*` columns on `Subscription`. |
| `src/lib/conversation-log.ts` (modify) | Export `logOutbound` so the welcome lands in conversation history. |
| `src/lib/bdapps/welcome.ts` (create) | IO: load, claim, send, record outcome. Never throws. |
| `src/lib/bdapps/subscription-service.ts` (modify) | Callback calls `sendSubscriptionWelcome` instead of the inline send. |
| `src/app/api/jobs/sweep/route.ts` (modify) | Pass 6: retry unsent welcomes. |

---

### Task 0: Create the WhatsApp template (manual, operator)

No code. Must be **approved** before Task 5 is deployed, or every outside-window welcome fails with an `operator` error and is given up after about 30 minutes.

- [ ] **Step 1:** In Meta Business Manager → WhatsApp Manager → Message templates, create:
  - Name: `subscription_activated`
  - Category: **Utility**
  - Language: **English** (code `en`, same as `reminder_alert`)
  - Body, exactly:
    ```
    Your Remique Pro {{1}} plan is now active. Send any message here to start using your second brain.
    ```
  - Sample for `{{1}}`: `Monthly`
  - No header, footer, or buttons.
- [ ] **Step 2:** Submit and wait for status **Active**. If Meta re-categorises it as Marketing, reject that and keep the wording transactional; Marketing templates cost more and are not delivered to users who opted out of marketing.

---

### Task 1: Pure welcome decision module

**Files:**
- Create: `src/lib/bdapps/welcome-message.ts`
- Test: `tests/welcome-message.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `WELCOME_TEMPLATE_NAME: 'subscription_activated'`, `WELCOME_TEMPLATE_LANGUAGE: 'en'`, `MAX_WELCOME_ATTEMPTS: 5`
  - `type WelcomeSend = { kind: 'text'; body: string } | { kind: 'template'; templateName: string; languageCode: string; bodyParameters: string[]; renderedText: string }`
  - `type WelcomeFailureClass = 'transient' | 'operator' | 'permanent'`
  - `isWithinServiceWindow(lastInboundAt: Date | null, now: Date): boolean`
  - `chooseWelcomeSend(params: { planLabel: string; lastInboundAt: Date | null; now: Date }): WelcomeSend`
  - `afterWelcomeFailure(failureClass: WelcomeFailureClass, attemptsMade: number): 'retry' | 'give_up'`
  - `isWelcomeRetryDue(lastAttemptAt: Date | null, attemptsMade: number, now: Date): boolean`

- [ ] **Step 1: Write the failing test**

Create `tests/welcome-message.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  MAX_WELCOME_ATTEMPTS,
  afterWelcomeFailure,
  chooseWelcomeSend,
  isWelcomeRetryDue,
  isWithinServiceWindow,
} from '../src/lib/bdapps/welcome-message';

const NOW = new Date('2026-09-13T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000);
const hoursAgo = (h: number) => minutesAgo(h * 60);

describe('isWithinServiceWindow', () => {
  // A website signup has never messaged the bot, so there is no window at all.
  test('no inbound message means outside the window', () => {
    assert.equal(isWithinServiceWindow(null, NOW), false);
  });

  test('a message an hour ago is inside the window', () => {
    assert.equal(isWithinServiceWindow(hoursAgo(1), NOW), true);
  });

  // Checked against 23 hours, not 24, so a slow send cannot land just after
  // Meta closes the window.
  test('a message 23.5 hours ago is treated as outside', () => {
    assert.equal(isWithinServiceWindow(hoursAgo(23.5), NOW), false);
  });

  // Clock skew between the DB and the function. The template always delivers,
  // so it is the safe fallback.
  test('a timestamp in the future is treated as outside', () => {
    assert.equal(isWithinServiceWindow(minutesAgo(-5), NOW), false);
  });
});

describe('chooseWelcomeSend', () => {
  test('inside the window sends free-form text naming the plan', () => {
    const send = chooseWelcomeSend({ planLabel: 'Monthly', lastInboundAt: hoursAgo(2), now: NOW });
    if (send.kind !== 'text') assert.fail(`expected text, got ${send.kind}`);
    assert.match(send.body, /Remique Pro Monthly/);
  });

  test('a user who never messaged gets the approved template', () => {
    const send = chooseWelcomeSend({ planLabel: 'Weekly', lastInboundAt: null, now: NOW });
    if (send.kind !== 'template') assert.fail(`expected template, got ${send.kind}`);
    assert.equal(send.templateName, 'subscription_activated');
    assert.equal(send.languageCode, 'en');
    assert.deepEqual(send.bodyParameters, ['Weekly']);
    assert.equal(
      send.renderedText,
      'Your Remique Pro Weekly plan is now active. Send any message here to start using your second brain.'
    );
  });
});

describe('afterWelcomeFailure', () => {
  test('a permanent failure gives up on the first attempt', () => {
    assert.equal(afterWelcomeFailure('permanent', 1), 'give_up');
  });

  test('a transient failure retries while attempts remain', () => {
    assert.equal(afterWelcomeFailure('transient', 1), 'retry');
  });

  test('an operator failure retries while attempts remain', () => {
    assert.equal(afterWelcomeFailure('operator', MAX_WELCOME_ATTEMPTS - 1), 'retry');
  });

  test('any failure gives up once the cap is reached', () => {
    assert.equal(afterWelcomeFailure('transient', MAX_WELCOME_ATTEMPTS), 'give_up');
  });
});

describe('isWelcomeRetryDue', () => {
  test('a subscription never attempted is due immediately', () => {
    assert.equal(isWelcomeRetryDue(null, 0, NOW), true);
  });

  // Also the race guard: the callback's in-flight attempt sets attempts=1 and
  // lastAttemptAt=now, so the sweep leaves it alone for two minutes.
  test('first retry waits two minutes', () => {
    assert.equal(isWelcomeRetryDue(minutesAgo(1), 1, NOW), false);
    assert.equal(isWelcomeRetryDue(minutesAgo(3), 1, NOW), true);
  });

  test('third retry waits eight minutes', () => {
    assert.equal(isWelcomeRetryDue(minutesAgo(5), 3, NOW), false);
    assert.equal(isWelcomeRetryDue(minutesAgo(9), 3, NOW), true);
  });

  test('never due once the cap is reached', () => {
    assert.equal(isWelcomeRetryDue(hoursAgo(10), MAX_WELCOME_ATTEMPTS, NOW), false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/welcome-message.test.ts`
Expected: FAIL with `Cannot find module '../src/lib/bdapps/welcome-message'`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/bdapps/welcome-message.ts`:

```ts
/**
 * Decides how the post-subscription welcome reaches the user.
 *
 * Pure on purpose — no Prisma, no fetch — so every branch is covered by
 * tests/welcome-message.test.ts. The IO lives in ./welcome.ts.
 */

export const WELCOME_TEMPLATE_NAME = 'subscription_activated';
export const WELCOME_TEMPLATE_LANGUAGE = 'en';
export const MAX_WELCOME_ATTEMPTS = 5;

// Meta's customer service window is 24 hours from the user's last message.
// Checked against 23 so a send that is slow to reach Meta cannot land just
// after the window closes and bounce.
const SERVICE_WINDOW_SAFE_MS = 23 * 60 * 60 * 1000;

export type WelcomeSend =
  | { kind: 'text'; body: string }
  | {
      kind: 'template';
      templateName: string;
      languageCode: string;
      bodyParameters: string[];
      // What the user actually sees, stored as the outbound history row so
      // later turns know what they were told.
      renderedText: string;
    };

export type WelcomeFailureClass = 'transient' | 'operator' | 'permanent';

export function isWithinServiceWindow(lastInboundAt: Date | null, now: Date): boolean {
  if (!lastInboundAt) return false;
  const age = now.getTime() - lastInboundAt.getTime();
  return age >= 0 && age < SERVICE_WINDOW_SAFE_MS;
}

function welcomeText(planLabel: string): string {
  return (
    `Your second brain has been activated 🧠✨.\n\n` +
    `You're now on Remique Pro ${planLabel}. You can start chatting right away!`
  );
}

// Must match the body approved in Meta Business Manager word for word.
function welcomeTemplateText(planLabel: string): string {
  return `Your Remique Pro ${planLabel} plan is now active. Send any message here to start using your second brain.`;
}

export function chooseWelcomeSend(params: {
  planLabel: string;
  lastInboundAt: Date | null;
  now: Date;
}): WelcomeSend {
  if (isWithinServiceWindow(params.lastInboundAt, params.now)) {
    return { kind: 'text', body: welcomeText(params.planLabel) };
  }

  return {
    kind: 'template',
    templateName: WELCOME_TEMPLATE_NAME,
    languageCode: WELCOME_TEMPLATE_LANGUAGE,
    bodyParameters: [params.planLabel],
    renderedText: welcomeTemplateText(params.planLabel),
  };
}

/** `attemptsMade` includes the attempt that just failed. */
export function afterWelcomeFailure(
  failureClass: WelcomeFailureClass,
  attemptsMade: number
): 'retry' | 'give_up' {
  if (failureClass === 'permanent') return 'give_up';
  return attemptsMade >= MAX_WELCOME_ATTEMPTS ? 'give_up' : 'retry';
}

// 2, 4, 8, 16 minutes between attempts. Five attempts span about half an hour,
// long enough to outlast a Meta rate limit.
function welcomeRetryDelayMs(attemptsMade: number): number {
  return 2 ** Math.max(1, attemptsMade) * 60 * 1000;
}

export function isWelcomeRetryDue(
  lastAttemptAt: Date | null,
  attemptsMade: number,
  now: Date
): boolean {
  if (attemptsMade >= MAX_WELCOME_ATTEMPTS) return false;
  if (!lastAttemptAt) return true;
  return now.getTime() - lastAttemptAt.getTime() >= welcomeRetryDelayMs(attemptsMade);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/welcome-message.test.ts`
Expected: PASS, 14 tests.

Then run: `npm test`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bdapps/welcome-message.ts tests/welcome-message.test.ts
git commit -m "feat: add welcome message channel and retry decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Welcome tracking columns and backfill

**Files:**
- Modify: `prisma/schema.prisma` (model `Subscription`, after `cancelledAt`)

**Interfaces:**
- Consumes: nothing.
- Produces: `Subscription.welcomeSentAt: Date | null`, `Subscription.welcomeAttempts: number`, `Subscription.welcomeLastAttemptAt: Date | null`, `Subscription.welcomeError: string | null`.

- [ ] **Step 1: Add the columns**

In `prisma/schema.prisma`, inside `model Subscription`, directly after the `cancelledAt` line:

```prisma
  // Post-subscription WhatsApp welcome. A null welcomeSentAt means the user has
  // not been told yet; the sweep retries until welcomeAttempts reaches the cap
  // in src/lib/bdapps/welcome-message.ts.
  welcomeSentAt        DateTime? @map("welcome_sent_at")
  welcomeAttempts      Int       @default(0) @map("welcome_attempts")
  welcomeLastAttemptAt DateTime? @map("welcome_last_attempt_at")
  welcomeError         String?   @map("welcome_error")
```

- [ ] **Step 2: Validate and regenerate the client**

Run: `npx prisma validate && npm run db:generate`
Expected: `The schema at prisma/schema.prisma is valid` and `Generated Prisma Client`.

- [ ] **Step 3: Apply to the database**

Check which database `DATABASE_URL` points at first. Then run:

```bash
npx prisma db push
```

Expected: adds four columns to `subscriptions`. **If Prisma proposes dropping anything** (the orphaned `subscription_attempts` table or `users.onboarding_sent_at` / `unsubscribed_notice_sent_at` from the discarded bKash branch), stop and ask the owner. Do not accept data loss as part of this task.

- [ ] **Step 4: Backfill existing subscriptions**

Without this, every current subscriber would get a "welcome" on their next renewal webhook. Run against the same database, **before** Task 5 is deployed:

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
UPDATE subscriptions
SET welcome_sent_at = created_at
WHERE status = 'ACTIVE' AND welcome_sent_at IS NULL;
SQL
```

Expected: `Script executed successfully.`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: track subscription welcome delivery" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Welcome sender

**Files:**
- Modify: `src/lib/conversation-log.ts:22` (export `logOutbound`)
- Create: `src/lib/bdapps/welcome.ts`

**Interfaces:**
- Consumes: everything Task 1 produces; Task 2 columns; `sendWhatsAppMessage`, `sendWhatsAppTemplate`, `WhatsAppApiError`, `SendWhatsAppResponse` from `src/lib/whatsapp.ts`; `BDAPPS_PLANS`, `BdappsPlanPeriod` from `src/lib/bdapps/types.ts`.
- Produces:
  - `type WelcomeResult = { status: 'sent'; channel: 'text' | 'template' } | { status: 'skipped'; reason: string } | { status: 'failed'; failureClass: WelcomeFailureClass; willRetry: boolean }`
  - `sendSubscriptionWelcome(subscriptionId: string): Promise<WelcomeResult>` — never throws.
  - `logOutbound(userId: string, response: SendWhatsAppResponse, text: string): Promise<void>` now exported.

- [ ] **Step 1: Export `logOutbound`**

In `src/lib/conversation-log.ts`, change:

```ts
async function logOutbound(
```

to:

```ts
export async function logOutbound(
```

- [ ] **Step 2: Create the sender**

Create `src/lib/bdapps/welcome.ts`:

```ts
import { prisma } from '../db';
import { logOutbound } from '../conversation-log';
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  WhatsAppApiError,
  type SendWhatsAppResponse,
} from '../whatsapp';
import { BDAPPS_PLANS, type BdappsPlanPeriod } from './types';
import {
  MAX_WELCOME_ATTEMPTS,
  afterWelcomeFailure,
  chooseWelcomeSend,
  type WelcomeFailureClass,
} from './welcome-message';

export type WelcomeResult =
  | { status: 'sent'; channel: 'text' | 'template' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; failureClass: WelcomeFailureClass; willRetry: boolean };

/**
 * Tells a newly subscribed user their plan is live.
 *
 * Safe to call from the bdApps callback and the sweep at the same time: the
 * conditional claim on welcomeAttempts lets exactly one caller send.
 *
 * Never throws. The user has already paid by the time this runs, and a
 * WhatsApp problem must not turn their success redirect into an error page.
 */
export async function sendSubscriptionWelcome(subscriptionId: string): Promise<WelcomeResult> {
  try {
    return await attemptWelcome(subscriptionId);
  } catch (error: any) {
    console.error(
      `[Remique][Welcome] Unexpected error subscription=${subscriptionId}: ${error?.message}`
    );
    return { status: 'failed', failureClass: 'transient', willRetry: true };
  }
}

async function attemptWelcome(subscriptionId: string): Promise<WelcomeResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: true },
  });

  if (!subscription) return { status: 'skipped', reason: 'not_found' };
  if (subscription.status !== 'ACTIVE') return { status: 'skipped', reason: 'not_active' };
  if (subscription.welcomeSentAt) return { status: 'skipped', reason: 'already_sent' };
  if (subscription.welcomeAttempts >= MAX_WELCOME_ATTEMPTS) {
    return { status: 'skipped', reason: 'gave_up' };
  }
  if (subscription.user.blockedAt) return { status: 'skipped', reason: 'user_blocked' };

  // Optimistic claim, same pattern as the message pipeline: whoever loses the
  // race sees count 0 and backs off instead of sending a second welcome.
  const claim = await prisma.subscription.updateMany({
    where: {
      id: subscription.id,
      welcomeSentAt: null,
      welcomeAttempts: subscription.welcomeAttempts,
    },
    data: { welcomeAttempts: { increment: 1 }, welcomeLastAttemptAt: new Date() },
  });
  if (claim.count === 0) return { status: 'skipped', reason: 'claimed_elsewhere' };

  const attemptsMade = subscription.welcomeAttempts + 1;
  const { user } = subscription;
  const period = (
    subscription.planPeriod.toLowerCase() === 'weekly' ? 'weekly' : 'monthly'
  ) as BdappsPlanPeriod;

  const lastInbound = await prisma.message.findFirst({
    where: { userId: user.id, direction: 'INBOUND' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const send = chooseWelcomeSend({
    planLabel: BDAPPS_PLANS[period].label,
    lastInboundAt: lastInbound?.createdAt ?? null,
    now: new Date(),
  });

  let response: SendWhatsAppResponse;
  try {
    response =
      send.kind === 'text'
        ? await sendWhatsAppMessage(user.phoneNumber, send.body)
        : await sendWhatsAppTemplate(
            user.phoneNumber,
            send.templateName,
            send.languageCode,
            send.bodyParameters
          );
  } catch (sendError: any) {
    const failureClass: WelcomeFailureClass =
      sendError instanceof WhatsAppApiError ? sendError.failureClass : 'transient';
    const decision = afterWelcomeFailure(failureClass, attemptsMade);
    const errorMessage = String(sendError?.message ?? 'Unknown send error').slice(0, 500);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        welcomeError: errorMessage,
        // Pinning attempts at the cap is what stops the sweep picking it up again.
        ...(decision === 'give_up' ? { welcomeAttempts: MAX_WELCOME_ATTEMPTS } : {}),
      },
    });

    console.error(
      `[Remique][Welcome] FAILED subscription=${subscription.id} user=${user.id} ` +
        `channel=${send.kind} class=${failureClass} ` +
        `attempt=${attemptsMade}/${MAX_WELCOME_ATTEMPTS} decision=${decision}: ${errorMessage}`
    );
    if (failureClass === 'operator') {
      console.error(
        '[Remique][Welcome] ACTION REQUIRED: Meta rejected the welcome. Check the ' +
          'subscription_activated template is approved and the WhatsApp token is valid.'
      );
    }

    return { status: 'failed', failureClass, willRetry: decision === 'retry' };
  }

  // If this write fails after a successful send, the outer catch reports a
  // failure and the sweep may send once more. Rare, and a duplicate welcome is
  // better than none.
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { welcomeSentAt: new Date(), welcomeError: null },
  });
  await logOutbound(user.id, response, send.kind === 'text' ? send.body : send.renderedText);

  console.log(
    `[Remique][Welcome] sent subscription=${subscription.id} user=${user.id} ` +
      `channel=${send.kind} attempt=${attemptsMade}`
  );
  return { status: 'sent', channel: send.kind };
}
```

- [ ] **Step 3: Typecheck the touched files**

Run: `npx tsc --noEmit 2>&1 | grep -E "welcome|conversation-log"`
Expected: no output.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/conversation-log.ts src/lib/bdapps/welcome.ts
git commit -m "feat: send subscription welcome inside or outside the service window" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Use the sender in the bdApps callback

**Files:**
- Modify: `src/lib/bdapps/subscription-service.ts` (import block at top; the "Notify user via WhatsApp" block around lines 362-378)

**Interfaces:**
- Consumes: `sendSubscriptionWelcome(subscriptionId: string): Promise<WelcomeResult>` from Task 3.
- Produces: no new exports.

- [ ] **Step 1: Swap the import**

Replace:

```ts
import { sendWhatsAppMessage } from '../whatsapp';
```

with:

```ts
import { sendSubscriptionWelcome } from './welcome';
```

(`sendWhatsAppMessage` has no other use in this file.)

- [ ] **Step 2: Replace the inline send**

Replace this whole block in `handleBdappsCallback`:

```ts
  // Notify user via WhatsApp
  try {
    const expiryDateStr = periodEnd.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    await sendWhatsAppMessage(
      user.phoneNumber,
      `Your second brain has been activated 🧠✨.\n\n` +
        `You're now on Remique Pro ${plan.label}. You can start chatting right away!`
    );
  } catch (notifyErr) {
    console.warn('[bdApps] Failed to send WhatsApp confirmation message:', notifyErr);
  }
```

with:

```ts
  // Welcome the user on WhatsApp. Never throws, and a failed send is retried
  // by the sweep, so the redirect below always happens.
  const welcome = await sendSubscriptionWelcome(subscription.id);
  if (welcome.status === 'failed') {
    console.warn(
      `[bdApps Callback] Welcome failed subscription=${subscription.id} ` +
        `class=${welcome.failureClass} willRetry=${welcome.willRetry}`
    );
  }
```

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit 2>&1 | grep -E "subscription-service|welcome"`
Expected: no output (in particular, no "unused" or "cannot find name" errors for `plan`, which is still used above this block).

Run: `npm test`
Expected: all suites PASS, including `tests/bdapps-billing.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/bdapps/subscription-service.ts
git commit -m "fix: stop swallowing failed bdApps welcome messages" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Retry unsent welcomes in the sweep

**Files:**
- Modify: `src/app/api/jobs/sweep/route.ts` (imports; constants; `result` object; new pass 6 after pass 5; `didWork` and log line)

**Interfaces:**
- Consumes: `sendSubscriptionWelcome` (Task 3); `isWelcomeRetryDue`, `MAX_WELCOME_ATTEMPTS` (Task 1).
- Produces: `sentWelcomes: number` in the sweep JSON response.

- [ ] **Step 1: Imports and constant**

Add after the existing `import { deleteDocument } from '@/lib/storage';`:

```ts
import { sendSubscriptionWelcome } from '@/lib/bdapps/welcome';
import { isWelcomeRetryDue, MAX_WELCOME_ATTEMPTS } from '@/lib/bdapps/welcome-message';
```

Add after `const ORPHAN_DOCUMENT_MS = ...;`:

```ts
// Only subscriptions that started recently are owed a welcome. Anything older
// is a renewal of someone already told.
const WELCOME_LOOKBACK_MS = 48 * 60 * 60 * 1000;
```

- [ ] **Step 2: Result counter**

In the `result` object, after `deletedOrphanDocuments: 0,` add:

```ts
      sentWelcomes: 0,
```

- [ ] **Step 3: Pass 6**

Insert directly after the pass 5 `for (const orphan of orphans) { ... }` loop, before `const didWork`:

```ts
    // ── 6. Subscription welcomes that never went out ────────────────────
    // The bdApps callback sends the welcome inline. This catches the ones that
    // failed there, and subscriptions activated by the webhook, which never
    // pass through the callback at all.
    const unwelcomed = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        welcomeSentAt: null,
        welcomeAttempts: { lt: MAX_WELCOME_ATTEMPTS },
        currentPeriodStart: { gte: new Date(now.getTime() - WELCOME_LOOKBACK_MS) },
        user: { blockedAt: null },
      },
      orderBy: { currentPeriodStart: 'asc' },
      take: BATCH,
      select: { id: true, welcomeAttempts: true, welcomeLastAttemptAt: true },
    });

    for (const sub of unwelcomed) {
      if (!isWelcomeRetryDue(sub.welcomeLastAttemptAt, sub.welcomeAttempts, now)) continue;

      const outcome = await sendSubscriptionWelcome(sub.id);
      if (outcome.status === 'sent') {
        result.sentWelcomes++;
      } else if (outcome.status === 'failed') {
        result.errors.push(`welcome ${sub.id}: ${outcome.failureClass}`);
      }
    }
```

- [ ] **Step 4: Report it**

In `const didWork =`, add `result.sentWelcomes > 0 ||` as the first condition.

In the `console.log` template, after the `deletedOrphanDocuments=` segment add:

```ts
          `sentWelcomes=${result.sentWelcomes} ` +
```

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc --noEmit 2>&1 | grep -E "sweep|welcome"`
Expected: no output.

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/jobs/sweep/route.ts
git commit -m "feat: retry unsent subscription welcomes from the sweep" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Deploy and verify end to end (manual)

Order matters. Each subscription test charges real bKash money (৳49 weekly), and the in-app cancel does not currently stop bdApps billing, so unsubscribe test numbers on the bdApps/bKash side afterwards.

- [ ] **Step 1: Preconditions**
  - Task 0 template status is **Active**.
  - Task 2 `db push` and backfill ran against production.

- [ ] **Step 2: Deploy** the branch to Vercel production.

- [ ] **Step 3: Inside-window case.** From test phone A, send "hi" to the bot. Subscribe on `/pricing` (weekly) with phone A.
  - Expect: the free-form "Your second brain has been activated 🧠✨" message.
  - Vercel logs: `[Remique][Welcome] sent ... channel=text attempt=1`.
  - DB: `welcome_sent_at` set, `welcome_attempts = 1`, `welcome_error` null; one OUTBOUND row in `messages`.

- [ ] **Step 4: Outside-window case.** Use phone B that has not messaged the bot in the last 24 hours (or ever). Subscribe.
  - Expect: the `subscription_activated` template.
  - Logs: `channel=template attempt=1`.

- [ ] **Step 5: Sweep retry case.** For phone B's subscription only:

  ```sql
  UPDATE subscriptions
  SET welcome_sent_at = NULL, welcome_attempts = 0, welcome_last_attempt_at = NULL,
      current_period_start = now()
  WHERE user_id = '<phone B user id>';
  ```

  Within about a minute (next sweep), expect a second template on phone B and `sentWelcomes=1` in the sweep log line.

- [ ] **Step 6: Clean up.** Unsubscribe phones A and B on the bdApps/bKash side.

---

## Out of Scope

- **Async delivery failures.** Meta can accept a send (HTTP 200) and report failure later through a `statuses` webhook, which `src/aws/webhook/index.ts` currently ignores. The window check prevents the common case (error 131047). Real delivery tracking needs the AWS webhook Lambda changed and redeployed, so it belongs in its own plan.
- **Bangla template.** English only for now.
- **Renewal-failed and cancellation notices.** This plan builds the pattern (claim, send, record, sweep retry) they will reuse.
- **Sharing the 24-hour check with the reminder route.** `send-reminder/route.ts` keeps its own inline check; refactoring the reminder delivery path is not worth the risk here.

## Risks

- **Forged webhook events.** The bdApps webhook is still unauthenticated (P0 finding). Until that is fixed, a forged `REGISTERED` event for an existing user will now also trigger a welcome template from the sweep. Low cost, but it tells someone they are subscribed when they are not.
- **`db push` drift.** Prisma may offer to drop the orphaned bKash objects. Declining is the correct answer for this task.
- **Template wording.** The body in Task 0 and `welcomeTemplateText` in Task 1 must match exactly, or the history row will not reflect what the user saw.
- **Retry window.** Five attempts over about 30 minutes. A template that is still pending approval at deploy time will exhaust it; reset with `UPDATE subscriptions SET welcome_attempts = 0 WHERE welcome_sent_at IS NULL AND status = 'ACTIVE';` once approved.
