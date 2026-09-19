const fs = require('fs');
const content = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const regex = /  if \(isStatusMissing && subscription\.status !== 'ACTIVE'\) \{[\s\S]*?\/\/ Notify user via WhatsApp/m;

const replacement = `  if (isStatusMissing && subscription.status !== 'ACTIVE') {
    console.log('[bdApps Browser Callback] Polling exhausted. DB is still not ACTIVE. Aborting with Ghosting/Timeout error.');
    return {
      success: false,
      requestId,
      subscriberId,
      error: 'Payment not completed or pending confirmation.',
      redirectUrl: \`\${appBaseUrl}/billing/cancelled?error=\${encodeURIComponent(
        'Payment was not completed. If you paid, please wait a few seconds and check WhatsApp.'
      )}\`,
    };
  }

  const user = subscription.user;
  if (!user) throw new Error("Subscription has no associated user");
  const planPeriod = ((subscription.planPeriod || '').toLowerCase() === 'weekly' ? 'weekly' : 'monthly') as BdappsPlanPeriod;
  const plan = BDAPPS_PLANS[planPeriod];
  const now = new Date();
  const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  // Activate Subscription ONLY if we have an explicit success signal
  // (If it was already active from webhook, this is just a safe idempotent update)
  if (isSuccess) {
    console.log('[bdApps Browser Callback] Explicit success signal found. Activating in DB (if not already)...');
    await db.update(subscriptions).set({
      status: 'ACTIVE',
      subscriberId: subscriberId || subscription.subscriberId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
    }).where(eq(subscriptions.id, subscription.id));

    if (requestId) {
      await db.update(payments)
        .set({
          status: 'PAID',
          subscriptionId: subscription.id,
        })
        .where(eq(payments.externalId, requestId))
        .catch(() => {});
    }
  } else {
    console.log('[bdApps Browser Callback] DB was already ACTIVE from webhook. Proceeding to success redirect!');
  }

  console.log('[bdApps Browser Callback] Complete! Redirecting user to WhatsApp.\\n=============================================');

  // Notify user via WhatsApp`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/lib/bdapps/subscription-service.ts', newContent);
console.log('Done!');
