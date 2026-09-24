'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CreditCard, Users, Building, Home, ChevronRight, LogOut, XCircle, AlertTriangle, Briefcase
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SalesSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SalesSidebar: React.FC<SalesSidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutUser } = useApp();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const menuItems = [
    { label: 'Subscribed Tenants', href: '/sales', icon: CreditCard, badge: 'Credits' },
    { label: 'User Directory', href: '/sales/users', icon: Users, badge: 'Directory' },
    { label: 'Property Directory', href: '/sales/properties', icon: Building, badge: 'Contacts' },
  ];

  const handleConfirmExit = () => {
    setIsExiting(true);
    try {
      logoutUser();
    } catch (e) {}
    window.location.href = '/';
  };

  return (
    <>
      <aside className={`w-full h-full bg-[#070d09] border-r border-emerald-950/80 flex flex-col justify-between text-gray-200 select-none shrink-0 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 sm:p-5 space-y-6 flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-emerald-950/80 pb-4 gap-3">
            <Link href="/sales" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Briefcase size={19} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-extrabold tracking-wider uppercase text-white font-sans">
                  PROP<span className="text-emerald-400">ZY</span>
                </span>
                <span className="text-[8px] font-extrabold tracking-widest text-teal-400 uppercase mt-0.5">
                  TRICITY • SALES DESK
                </span>
              </div>
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1610] border border-emerald-900/80 text-gray-300 cursor-pointer"
                aria-label="Close sales navigation"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>

          {/* Navigation Section */}
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-emerald-400/80 uppercase tracking-widest px-3 block mb-2">
              Sales Desk Operations
            </span>
            <nav className="space-y-1.5" aria-label="Sales Navigation">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/sales'
                  ? pathname === '/sales'
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0d2a1a] to-[#0a1e13] text-emerald-300 border border-emerald-700/60 shadow-lg shadow-emerald-950/50'
                        : 'text-gray-400 hover:text-white hover:bg-[#0c1810] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Icon size={16} className={`transition-colors shrink-0 ${isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-emerald-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.badge && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold tracking-wider uppercase border ${
                          isActive
                            ? 'bg-emerald-900/80 text-emerald-300 border-emerald-700'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 group-hover:border-emerald-900'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={13} className={`transition-transform duration-200 ${isActive ? 'text-emerald-400 translate-x-0.5' : 'text-gray-600 group-hover:text-gray-400'}`} />
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-emerald-950/80 space-y-2 bg-[#050906] shrink-0 sticky bottom-0 z-20">
          <Link
            href="/"
            className="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-emerald-400 hover:bg-[#0c1810] transition-colors border border-transparent hover:border-emerald-900/60 group w-full"
          >
            <Home size={15} className="text-gray-500 group-hover:text-emerald-400 transition-colors shrink-0" />
            <span className="truncate">Back to Website</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition-colors w-full cursor-pointer"
          >
            <LogOut size={15} className="text-rose-400/80 shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className="bg-[#0a110d] rounded-3xl border border-rose-900/80 p-6 max-w-sm w-full space-y-4 text-gray-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-rose-950/80 border border-rose-900 p-2.5 text-rose-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="logout-title" className="text-sm font-extrabold text-white">Sign Out of Sales Desk</h3>
                <p id="logout-desc" className="mt-1 text-xs text-gray-400">
                  Are you sure you want to log out of your sales executive session?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-emerald-950">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#050806] border border-emerald-900 text-gray-300 text-xs font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExiting}
                onClick={handleConfirmExit}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shadow-md shadow-rose-950/50 cursor-pointer disabled:opacity-50"
              >
                {isExiting ? 'Signing Out...' : 'Confirm Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
