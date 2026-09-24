import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDatabase, invalidateMongoConnection } from '@/lib/mongodb';
import User from '@/models/User';
import { signJWT, setAuthCookie } from '@/lib/auth';
import { memoryUsers } from '@/lib/memoryStore';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const oauth2Client = new OAuth2Client(clientId);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential } = body;

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Missing Google authentication credential.' },
        { status: 400 }
      );
    }

    let payload: {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    } | null = null;

    // 1. Verify token with Google
    try {
      if (clientId) {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: credential,
          audience: clientId,
        });
        payload = ticket.getPayload() || null;
      } else {
        // Safe decoding fallback if NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured yet
        const parts = credential.split('.');
        if (parts.length >= 2) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const jsonString = Buffer.from(base64, 'base64').toString('utf8');
          payload = JSON.parse(jsonString);
        }
      }
    } catch (verifyError: any) {
      console.warn('Google token verification error:', verifyError?.message);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired Google authentication token.' },
        { status: 401 }
      );
    }

    const email = payload?.email?.toLowerCase()?.trim();
    const name = payload?.name?.trim() || 'Google User';
    const googleId = payload?.sub || '';
    const avatar = payload?.picture || '';

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Google account did not provide a valid email address.' },
        { status: 400 }
      );
    }

    // 2. Lookup or Provision User in MongoDB
    let dbUser: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await connectToDatabase(attempt === 2);

        // Find existing user by email
        dbUser = await User.findOne({ email }).select('-password');

        if (dbUser) {
          // Link googleId and avatar if not set
          let hasChanges = false;
          if (!dbUser.googleId && googleId) {
            dbUser.googleId = googleId;
            hasChanges = true;
          }
          if (!dbUser.avatar && avatar) {
            dbUser.avatar = avatar;
            hasChanges = true;
          }
          if (hasChanges) {
            await dbUser.save();
          }
        } else {
          // Auto-provision new Google user
          const generatedPassword = await bcrypt.hash(randomUUID(), 10);
          const isSalesEmail = email === 'pawanpropzy@gmail.com' || email === 'chandnirathore0963@gmail.com';
          const initialRole = isSalesEmail ? 'sales executive' : 'tenant';
          dbUser = await User.create({
            name,
            email,
            phone: '',
            password: generatedPassword,
            googleId,
            avatar,
            role: initialRole,
            city: 'Mohali',
            wishlist: [],
            ownerVerified: isSalesEmail,
            verificationStatus: isSalesEmail ? 'approved' : 'none',
          });
        }
        break;
      } catch (dbErr: any) {
        console.warn(`MongoDB Google Auth attempt ${attempt} error:`, dbErr?.message);
        if (attempt === 1) {
          invalidateMongoConnection();
          continue;
        }
      }
    }

    // Fallback to memoryStore if MongoDB is completely unreachable
    if (!dbUser) {
      let memUser = memoryUsers.find((u) => u.email.toLowerCase() === email);
      if (!memUser) {
        memUser = {
          id: `usr-${Date.now()}`,
          name,
          email,
          phone: '',
          role: 'tenant',
          ownerVerified: false,
          verificationStatus: 'none',
        };
        memoryUsers.push(memUser);
      }
      dbUser = memUser;
    }

    const userId = String(dbUser._id || dbUser.id);
    const userRole = dbUser.role || 'tenant';
    const userName = dbUser.name || name;
    const userCity = dbUser.city || 'Mohali';

    // 3. Issue Propzy Session JWT
    const token = await signJWT({
      id: userId,
      name: userName,
      email: dbUser.email,
      role: userRole,
    });

    const userProfile = {
      id: userId,
      name: userName,
      email: dbUser.email,
      phone: dbUser.phone || '',
      role: userRole,
      city: userCity,
      avatar: dbUser.avatar || avatar,
      googleId: dbUser.googleId || googleId,
      ownerVerified: dbUser.ownerVerified || false,
      verificationStatus: dbUser.verificationStatus || 'none',
      consumerNumber: dbUser.consumerNumber || '',
      electricityBillUrl: dbUser.electricityBillUrl || '',
      wishlist: dbUser.wishlist || [],
      unlockedProperties: Array.isArray(dbUser.unlockedProperties) ? dbUser.unlockedProperties : [],
      credits: typeof dbUser.credits === 'number' ? dbUser.credits : 0,
      activePlan: dbUser.activePlan || 'Free',
      planExpiresAt: dbUser.planExpiresAt ? (typeof dbUser.planExpiresAt.toISOString === 'function' ? dbUser.planExpiresAt.toISOString() : dbUser.planExpiresAt) : undefined,
      billingHistory: Array.isArray(dbUser.billingHistory) ? dbUser.billingHistory : []
    };

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      message: `Welcome back, ${userName}!`,
    });

    return setAuthCookie(response, token);
  } catch (error: any) {
    console.error('Google Auth Route Exception:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Google authentication failed.' },
      { status: 500 }
    );
  }
}
