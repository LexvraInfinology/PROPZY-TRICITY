import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import CreditAuditLog from '@/models/CreditAuditLog';
import { getAuthUser } from '@/lib/auth';
import { isSalesOrAdmin, isBrowserDocumentNavigation } from '@/lib/accessControl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (isBrowserDocumentNavigation(req)) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }

  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isSalesOrAdmin(authUser)) {
      return NextResponse.json(
        { success: false, message: 'Access restricted to authorized sales and admin personnel.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId, delta, reason } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Target user ID is required.' },
        { status: 400 }
      );
    }

    // Strictly enforce single-step micro-adjustments only (+1 or -1)
    const numericDelta = Number(delta);
    if (numericDelta !== 1 && numericDelta !== -1) {
      return NextResponse.json(
        { success: false, message: 'Credit adjustments are strictly constrained to single-step (+1 or -1) actions.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Target tenant account was not found.' },
        { status: 404 }
      );
    }

    const currentBalance = typeof targetUser.credits === 'number' ? targetUser.credits : 0;

    // Prevent balance from going below zero
    if (numericDelta === -1 && currentBalance <= 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot decrement credits below zero.' },
        { status: 400 }
      );
    }

    // Atomic update with concurrency guard condition
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: targetUserId,
        ...(numericDelta === -1 ? { credits: { $gt: 0 } } : {})
      },
      { $inc: { credits: numericDelta } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Credit adjustment could not be applied. Balance may have already reached zero.' },
        { status: 400 }
      );
    }

    const newBalance = typeof updatedUser.credits === 'number' ? updatedUser.credits : 0;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

    // Append-only immutable audit entry
    const auditRecord = await CreditAuditLog.create({
      targetUserId: updatedUser._id,
      targetUserEmail: updatedUser.email,
      targetUserName: updatedUser.name || 'Tenant',
      performedById: authUser.id,
      performedByEmail: authUser.email,
      performedByName: authUser.name || 'Sales Executive',
      performedByRole: authUser.role || 'sales_executive',
      actionType: numericDelta === 1 ? 'increment' : 'decrement',
      deltaAmount: numericDelta,
      previousBalance: currentBalance,
      newBalance,
      reason: (reason && typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Sales Courtesy',
      ipAddress: clientIp,
      userAgent,
      createdAt: new Date()
    });

    const actionText = numericDelta === 1 ? 'Added 1 credit to' : 'Deducted 1 credit from';

    return NextResponse.json({
      success: true,
      message: `${actionText} ${updatedUser.name}. New balance: ${newBalance} credits.`,
      data: {
        userId: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        credits: newBalance,
        auditLogId: auditRecord._id.toString(),
        timestamp: auditRecord.createdAt
      }
    });
  } catch (err: any) {
    console.error('[API Sales Credit Adjust] Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to adjust tenant credits.' },
      { status: 500 }
    );
  }
}
