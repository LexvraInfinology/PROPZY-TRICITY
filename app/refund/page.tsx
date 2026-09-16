'use client';

import React from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Clock,
  CreditCard,
  Mail,
  ArrowLeft,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function CancellationAndRefundPage() {
  return (
    <div className="min-h-screen bg-[#050806] text-gray-100 font-sans antialiased pt-6 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Header */}
        <div className="space-y-2.5 sm:space-y-3">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <RotateCcw size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Cancellation & <span className="text-emerald-400">Refund Policy</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Effective Date: 14 September 2026 • Official Policy for Propzy Tricity
              </p>
            </div>
          </div>
        </div>

        {/* Intro Card */}
        <div className="bg-[#0a110d] border border-emerald-950 rounded-2xl p-5 sm:p-6 text-xs text-gray-300 leading-relaxed shadow-lg">
          <p>
            This Cancellation & Refund Policy applies to all paid plans and services purchased through{' '}
            <strong className="text-white">Propzy Tricity</strong>.
            By purchasing any paid plan or service from Propzy Tricity, you acknowledge and agree to the terms stated below.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-[#0a110d] border border-emerald-950 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 space-y-8 shadow-xl">
          
          {/* 1. Digital Services & Paid Plans */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <CreditCard size={18} className="text-emerald-400 shrink-0" />
              <span>1. Digital Services & Paid Plans</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Propzy Tricity offers paid subscription plans providing users with <strong className="text-white">intangible digital services</strong>, specifically Direct Property Owner Contact Credits and priority platform access. All credits and subscription privileges are delivered electronically and activated instantly on the user&apos;s account upon successful payment confirmation.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Standard Plan */}
              <div className="bg-[#060c08] border border-emerald-900/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Standard Plan</h3>
                  <span className="text-emerald-400 font-extrabold text-sm">₹399</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong className="text-gray-200">Direct Owner Contact Credits:</strong> 20 Credits</li>
                  <li>• <strong className="text-gray-200">Validity:</strong> 30 days</li>
                  <li>• <strong className="text-gray-200">Delivery:</strong> Instant digital fulfillment</li>
                  <li>• <strong className="text-gray-200">Zero Brokerage:</strong> Yes (100% direct owner connect)</li>
                </ul>
              </div>

              {/* Premium Plan */}
              <div className="bg-[#060c08] border border-emerald-900/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Premium Plan</h3>
                  <span className="text-emerald-400 font-extrabold text-sm">₹999</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong className="text-gray-200">Direct Owner Contact Credits:</strong> 100 Credits</li>
                  <li>• <strong className="text-gray-200">Validity:</strong> 90 days</li>
                  <li>• <strong className="text-gray-200">Delivery:</strong> Instant digital fulfillment</li>
                  <li>• <strong className="text-gray-200">Priority Support:</strong> Included</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-gray-400 italic pt-1">
              No physical products or goods are shipped. All features, credits, pricing, and validity periods are electronically provisioned immediately upon transaction success.
            </p>
          </section>

          {/* 2. Digital Credit Protection & Replacement Guarantee */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <span>2. Digital Credit Protection & Replacement Policy</span>
            </h2>
            <div className="p-4 rounded-xl bg-[#08150d] border border-emerald-800/80 space-y-2 text-xs text-gray-200">
              <p className="font-bold text-emerald-400 flex items-center space-x-1.5">
                <span> Tenant Credit Protection Guarantee:</span>
              </p>
              <p className="leading-relaxed">
                If an unlocked property owner contact is verified to be <strong>invalid, unreachable / wrong number, or already rented out</strong> at the time of unlocking, the tenant can report the listing to our support team within <strong>48 hours</strong> of unlocking.
              </p>
              <p className="leading-relaxed text-emerald-300 font-medium">
                Upon prompt review and verification, the consumed contact credit will be <strong>fully refunded and credited back to your Propzy account wallet</strong> so you can connect with another verified property without any penalty.
              </p>
            </div>
          </section>

          {/* 3. Cancellation of Plans */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <XCircle size={18} className="text-emerald-400 shrink-0" />
              <span>3. Cancellation of Plans</span>
            </h2>
            <ul className="text-xs text-gray-300 space-y-2 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Once a paid subscription plan has been successfully purchased and activated, the user may request plan cancellation at any time.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Because digital credits are provisioned immediately upon purchase, unused plan validity or unconsumed credits do not automatically create an entitlement for monetary refund unless covered under our Refund Eligibility terms.</span>
              </li>
            </ul>
          </section>

          {/* 4. Monetary Refund Eligibility */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>4. Monetary Refund Eligibility</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Monetary refunds to the original payment source are approved under the following circumstances:
            </p>
            <ul className="text-xs text-gray-300 space-y-1.5 pl-4 list-disc">
              <li><strong className="text-white">Duplicate Transactions:</strong> A payment was deducted more than once for the same transaction due to a network glitch or payment gateway error.</li>
              <li><strong className="text-white">Non-Delivery of Digital Credits:</strong> Payment was successfully debited from the customer&apos;s bank/card, but the subscription plan or credits failed to activate within 2 hours due to an internal system error.</li>
              <li><strong className="text-white">Unauthorized Charges:</strong> Proven unauthorized or fraudulent transactions confirmed through our payment gateway investigation.</li>
              <li>Any other exceptional circumstance where Propzy Tricity management approves a monetary refund after technical review.</li>
            </ul>
          </section>

          {/* 5. Non-Refundable Situations */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
              <span>5. Non-Refundable Situations</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              A monetary refund will not be granted in the following scenarios:
            </p>
            <ul className="text-xs text-gray-300 space-y-1.5 pl-4 list-disc">
              <li>The user has consumed digital contact credits on valid, responsive property listings.</li>
              <li>Change of mind after purchasing a digital plan where services have been delivered.</li>
              <li>Credits expire after the validity period (30 days for Standard, 90 days for Premium) without being used.</li>
              <li>Personal delays in contacting landlords or scheduling viewings.</li>
            </ul>
          </section>

          {/* 6. Refund Request Process */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <HelpCircle size={18} className="text-emerald-400 shrink-0" />
              <span>6. How to Submit a Refund Request</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              To request a refund or credit wallet adjustment, email <a href="mailto:propzytricity@gmail.com" className="text-emerald-400 underline font-semibold">propzytricity@gmail.com</a> or message our helpline with:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300 pt-1">
              <div className="bg-[#070e0a] p-2.5 rounded-lg border border-emerald-950/80">• Registered Full Name</div>
              <div className="bg-[#070e0a] p-2.5 rounded-lg border border-emerald-950/80">• Registered Email & Phone Number</div>
              <div className="bg-[#070e0a] p-2.5 rounded-lg border border-emerald-950/80">• Plan Name (e.g., Standard ₹399 / Premium ₹999)</div>
              <div className="bg-[#070e0a] p-2.5 rounded-lg border border-emerald-950/80">• Razorpay Payment ID / Order ID</div>
              <div className="bg-[#070e0a] p-2.5 rounded-lg border border-emerald-950/80 sm:col-span-2">• Specific reason for the refund or credit replacement</div>
            </div>
          </section>

          {/* 7. Refund Processing Timeline & Razorpay Clause */}
          <section className="space-y-3 border-b border-emerald-950/60 pb-6">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <Clock size={18} className="text-emerald-400 shrink-0" />
              <span>7. Refund Processing Timeline</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Upon receiving a refund claim, our support desk verifies the transaction and usage records within 24–48 hours.
            </p>
            
            {/* Mandatory Razorpay Compliance Clause Box */}
            <div className="p-4 rounded-xl bg-[#08150d] border-2 border-emerald-500/80 text-xs text-emerald-300 font-semibold space-y-1">
              <div className="text-white font-bold text-sm">Mandatory Refund Settlement Clause:</div>
              <p className="text-white text-xs leading-relaxed font-normal">
                &quot;In cases of approved monetary refunds, the amount will be credited back to the original payment source within 5–7 business days.&quot;
              </p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Depending on your issuing bank, card network (Visa / Mastercard / RuPay), or UPI service provider, it may take 5–7 working days for the refunded amount to reflect in your bank statement.
            </p>
          </section>

          {/* 8. Contact Information */}
          <section className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <Mail size={18} className="text-emerald-400 shrink-0" />
              <span>8. Official Compliance & Support Contact</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              For any cancellation, digital credit replacement, or billing inquiries, please reach out to our official compliance desk:
            </p>
            <div className="bg-[#060c08] border border-emerald-900/60 rounded-xl p-4 space-y-2 text-xs text-gray-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400 font-mono text-[10px] block">OPERATING NAME</span>
                  <span className="font-bold text-white">Propzy Tricity</span>
                </div>
                <div>
                  <span className="text-gray-400 font-mono text-[10px] block">SUPPORT EMAIL</span>
                  <a href="mailto:propzytricity@gmail.com" className="font-semibold text-emerald-400 hover:underline">
                    propzytricity@gmail.com
                  </a>
                </div>
                <div>
                  <span className="text-gray-400 font-mono text-[10px] block">DIRECT PHONE</span>
                  <a href="tel:+919317902609" className="font-semibold text-white hover:text-emerald-400">
                    +91 93179 02609
                  </a>
                </div>
                <div>
                  <span className="text-gray-400 font-mono text-[10px] block">SUPPORT HOURS</span>
                  <span className="text-gray-200">Mon–Sat, 9:00 AM – 7:00 PM IST</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-400 font-mono text-[10px] block">PHYSICAL ADDRESS</span>
                  <span className="text-gray-200">
                    4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307, India
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-400 font-mono text-[10px] block">OFFICIAL PORTAL</span>
                  <a href="https://propzytricity.in" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-semibold">
                    https://propzytricity.in
                  </a>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Bottom Contact Help Card */}
        <div className="p-6 bg-[#080d09] border border-emerald-900/60 rounded-2xl text-center space-y-2">
          <p className="text-xs text-gray-300">
            Have questions about your plan or a refund request? Reach out to us via our{' '}
            <Link href="/contact" className="text-emerald-400 font-bold hover:underline">
              Contact Us page
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
