'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, ChevronDown, ShieldCheck, CheckCircle2, 
  Search, MessageSquare, ArrowRight 
} from 'lucide-react';

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'tenants' | 'owners' | 'verification'>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      category: 'tenants',
      question: 'Is PROPZY TRICITY really 100% 0% Brokerage?',
      answer: 'Yes! PROPZY TRICITY connects tenants directly with verified property owners without middleman brokers. You schedule visits directly with property owners and pay zero commission fees.',
    },
    {
      category: 'tenants',
      question: 'How do I contact property owners?',
      answer: 'Click "Contact Owner" or "Schedule Visit" on any listing page. Once logged in, you get direct phone or WhatsApp connection with the owner.',
    },
    {
      category: 'tenants',
      question: 'What is the PROPZY TRICITY Relax Plan?',
      answer: 'The Relax Plan assigns a personal Relationship Manager (RM) who handpicks verified listings matching your budget, coordinates visits, and negotiates rent terms for you.',
    },
    {
      category: 'owners',
      question: 'How do property owners list properties on PROPZY TRICITY?',
      answer: 'Click "Post Property" in the top bar. Sign up with an Owner account and submit your property details along with your Electricity Bill for owner verification.',
    },
    {
      category: 'verification',
      question: 'Why is Electricity Bill verification required?',
      answer: 'To eliminate fake broker listings, we require property owners to submit an Electricity Bill with Consumer Number matching the property address. Our admin team verifies ownership before listing goes live.',
    },
    {
      category: 'verification',
      question: 'How long does property moderation take?',
      answer: 'Our admin team reviews submitted listings within 1 to 4 hours. Once verified, your listing goes live automatically on PROPZY TRICITY.',
    },
    {
      category: 'tenants',
      question: 'Can I search properties by PROP-ID?',
      answer: 'Yes! Every property has a unique PROP-ID (e.g., 101). You can type any PROP-ID into the search bar to locate that specific listing instantly.',
    },
  ];

  const filteredFaqs = faqs.filter(f => {
    if (activeTab !== 'all' && f.category !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050806] text-gray-100 font-sans antialiased pt-6 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <HelpCircle size={14} />
            <span>Frequently Asked Questions</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Got Questions? <span className="text-emerald-400">We have Answers.</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg mx-auto">
            Everything you need to know about renting, owner verifications, and 0% brokerage on PROPZY TRICITY.
          </p>

          {/* Search Box */}
          <div className="relative max-w-lg mx-auto pt-1 sm:pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search question or keyword (e.g. 0% brokerage, verification)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-[#0a110d] border border-emerald-950 rounded-2xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-lg"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { key: 'all', label: 'All FAQs' },
            { key: 'tenants', label: 'Tenants & Renting' },
            { key: 'owners', label: 'Property Owners' },
            { key: 'verification', label: 'Verification & Safety' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-[#0a110d] border border-emerald-950 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Accordion Q&A List */}
        <div className="space-y-2.5 sm:space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#0a110d] border border-emerald-950 rounded-2xl overflow-hidden shadow-md transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-4.5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between text-left cursor-pointer hover:bg-[#0d1611] transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-white pr-3 sm:pr-4">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-emerald-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4.5 pb-4 pt-1 sm:px-6 sm:pb-5 text-xs text-gray-300 leading-relaxed border-t border-emerald-950/60 bg-[#080d09]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Banner */}
        <div className="bg-[#0a1c12] border border-emerald-900/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center space-y-2.5 sm:space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-white">Have a specific question not listed here?</h3>
          <p className="text-xs text-gray-400">
            Our support team is available to assist you with any platform query.
          </p>
          <div className="pt-1.5 sm:pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg transition-all"
            >
              <MessageSquare size={14} />
              <span>Contact Support</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
