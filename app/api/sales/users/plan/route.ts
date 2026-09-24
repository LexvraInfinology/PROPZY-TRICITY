import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
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
    const { targetUserId, plan } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Target user ID is required.' },
        { status: 400 }
      );
    }

    if (!plan || typeof plan !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Plan name is required (Free, Standard, or Premium).' },
        { status: 400 }
      );
    }

    const rawPlan = plan.toLowerCase().trim();
    let normalizedPlan: 'Free' | 'Standard Plan' | 'Premium Plan';
    let planExpiresAt: Date | null = null;
    let planCredits = 0;

    if (rawPlan === 'free') {
      normalizedPlan = 'Free';
      planExpiresAt = null;
      planCredits = 0;
    } else if (rawPlan.includes('standard')) {
      normalizedPlan = 'Standard Plan';
      planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      planCredits = 20;
    } else if (rawPlan.includes('premium')) {
      normalizedPlan = 'Premium Plan';
      planExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      planCredits = 100;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid plan selected. Choose Free, Standard, or Premium.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User account was not found.' },
        { status: 404 }
      );
    }

    const setFields: Record<string, any> = {
      activePlan: normalizedPlan,
      planExpiresAt,
      credits: planCredits
    };

    const updateOperations: any = {
      $set: setFields
    };

    // If upgraded to a paid plan by sales, append an administrative billing record
    if (normalizedPlan !== 'Free') {
      const salesInvoice = {
        invoiceNo: `INV-SLS-${Date.now().toString().slice(-6)}`,
        planName: normalizedPlan,
        amount: normalizedPlan === 'Premium Plan' ? 999 : 399,
        date: new Date().toISOString().split('T')[0],
        status: 'Paid',
        paymentMethod: `Sales Provision (${authUser.name || 'Sales Staff'})`,
        orderId: `sales_assign_${Date.now()}`,
        credits: planCredits
      };

      updateOperations.$push = {
        billingHistory: {
          $each: [salesInvoice],
          $position: 0
        }
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      updateOperations,
      { new: true }
    ).select('_id name email role city activePlan credits planExpiresAt');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Failed to update user plan.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plan successfully updated to ${normalizedPlan} for ${updatedUser.name}.`,
      data: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        activePlan: updatedUser.activePlan,
        credits: updatedUser.credits,
        planExpiresAt: updatedUser.planExpiresAt
      }
    });
  } catch (err: any) {
    console.error('[API Sales User Plan] Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update user plan.' },
      { status: 500 }
    );
  }
}
