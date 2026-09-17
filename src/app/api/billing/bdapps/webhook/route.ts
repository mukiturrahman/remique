import { NextRequest, NextResponse } from 'next/server';
import { handleBdappsWebhook } from '@/lib/bdapps';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);

    if (!payload) {
      return NextResponse.json(
        { statusCode: 'E1009', statusDetail: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    console.log('\n=============================================');
    console.log('[bdApps Webhook] Received payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('=============================================\n');

    const result = await handleBdappsWebhook(payload);

    return NextResponse.json({
      statusCode: result.success ? 'S1000' : 'E1001',
      statusDetail: result.actionTaken,
      ...result,
    });
  } catch (error: any) {
    console.error('[API /api/billing/bdapps/webhook] Error:', error);
    return NextResponse.json(
      { statusCode: 'E1001', statusDetail: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
