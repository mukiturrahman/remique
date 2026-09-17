const fs = require('fs');
const content = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const regex = /  \/\/ Find subscription by requestId[\s\S]*?Notify user via WhatsApp/m;

const replacement = `  // Find subscription by requestId
  let subscriptionRecord = null;
  let userRecord = null;
  
  if (requestId) {
    // If the browser redirect didn't include a status, we give the background 
    // webhook up to 3 seconds to activate the subscription before we give up.
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.requestId, requestId),
        with: { user: true },
      });
      if (res) {
        subscriptionRecord = res;
        userRecord = res.user;
        if (isStatusMissing && res.status !== 'ACTIVE') {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
      }
      break;
    }
  }

  if (!subscriptionRecord && subscriberId) {
    const cleanSub = subscriberId.replace(/^tel:/, '').replace(/\\D/g, '');
    const res = await db.select({
      subscription: subscriptions,
      user: users
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .where(or(
      eq(subscriptions.subscriberId, subscriberId),
      eq(users.whatsappId, cleanSub),
      eq(users.phoneNumber, \`+\${cleanSub}\`)
    ))
    .limit(1);

    if (res.length > 0) {
      subscriptionRecord = res[0].subscription;
      userRecord = res[0].user;
    }
  }
  
  const subscription = subscriptionRecord ? { ...subscriptionRecord, user: userRecord } : null;

  if (!subscription) {
    return {
      success: false,
      requestId,
      subscriberId,
      error: 'No matching subscription request found.',
      redirectUrl: \`\${appBaseUrl}/billing/cancelled?error=\${encodeURIComponent(
        'Subscription session not found. Please try again.'
      )}\`,
    };
  }

  // If status is still missing and webhook hasn't activated it, we cannot proceed.
  // The user probably backed out or closed the page without paying.
  if (isStatusMissing && subscription.status !== 'ACTIVE') {
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
  }

  // Notify user via WhatsApp`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/lib/bdapps/subscription-service.ts', newContent);
console.log('Done!');
