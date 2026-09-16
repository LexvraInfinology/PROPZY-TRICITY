import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRazorpayWebhookSignature,
  processSubscriptionPayment
} from '@/lib/razorpayServer';

export const runtime = 'nodejs';

// GET: Quick health-check endpoint to verify that the webhook route is live and reachable
export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'online',
    message: 'Razorpay Webhook endpoint is active and listening for events.',
    timestamp: new Date().toISOString()
  });
}

// POST: Main webhook receiver for Razorpay events (payment.captured, order.paid, payment_link.paid, payment.failed)
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // 1. Verify Razorpay cryptographic webhook signature
    const isSignatureValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isSignatureValid) {
      console.error('[Razorpay Webhook] Invalid signature rejected:', signature);
      return NextResponse.json(
        { success: false, message: 'Invalid webhook signature.' },
        { status: 400 }
      );
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const eventType = payload.event;
    console.log(
      `[Razorpay Webhook Event]: ${eventType} (ID: ${payload.payload?.payment?.entity?.id || 'N/A'})`
    );

    // 2. Process Successful Payment / Order Events
    if (
      eventType === 'payment.captured' ||
      eventType === 'order.paid' ||
      eventType === 'payment_link.paid'
    ) {
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_link?.entity || {};
      const orderEntity = payload.payload?.order?.entity || {};
      const notes = paymentEntity.notes || orderEntity.notes || {};

      const paymentId = paymentEntity.id || '';
      const orderId = paymentEntity.order_id || orderEntity.id || '';
      const amountInPaise = paymentEntity.amount || orderEntity.amount || 0;

      const userId = notes.userId || '';
      const userEmail = (notes.userEmail || paymentEntity.email || '').toLowerCase().trim();
      const userPhoneRaw = notes.userPhone || paymentEntity.contact || '';
      const userPhoneClean = userPhoneRaw.replace(/\D/g, '').slice(-10);
      const planName = notes.planName || notes.planId || '';

      if (paymentId) {
        const result = await processSubscriptionPayment({
          orderId: orderId || `ord_webhook_${paymentId}`,
          paymentId: paymentId,
          userId,
          userEmail,
          userPhone: userPhoneClean,
          planName,
          amountInPaiseOrRupees: amountInPaise,
          paymentMethod: `Razorpay Webhook (${paymentEntity.method || 'Online'})`,
          processedVia: 'webhook',
          rawWebhookPayload: payload
        });

        console.log(
          `[Razorpay Webhook] Result for ${paymentId}: ${result.message} (AlreadyProcessed: ${result.alreadyProcessed})`
        );
      }
    } else if (eventType === 'payment.failed') {
      console.warn('[Razorpay Webhook] Payment failed event received:', payload.payload?.payment?.entity?.id);
    }

    // Always respond with 200 OK to inform Razorpay that the event was safely received
    return NextResponse.json({ success: true, received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Razorpay Webhook Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Webhook processing error.' },
      { status: 500 }
    );
  }
}
