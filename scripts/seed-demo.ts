/**
 * Throwaway demo data for looking at the admin dashboard locally.
 *
 * NOT for production. Wipes and repopulates every table. Point DATABASE_URL at
 * a disposable local Postgres before running:
 *
 *   npx tsx scripts/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';

/**
 * Refuses to run against anything but a local database.
 *
 * This script deletes every row in every table. The only thing standing
 * between that and production is this check, so it is a hard exit rather than
 * a warning — a warning gets ignored exactly once and that is enough.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  let host: string;

  try {
    host = new URL(url).hostname;
  } catch {
    console.error('DATABASE_URL is unset or unparseable. Refusing to run.');
    process.exit(1);
  }

  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    console.error(
      `Refusing to run: DATABASE_URL points at "${host}", not localhost.\n` +
        'This script DELETES EVERY ROW IN EVERY TABLE. Point it at a disposable\n' +
        'local Postgres first, e.g.\n\n' +
        '  docker run -d --name remique-testdb -e POSTGRES_PASSWORD=localtest \\\n' +
        '    -e POSTGRES_DB=remique -p 5433:5432 postgres:16-alpine\n\n' +
        '  export DATABASE_URL="postgresql://postgres:localtest@localhost:5433/remique"\n' +
        '  export DATABASE_URL_UNPOOLED="$DATABASE_URL"\n'
    );
    process.exit(1);
  }
}

assertLocalDatabase();

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

function ago(days: number, hours = 0): Date {
  return new Date(now - days * DAY - hours * 60 * 60 * 1000);
}

function ahead(hours: number): Date {
  return new Date(now + hours * 60 * 60 * 1000);
}

/** Deterministic pseudo-random so repeated runs look the same. */
let seed = 42;
function rand(max: number): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % max;
}

