import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkWhatsAppToken, type WhatsAppTokenStatus } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The deep check calls Meta's Graph API, so it is cached briefly. Uptime
// monitors poll on a fixed interval and we do not want one probe per hit.
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

export async function GET(request: NextRequest) {
  // ?deep=1 additionally verifies the WhatsApp access token against Meta.
  // The default probe stays cheap so it can be polled freely.
  const deep = request.nextUrl.searchParams.get('deep') === '1';

  const checks: Record<string, unknown> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (err: any) {
    healthy = false;
    checks.database = { status: 'error', error: err?.message };
  }

  if (deep) {
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
          // Code 190 is the one that silently kills the bot: the App Dashboard
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
  }

  // Unprocessed inbound messages are the symptom of any stalled pipeline,
  // whatever the cause. Non-zero and climbing means something needs attention.
  try {
    const pendingInbound = await prisma.message.count({
      where: { direction: 'INBOUND', processedAt: null },
    });
    checks.pendingInbound = pendingInbound;
  } catch {
    // Database check above already recorded the failure.
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
