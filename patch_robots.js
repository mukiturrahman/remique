const fs = require('fs');
let code = fs.readFileSync('src/middleware.ts', 'utf8');

const newCode = `import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminConfigured, verifySessionToken } from './lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login', '/api/admin/logout']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!adminConfigured()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  let response;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    response = NextResponse.next();
  } else {
    const valid = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);

    if (valid) {
      response = NextResponse.next();
    } else if (pathname.startsWith('/api/admin')) {
      response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      const loginUrl = new URL('/admin/login', request.url);
      response = NextResponse.redirect(loginUrl);
    }
  }

  // FORCE noindex on absolutely every /admin route at the HTTP header level
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
`;

fs.writeFileSync('src/middleware.ts', newCode);
console.log('Patched middleware');
