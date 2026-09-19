const fs = require('fs');
const file = 'src/lib/bdapps/subscription-service.ts';
let content = fs.readFileSync(file, 'utf8');

const injectionPoint = `  if (rawStatus === 'UNREGISTERED') {`;

const newCode = `  if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED') {
    if (subscription && subscription.status === 'PENDING') {
      await db.update(subscriptions).set({
        planTier: 'free',
        planPeriod: null,
        status: 'ACTIVE',
        currentPeriodStart: null,
        currentPeriodEnd: null
      }).where(eq(subscriptions.id, subscription.id));
      
      if (requestId) {
        await db.update(payments).set({ status: 'FAILED' }).where(and(eq(payments.externalId, requestId), eq(payments.status, 'PENDING'))).catch(() => {});
      }

      return {
        success: true,
        status: rawStatus,
        subscriberId: rawSubscriberId,
        requestId,
        actionTaken: 'REVERTED_TO_FREE',
      };
    }
  }

  if (rawStatus === 'UNREGISTERED') {`;

content = content.replace(injectionPoint, newCode);
fs.writeFileSync(file, content);
console.log('Done');
