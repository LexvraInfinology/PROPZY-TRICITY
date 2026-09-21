'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Building, PhoneCall, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-16 bg-[#050806] text-gray-100 font-sans">
      <div className="max-w-2xl w-full space-y-8">
        {/* Glowing 404 Badge */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="relative w-24 h-24 rounded-3xl bg-[#0a2014] border border-emerald-800/80 text-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-950/80">
            <AlertCircle size={48} className="stroke-[2]" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
            <Sparkles size={13} />
            <span>404 - Page Not Found</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Page Not Available
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
            The page or listing you are looking for does not exist, has been removed, or is not accessible.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="max-w-lg mx-auto p-2 rounded-2xl bg-[#07130b] border border-emerald-900/60 shadow-xl">
          <GlobalSearchBar
            mode="public"
            placeholder="Search by PROP-ID (e.g. 101), title, city, or locality..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Home size={16} />
            <span>Back to Homepage</span>
          </Link>

          <Link
            href="/properties"
            className="px-6 py-3 rounded-xl bg-[#0b1610] border border-emerald-900/80 text-emerald-400 hover:bg-emerald-950 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Building size={16} />
            <span>Browse All Properties</span>
          </Link>

          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl bg-[#070f0a] border border-emerald-950 text-gray-300 hover:text-white hover:border-emerald-800 text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer"
          >
            <PhoneCall size={16} />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
