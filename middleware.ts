import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'propzy_token';
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'propzy-secret-jwt-key-2026-super-secure'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isBrowserDoc =
    req.headers.get('sec-fetch-dest') === 'document' ||
    req.headers.get('sec-fetch-mode') === 'navigate' ||
    Boolean(req.headers.get('accept')?.includes('text/html'));

  // 1. Direct browser access to /api/users or any unauthorized access to /api/users
  if (pathname === '/api/users' || pathname.startsWith('/api/users/')) {
    // If a user navigates to /api/users in their browser address bar, ALWAYS show the 404 page
    if (isBrowserDoc) {
      return NextResponse.rewrite(new URL('/not-found', req.url), { status: 404 });
    }

    // For programmatic API calls (fetch/XHR), require an authenticated admin
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const authHeader = req.headers.get('authorization');
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return NextResponse.rewrite(new URL('/not-found', req.url), { status: 404 });
    }

    try {
      const verified = await jwtVerify(token, SECRET_KEY);
      const authUser: any = verified.payload;
      if (!authUser || authUser.role !== 'admin') {
        return NextResponse.rewrite(new URL('/not-found', req.url), { status: 404 });
      }
    } catch {
      return NextResponse.rewrite(new URL('/not-found', req.url), { status: 404 });
    }
  }

  // 2. Browser document navigations to internal admin/sales/debug/seed API routes
  if (isBrowserDoc && (pathname.startsWith('/api/admin') || pathname.startsWith('/api/sales') || pathname === '/api/test-db' || pathname === '/api/seed')) {
    return NextResponse.rewrite(new URL('/not-found', req.url), { status: 404 });
  }

  // 3. Redirect /login and /admin/login to single unified login modal on homepage
  if (pathname === '/admin/login' || pathname === '/login') {
    const from = req.nextUrl.searchParams.get('from') || '';
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('auth', 'login');
    if (from) {
      redirectUrl.searchParams.set('from', from);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // 4. Protect admin dashboard routes
  if (pathname.startsWith('/admin')) {
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    const buildHomeAuthRedirect = () => {
      const redirectUrl = new URL('/', req.url);
      redirectUrl.searchParams.set('auth', 'login');
      redirectUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(redirectUrl);
    };

    if (!cookieToken) {
      return buildHomeAuthRedirect();
    }

    try {
      const verified = await jwtVerify(cookieToken, SECRET_KEY);
      const authUser: any = verified.payload;
      if (!authUser || authUser.role !== 'admin') {
        return buildHomeAuthRedirect();
      }
    } catch {
      return buildHomeAuthRedirect();
    }
  }

  // 5. Protect sales executive portal routes (/sales)
  if (pathname.startsWith('/sales')) {
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    // Non-authenticated visitors redirect directly to standard normal login page
    if (!cookieToken) {
      const redirectUrl = new URL('/', req.url);
      redirectUrl.searchParams.set('auth', 'login');
      return NextResponse.redirect(redirectUrl);
    }

    try {
      const verified = await jwtVerify(cookieToken, SECRET_KEY);
      const authUser: any = verified.payload;
      const role = (authUser?.role || '').toLowerCase().trim();
      const isSales = role === 'sales_executive' || role === 'sales executive';
      const isAdmin = role === 'admin';

      if (!authUser) {
        const redirectUrl = new URL('/', req.url);
        redirectUrl.searchParams.set('auth', 'login');
        return NextResponse.redirect(redirectUrl);
      }

      if (!isSales && !isAdmin) {
        // Authenticated non-sales users (tenants/owners) redirect to standard dashboard
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    } catch {
      const redirectUrl = new URL('/', req.url);
      redirectUrl.searchParams.set('auth', 'login');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|pdf)$).*)',
  ],
};
