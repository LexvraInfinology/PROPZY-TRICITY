'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Home, ShieldCheck, Smartphone, Instagram, UserCheck, Percent, Heart,
  Building, Building2, Landmark, Hotel, Castle
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export const Footer: React.FC = () => {
  const pathname = usePathname();
  const { user } = useApp();

  const majorCities = [
    { name: 'Mohali', href: '/properties?city=Mohali', icon: Building2 },
    { name: 'Chandigarh', href: '/properties?city=Chandigarh', icon: Landmark },
    { name: 'Zirakpur', href: '/properties?city=Zirakpur', icon: Building },
    { name: 'Panchkula', href: '/properties?city=Panchkula', icon: Hotel },
    { name: 'Kharar', href: '/properties?city=Kharar', icon: Castle },
  ];

  const role = (user?.role || '').toLowerCase().trim();
  const isSalesExecutive = role === 'sales executive' || role === 'sales_executive' || user?.email?.toLowerCase().trim() === 'pawanpropzy@gmail.com' || user?.email?.toLowerCase().trim() === 'chandnirathore0963@gmail.com';

  // Hide Footer on Admin and Sales portal routes
  if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/sales'))) {
    return null;
  }

  // Remove footer on dashboard for sales executive role
  if (isSalesExecutive && pathname && pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <footer className="bg-[#030604] text-gray-300 pt-12 sm:pt-16 pb-28 lg:pb-20 border-t border-emerald-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* ─────────────────────────────────────────────────────────────
            TOP GRID: LOGO & LINKS
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-8">
          {/* Col 1: Brand & Socials */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
                <Home size={20} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-extrabold tracking-wider uppercase text-white font-sans">
                  PROP<span className="text-emerald-400">ZY</span>
                </span>
                <span className="text-[9px] font-extrabold tracking-widest text-emerald-400 uppercase mt-0.5">
                  TRICITY
                </span>
              </div>
            </Link>

            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              Your trusted platform for verified rental properties. <br /> 0% brokerage. 100% transparency.
            </p>

            {/* Social Icons Row */}
            <div className="flex items-center space-x-2.5 pt-2">
              <a
                href="https://www.instagram.com/propzytricity/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow us on Instagram"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full border border-emerald-900/80 bg-[#07110a] hover:bg-emerald-500 hover:text-black hover:border-emerald-500 flex items-center justify-center text-emerald-400 transition-all shadow-sm"
              >
                <Instagram size={15} />
              </a>
              <a
                href="https://wa.me/919317902609"
                target="_blank"
                rel="noopener noreferrer"
                title="Chat with us on WhatsApp"
                aria-label="WhatsApp"
                className="w-8 h-8 rounded-full border border-emerald-900/80 bg-[#07110a] hover:bg-emerald-500 hover:text-black hover:border-emerald-500 flex items-center justify-center text-emerald-400 transition-all shadow-sm"
              >
                <WhatsAppIcon size={15} />
              </a>
            </div>
          </div>

          {/* Col 2: EXPLORE */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">EXPLORE</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="/properties?category=rent" className="hover:text-emerald-400 transition-colors">Rent</Link></li>
              <li><Link href="/properties?category=buy" className="hover:text-emerald-400 transition-colors">Buy</Link></li>
              <li><Link href="/properties?category=pg" className="hover:text-emerald-400 transition-colors">PG</Link></li>
              <li><Link href="/properties?category=commercial" className="hover:text-emerald-400 transition-colors">Commercial</Link></li>
              <li><Link href="/properties" className="hover:text-emerald-400 transition-colors">All Properties</Link></li>
            </ul>
          </div>

          {/* Col 3: COMPANY */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">COMPANY</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
              <li><Link href="/how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</Link></li>
              <li><Link href="/blog" className="hover:text-emerald-400 transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact Us</Link></li>
              <li><Link href="/plans" className="hover:text-emerald-400 transition-colors">Explore Plans</Link></li>
            </ul>
          </div>

          {/* Col 4: SUPPORT */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">SUPPORT</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><Link href="/help" className="hover:text-emerald-400 transition-colors">Help Center</Link></li>
              <li><Link href="/safety" className="hover:text-emerald-400 transition-colors">Safety & Security</Link></li>
              <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Use</Link></li>
              <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund" className="hover:text-emerald-400 transition-colors">Cancellation & Refund Policy</Link></li>
              <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MIDDLE HIGHLIGHT BAR (Dotted Border)
        ───────────────────────────────────────────────────────────── */}
        <div className="border-y border-dashed border-emerald-900/60 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Highlight 1 */}
          <div className="w-full max-w-72 sm:max-w-none mx-auto flex items-center justify-start sm:justify-center space-x-3.5 px-2 sm:px-0">
            <div className="w-10 h-10 rounded-full bg-[#0a1e14] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Percent size={18} />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-bold text-white">0% Brokerage</div>
              <div className="text-[11px] text-gray-400">Direct zero brokerage platform</div>
            </div>
          </div>

          {/* Highlight 2 */}
          <div className="w-full max-w-72 sm:max-w-none mx-auto flex items-center justify-start sm:justify-center space-x-3.5 px-2 sm:px-0">
            <div className="w-10 h-10 rounded-full bg-[#0a1e14] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-bold text-white">100% Verified</div>
              <div className="text-[11px] text-gray-400">Every property, manually verified</div>
            </div>
          </div>

          {/* Highlight 3 */}
          <div className="w-full max-w-72 sm:max-w-none mx-auto flex items-center justify-start sm:justify-center space-x-3.5 px-2 sm:px-0">
            <div className="w-10 h-10 rounded-full bg-[#0a1e14] border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck size={18} />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-bold text-white">Direct Owner</div>
              <div className="text-[11px] text-gray-400">Connect directly with owners</div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            APP DOWNLOAD & SERVING MAJOR CITIES
        ───────────────────────────────────────────────────────────── */}
        <div className="border-b border-dashed border-emerald-900/60 pb-8 flex justify-center items-center mx-auto">
        

          {/* Serving Major Cities */}
          <div className="lg:col-span-7 space-y-3 mx-auto">
            <div className="text-[11px] font-extrabold uppercase text-emerald-400 tracking-wider text-center leading-none">
              SERVING MAJOR CITIES
            </div>
            <div className="flex flex-wrap justify-start gap-4">
              {majorCities.map((c, idx) => {
                const IconComponent = c.icon;
                return (
                  <Link key={idx} href={c.href} className="flex flex-col items-center space-y-1.5 group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-[#0a1b12] border border-emerald-900/60 group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-all shadow-sm">
                      <IconComponent size={16} strokeWidth={1.75} />
                    </div>
                    <span className="text-[10px] text-gray-400 group-hover:text-white font-medium transition-colors text-center">
                      {c.name}
                    </span>
                  </Link>
                );
              })}

            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM COPYRIGHT ROW 
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-3 pt-3 text-center md:text-left">
          {/* Copyright text */}
          <p className="order-2 md:order-1 text-[11px] sm:text-xs">
            © 2026 PROPZY TRICITY. All rights reserved.
          </p>

          {/* Legal Links & Attribution */}
          <div className="order-1 md:order-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-gray-400">
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Use</Link>
              <span className="text-gray-700">•</span>
              <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              <span className="text-gray-700">•</span>
              <Link href="/refund" className="hover:text-emerald-400 transition-colors">Cancellation & Refund</Link>
            </div>

            <span className="hidden sm:inline text-gray-700">•</span>

            <div className="flex items-center justify-center space-x-1.5 text-gray-400">
              <span>Made with</span>
              <Heart size={12} className="text-emerald-400 fill-emerald-400 inline shrink-0" />
              <span>for finding your home</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
