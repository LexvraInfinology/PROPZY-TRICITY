'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Building2, Heart, PlusCircle, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';

function MobileBottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { wishlist, openAuthModal, user } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = (user?.role || '').toLowerCase().trim();
  const isSalesExecutive = role === 'sales executive' || role === 'sales_executive' || user?.email?.toLowerCase().trim() === 'pawanpropzy@gmail.com' || user?.email?.toLowerCase().trim() === 'chandnirathore0963@gmail.com';

  if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/sales') || (isSalesExecutive && pathname.startsWith('/dashboard')))) {
    return null;
  }

  const currentUser = mounted ? user : null;
  const currentWishlist = mounted ? wishlist : [];

  const tab = searchParams ? searchParams.get('tab') : null;

  const isHomeActive = pathname === '/';
  const isPropertiesActive = pathname === '/properties' || pathname.startsWith('/properties/');
  const isSavedActive = pathname === '/dashboard' && (tab === 'wishlist' || tab === 'saved');
  const isPostActive = pathname === '/post-property';
  const isProfileActive = pathname === '/dashboard' && !isSavedActive;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060a08]/95 backdrop-blur-xl border-t border-emerald-900/60 px-2 py-1 shadow-2xl shadow-emerald-950/80">
      <div className={`grid ${currentUser?.role === 'owner' ? 'grid-cols-5' : 'grid-cols-4'} items-center text-center`}>
        {/* Home */}
        <Link
          href="/"
          onClick={(e) => {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('home_scroll_target');
              if (pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          }}
          className={`flex flex-col items-center justify-center py-1 text-[9px] font-semibold transition-colors ${
            isHomeActive ? 'text-emerald-400 font-extrabold' : 'text-gray-400 hover:text-emerald-300'
          }`}
        >
          <Home size={17} className={isHomeActive ? 'text-emerald-400' : ''} />
          <span className="mt-0.5">Home</span>
        </Link>

        {/* All Properties */}
        <Link
          href="/properties"
          className={`flex flex-col items-center justify-center py-1 text-[9px] font-semibold transition-colors ${
            isPropertiesActive ? 'text-emerald-400 font-extrabold' : 'text-gray-400 hover:text-emerald-300'
          }`}
        >
          <Building2 size={17} className={isPropertiesActive ? 'text-emerald-400' : ''} />
          <span className="mt-0.5">All Properties</span>
        </Link>

        {/* Saved Properties */}
        <button
          type="button"
          onClick={(e) => {
            if (!currentUser) {
              e.preventDefault();
              openAuthModal();
            } else {
              router.push('/dashboard?tab=wishlist');
            }
          }}
          className={`flex flex-col items-center justify-center py-1 text-[9px] font-semibold transition-colors cursor-pointer ${
            isSavedActive ? 'text-emerald-400 font-extrabold' : 'text-gray-400 hover:text-emerald-300'
          }`}
        >
          <div className="relative">
            <Heart
              size={17}
              className={isSavedActive ? 'text-emerald-400 fill-emerald-400' : ''}
            />
            {currentWishlist.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-500 text-black text-[8px] font-extrabold px-1 rounded-full">
                {currentWishlist.length}
              </span>
            )}
          </div>
          <span className="mt-0.5">Saved</span>
        </button>

        {/* Post Property - owners only */}
        {currentUser?.role === 'owner' && (
          <Link
            href="/post-property"
            className={`flex flex-col items-center justify-center py-1 text-[9px] font-semibold transition-colors ${
              isPostActive ? 'text-emerald-400 font-extrabold' : 'text-gray-400 hover:text-emerald-300'
            }`}
          >
            <PlusCircle size={17} className={isPostActive ? 'text-emerald-400' : 'text-emerald-400'} />
            <span className="mt-0.5">Post</span>
          </Link>
        )}

        {/* Profile / Account / Login */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => {
            if (currentUser) {
              router.push('/dashboard?tab=account');
            } else {
              openAuthModal();
            }
          }}
          className={`flex flex-col items-center justify-center py-1 text-[9px] font-semibold transition-colors cursor-pointer ${
            isProfileActive ? 'text-emerald-400 font-extrabold' : 'text-gray-400 hover:text-emerald-300'
          }`}
        >
          <User size={17} className={isProfileActive ? 'text-emerald-400' : ''} />
          <span className="mt-0.5">{currentUser ? 'Profile' : 'Login'}</span>
        </button>
      </div>
    </div>
  );
}

export const MobileBottomNav: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavContent />
    </Suspense>
  );
};
