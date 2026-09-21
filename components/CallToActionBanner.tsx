'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';

interface CallToActionBannerProps {
  subTag?: string;
  titleMain?: string;
  titleItalic?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  className?: string;
}

export const CallToActionBanner: React.FC<CallToActionBannerProps> = ({
  subTag = 'IS READY TO MOVE',
  titleMain = "Let's find your",
  titleItalic = 'perfect space.',
  description = 'Verified homes. Zero brokerage. Hassle-free renting.',
  buttonText = 'Explore Properties',
  buttonHref = '/properties',
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#06180e] via-[#0b2b1a] to-[#04120b] border border-emerald-800/40 p-6 sm:p-8 md:p-12 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${className}`}
    >
      {/* Background Subtle Glows */}
      <div className="absolute -left-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left Content */}
      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-4 md:gap-5 z-10 max-w-2xl w-full">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#092214] border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <Home size={26} />
        </div>
        <div className="space-y-1.5 w-full">
          <div className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-emerald-400 uppercase font-mono">
            {subTag}
          </div>
          <h2 className="text-[16px] xs:text-[18px] sm:text-4xl font-serif font-bold text-white tracking-tight whitespace-nowrap sm:whitespace-normal">
            <span className="inline">{titleMain}</span>{' '}
            <span className="inline italic font-normal text-emerald-400 drop-shadow-sm">
              {titleItalic}
            </span>
          </h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-1 text-xs sm:text-sm text-gray-300 font-medium max-w-xl mx-auto md:mx-0 pt-0.5">
            {description.includes('.') && description.split('.').filter(Boolean).length > 1 ? (
              description
                .split('.')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((item, index) => (
                  <span key={index} className="whitespace-nowrap">
                    {item}.
                  </span>
                ))
            ) : (
              <span>{description}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Button */}
      <div className="z-10 shrink-0 w-full md:w-auto">
        <Link
          href={buttonHref}
          className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-[1.02] active:scale-95 w-full md:w-auto min-h-12"
        >
          <span>{buttonText}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};
