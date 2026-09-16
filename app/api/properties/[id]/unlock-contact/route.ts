import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import Property from '@/models/Property';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let authUser = await getAuthUser(req);
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {}

    if (!authUser && (bodyData?.email || bodyData?.userId)) {
      await connectToDatabase();
      let fallbackUser: any = null;
      if (bodyData.userId && mongoose.Types.ObjectId.isValid(bodyData.userId)) {
        fallbackUser = await User.findById(bodyData.userId);
      }
      if (!fallbackUser && bodyData.email) {
        fallbackUser = await User.findOne({ email: bodyData.email.toLowerCase().trim() });
      }
      if (fallbackUser) {
        authUser = {
          id: fallbackUser._id.toString(),
          name: fallbackUser.name,
          email: fallbackUser.email,
          role: fallbackUser.role
        };
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Please login to unlock owner contact details.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Property ID is required.' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Find Property
    const normalizedPz = id.startsWith('prop-') ? `PZ-${id.replace('prop-', '')}` : id.startsWith('LR-') ? `PZ-${id.replace('LR-', '')}` : id;
    const normalizedLr = id.startsWith('prop-') ? `LR-${id.replace('prop-', '')}` : id.startsWith('PZ-') ? `LR-${id.replace('PZ-', '')}` : id;

    let property = await Property.findOne({
      $or: [{ pid: id }, { pid: normalizedPz }, { pid: normalizedLr }, { id: id }]
    });

    if (!property && id.match(/^[0-9a-fA-F]{24}$/)) {
      property = await Property.findById(id).catch(() => null);
    }

    if (!property) {
      return NextResponse.json({ success: false, message: 'Property listing not found.' }, { status: 404 });
    }

    const ownerPhone = property.ownerPhone || '';
    const ownerName = property.ownerName || 'Verified Owner';
    const propKey = property.pid || property.id || id;

    // 2. If Admin or the listing Owner themselves -> free access
    if (authUser.role === 'admin' || (property.ownerEmail && property.ownerEmail.toLowerCase() === authUser.email?.toLowerCase())) {
      return NextResponse.json({
        success: true,
        ownerPhone,
        ownerName,
        alreadyUnlocked: true,
        remainingCredits: 999
      });
    }

    // 3. Find User Record
    let dbUser: any = null;
    if (authUser.id && mongoose.Types.ObjectId.isValid(authUser.id)) {
      dbUser = await User.findById(authUser.id);
    }
    if (!dbUser && authUser.email) {
      dbUser = await User.findOne({ email: authUser.email.toLowerCase().trim() });
    }

    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
    }

    if (!Array.isArray(dbUser.unlockedProperties)) {
      dbUser.unlockedProperties = [];
    }

    // 4. Check if already unlocked previously (no double charge)
    const isAlreadyUnlocked = dbUser.unlockedProperties.some((pid: string) => 
      pid === id || pid === property.pid || pid === property.id || pid === normalizedPz || pid === normalizedLr
    );

    if (isAlreadyUnlocked) {
      return NextResponse.json({
        success: true,
        ownerPhone,
        ownerName,
        alreadyUnlocked: true,
        remainingCredits: dbUser.credits || 0,
        unlockedProperties: dbUser.unlockedProperties
      });
    }

    // 5. Check if user has available credits
    const currentCredits = typeof dbUser.credits === 'number' ? dbUser.credits : 0;
    if (currentCredits <= 0) {
      return NextResponse.json({
        success: false,
        needRecharge: true,
        message: 'You do not have enough contact credits. Please purchase a plan to unlock verified owner contacts.',
        remainingCredits: 0
      }, { status: 403 });
    }

    // 6. Deduct 1 Credit & Save Unlocked Property
    dbUser.credits = Math.max(0, currentCredits - 1);
    dbUser.unlockedProperties.push(propKey);
    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: `🎉 Contact unlocked successfully! 1 credit used. Remaining credits: ${dbUser.credits}`,
      ownerPhone,
      ownerName,
      alreadyUnlocked: false,
      remainingCredits: dbUser.credits,
      unlockedProperties: dbUser.unlockedProperties
    });
  } catch (error: any) {
    console.error('[Unlock Contact Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to unlock contact details.' },
      { status: 500 }
    );
  }
}
