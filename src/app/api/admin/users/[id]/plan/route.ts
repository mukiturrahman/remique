import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The tiers the rest of the app actually branches on.
 *
 * `pro` and `permanent` both bypass the token caps (src/lib/usage.ts); `pro`
 * is additionally what the reminder service and the subscription flow read.
 * Anything outside this set would silently behave as free.
 */
const TIERS = new Set(['free', 'pro', 'permanent']);

/**
 * The two plans that exist, mirrored from `BDAPPS_PLANS` in
 * `src/lib/bdapps/types.ts`. Both store `planTier: 'pro'`, so the period is
 * the only thing that says which product someone is on — and the admin table
 * reads it back to name the plan.
 */
const PERIODS = new Set(['weekly', 'monthly']);

export async function POST(
  request: NextRequest,
  // Next 15: params is a Promise. Destructuring it synchronously is the single
  // most common way to break a route handler on this version.
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const tier = body?.tier;
  if (typeof tier !== 'string' || !TIERS.has(tier)) {
    return NextResponse.json(
      { error: 'Tier must be one of: free, pro, permanent' },
      { status: 400 }
    );
  }

  // Only a pro plan has a period. Null is the right answer for free and for
  // the internal tier, and a period sent alongside either is ignored rather
  // than stored, so the row cannot end up claiming a plan nobody is on.
  const rawPeriod = body?.period;
  if (tier === 'pro') {
    if (typeof rawPeriod !== 'string' || !PERIODS.has(rawPeriod)) {
      return NextResponse.json(
        { error: 'A pro plan must be weekly or monthly' },
        { status: 400 }
      );
    }
  }
  const period = tier === 'pro' ? (rawPeriod as string) : null;

  // Null means "no expiry" — a grant that stays live until it is changed by
  // hand. Undefined is not the same thing and is rejected below.
  let expiresAt: Date | null = null;
  if (body?.expiresAt !== null && body?.expiresAt !== undefined) {
    if (typeof body.expiresAt !== 'string') {
      return NextResponse.json({ error: 'expiresAt must be a date or null' }, { status: 400 });
    }
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'That is not a date I can read' }, { status: 400 });
    }
    expiresAt = parsed;
  }

  // Going back to free clears the whole plan, dates included. Leaving an old
  // expiry behind would keep the user on the "unsubscribed" list forever.
  const data =
    tier === 'free'
      ? { planTier: 'free', planPeriod: null, planStartedAt: null, planExpiresAt: null }
      : { planTier: tier, planPeriod: period, planStartedAt: new Date(), planExpiresAt: expiresAt };

  try {
    await prisma.user.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  console.warn(
    `[Remique] Admin set plan userId=${id} tier=${tier} period=${period ?? 'none'} expires=${expiresAt?.toISOString() ?? 'never'}`
  );
  return NextResponse.json({ ok: true });
}
