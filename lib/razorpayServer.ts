import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';

export interface SubscriptionPlan {
  id: 'standard' | 'premium';
  name: string;
  amount: number; // in INR (Rupees)
  credits: number;
  validityDays: number;
  description: string;
}

export const SUBSCRIPTION_PLANS: Record<'standard' | 'premium', SubscriptionPlan> = {
  standard: {
    id: 'standard',
    name: 'Standard Plan',
    amount: 399,
    credits: 20,
    validityDays: 30,
    description: '20 Contact Credits • 30 Days Validity • Zero Brokerage'
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    amount: 999,
    credits: 100,
    validityDays: 90,
    description: '100 Contact Credits • 90 Days Validity • Zero Brokerage • Priority Support'
  }
};

/**
 * Server-side resolver for subscription plans.
 * Guarantees that prices and credits are strictly derived server-side.
 */
export function getPlanDetails(planKeyOrName?: string | null): SubscriptionPlan | null {
  if (!planKeyOrName) return null;
  const normalized = String(planKeyOrName).toLowerCase().trim();

  if (
    normalized === 'premium' ||
    normalized.includes('premium') ||
    normalized.includes('999') ||
    normalized.includes('100 credits')
  ) {
    return SUBSCRIPTION_PLANS.premium;
  }

  if (
    normalized === 'standard' ||
    normalized.includes('standard') ||
    normalized.includes('399') ||
    normalized.includes('20 credits')
  ) {
    return SUBSCRIPTION_PLANS.standard;
  }

  return null;
}

/**
 * Strict server-side plan resolver. Defaults to standard if unable to match.
 */
export function resolveStrictPlan(planKeyOrName?: string | null, fallbackAmount?: number): SubscriptionPlan {
  const matched = getPlanDetails(planKeyOrName);
  if (matched) return matched;

  if (fallbackAmount && Number(fallbackAmount) >= 900) {
    return SUBSCRIPTION_PLANS.premium;
  }
  return SUBSCRIPTION_PLANS.standard;
}

export function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing. Please configure them in your environment settings.'
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

