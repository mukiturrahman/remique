import { NextRequest, NextResponse } from 'next/server';
import { initiateBdappsSubscription } from '@/lib/bdapps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phoneNumber, email, planPeriod, userId } = body;

    if (!phoneNumber && !userId) {
      return NextResponse.json(
        { error: 'Please provide a valid WhatsApp phone number.' },
        { status: 400 }
      );
    }

    const result = await initiateBdappsSubscription({
      phoneNumber,
      email,
      userId,
      planPeriod,
    });

    if (!result.success || !result.authorizationUrl) {
      return NextResponse.json(
        { error: result.error || 'Failed to initiate bdApps subscription.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      requestId: result.requestId,
    });
  } catch (error: any) {
    console.error('[API /api/billing/bdapps/subscribe] POST Error:', error);
    
    // Prevent leaking Prisma or developer errors to the UI
    let errorMessage = 'Something went wrong. Please try again.';
    if (error?.message && !error.message.includes('prisma') && !error.message.includes('invocation')) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone') || req.nextUrl.searchParams.get('phoneNumber');
    const period = req.nextUrl.searchParams.get('period') || req.nextUrl.searchParams.get('planPeriod') || 'monthly';
    const userId = req.nextUrl.searchParams.get('userId') || undefined;

    if (!phone && !userId) {
      return NextResponse.redirect(new URL('/pricing?error=missing_phone', req.url));
    }

    const result = await initiateBdappsSubscription({
      phoneNumber: phone || undefined,
      userId,
      planPeriod: period,
    });

    if (!result.success || !result.authorizationUrl) {
      const errMsg = encodeURIComponent(result.error || 'Failed to start subscription');
      return NextResponse.redirect(new URL(`/pricing?error=${errMsg}`, req.url));
    }

    return NextResponse.redirect(result.authorizationUrl);
  } catch (error: any) {
    console.error('[API /api/billing/bdapps/subscribe] GET Error:', error);
    
    // Prevent leaking Prisma or developer errors to the UI
    let errorMessage = 'Something went wrong. Please try again.';
    if (error?.message && !error.message.includes('prisma') && !error.message.includes('invocation')) {
      errorMessage = error.message;
    }
    
    const errMsg = encodeURIComponent(errorMessage);
    return NextResponse.redirect(new URL(`/pricing?error=${errMsg}`, req.url));
  }
}
