'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Heart, User, ChevronDown, Home, Menu, X, ShieldCheck, Plus, Sparkles, Zap } from 'lucide-react';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { useApp } from '@/context/AppContext';

function NavbarContent() {
  const { user, logoutUser, openAuthModal, openPidModal, wishlist } = useApp();
  const [mounted, setMounted] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  // Track active navbar selection
  const [activeItem, setActiveItem] = useState<string>('');
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname === '/about') {
      setActiveItem('about');
    } else if (pathname === '/contact') {
      setActiveItem('contact');
    } else if (pathname === '/properties') {
      if (categoryParam === 'buy') setActiveItem('buy');
      else if (categoryParam === 'rent') setActiveItem('rent');
      else setActiveItem('properties');
    } else if (pathname === '/') {
      setActiveItem('home');
    } else {
      setActiveItem('');
    }
  }, [pathname, categoryParam]);

  // Update sliding underline position when activeItem changes or window resizes
  useEffect(() => {
    const updateUnderline = () => {
      if (navContainerRef.current) {
        const activeEl = navContainerRef.current.querySelector(`[data-nav-key="${activeItem}"]`) as HTMLElement;
        if (activeEl) {
          setIndicatorStyle({
            left: activeEl.offsetLeft,
            width: activeEl.offsetWidth,
            opacity: 1,
          });
        } else {
          setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
        }
      }
    };

    updateUnderline();
    window.addEventListener('resize', updateUnderline);
    return () => window.removeEventListener('resize', updateUnderline);
  }, [activeItem]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile and profile menus when route or query changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname, searchParams]);

  const navItems = [
    { key: 'properties', label: 'All Properties', href: '/properties' },
    { key: 'buy', label: 'Buy', href: '/properties?category=buy' },
    { key: 'rent', label: 'Rent', href: '/properties?category=rent' },
    { key: 'about', label: 'About', href: '/about' },
    { key: 'contact', label: 'Contact', href: '/contact' },
  ];

  // Hide Navbar completely on Admin portal, Plans, and Pricing routes (called after all hook declarations)
  if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/plans') || pathname.startsWith('/pricing'))) {
    return null;
  }

  const currentUser = mounted ? user : null;
  const currentWishlist = mounted ? wishlist : [];

  return (
    <header className="sticky top-0 z-50 bg-[#060907]/95 backdrop-blur-xl border-b border-emerald-950/60">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4 md:space-x-8 lg:space-x-12 shrink-0">
            {/* Brand Logo */}
            <Link
              href="/"
              onClick={(e) => {
                setActiveItem('home');
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('home_scroll_target');
                  if (pathname === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }
              }}
              className="flex items-center space-x-2 sm:space-x-2.5 group shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform shrink-0">
                <Home size={18} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base sm:text-xl font-extrabold tracking-wider uppercase text-white font-sans">
                  PROP<span className="text-emerald-400">ZY</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-extrabold tracking-widest text-emerald-400 uppercase mt-0.5">
                  TRICITY
                </span>
              </div>
            </Link>

            {/* Center Navigation Links with Smooth Sliding Animated Underline */}
            <nav
              ref={navContainerRef}
              className="relative hidden xl:flex items-center space-x-6 lg:space-x-7 text-xs font-semibold tracking-wide py-2"
            >
              {navItems.map((item) => {
                const isActive = activeItem === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    data-nav-key={item.key}
                    onClick={() => setActiveItem(item.key)}
                    className={`py-1 transition-colors duration-200 ${isActive
                      ? 'text-emerald-400 font-extrabold'
                      : 'text-gray-300 hover:text-emerald-400'
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Smooth Sliding Emerald Underline Indicator */}
              <span
                className="absolute bottom-0 h-[2.5px] bg-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-emerald-400/50"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                }}
              />
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            {/* Global Search Bar with Auto-Suggestions */}
            <GlobalSearchBar mode="public" className="hidden sm:block w-44 md:w-56 lg:w-72" />

            {/* Post Property Button */}
            {currentUser?.role === 'owner' && (
              <Link
                href="/post-property"
                onClick={() => setActiveItem('')}
                className="hidden sm:inline-flex items-center justify-center space-x-1.5 px-4 py-2 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Post Property</span>
              </Link>
            )}

            {/* Saved Wishlist Icon */}
            <Link
              href="/dashboard?tab=wishlist"
              className="relative p-2 text-gray-300 hover:text-emerald-400 transition-colors hidden sm:block"
              title="Saved Properties"
            >
              <Heart size={20} />
              {currentWishlist.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {currentWishlist.length}
                </span>
              )}
            </Link>

            {/* Profile Dropdown or Login Link */}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#0d1612] border border-emerald-900/80 hover:border-emerald-500/60 transition-all text-xs font-medium text-gray-200 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-xs">
                    {currentUser.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline font-semibold">
                    {currentUser.name?.split(' ')[0] || 'User'}
                  </span>
                  {currentUser.role !== 'owner' && currentUser.role !== 'admin' && typeof currentUser.credits === 'number' && (
                    <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-800/80">
                      ⚡ {currentUser.credits}
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-emerald-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a110d] rounded-2xl shadow-2xl border border-emerald-900/80 p-2 space-y-1 z-[60] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  {currentUser.role === 'admin' ? (
                    <>
                      <div className="px-4 py-2 border-b border-emerald-950 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                        🛡️ Admin Portal
                      </div>
                      <Link
                        href="/admin"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Admin Overview
                      </Link>
                      <Link
                        href="/admin/properties"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Verification Queue
                      </Link>
                      <Link
                        href="/admin/inquiries"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Tenant Leads
                      </Link>
                    </>
                  ) : currentUser.role === 'owner' ? (
                    <>
                      <div className="px-4 py-2 border-b border-emerald-950 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                        Owner Dashboard
                      </div>
                      <Link
                        href="/dashboard?tab=account"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Account Details
                      </Link>
                      <Link
                        href="/dashboard?tab=my-properties"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        My Properties
                      </Link>
                      <Link
                        href="/dashboard?tab=wishlist"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Saved Property
                      </Link>
                      <Link
                        href="/dashboard?tab=inquiries"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Tenant Inquiries
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-2 border-b border-emerald-950 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                            {currentUser.role === 'sales executive' || currentUser.email?.toLowerCase().trim() === 'pawanpropzy@gmail.com' ? '👔 Executive' : 'Tenant Profile'}
                          </div>
                          <div className="text-[11px] font-bold text-amber-300 mt-0.5 flex items-center space-x-1">
                            <Sparkles size={10} className="text-amber-400" />
                            <span>{currentUser.activePlan || 'Standard Plan'}</span>
                          </div>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 font-mono text-[11px] font-extrabold flex items-center space-x-1 shadow-sm">
                          <Zap size={10} className="fill-emerald-400 text-emerald-400" />
                          <span>{currentUser.credits ?? 0}</span>
                        </div>
                      </div>
                      <Link
                        href="/dashboard?tab=account"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Account
                      </Link>
                      <Link
                        href="/dashboard?tab=wishlist"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Saved Property
                      </Link>
                      <Link
                        href="/dashboard?tab=billing"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Billing History
                      </Link>
                      <Link
                        href="/plans"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-200 rounded-xl hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors"
                      >
                        Explore Plans
                      </Link>
                    </>
                  )}
                    <div className="pt-1 border-t border-emerald-950">
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logoutUser();
                          router.replace('/');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-400 rounded-xl hover:bg-emerald-950/80 transition-colors cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={openAuthModal}
                  className="inline-flex items-center justify-center space-x-1 sm:space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] sm:text-xs tracking-wide transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap shrink-0"
                >
                  <User size={12} className="stroke-[2.5] hidden xs:inline" />
                  <span>Login / Sign Up</span>
                </button>
              </div>
            )}

            {/* Mobile/Tablet/Laptop (under 1280px) Hamburger Menu Toggle */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-emerald-950 focus:outline-none transition-colors cursor-pointer border border-transparent hover:border-emerald-900/60 shrink-0"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Action Bar for Mobile View Only (< sm) - Render search only on home page */}
        {(pathname === '/' || currentUser?.role === 'owner') && (
          <div className="flex flex-col sm:hidden gap-2 pb-3.5 pt-1.5 px-1 border-t border-emerald-950/40 w-full">
            {pathname === '/' && (
              <GlobalSearchBar mode="public" placeholder="Search ID, City, Locality, Title..." className="w-full" />
            )}

            {currentUser?.role === 'owner' && (
              <Link
                href="/post-property"
                onClick={() => setActiveItem('sell')}
                className="w-full h-10 flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus size={15} className="stroke-[2.5]" />
                <span>Post Property Free</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Mobile/Tablet/Laptop Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-[#070d09]/98 backdrop-blur-xl border-b border-emerald-950/80 px-4 sm:px-6 lg:px-8 pt-3 pb-4 animate-in fade-in slide-in-from-top-4 duration-200 shadow-2xl">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => {
                    setActiveItem(item.key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center ${activeItem === item.key
                    ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 shadow-sm'
                    : 'bg-[#0b140f] text-gray-300 hover:text-emerald-400 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-900/40'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {!currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <User size={14} className="stroke-[2.5]" />
                <span>Login or Create Free Account</span>
              </button>
            ) : (
              <div className="pt-2 border-t border-emerald-950/80 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-xs shrink-0">
                    {currentUser.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white leading-tight">{currentUser.name}</div>
                    <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                      <span className="text-emerald-400 capitalize">{currentUser.role}</span>
                      {currentUser.role !== 'owner' && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-amber-300 font-bold">{currentUser.activePlan || 'Standard Plan'}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-emerald-300 font-mono font-bold">⚡{currentUser.credits ?? 0}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logoutUser();
                    router.replace('/');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-900/80 text-rose-300 text-xs font-bold hover:bg-rose-900 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export const Navbar: React.FC = () => {
  return (
    <Suspense fallback={<header className="h-20 bg-[#060907]" />}>
      <NavbarContent />
    </Suspense>
  );
};
