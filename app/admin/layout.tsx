'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Search, ShieldCheck, Menu, ChevronDown, LayoutDashboard, ClipboardCheck, Users, LogOut, Home
} from 'lucide-react';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { BrandSpinner } from '@/components/Loader';
import { useApp, useAppStore } from '@/context/AppContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, logoutUser, showToast } = useApp();
  const [pidQuickInput, setPidQuickInput] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Close Admin menu when clicking anywhere outside
  useEffect(() => {
    if (!isAdminMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdminMenuOpen]);

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
        if (active && data.success && data.user?.role === 'admin') {
          setUser(data.user);
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

  // Automatic Authorization Guard & Silent Redirection
  useEffect(() => {
    if (!isHydrated || !isSessionChecked || isLoggingOut) return;

    if (!user || user.role !== 'admin') {
      if (user && user.role !== 'admin') {
        showToast('Access restricted to Admin accounts');
      }
      const target = `/?auth=login&from=${encodeURIComponent(pathname)}`;
      router.replace(target);
    }
  }, [user, pathname, isHydrated, isSessionChecked, isLoggingOut, router, showToast]);

  const handleConfirmExit = () => {
    setIsAdminMenuOpen(false);
    setIsLoggingOut(true);
    try {
      logoutUser();
    } catch (e) {}
    window.location.href = '/';
  };

  // Prevent rendering admin panel before hydration or for non-admin users
  if (!isHydrated || !isSessionChecked || !user || user.role !== 'admin') {
    return (
      <div className="bg-[#050806] min-h-screen flex items-center justify-center">
        <BrandSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#050806] text-gray-100 min-h-screen font-sans antialiased">
        {/* Sidebar */}
        <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
          <AdminSidebar />
        </div>

        {isMobileSidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
            />
            <div className="fixed left-0 top-0 z-50 h-dvh w-[86vw] max-w-sm lg:hidden shadow-2xl">
              <AdminSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main Administrative Viewport Container */}
        <div className="lg:pl-64 flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-[#060a08]/95 backdrop-blur-xl border-b border-emerald-950/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden inline-flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-[#0a1610] border border-emerald-900/80 text-emerald-400 cursor-pointer shrink-0 shadow-sm"
                aria-label="Open admin navigation"
              >
                <Menu size={16} />
              </button>
              <GlobalSearchBar mode="admin" className="w-full md:w-md md:max-w-[42vw]" />
            </div>

            {/* Right Controls */}
            <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-4 w-full lg:w-auto flex-wrap">
              {/* Admin Portal Menu */}
              <div className="relative" ref={adminMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAdminMenuOpen((open) => !open)}
                  aria-expanded={isAdminMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#0a1610] border border-emerald-900/80 hover:border-emerald-500/70 text-[11px] sm:text-xs min-w-0 transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-[10px] sm:text-xs">
                    {(user.name || 'Admin').charAt(0)}
                  </div>
                  <span className="font-bold text-white truncate max-w-28 sm:max-w-none">
                    {(user.name || 'Admin').split(' ')[0]}
                  </span>
                  <span className="hidden sm:inline text-[10px] font-extrabold text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                    ADMIN
                  </span>
                  <ChevronDown size={12} className={`text-emerald-400 transition-transform ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAdminMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 lg:left-auto lg:right-0 mt-2.5 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#0a110d] border border-emerald-900/80 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="px-3 py-2 border-b border-emerald-950 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Admin Portal
                    </div>
                    <div className="py-1.5 space-y-0.5">
                      <Link href="/admin" role="menuitem" onClick={() => setIsAdminMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors">
                        <LayoutDashboard size={14} /> Admin Overview
                      </Link>
                      <Link href="/admin/verifications" role="menuitem" onClick={() => setIsAdminMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors">
                        <ClipboardCheck size={14} /> Verification Queue
                      </Link>
                      <Link href="/admin/inquiries" role="menuitem" onClick={() => setIsAdminMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors">
                        <Users size={14} /> Tenant Leads
                      </Link>
                    </div>
                    <div className="pt-1.5 border-t border-emerald-950 space-y-0.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAdminMenuOpen(false);
                          setShowExitConfirm(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-gray-300 hover:text-emerald-400 rounded-xl hover:bg-emerald-950/50 transition-colors cursor-pointer"
                      >
                        <Home size={14} /> Back to Website
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAdminMenuOpen(false);
                          setShowExitConfirm(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-rose-400 rounded-xl hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </header>

          {/* Main Content Area */}
          <main className="flex-1 px-3 sm:px-6 lg:px-8 py-3.5 sm:py-8 space-y-4 sm:space-y-8 max-w-7xl w-full mx-auto pb-20 sm:pb-24">
            {children}
          </main>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a110d] border border-amber-900/60 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-400 flex items-center justify-center mx-auto">
              <LogOut size={24} />
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
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#050806] border border-emerald-950 text-gray-300 font-bold text-xs hover:bg-[#0e1813] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                OK, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