/**
 * Verifies Razorpay checkout HMAC-SHA256 signature using constant-time comparison.
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;

  try {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[Razorpay Signature Error]:', err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook HMAC-SHA256 signature.
 */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Handle case where webhook secret is missing or misconfigured as a URL
  if (!secret || secret.startsWith('http://') || secret.startsWith('https://')) {
    console.error(
      '[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured or is set to a URL rather than a secret token. Webhook verification rejected for security.'
    );
    return false;
  }

  if (!signature || !rawBody) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[Razorpay Webhook Signature Error]:', err);
    return false;
  }
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${Date.now().toString().slice(-4)}${randomSuffix}`;
}

export interface ProcessPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
  planName?: string;
  amountInPaiseOrRupees?: number;
  paymentMethod?: string;
  processedVia: 'verify-api' | 'webhook';
  rawWebhookPayload?: any;
}

export interface ProcessPaymentResult {
  success: boolean;
  message: string;
  alreadyProcessed: boolean;
  user?: any;
  invoice?: any;
}

/**
 * Map user document to standard client response payload
 */
export function mapUserResponse(dbUser: any) {
  if (!dbUser) return null;
  return {
    id: dbUser._id ? dbUser._id.toString() : dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone || '',
    role: dbUser.role || 'tenant',
    city: dbUser.city || 'Mohali',
    wishlist: dbUser.wishlist || [],
    unlockedProperties: dbUser.unlockedProperties || [],
    ownerVerified: dbUser.ownerVerified || false,
    verificationStatus: dbUser.verificationStatus || 'none',
    electricityBillUrl: dbUser.electricityBillUrl || '',
    consumerNumber: dbUser.consumerNumber || '',
    credits: typeof dbUser.credits === 'number' ? dbUser.credits : 0,
    activePlan: dbUser.activePlan || 'Free',
    planExpiresAt: dbUser.planExpiresAt ? new Date(dbUser.planExpiresAt).toISOString() : undefined,
    billingHistory: dbUser.billingHistory || []
  };
}

/**
 * Unified, idempotent payment processing logic used by BOTH verify-payment API and Webhook.
 * Prevents double-crediting via MongoDB unique indexes on Payment.paymentId and atomic updates.
 */
export async function processSubscriptionPayment({
  orderId,
  paymentId,
  signature = '',
  userId = '',
  userEmail = '',
  userPhone = '',
  planName = '',
  amountInPaiseOrRupees = 0,
  paymentMethod = 'Razorpay Online',
  processedVia,
  rawWebhookPayload
}: ProcessPaymentParams): Promise<ProcessPaymentResult> {
  if (!orderId || !paymentId) {
    return {
      success: false,
      message: 'Order ID and Payment ID are required.',
      alreadyProcessed: false
    };
  }

  await connectToDatabase();

  // 1. Check if Payment record already exists in database (Idempotency Check #1)
  const existingPayment: any = await Payment.findOne({ paymentId }).lean();
  if (existingPayment) {
    console.log(`[Payment Service] Payment ${paymentId} already processed previously via ${existingPayment.processedVia}. Returning existing record.`);

    let dbUser: any = null;
    if (existingPayment.userId) {
      dbUser = await User.findById(existingPayment.userId).lean();
    }
    if (!dbUser && existingPayment.userEmail) {
      dbUser = await User.findOne({ email: String(existingPayment.userEmail).toLowerCase().trim() }).lean();
    }

    const existingInvoice = dbUser?.billingHistory?.find(
      (inv: any) => inv.paymentId === paymentId || inv.orderId === orderId || inv.invoiceNo === existingPayment.invoiceNo
    );

    return {
      success: true,
      message: 'Payment already processed successfully.',
      alreadyProcessed: true,
      user: mapUserResponse(dbUser),
      invoice: existingInvoice || {
        invoiceNo: existingPayment.invoiceNo,
        planName: existingPayment.planName,
        amount: existingPayment.amount,
        status: 'Paid',
        paymentMethod: existingPayment.paymentMethod,
        orderId: existingPayment.orderId,
        paymentId: existingPayment.paymentId,
        credits: existingPayment.credits
      }
    };
  }

  // 2. Find target User
  let dbUser: any = null;
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const cleanPhone = (userPhone || '').replace(/\D/g, '').slice(-10);

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    dbUser = await User.findById(userId);
  }
  if (!dbUser && cleanEmail) {
    dbUser = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
  }
  if (!dbUser && cleanPhone) {
    dbUser = await User.findOne({
      phone: { $regex: new RegExp(`${cleanPhone}$`) }
    });
  }

  if (!dbUser) {
    console.warn(`[Payment Service] User not found for Order: ${orderId}, Email: ${userEmail}, UserId: ${userId}`);
    return {
      success: false,
      message: 'Target user account could not be found.',
      alreadyProcessed: false
    };
  }

  // 3. Check if billingHistory already contains this orderId or paymentId (Idempotency Check #2)
  const alreadyInBillingHistory = Array.isArray(dbUser.billingHistory) && dbUser.billingHistory.some(
    (inv: any) => (orderId && inv.orderId === orderId) || (paymentId && inv.paymentId === paymentId)
  );

  if (alreadyInBillingHistory) {
    console.log(`[Payment Service] Order ${orderId} already present in User billing history. Acknowledged idempotently.`);
    const existingInvoice = dbUser.billingHistory.find(
      (inv: any) => (orderId && inv.orderId === orderId) || (paymentId && inv.paymentId === paymentId)
    );

    // Ensure Payment collection record exists
    try {
      await Payment.create({
        orderId,
        paymentId,
        signature,
        userId: dbUser._id,
        userEmail: dbUser.email,
        userPhone: dbUser.phone || '',
        planId: 'standard',
        planName: existingInvoice?.planName || 'Standard Plan',
        amount: existingInvoice?.amount || 399,
        credits: existingInvoice?.credits || 20,
        validityDays: 30,
        status: 'captured',
        paymentMethod,
        invoiceNo: existingInvoice?.invoiceNo || generateInvoiceNumber(),
        processedVia,
        rawWebhookPayload
      });
    } catch { }

    return {
      success: true,
      message: 'Payment already processed successfully.',
      alreadyProcessed: true,
      user: mapUserResponse(dbUser),
      invoice: existingInvoice
    };
  }

  // 4. Resolve Server-Side Plan Parameters (Strict server enforcement)
  const normalizedAmount = amountInPaiseOrRupees > 10000
    ? Math.round(amountInPaiseOrRupees / 100)
    : Number(amountInPaiseOrRupees) || 0;

  const plan = resolveStrictPlan(planName, normalizedAmount);
  const creditsToAdd = plan.credits;
  const validityDays = plan.validityDays;
  const finalAmount = plan.amount;
  const planTitle = plan.name;
  const invoiceNumber = generateInvoiceNumber();

  // 5. Calculate Plan Expiration Date
  const now = new Date();
  const currentExpiry = dbUser.planExpiresAt && new Date(dbUser.planExpiresAt) > now
    ? new Date(dbUser.planExpiresAt)
    : now;
  const newExpiry = new Date(currentExpiry.getTime() + validityDays * 24 * 60 * 60 * 1000);

  // 6. Build Invoice Record
  const newInvoice = {
    id: `bill_${Date.now()}`,
    invoiceNo: invoiceNumber,
    planName: planTitle,
    amount: finalAmount,
    date: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    status: 'Paid' as const,
    paymentMethod,
    orderId,
    paymentId,
    credits: creditsToAdd
  };

  // 7. Atomic Insert into Payment Collection (Protected by unique paymentId index)
  try {
    await Payment.create({
      orderId,
      paymentId,
      signature,
      userId: dbUser._id,
      userEmail: dbUser.email,
      userPhone: dbUser.phone || '',
      planId: plan.id,
      planName: planTitle,
      amount: finalAmount,
      currency: 'INR',
      credits: creditsToAdd,
      validityDays,
      status: 'captured',
      paymentMethod,
      invoiceNo: invoiceNumber,
      processedVia,
      rawWebhookPayload
    });
  } catch (err: any) {
    // Duplicate Key Error (E11000) -> Parallel execution already created this payment record!
    if (err.code === 11000 || String(err.message).includes('E11000')) {
      console.log(`[Payment Service] Race condition prevented by unique paymentId index for ${paymentId}. Fetching current state.`);
      const refreshedUser: any = await User.findById(dbUser._id).lean();
      const existingInvoice = refreshedUser?.billingHistory?.find(
        (inv: any) => inv.paymentId === paymentId || inv.orderId === orderId
      );
      return {
        success: true,
        message: 'Payment already processed successfully.',
        alreadyProcessed: true,
        user: mapUserResponse(refreshedUser),
        invoice: existingInvoice
      };
    }
    throw err;
  }

  // 8. Atomic Update of User Document (Credits, Subscription, Expiry, Billing History)
  const updatedUser = await User.findByIdAndUpdate(
    dbUser._id,
    {
      $inc: { credits: creditsToAdd },
      $set: {
        activePlan: planTitle,
        planExpiresAt: newExpiry
      },
      $push: {
        billingHistory: {
          $each: [newInvoice],
          $position: 0
        }
      }
    },
    { new: true }
  );

  console.log(
    `[Payment Service] Successfully allocated ${creditsToAdd} credits to ${dbUser.email} (Plan: ${planTitle}). Total credits: ${updatedUser?.credits}`
  );

  return {
    success: true,
    message: `🎉 Payment successful! You have subscribed to ${planTitle}. ${creditsToAdd} credits added.`,
    alreadyProcessed: false,
    user: mapUserResponse(updatedUser),
    invoice: newInvoice
  };
}
