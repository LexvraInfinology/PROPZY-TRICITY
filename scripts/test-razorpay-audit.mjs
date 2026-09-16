import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'Infinologylexvra';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '9PKO7Lsttxu5FAE4XhEUtr4k';
const MONGODB_URI = process.env.MONGODB_URI;

// Helper to create valid auth header
function createTestJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Generate Razorpay signature
function generateRazorpaySignature(orderId, paymentId) {
  return crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PROPZY RAZORPAY AUDIT & FIX VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  console.log(`🔗 Target Base URL: ${BASE_URL}`);

  // Connect to MongoDB to find or create a test user
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    readPreference: 'primaryPreferred'
  });
  console.log('✅ Connected to MongoDB Atlas for state assertions\n');

  const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    role: String,
    credits: Number,
    activePlan: String,
    planExpiresAt: Date,
    billingHistory: Array
  });
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const testEmail = `audit_test_${Date.now()}@propzy.com`;
  const testUser = await User.create({
    name: 'Audit Test User',
    email: testEmail,
    phone: '9876543210',
    role: 'tenant',
    credits: 0,
    activePlan: 'Free',
    billingHistory: []
  });

  console.log(`👤 Created Test User: ${testEmail} (Initial Credits: 0)\n`);

  const validToken = createTestJwt({
    id: testUser._id.toString(),
    email: testUser.email,
    name: testUser.name,
    role: testUser.role
  });

  let passedTests = 0;
  let totalTests = 7;

  try {
    // -------------------------------------------------------------
    // TEST 1: Unauthenticated Request -> Should Return 401
    // -------------------------------------------------------------
    console.log('▶️ TEST 1: Unauthenticated Request to /api/razorpay/create-order');
    const unauthRes = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName: 'Standard Plan' })
    });
    console.log(`   Status: ${unauthRes.status}`);
    const unauthData = await unauthRes.json();
    if (unauthRes.status === 401 && unauthData.success === false) {
      console.log('   ✅ PASS: Unauthenticated request rejected with 401\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Did not reject unauthenticated request\n');
    }

    // -------------------------------------------------------------
    // TEST 2: Invalid Plan / Tampered Plan -> Should Return 400
    // -------------------------------------------------------------
    console.log('▶️ TEST 2: Invalid Plan Request to /api/razorpay/create-order');
    const invalidPlanRes = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({ planName: 'Malicious Hack Plan (₹1)', amount: 1 })
    });
    console.log(`   Status: ${invalidPlanRes.status}`);
    const invalidPlanData = await invalidPlanRes.json();
    if (invalidPlanRes.status === 400 && invalidPlanData.success === false) {
      console.log('   ✅ PASS: Tampered/Invalid plan rejected with 400\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Accepted invalid plan\n');
    }

    // -------------------------------------------------------------
    // TEST 3: Invalid Signature Verification -> Should Return 400
    // -------------------------------------------------------------
    console.log('▶️ TEST 3: Invalid Signature Verification to /api/razorpay/verify-payment');
    const invalidSigRes = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        razorpay_order_id: 'order_fake_123',
        razorpay_payment_id: 'pay_fake_123',
        razorpay_signature: 'fake_malicious_signature_99999',
        planName: 'Standard Plan'
      })
    });
    console.log(`   Status: ${invalidSigRes.status}`);
    const invalidSigData = await invalidSigRes.json();
    if (invalidSigRes.status === 400 && invalidSigData.success === false) {
      console.log('   ✅ PASS: Invalid signature properly rejected with 400\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Invalid signature was not rejected\n');
    }

    // -------------------------------------------------------------
    // TEST 4: Standard Plan Payment (₹399 -> 20 Credits)
    // -------------------------------------------------------------
    console.log('▶️ TEST 4: Standard Plan Payment Processing');
    const stdOrderId = `order_std_${Date.now()}`;
    const stdPaymentId = `pay_std_${Date.now()}`;
    const stdSig = generateRazorpaySignature(stdOrderId, stdPaymentId);

    const stdVerifyRes = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        razorpay_order_id: stdOrderId,
        razorpay_payment_id: stdPaymentId,
        razorpay_signature: stdSig,
        planName: 'Standard Plan (20 Credits)'
      })
    });
    const stdVerifyData = await stdVerifyRes.json();
    console.log(`   Verify Response: Status ${stdVerifyRes.status}, Success: ${stdVerifyData.success}`);

    const userAfterStd = await User.findById(testUser._id);
    console.log(`   User Credits: ${userAfterStd.credits} (Expected: 20)`);
    console.log(`   User Plan: ${userAfterStd.activePlan} (Expected: Standard Plan)`);
    console.log(`   Invoices count: ${userAfterStd.billingHistory?.length}`);

    if (
      stdVerifyRes.status === 200 &&
      stdVerifyData.success === true &&
      userAfterStd.credits === 20 &&
      userAfterStd.activePlan === 'Standard Plan' &&
      userAfterStd.billingHistory?.length === 1 &&
      userAfterStd.billingHistory[0].amount === 399
    ) {
      console.log('   ✅ PASS: Standard Plan correctly credited 20 credits & generated ₹399 invoice\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Standard Plan payment verification state mismatch\n');
    }

    // -------------------------------------------------------------
    // TEST 5: Duplicate Payment Verification (Idempotency)
    // -------------------------------------------------------------
    console.log('▶️ TEST 5: Duplicate Payment Verification Idempotency');
    const dupVerifyRes = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        razorpay_order_id: stdOrderId,
        razorpay_payment_id: stdPaymentId,
        razorpay_signature: stdSig,
        planName: 'Standard Plan'
      })
    });
    const dupVerifyData = await dupVerifyRes.json();
    const userAfterDup = await User.findById(testUser._id);

    console.log(`   Duplicate Response Status: ${dupVerifyRes.status}`);
    console.log(`   User Credits after duplicate request: ${userAfterDup.credits} (Expected still 20, not 40!)`);
    console.log(`   Invoices count: ${userAfterDup.billingHistory?.length} (Expected still 1)`);

    if (
      dupVerifyRes.status === 200 &&
      dupVerifyData.success === true &&
      userAfterDup.credits === 20 &&
      userAfterDup.billingHistory?.length === 1
    ) {
      console.log('   ✅ PASS: Duplicate payment request was idempotent (no extra credits or duplicate invoices)\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Idempotency failed - duplicate credits added!\n');
    }

    // -------------------------------------------------------------
    // TEST 6: Duplicate Webhook Event (Idempotency)
    // -------------------------------------------------------------
    console.log('▶️ TEST 6: Duplicate Webhook Event Processing (/api/rayzorpay-webhook)');
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: stdPaymentId,
            order_id: stdOrderId,
            amount: 39900,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
            email: testEmail,
            notes: {
              userId: testUser._id.toString(),
              userEmail: testEmail,
              planName: 'Standard Plan',
              credits: '20'
            }
          }
        }
      }
    };

    const webhookRes = await fetch(`${BASE_URL}/api/rayzorpay-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    const webhookData = await webhookRes.json();
    const userAfterWebhook = await User.findById(testUser._id);

    console.log(`   Webhook Response Status: ${webhookRes.status}`);
    console.log(`   User Credits after Webhook: ${userAfterWebhook.credits} (Expected still 20)`);

    if (webhookRes.status === 200 && userAfterWebhook.credits === 20) {
      console.log('   ✅ PASS: Webhook processed idempotently without adding duplicate credits\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Webhook resulted in duplicate credit allocation\n');
    }

    // -------------------------------------------------------------
    // TEST 7: Premium Plan Payment (₹999 -> 100 Credits)
    // -------------------------------------------------------------
    console.log('▶️ TEST 7: Premium Plan Payment Processing (₹999 -> 100 Credits)');
    const premOrderId = `order_prem_${Date.now()}`;
    const premPaymentId = `pay_prem_${Date.now()}`;
    const premSig = generateRazorpaySignature(premOrderId, premPaymentId);

    const premVerifyRes = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        razorpay_order_id: premOrderId,
        razorpay_payment_id: premPaymentId,
        razorpay_signature: premSig,
        planName: 'Premium Plan (100 Credits)'
      })
    });
    const premVerifyData = await premVerifyRes.json();
    const userAfterPrem = await User.findById(testUser._id);

    console.log(`   Verify Response: Status ${premVerifyRes.status}, Success: ${premVerifyData.success}`);
    console.log(`   User Credits: ${userAfterPrem.credits} (Expected: 120 = 20 standard + 100 premium)`);
    console.log(`   User Plan: ${userAfterPrem.activePlan} (Expected: Premium Plan)`);
    console.log(`   Invoices count: ${userAfterPrem.billingHistory?.length} (Expected: 2)`);

    if (
      premVerifyRes.status === 200 &&
      premVerifyData.success === true &&
      userAfterPrem.credits === 120 &&
      userAfterPrem.activePlan === 'Premium Plan' &&
      userAfterPrem.billingHistory?.length === 2 &&
      userAfterPrem.billingHistory[0].amount === 999
    ) {
      console.log('   ✅ PASS: Premium Plan correctly credited 100 credits & generated ₹999 invoice\n');
      passedTests++;
    } else {
      console.log('   ❌ FAIL: Premium Plan payment verification failed\n');
    }

  } finally {
    // Cleanup test user and payment records
    console.log('🧹 Cleaning up test user and payment records...');
    await User.findByIdAndDelete(testUser._id);
    const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}));
    await Payment.deleteMany({ userEmail: testEmail });
    await mongoose.disconnect();
    console.log('✅ Cleanup completed.');
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('💥 Test Runner Error:', err);
  process.exit(1);
});
