import { NextRequest, NextResponse } from 'next/server';
import { handleBdappsCallback } from '@/lib/bdapps';

export async function GET(req: NextRequest) {
  try {
    const result = await handleBdappsCallback(req.nextUrl.searchParams);
    return NextResponse.redirect(result.redirectUrl);
  } catch (error: any) {
    console.error('[API /api/billing/bdapps/callback] Error:', error);
    const err = encodeURIComponent(error?.message || 'Callback error');
    return NextResponse.redirect(new URL(`/billing/cancelled?error=${err}`, req.url));
  }
}
