'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const sections = [
    {
      id: '1',
      title: '1. Information We Collect',
      content: 'We collect personal information necessary to facilitate property verification and direct owner-tenant communication. This includes your name, email address, mobile phone number, city, and property details. For property owners, we collect electricity bill documents and consumer numbers strictly for ownership verification.',
    },
    {
      id: '2',
      title: '2. How We Use Your Data',
      content: 'Your data is used solely to verify listing authenticity, facilitate direct contact between tenants and owners, provide user account access, and deliver support (such as the PROPZY Relax Plan). We do not sell your personal information to third-party telemarketers.',
    },
    {
      id: '3',
      title: '3. Document Security & Encryption',
      content: 'Electricity Bills and identification documents uploaded during owner verification are stored securely using encrypted cloud infrastructure. Access is restricted exclusively to authorized administrative moderators for verification checks.',
    },
    {
      id: '4',
      title: '4. Communication Privacy',
      content: 'When you request property contact information or schedule a visit, your phone number and message are shared strictly with the verified property owner of that specific listing.',
    },
    {
      id: '5',
      title: '5. Cookies & Local Storage',
      content: 'PROPZY uses local storage and HTTP cookies to maintain your login session state, active wishlist preferences, and personalized search filters.',
    },
    {
      id: '6',
      title: '6. User Rights & Data Deletion',
      content: 'You have full right to update your profile information or request account deletion at any time by contacting propzytricity@gmail.com.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050806] text-gray-100 font-sans antialiased pt-4 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="space-y-2.5 sm:space-y-3">
          <Link href="/" className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline">
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Privacy <span className="text-emerald-400">Policy</span>
          </h1>
          <p className="text-xs text-gray-400">
            Last Updated: February 2026 • Transparency & Data Protection Commitment
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
            For privacy inquiries or data requests, email our Privacy Officer at{' '}
            <a href="mailto:propzytricity@gmail.com" className="text-emerald-400 font-bold hover:underline">
              propzytricity@gmail.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
