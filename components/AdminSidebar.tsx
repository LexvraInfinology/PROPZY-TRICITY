'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building, MessageSquare, Users, FileText, Mail,
  ArrowLeft, Home, ShieldCheck, Sparkles, ChevronRight, LogOut, XCircle, AlertTriangle
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutUser } = useApp();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const menuItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Property Manager', href: '/admin/properties', icon: Building, badge: 'All ID' },
    { label: 'AI Quick Ingest', href: '/admin/properties/quick-ingest', icon: Sparkles, badge: 'AI' },
    { label: 'Inquiries & Leads', href: '/admin/inquiries', icon: MessageSquare },
    { label: 'Contact Messages', href: '/admin/contacts', icon: Mail },
    { label: 'User Directory', href: '/admin/users', icon: Users },
    { label: 'Owner Verifications', href: '/admin/verifications', icon: ShieldCheck, badge: 'Verify' },
  ];

  const handleConfirmExit = () => {
    setIsExiting(true);
    try {
      logoutUser();
    } catch (e) { }
    window.location.href = '/';
  };

  return (
    <>
      <aside className={`w-full h-full bg-[#070d09] border-r border-emerald-950/80 flex flex-col justify-between text-gray-200 select-none shrink-0 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 sm:p-5 space-y-6 flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-emerald-950/80 pb-4 gap-3">
            <Link href="/admin" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Home size={20} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-extrabold tracking-wider uppercase text-white font-sans">
                  PROP<span className="text-emerald-400">ZY</span>
                </span>
                <span className="text-[8px] font-extrabold tracking-widest text-emerald-400 uppercase mt-0.5">
                  TRICITY • ADMIN
                </span>
              </div>
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1610] border border-emerald-900/80 text-gray-300 cursor-pointer"
                aria-label="Close admin navigation"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-3 mb-2">
              Main Management
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-md font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-[#0b1610]'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-gray-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Quick Links & Main Site Return */}
        <div className="p-4 border-t border-emerald-950/80 bg-[#050906]">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-emerald-400 bg-[#08100b] hover:bg-[#0d1c13] border border-emerald-950 hover:border-emerald-900/80 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center space-x-2">
              <ArrowLeft size={16} />
              <span>Back to Website</span>
            </div>
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>

      {/* Confirmation Alert Modal for Returning to Website */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a110d] border border-amber-900/60 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-white">Back to Website?</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                You will be <strong className="text-amber-400">logged out</strong> from your admin account before returning to the home page.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                disabled={isExiting}
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#050806] border border-emerald-950 text-gray-300 font-bold text-xs hover:bg-[#0e1813] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExiting}
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExiting ? 'Logging out...' : 'OK, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
