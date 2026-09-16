import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getRazorpayInstance, getPlanDetails } from '@/lib/razorpayServer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please login to subscribe.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { planName } = body;

    // Strict server-side plan validation - never trust arbitrary prices from client
    const plan = getPlanDetails(planName);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid subscription plan selected. Please choose a valid plan (Standard or Premium).'
        },
        { status: 400 }
      );
    }

    const resolvedAmount = plan.amount;
    const razorpay = getRazorpayInstance();

    // Razorpay requires amount in subunits (paise for INR, so multiplied by 100)
    const amountInSubunits = Math.round(resolvedAmount * 100);
    const receiptId = `rcpt_${Date.now().toString().slice(-6)}_${Math.floor(100 + Math.random() * 900)}`;

    const orderOptions = {
      amount: amountInSubunits,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        userId: authUser.id,
        userEmail: authUser.email || '',
        userName: authUser.name || '',
        planId: plan.id,
        planName: plan.name,
        credits: String(plan.credits),
        validityDays: String(plan.validityDays)
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    const publicRazorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: publicRazorpayKey,
      plan: {
        id: plan.id,
        name: plan.name,
        credits: plan.credits,
        validityDays: plan.validityDays,
        amount: resolvedAmount
      }
    });
  } catch (error: any) {
    console.error('[Razorpay Create Order Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to create payment order. Please check Razorpay credentials and try again.'
      },
      { status: 500 }
    );
  }
}
