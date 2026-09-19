import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/db';
import { messages, reminders } from '@/db/schema';
import { eq, and, lte, isNull, sql, count } from 'drizzle-orm';
import { env } from '@/lib/env';
import { checkWhatsAppToken, type WhatsAppTokenStatus } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The anonymous probe must stay free to serve. It touches nothing, so hammering
// it cannot burn database compute or Meta quota — only Vercel invocations,
// which the platform's own DDoS mitigation covers.
//
// Everything that costs money (database round trips, the Graph API token check)
// sits behind HEALTH_CHECK_SECRET.

const TOKEN_CACHE_MS = 60_000;
let tokenCache: { checkedAt: number; result: WhatsAppTokenStatus } | null = null;

async function getTokenStatus(): Promise<{ result: WhatsAppTokenStatus; cached: boolean }> {
  if (tokenCache && Date.now() - tokenCache.checkedAt < TOKEN_CACHE_MS) {
    return { result: tokenCache.result, cached: true };
  }

  const result = await checkWhatsAppToken();
  tokenCache = { checkedAt: Date.now(), result };
  return { result, cached: false };
}

function isAuthorized(request: NextRequest): boolean {
  const secret = env.HEALTH_CHECK_SECRET;
  if (!secret) return false;

  const provided =
    request.headers.get('x-health-secret') ??
    request.nextUrl.searchParams.get('secret') ??
    '';

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const wantsDeep =
    request.nextUrl.searchParams.get('deep') === '1' ||
    request.nextUrl.searchParams.has('secret') ||
    request.headers.has('x-health-secret');

  // Anonymous liveness probe. No I/O.
  if (!wantsDeep) {
    return NextResponse.json(
      { status: 'ok', service: 'remique-api', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  }

  if (!isAuthorized(request)) {
    // Deliberately indistinguishable from a route that does not exist, so the
    // deep probe is not discoverable by anonymous scanning.
    return new NextResponse('Not Found', { status: 404 });
  }

  const checks: Record<string, unknown> = {};
  let healthy = true;

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'ok' };
  } catch (err: any) {
    healthy = false;
    checks.database = { status: 'error', error: err?.message };
  }

  try {
    const { result, cached } = await getTokenStatus();

    if (result.ok) {
      checks.whatsappToken = {
        status: 'ok',
        cached,
        phoneNumberId: result.phoneNumberId,
        displayPhoneNumber: result.displayPhoneNumber,
        verifiedName: result.verifiedName,
      };
    } else {
      healthy = false;
      checks.whatsappToken = {
        status: 'error',
        cached,
        httpStatus: result.httpStatus,
        code: result.code,
        error: result.error,
        // Code 190 is the one that silently kills the bot: an App Dashboard
        // token is temporary and expires after 24 hours.
        hint:
          result.code === 190
            ? 'WHATSAPP_TOKEN is expired or invalid. Replace it with a System User token set to never expire, then redeploy.'
            : 'WhatsApp credentials or permissions were rejected by Meta.',
      };
    }
  } catch (err: any) {
    healthy = false;
    checks.whatsappToken = { status: 'error', error: err?.message };
  }

  // Backlog depth. This is the symptom of a stalled pipeline whatever the
  // cause, so it is the single number worth alerting on.
  try {
    const [pendingInbound, overdueReminders] = await Promise.all([
      db.select({ count: count() }).from(messages).where(and(eq(messages.direction, 'INBOUND'), isNull(messages.processedAt))).then(r => r[0].count),
      db.select({ count: count() }).from(reminders).where(and(eq(reminders.status, 'SCHEDULED'), lte(reminders.scheduledAt, new Date()))).then(r => r[0].count),
    ]);
    checks.pendingInbound = pendingInbound;
    checks.overdueReminders = overdueReminders;
  } catch {
    // The database check above already recorded the failure.
  }

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      service: 'remique-api',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
