import re

with open('src/lib/admin-queries.ts', 'r') as f:
    content = f.read()

bad_line = "const [user] = await db.select({ ...users, planTier: subscriptions.planTier, planPeriod: subscriptions.planPeriod, planExpiresAt: subscriptions.currentPeriodEnd }).from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(eq(users.id, id)).limit(1);"

good_lines = """  const [result] = await db.select().from(users).leftJoin(subscriptions, eq(users.id, subscriptions.userId)).where(eq(users.id, id)).limit(1);
  if (!result) return null;
  const user = { ...result.users, planTier: result.subscriptions?.planTier ?? 'free', planPeriod: result.subscriptions?.planPeriod ?? null, planExpiresAt: result.subscriptions?.currentPeriodEnd ?? null };"""

content = content.replace(bad_line + "\n  if (!user) return null;", good_lines)

with open('src/lib/admin-queries.ts', 'w') as f:
    f.write(content)
