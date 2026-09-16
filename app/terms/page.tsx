'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function TermsOfUsePage() {
  const sections = [
    {
      id: '1',
      title: '1. Acceptance of Terms',
      content: 'By accessing or using the PROPZY platform ("Website", "Service", or "Application"), you agree to be bound by these Terms of Use. If you do not agree to all terms and conditions, you must discontinue using our platform immediately.',
    },
    {
      id: '2',
      title: '2. 0% Brokerage & Platform Services',
      content: 'PROPZY operates as a direct peer-to-peer real estate discovery platform connecting verified property owners with prospective tenants. PROPZY does not charge brokerage commissions to tenants. Any third-party broker or agent posing as a PROPZY representative to extract fees is strictly unauthorized and violates our policies.',
    },
    {
      id: '3',
      title: '3. Owner Verification & Listing Authenticity',
      content: 'Property owners submitting listings must upload genuine proof of property ownership (including Electricity Bill with Consumer Number). PROPZY reserves the right to reject or suspend listings that fail verification or provide misleading information.',
    },
    {
      id: '4',
      title: '4. Tenant Responsibilities',
      content: 'Tenants are responsible for inspecting properties, verifying owner identities, and executing legally binding rental agreements directly with owners before paying security deposits or advance rent.',
    },
    {
      id: '5',
      title: '5. Limitation of Liability',
      content: 'While PROPZY moderates listings for authenticity, PROPZY shall not be held liable for disputes, property damages, lease contractual breaches, or monetary transactions occurring directly between tenants and owners outside the platform.',
    },
    {
      id: '6',
      title: '6. Modifications to Terms',
      content: 'PROPZY reserves the right to update these Terms of Use at any time. Continued usage of the platform following updates constitutes acceptance of the modified terms.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050806] text-gray-100 font-sans antialiased pt-6 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="space-y-2.5 sm:space-y-3">
          <Link href="/" className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline">
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Terms of <span className="text-emerald-400">Use</span>
          </h1>
          <p className="text-xs text-gray-400">
            Last Updated: February 2026 • Legal Terms & Conditions for PROPZY Platform Usage
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-[#0a110d] border border-emerald-950 rounded-2xl sm:rounded-3xl p-4.5 sm:p-8 md:p-10 space-y-6 sm:space-y-8 shadow-xl">
          {sections.map((s) => (
            <div key={s.id} className="space-y-2 border-b border-emerald-950/60 pb-5 sm:pb-6 last:border-b-0 last:pb-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center space-x-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{s.title}</span>
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed pl-0 sm:pl-6">
                {s.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Contact */}
        <div className="p-6 bg-[#080d09] border border-emerald-900/60 rounded-2xl text-center space-y-2">
          <p className="text-xs text-gray-300">
            Have questions regarding our legal terms? Reach out to our team at{' '}
            <a href="mailto:propzytricity@gmail.com" className="text-emerald-400 font-bold hover:underline">
              propzytricity@gmail.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