async function main() {
  console.log('Wiping...');
  await prisma.payment.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.conversationState.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.document.deleteMany();
  await prisma.fact.deleteMany();
  await prisma.note.deleteMany();
  await prisma.message.deleteMany();
  await prisma.user.deleteMany();

  const people = [
    { name: 'Mukitur Rahman', phone: '+8801853501469', heavy: true, blocked: false },
    { name: 'Nusrat Jahan', phone: '+8801711234567', heavy: false, blocked: false },
    { name: 'Rakib Hasan', phone: '+8801912345678', heavy: true, blocked: true },
    { name: 'Sadia Islam', phone: '+8801677889900', heavy: false, blocked: false },
    { name: null, phone: '+8801555000111', heavy: false, blocked: false },
  ];

  for (const [i, person] of people.entries()) {
    const user = await prisma.user.create({
      data: {
        whatsappId: person.phone.replace('+', ''),
        phoneNumber: person.phone,
        name: person.name,
        timezone: 'Asia/Dhaka',
        createdAt: ago(40 - i * 6),
        blockedAt: person.blocked ? ago(2) : null,
        blockedReason: person.blocked ? 'Abusive language, repeated after warning' : null,
        blockNoticeSentAt: person.blocked ? ago(2) : null,
        dailyTokenCap: i === 1 ? 50_000 : null,
        weeklyTokenCap: null,
        // i=0 is on an active weekly plan; i=2 lapsed a week ago (counts as
        // unsubscribed); everyone else never subscribed.
        planTier: i === 0 ? 'weekly' : i === 2 ? 'free' : 'free',
        planPeriod: i === 0 ? 'weekly' : i === 2 ? 'weekly' : null,
        planStartedAt: i === 0 ? ago(4) : i === 2 ? ago(21) : null,
        planExpiresAt: i === 0 ? ahead(72) : i === 2 ? ago(7) : null,
      },
    });

    // ── Messages ────────────────────────────────────────────────
    const inbound = [
      'kalke shokal 10 tay doctor er appointment mone koraye dio',
      'amar reminder gula dekhaw',
      'remind me to call ammu in 30 minutes',
      'eta amar eTin document, save kore rakho',
      'porshu bikal 5 tay meeting ache',
      'shob cancel kore dao',
    ];
    const outbound = [
      'Done! Reminding you tomorrow at 10:00 AM about the doctor appointment. 🔔',
      'You have 3 reminders coming up.',
      'Got it — 30 minutes from now, call Ammu.',
      'Saved as "eTin document". 📄',
      'Set for Wednesday 5:00 PM.',
      'Cancelled all 3.',
    ];

    const turns = person.heavy ? 6 : 3;
    for (let t = 0; t < turns; t++) {
      const when = ago(rand(25), rand(20));
      await prisma.message.create({
        data: {
          userId: user.id,
          whatsappMessageId: `wamid.seed.${user.id}.in.${t}`,
          direction: 'INBOUND',
          messageText: inbound[t % inbound.length],
          createdAt: when,
          processedAt: when,
        },
      });
      await prisma.message.create({
        data: {
          userId: user.id,
          whatsappMessageId: `wamid.seed.${user.id}.out.${t}`,
          direction: 'OUTBOUND',
          messageText: outbound[t % outbound.length],
          createdAt: new Date(when.getTime() + 4000),
          processedAt: new Date(when.getTime() + 4000),
        },
      });
    }

    // ── Usage events across the last 30 days ────────────────────
    let totalIn = 0;
    let totalOut = 0;
    let totalCost = 0;
    let calls = 0;

    const activeDays = person.heavy ? 22 : 8;
    for (let d = 0; d < activeDays; d++) {
      const dayOffset = rand(30);
      const perDay = person.heavy ? 1 + rand(4) : 1 + rand(2);

      for (let c = 0; c < perDay; c++) {
        const inputTokens = 2_000 + rand(9_000);
        const cachedTokens = Math.floor(inputTokens * 0.6);
        const outputTokens = 80 + rand(400);
        // gpt-4.1-mini: 0.40 / 0.10 / 1.60 USD per 1M
        const costMicros = Math.round(
          (inputTokens - cachedTokens) * 0.4 + cachedTokens * 0.1 + outputTokens * 1.6
        );

        await prisma.usageEvent.create({
          data: {
            userId: user.id,
            purpose: 'parse',
            provider: 'openai',
            model: 'gpt-4.1-mini',
            inputTokens,
            cachedTokens,
            outputTokens,
            costMicros,
            createdAt: ago(dayOffset, rand(23)),
          },
        });

        totalIn += inputTokens;
        totalOut += outputTokens;
        totalCost += costMicros;
        calls += 1;
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalInputTokens: totalIn,
        totalOutputTokens: totalOut,
        totalCostMicros: totalCost,
        totalLlmCalls: calls,
      },
    });

    // ── Reminders ───────────────────────────────────────────────
    await prisma.reminder.createMany({
      data: [
        {
          userId: user.id,
          title: 'Doctor appointment',
          originalMessage: inbound[0],
          scheduledAt: ahead(18),
          category: 'MEETING',
          status: 'SCHEDULED',
        },
        {
          userId: user.id,
          title: 'Call Ammu',
          originalMessage: inbound[2],
          scheduledAt: ahead(2),
          category: 'TASK',
          status: 'SCHEDULED',
        },
        {
          userId: user.id,
          title: 'Take medicine',
          originalMessage: 'roj raate medicine er kotha mone koraye dio',
          scheduledAt: ahead(9),
          category: 'HABIT',
          recurrenceRule: 'DAILY',
          status: 'SCHEDULED',
        },
        {
          userId: user.id,
          title: 'Team standup',
          originalMessage: 'standup mone koraye dio',
          scheduledAt: ago(3),
          category: 'MEETING',
          status: 'SENT',
          sentAt: ago(3),
        },
        {
          userId: user.id,
          title: 'Pay electricity bill',
          originalMessage: 'bill er kotha mone koraye dio',
          scheduledAt: ago(8),
          category: 'TASK',
          status: 'DONE',
          sentAt: ago(8),
          completedAt: ago(8),
        },
      ],
    });

    // ── Documents ───────────────────────────────────────────────
    await prisma.document.createMany({
      data: [
        {
          userId: user.id,
          label: 'eTin certificate',
          mediaType: 'document',
          mimeType: 'application/pdf',
          fileName: 'etin.pdf',
          s3Key: `documents/${user.id}/seed-1.pdf`,
          sizeBytes: 184_320,
          createdAt: ago(12),
        },
        {
          userId: user.id,
          label: 'Passport photo page',
          mediaType: 'image',
          mimeType: 'image/jpeg',
          s3Key: `documents/${user.id}/seed-2.jpg`,
          sizeBytes: 512_000,
          createdAt: ago(5),
        },
        // Unlabeled: an upload the user never named. Swept after 24h.
        {
          userId: user.id,
          label: null,
          mediaType: 'image',
          mimeType: 'image/heic',
          s3Key: `documents/${user.id}/seed-3.heic`,
          sizeBytes: 2_100_000,
          createdAt: ago(0, 3),
        },
      ],
    });

    // ── Facts ───────────────────────────────────────────────────
    await prisma.fact.createMany({
      data: [
        {
          userId: user.id,
          subject: 'girlfriend',
          predicate: 'birthday',
          value: '2026-09-10',
          valueDate: new Date('2026-09-10T00:00:00Z'),
          recurring: true,
        },
        { userId: user.id, subject: 'company', predicate: 'name', value: 'RoveUp' },
        { userId: user.id, subject: 'user', predicate: 'wake_time', value: '07:00' },
      ],
    });

    // ── Payments ────────────────────────────────────────────────
    // Only i=0 and i=2 ever paid. One PENDING and one FAILED row exist so the
    // revenue tile can be checked against a total that must exclude them.
    if (i === 0 || i === 2) {
      await prisma.payment.createMany({
        data: [
          {
            userId: user.id,
            amount: '199.00',
            currency: 'BDT',
            provider: 'bkash',
            externalId: `bkash-seed-${user.id}-1`,
            status: 'PAID',
            periodStart: ago(i === 0 ? 4 : 21),
            periodEnd: i === 0 ? ahead(72) : ago(7),
            createdAt: ago(i === 0 ? 4 : 21),
          },
          {
            userId: user.id,
            amount: '199.00',
            currency: 'BDT',
            provider: 'bkash',
            externalId: `bkash-seed-${user.id}-2`,
            status: i === 0 ? 'PAID' : 'FAILED',
            createdAt: ago(i === 0 ? 11 : 6),
          },
          {
            userId: user.id,
            amount: '499.00',
            currency: 'BDT',
            provider: 'bkash',
            externalId: `bkash-seed-${user.id}-3`,
            status: 'PENDING',
            createdAt: ago(0, 2),
          },
        ],
      });
    }

    console.log(
      `  ${person.name ?? 'Unnamed'} — ${calls} calls, ` +
        `${(totalIn + totalOut).toLocaleString()} tokens, $${(totalCost / 1e6).toFixed(2)}` +
        (person.blocked ? ' [BLOCKED]' : '')
    );
  }

  console.log('\nDone. Open http://localhost:3000/admin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
