import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  verifyRazorpaySignature,
  processSubscriptionPayment
} from '@/lib/razorpayServer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please login.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planName
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Incomplete payment credentials received from gateway.' },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay HMAC-SHA256 Signature
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error('[Razorpay Verify] Invalid signature for order:', razorpay_order_id);
      return NextResponse.json(
        { success: false, message: 'Payment verification failed: Invalid digital signature.' },
        { status: 400 }
      );
    }

    // 2. Delegate to unified, idempotent payment processing service
    const result = await processSubscriptionPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      userId: authUser.id,
      userEmail: authUser.email,
      userPhone: authUser.phone,
      planName: planName,
      processedVia: 'verify-api',
      paymentMethod: 'Razorpay Online (UPI/Card/Netbanking)'
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      user: result.user,
      invoice: result.invoice
    });
  } catch (error: any) {
    console.error('[Razorpay Verify Payment Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to process subscription verification.' },
      { status: 500 }
    );
  }
}
