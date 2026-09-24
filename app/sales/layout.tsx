'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Briefcase, ChevronRight, UserCheck } from 'lucide-react';
import { SalesSidebar } from '@/components/SalesSidebar';
import { BrandSpinner } from '@/components/Loader';
import { useApp, useAppStore } from '@/context/AppContext';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, showToast } = useApp();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      if (useAppStore.persist?.hasHydrated?.()) {
        setIsHydrated(true);
      } else {
        setTimeout(checkHydration, 50);
      }
    };
    checkHydration();
  }, []);

  // Restore authoritative HttpOnly-cookie session
  useEffect(() => {
    if (!isHydrated) return;

    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && data.user) {
          const role = (data.user.role || '').toLowerCase();
          if (role === 'admin' || role.includes('sales')) {
            setUser(data.user);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsSessionChecked(true);
      });

    return () => {
      active = false;
    };
  }, [isHydrated, setUser]);

  // Authorization Guard: redirect unauthenticated to normal login, and non-sales/non-admin to dashboard
  useEffect(() => {
    if (!isHydrated || !isSessionChecked) return;

    if (!user) {
      router.replace('/?auth=login');
      return;
    }

    const role = (user.role || '').toLowerCase().trim();
    const isSalesOrAdmin = role === 'admin' || role === 'sales_executive' || role === 'sales executive';

    if (!isSalesOrAdmin) {
      showToast('Sales portal access is restricted to authorized personnel.');
      router.replace('/dashboard');
    }
  }, [user, isHydrated, isSessionChecked, router, showToast]);

  if (!isHydrated || !isSessionChecked) {
    return (
      <div className="min-h-screen bg-[#050806] flex items-center justify-center">
        <BrandSpinner message="Verifying Sales Desk credentials..." size="lg" />
      </div>
    );
  }

  const role = (user?.role || '').toLowerCase().trim();
  const isAuthorized = user && (role === 'admin' || role === 'sales_executive' || role === 'sales executive');

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050806] flex items-center justify-center">
        <BrandSpinner message="Redirecting to dashboard..." size="md" />
      </div>
    );
  }

  const isSuperAdmin = role === 'admin';

  return (
    <div className="bg-[#050806] text-gray-100 min-h-screen font-sans antialiased">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close sales navigation"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
          />
          <div className="fixed left-0 top-0 bottom-0 z-50 h-dvh w-[86vw] max-w-sm lg:hidden shadow-2xl">
            <SalesSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
        <SalesSidebar isOpen={true} />
      </div>

      {/* Main Administrative Viewport Container */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Operational Header */}
        <header className="h-16 px-4 sm:px-6 bg-[#070d09]/95 backdrop-blur-md border-b border-emerald-950/80 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#0b1610] border border-emerald-900/80 text-gray-300 hover:text-white"
              aria-label="Open sales navigation menu"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-extrabold text-white tracking-wide">Sales Desk</span>
              <ChevronRight size={13} className="text-gray-600" />
              <span className="text-emerald-400 font-semibold capitalize">
                {pathname === '/sales' ? 'Subscribed Tenants' : pathname.replace('/sales/', '').replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          {/* Executive Profile Badge */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white truncate max-w-[160px]">
                {user?.name || 'Sales Executive'}
              </span>
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">
                {user?.email}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[#0a1e13] border border-emerald-800/80 text-emerald-300 shadow-sm">
              <UserCheck size={13} className="text-emerald-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                {isSuperAdmin ? 'ADMIN' : 'SALES EXECUTIVE'}
              </span>
            </div>
          </div>
        </header>

        {/* Render Active View */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
