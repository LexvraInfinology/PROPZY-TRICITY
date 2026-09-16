import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'propzy_token';
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'propzy-secret-jwt-key-2026-super-secure'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check admin routes (except login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!cookieToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    try {
      const verified = await jwtVerify(cookieToken, SECRET_KEY);
      const authUser: any = verified.payload;
      if (!authUser || authUser.role !== 'admin') {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
