import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { signJWT, setAuthCookie } from '@/lib/auth';
import { isValidEmail, getPasswordValidationMessage } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role, city } = await req.json();

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ success: false, message: 'Please provide all required registration fields.' }, { status: 400 });
    }

    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      return NextResponse.json({ success: false, message: passwordError }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address (e.g. name@example.com).' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanCity = (city && typeof city === 'string' && city.trim()) ? city.trim() : 'Mohali';
    // Strictly prevent self-registration with admin or other privileged roles
    const selectedRole = role === 'owner' ? 'owner' : 'tenant';

    // Helper to return response with JWT cookie
    const createAuthResponse = async (userPayload: { id: string; name: string; email: string; phone: string; role: 'tenant' | 'owner' | 'admin'; city?: string; wishlist?: string[] }, message: string) => {
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

    // Connect to MongoDB Atlas
    await connectToDatabase();

    // Check if email or phone is already registered
    const existing: any = await User.findOne({
      $or: [
        { email: cleanEmail },
        { phone: cleanPhone }
      ]
    }).lean();

    if (existing) {
      const msg = existing.email === cleanEmail 
        ? 'An account with this email address already exists. Please login instead.'
        : 'An account with this mobile phone number already exists. Please login instead.';
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser;
    try {
      newUser = await User.create({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: hashedPassword,
        role: selectedRole,
        city: cleanCity,
        wishlist: []
      });
    } catch (writeErr: any) {
      if (writeErr?.message?.includes('not primary') || writeErr?.message?.includes('topology was closed')) {
        console.warn('[MongoDB] Primary step-down detected, refreshing replica connection and retrying...');
        await connectToDatabase(true);
        newUser = await User.create({
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password: hashedPassword,
          role: selectedRole,
          city: cleanCity,
          wishlist: []
        });
      } else {
        throw writeErr;
      }
    }

    const createdUserData = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      city: newUser.city || cleanCity,
      wishlist: []
    };

    return createAuthResponse(createdUserData, 'Registration successful! Welcome to Propzy.');
  } catch (error: any) {
    console.error('Registration Error:', error);

    // Duplicate key error handler (MongoDB E11000)
    if (error.code === 11000 || error.message?.includes('E11000')) {
      const isEmail = error.message?.includes('email') || error.keyPattern?.email;
      return NextResponse.json({
        success: false,
        message: isEmail 
          ? 'An account with this email address already exists. Please login instead.'
          : 'An account with this mobile phone number already exists. Please login instead.'
      }, { status: 400 });
    }

    // Mongoose validation error handler
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors || {})[0] as any;
      return NextResponse.json({
        success: false,
        message: firstError?.message || 'Invalid registration details provided.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: error.message || 'Registration failed. Please check your connection and try again.'
    }, { status: 500 });
  }
}
