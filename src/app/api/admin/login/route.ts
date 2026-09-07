import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, SESSION_TTL_MS, createSessionToken, passwordMatches } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Best-effort brute-force brake.
 *
 * Per-instance and in-memory: Vercel runs many instances and they share
 * nothing, so a determined attacker gets this many attempts *per instance*.
 * It stops casual scanning, not a real brute force. The security actually
 * rests on ADMIN_PASSWORD having enough entropy.
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || record.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (tooManyAttempts(ip)) {
    console.warn(`[Remique] Admin login rate limited ip=${ip}`);
    return NextResponse.json({ error: 'Too many attempts. Wait 15 minutes.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const submitted = typeof body?.password === 'string' ? body.password : '';

  if (!(await passwordMatches(submitted))) {
    console.warn(`[Remique] Failed admin login ip=${ip}`);
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // A success clears the counter so a legitimate operator who fat-fingered it
  // a few times is not locked out afterwards.
  attempts.delete(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}
