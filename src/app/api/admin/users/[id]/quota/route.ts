import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Null means "inherit the global env default". Anything else must be a non-negative integer. */
function parseCap(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const daily = parseCap(body?.dailyTokenCap);
  const weekly = parseCap(body?.weeklyTokenCap);

  if (daily === undefined || weekly === undefined) {
    return NextResponse.json(
      { error: 'Caps must be a non-negative whole number, or null to inherit the default' },
      { status: 400 }
    );
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { dailyTokenCap: daily, weeklyTokenCap: weekly },
    });
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  console.warn(`[Remique] Admin set caps userId=${id} daily=${daily} weekly=${weekly}`);
  return NextResponse.json({ ok: true });
}
