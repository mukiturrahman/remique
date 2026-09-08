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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PERMANENT_TIER = 'permanent';

const apply = process.argv.includes('--apply');

async function main() {
  const total = await prisma.user.count();

  // Anyone not already permanent. Restated rather than assumed, so a partial
  // previous run resumes cleanly.
  const pending = await prisma.user.findMany({
    where: { planTier: { not: PERMANENT_TIER } },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      planTier: true,
      planExpiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
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

  const result = await prisma.user.updateMany({
    where: { planTier: { not: PERMANENT_TIER } },
    data: {
      planTier: PERMANENT_TIER,
      // A permanent plan has no billing period and no end date. Both are
      // cleared rather than left stale, so nothing downstream reads a leftover
      // expiry and treats these users as lapsed.
      planPeriod: null,
      planExpiresAt: null,
      planStartedAt: new Date(),
    },
  });

  console.log(`\nUpdated ${result.count} users to the permanent plan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
