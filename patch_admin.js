const fs = require('fs');

let content = fs.readFileSync('src/lib/admin-queries.ts', 'utf8');

// First, make sure `subscriptions` is imported from `../db/schema`
if (!content.includes('subscriptions')) {
    content = content.replace('documents } from "../db/schema"', 'documents, subscriptions } from "../db/schema"');
    content = content.replace('documents } from "@/db/schema"', 'documents, subscriptions } from "@/db/schema"');
}

// Update getUserDetail
content = content.replace(
    '  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);',
    '  const [user] = await db.select({ ...users, planTier: subscriptions.planTier, planPeriod: subscriptions.planPeriod, planExpiresAt: subscriptions.currentPeriodEnd }).from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(eq(users.id, id)).limit(1);'
);

// We need to replace property accesses first
content = content.replace(/users\.planTier/g, 'subscriptions.planTier');
content = content.replace(/users\.planPeriod/g, 'subscriptions.planPeriod');
content = content.replace(/users\.planExpiresAt/g, 'subscriptions.currentPeriodEnd');
content = content.replace(/users\.planStartedAt/g, 'subscriptions.currentPeriodStart');

// For other queries, we can try to do a surgical replacement.
const replacements = [
    {
        search: /\.from\(users\)\s*\n\s*\.where\(\s*inArray\(users\.id, pageUserIds\)\s*\)/,
        replace: '.from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(inArray(users.id, pageUserIds))'
    },
    {
        search: /\.from\(users\)\s*\n\s*\.where\(baseWhere\)/g,
        replace: '.from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(baseWhere)'
    },
    {
        search: /\.from\(users\)\s*\n\s*\.where\(\s*composeWhere/g,
        replace: '.from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(composeWhere'
    },
    {
        search: /\.from\(users\)\s*\n\s*\.where\(\s*and\(\s*isNotNull\(subscriptions\.currentPeriodEnd\)/g,
        replace: '.from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(and(isNotNull(subscriptions.currentPeriodEnd)'
    }
];

for (const r of replacements) {
    content = content.replace(r.search, r.replace);
}

// Special case for listUnsubscribed:
content = content.replace(
    /db\n\s*\.select\({\n\s*id: users\.id,\n\s*name: users\.name,\n\s*phoneNumber: users\.phoneNumber,\n\s*planTier: subscriptions\.planTier,\n\s*planPeriod: subscriptions\.planPeriod,\n\s*planExpiresAt: subscriptions\.currentPeriodEnd,\n\s*}\)\n\s*\.from\(users\)/g,
    'db\n      .select({\n        id: users.id,\n        name: users.name,\n        phoneNumber: users.phoneNumber,\n        planTier: subscriptions.planTier,\n        planPeriod: subscriptions.planPeriod,\n        planExpiresAt: subscriptions.currentPeriodEnd,\n      })\n      .from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId))'
);

fs.writeFileSync('src/lib/admin-queries.ts', content);
