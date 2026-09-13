import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Redirects rather than returning JSON because the sign-out control in the
  // admin layout is a plain form, not a fetch — it has no client JS to follow
  // up with.
  const response = NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 });
  response.cookies.set({ name: ADMIN_COOKIE, value: '', path: '/', maxAge: 0 });
  return response;
}
