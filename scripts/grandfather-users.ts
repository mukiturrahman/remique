/**
 * Puts every user that already exists on a permanent, free-forever plan.
 *
 * These are the people who used Remique before it had any concept of paying.
 * Charging them retroactively, or letting them lapse into a paid tier they
 * never agreed to, would be a bait and switch. `planExpiresAt` stays null,
 * which is what "never expires" means everywhere else in the code — the
 * dashboard's unsubscribed count keys on that column, so a null expiry can
 * never be counted as churn.
 *
 * New users are unaffected: the schema default is still 'free', so anyone who
 * signs up after this runs goes through whatever the paid flow ends up being.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   npx tsx scripts/grandfather-users.ts
 *   npx tsx scripts/grandfather-users.ts --apply
 *
 * Idempotent — running it twice changes nothing the second time.
 */
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { not, eq, sql } from 'drizzle-orm';

export const PERMANENT_TIER = 'permanent';

const apply = process.argv.includes('--apply');

async function main() {
  const totalRes = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = Number(totalRes[0].count);

  const pending = await db.query.users.findMany({
    where: not(eq(users.planTier, PERMANENT_TIER)),
    columns: {
      id: true,
      name: true,
      phoneNumber: true,
      planTier: true,
      planExpiresAt: true,
      createdAt: true,
    },
    orderBy: (u, { asc }) => asc(u.createdAt),
  });

  console.log(`\n${total} users in the database.`);
  console.log(`${pending.length} not yet on the permanent plan.\n`);

  if (pending.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  for (const user of pending) {
    console.log(
      `  ${(user.name ?? 'Unnamed').padEnd(24)} ${user.phoneNumber.padEnd(16)} ` +
        `${user.planTier} -> ${PERMANENT_TIER}`
    );
  }

  if (!apply) {
    console.log(`\nDry run. Nothing was written. Re-run with --apply to make these changes.`);
    return;
  }

  const result = await db.update(users)
    .set({
      planTier: PERMANENT_TIER,
      planPeriod: null,
      planExpiresAt: null,
      planStartedAt: new Date(),
    })
    .where(not(eq(users.planTier, PERMANENT_TIER)))
    .returning({ id: users.id });

  console.log(`\nUpdated ${result.length} users to the permanent plan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
