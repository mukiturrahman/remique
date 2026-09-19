import { NextRequest, NextResponse } from 'next/server';
import { handleBdappsWebhook } from '@/lib/bdapps';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.clone().text().catch(() => 'Could not read raw body');
    const headers = Object.fromEntries(req.headers.entries());

    console.log('\n=============================================');
    console.log('[bdApps Webhook] INCOMING POST REQUEST');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Raw Body:', rawBody);

    let payload = await req.clone().json().catch(() => null);
    
    // If it's not JSON, try to parse it as URL-encoded form data (just in case bdApps uses forms)
    if (!payload && headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.clone().formData().catch(() => null);
      if (formData) {
        payload = Object.fromEntries(formData.entries());
        console.log('Parsed Form Data:', JSON.stringify(payload, null, 2));
      }
    }

    console.log('=============================================\n');

    if (!payload) {
      // If we completely failed to parse anything, fallback to wrapping the raw text so it doesn't crash
      payload = { raw: rawBody };
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

export async function GET(req: NextRequest) {
  console.log('\\n=============================================');
  console.log('[bdApps Webhook] INCOMING GET REQUEST (Warning: Webhooks are usually POST)');
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  console.log('=============================================\\n');
  
  return NextResponse.json({
    statusCode: 'S1000',
    statusDetail: 'GET received, but expecting POST for webhook data.',
  });
}
