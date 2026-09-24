import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'owner' | 'admin' | 'sales executive' | 'sales_executive' | string;
  [key: string]: any;
}

const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY WARNING] Neither JWT_SECRET nor NEXTAUTH_SECRET is configured. Set this in production!');
}

const SECRET_KEY = new TextEncoder().encode(
  jwtSecret || 'propzy-secret-jwt-key-2026-super-secure'
);

export const AUTH_COOKIE_NAME = 'propzy_token';

const isProductionOrHttps = process.env.NODE_ENV === 'production' || Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'));

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as unknown as JWTPayload;
  } catch (err) {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  // 1. Check HttpOnly Cookie
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) {
    const user = await verifyJWT(cookieToken);
    if (user) return user;
  }

  // 2. Check Authorization Header (Bearer token fallback for API consumers)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const user = await verifyJWT(token);
    if (user) return user;
  }

  return null;
}

export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProductionOrHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProductionOrHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
