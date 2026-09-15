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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    const searchParams = new URLSearchParams();
    
    if (formData) {
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          searchParams.append(key, value);
        }
      });
    }

    // Also fallback to URL search params if any
    req.nextUrl.searchParams.forEach((value, key) => {
      if (!searchParams.has(key)) {
        searchParams.append(key, value);
      }
    });

    const result = await handleBdappsCallback(searchParams);
    return NextResponse.redirect(result.redirectUrl);
  } catch (error: any) {
    console.error('[API /api/billing/bdapps/callback] POST Error:', error);
    const err = encodeURIComponent(error?.message || 'Callback error');
    return NextResponse.redirect(new URL(`/billing/cancelled?error=${err}`, req.url));
  }
}
