import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminConfigured, verifySessionToken } from './lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

/**
 * Paths that must stay reachable without a valid session: the login page and
 * its POST endpoint, plus logout — signing out with an already-expired
 * cookie must land the operator on the login page, not a raw 401 JSON body.
 * The route only clears the cookie and redirects, so making it public grants
 * nothing.
 */
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login', '/api/admin/logout']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No secrets configured means the admin surface does not exist. A 404 rather
  // than a 500 or a login form, so an unconfigured deployment gives a scanner
  // nothing to work with.
  if (!adminConfigured()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const valid = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);

  if (valid) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // An expired session during a fetch must surface as an error the caller can
  // read, not an HTML redirect it will try to parse as JSON.
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}
