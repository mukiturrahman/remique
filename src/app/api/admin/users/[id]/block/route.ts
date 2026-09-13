import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The session is already verified by src/middleware.ts — this route is only
// reachable with a valid cookie.
export async function POST(
  request: NextRequest,
  // Next 15: params is a Promise. Destructuring it synchronously is the single
  // most common way to break a route handler on this version.
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.blocked !== 'boolean') {
    return NextResponse.json({ error: 'blocked must be a boolean' }, { status: 400 });
  }

  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;

  try {
    await prisma.user.update({
      where: { id },
      data: body.blocked
        ? { blockedAt: new Date(), blockedReason: reason }
        : // Clearing blockNoticeSentAt too, so a later re-block notifies the
          // user again instead of going silently dark on them.
          { blockedAt: null, blockedReason: null, blockNoticeSentAt: null },
    });
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  console.warn(`[Remique] Admin ${body.blocked ? 'blocked' : 'unblocked'} userId=${id}`);
  return NextResponse.json({ ok: true });
}
