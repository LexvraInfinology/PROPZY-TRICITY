import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { signJWT, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Please enter your email/mobile and password.' },
        { status: 400 }
      );
    }

    const cleanInput = identifier.trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_ID || 'admin@propzy.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    // Helper to generate response with JWT cookie
    const createAuthResponse = async (
      userPayload: any,
      message: string
    ) => {
      const token = await signJWT({
        id: userPayload.id,
        name: userPayload.name,
        email: userPayload.email,
        role: userPayload.role
      });

      const response = NextResponse.json({
        success: true,
        message,
        user: userPayload
      });

      return setAuthCookie(response, token);
    };

    // 1. Strict configured Admin credentials check
    let isAdminMatch = false;
    if (cleanInput === adminEmail || cleanInput === 'admin' || (adminEmail.includes('@') && cleanInput === adminEmail.split('@')[0])) {
      if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
        isAdminMatch = await bcrypt.compare(password, adminPassword);
      } else {
        const pBuf = Buffer.from(password);
        const aBuf = Buffer.from(adminPassword);
        if (pBuf.length === aBuf.length && crypto.timingSafeEqual(pBuf, aBuf)) {
          isAdminMatch = true;
        }
      }
    }

    if (isAdminMatch) {
      return createAuthResponse({
        id: 'admin-001',
        name: 'Admin Operations',
        email: adminEmail,
        phone: '+91 99999 00000',
        role: 'admin',
        wishlist: []
      }, 'Admin login successful!');
    }

    // 2. Connect to MongoDB Atlas
    await connectToDatabase();

    // 3. Look up user strictly in MongoDB database
    const foundUser = await User.findOne({
      $or: [
        { email: cleanInput },
        { phone: cleanInput }
      ]
    });

    if (!foundUser) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email or mobile number. Please register first.' },
        { status: 401 }
      );
    }

    // 4. Strictly verify password with bcrypt
    let isMatch = false;
    if (foundUser.password) {
      const stored = String(foundUser.password);
      if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
        isMatch = await bcrypt.compare(password, stored);
      }
    }

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Incorrect password. Please verify and try again.' },
        { status: 401 }
      );
    }

    // Clean up wishlist to only include existing properties
    const rawWishlist: string[] = foundUser.wishlist || [];
    let validWishlist = rawWishlist;
    if (rawWishlist.length > 0) {
      try {
        const Property = (await import('@/models/Property')).default;
        const existingProps = await Property.find({
          $or: [
            { pid: { $in: rawWishlist } },
            { _id: { $in: rawWishlist.filter((id: string) => id.match(/^[0-9a-fA-F]{24}$/)) } }
          ]
        }).select('pid _id').lean();

        const validPids = new Set<string>();
        existingProps.forEach((p: any) => {
          if (p.pid) validPids.add(p.pid);
          if (p._id) validPids.add(p._id.toString());
        });

        validWishlist = rawWishlist.filter((id: string) => validPids.has(id));

        if (validWishlist.length !== rawWishlist.length) {
          await User.updateOne({ _id: foundUser._id }, { $set: { wishlist: validWishlist } });
        }
      } catch (e) {}
    }



    return createAuthResponse({
      id: foundUser._id.toString(),
      name: foundUser.name,
      email: foundUser.email,
      phone: foundUser.phone,
      role: foundUser.role,
      city: foundUser.city || 'Mohali',
      wishlist: validWishlist,
      unlockedProperties: Array.isArray(foundUser.unlockedProperties) ? foundUser.unlockedProperties : [],
      ownerVerified: foundUser.ownerVerified || false,
      verificationStatus: foundUser.verificationStatus || 'none',
      electricityBillUrl: foundUser.electricityBillUrl || '',
      consumerNumber: foundUser.consumerNumber || '',
      credits: typeof foundUser.credits === 'number' ? foundUser.credits : 0,
      activePlan: foundUser.activePlan || 'Free',
      planExpiresAt: foundUser.planExpiresAt ? foundUser.planExpiresAt.toISOString() : undefined,
      billingHistory: Array.isArray(foundUser.billingHistory) ? foundUser.billingHistory : []
    }, `Welcome back, ${foundUser.name}!`);

  } catch (error: any) {
    console.error('Authentication Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Authentication failed. Please check your connection and try again.'
    }, { status: 500 });
  }
}
