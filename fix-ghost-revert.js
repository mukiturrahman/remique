const fs = require('fs');
const content = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const regex = /  if \(isStatusMissing && subscription\.status !== 'ACTIVE'\) \{\n    console\.log\('\[bdApps Browser Callback\] Polling exhausted\. DB is still not ACTIVE\. Aborting with Ghosting\/Timeout error\.'\);\n    return \{/m;

const replacement = `  if (isStatusMissing && subscription.status !== 'ACTIVE') {
    console.log('[bdApps Browser Callback] Polling exhausted. DB is still not ACTIVE. Aborting with Ghosting/Timeout error.');
    
    if (requestId) {
      console.log(\`[bdApps Browser Callback] Reverting ghosted subscription \${requestId} to FREE tier...\`);
      await db.update(payments)
        .set({ status: 'FAILED' })
        .where(and(eq(payments.externalId, requestId), eq(payments.status, 'PENDING')))
        .catch(() => {});

      await db.update(subscriptions)
        .set({ 
          planTier: 'free',
          planPeriod: null,
          status: 'ACTIVE',
          currentPeriodStart: null,
          currentPeriodEnd: null
        })
        .where(and(eq(subscriptions.requestId, requestId), eq(subscriptions.status, 'PENDING')))
        .catch(() => {});
    }

    return {`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/lib/bdapps/subscription-service.ts', newContent);
console.log('Done!');
