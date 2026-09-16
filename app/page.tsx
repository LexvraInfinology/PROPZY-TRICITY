'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search, ShieldCheck, MapPin, Building, Home as HomeIcon,
  Users, CheckCircle2, ArrowRight, Sparkles, Filter, PhoneCall,
  FileText, Sparkle, Compass, UserCheck, HeartHandshake, Bell, Award,
  CircleDollarSign, User, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { PropertyCard } from '@/components/PropertyCard';
import { InquiryModal } from '@/components/InquiryModal';
import { useApp } from '@/context/AppContext';
import { LazyImage } from '@/components/LazyImage';
import { CallToActionBanner } from '@/components/CallToActionBanner';
import { SkeletonPropertyCard } from '@/components/Loader';
import { getClientPropertiesCache, setClientPropertiesCache } from '@/lib/clientPropertiesCache';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export default function HomePage() {
  const router = useRouter();
  const { user, openAuthModal, openPidModal, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'rent' | 'buy' | 'pg'>('rent');
  const [propertyType, setPropertyType] = useState('all');
  const [selectedCity, setSelectedCity] = useState('Mohali');
  const [budgetFilter, setBudgetFilter] = useState('any');
  const [activeCategoryCity, setActiveCategoryCity] = useState('Mohali');

  const [properties, setProperties] = useState<PropertyItem[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getClientPropertiesCache('home_featured');
      return cached?.data || [];
    }
    return [];
  });
  const [totalPropertiesCount, setTotalPropertiesCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const cached = getClientPropertiesCache('home_featured');
      if (typeof cached?.pagination?.total === 'number') {
        return cached.pagination.total;
      }
      if (cached?.data?.length) {
        return cached.data.length;
      }
    }
    return 0;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = getClientPropertiesCache('home_featured');
      return !cached || cached.data.length === 0;
    }
    return true;
  });

  const [selectedPropertyForInquiry, setSelectedPropertyForInquiry] = useState<PropertyItem | null>(null);

  const propertySliderRef = useRef<HTMLDivElement>(null);

  const scrollPropertySlider = (direction: 'left' | 'right') => {
    if (propertySliderRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      propertySliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Helper function to format round-down dynamic count with + (e.g. 43 -> 40+, 57 -> 50+)
  const getRoundedDisplayCount = (count: number): string => {
    if (count <= 0) return '0+';
    if (count < 10) return `${count}+`;
    const rounded = Math.floor(count / 10) * 10;
    return `${rounded}+`;
  };

  // Fetch properties from API
  useEffect(() => {
    async function fetchProperties() {
      const cached = getClientPropertiesCache('home_featured');
      if (cached && cached.data && cached.data.length > 0) {
        const activeCached = cached.data.filter((p: any) => p.available !== false);
        setProperties(activeCached);
        if (typeof cached.pagination?.total === 'number') {
          setTotalPropertiesCount(cached.pagination.total);
        } else {
          setTotalPropertiesCount(activeCached.length);
        }
        setLoading(false);
      }

      try {
        const res = await fetch('/api/properties?includeTotal=true');
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const activeProperties = data.data.filter((p: any) => p.available !== false);
          setProperties(activeProperties);
          const total = typeof data.pagination?.total === 'number' ? data.pagination.total : activeProperties.length;
          setTotalPropertiesCount(total);
          setClientPropertiesCache('home_featured', activeProperties, data.pagination);
        }
      } catch (e) {
        console.warn('Properties fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, []);

  // Synchronously lock scroll position BEFORE browser paints the first frame
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const savedPid = sessionStorage.getItem('home_scroll_pid');
    const savedY = sessionStorage.getItem('home_scroll_y');
    const targetSectionId = sessionStorage.getItem('home_scroll_target');
    const savedCity = sessionStorage.getItem('home_active_city');

    if (savedCity) {
      setActiveCategoryCity(savedCity);
    }

    if (savedPid || savedY || targetSectionId) {
      const applyScroll = () => {
        if (savedPid) {
          const el = document.getElementById(`prop-card-${savedPid}`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
            return true;
          }
        }
        if (savedY && Number(savedY) > 0) {
          window.scrollTo({ top: Number(savedY), behavior: 'instant' });
          return true;
        }
        if (targetSectionId) {
          const el = document.getElementById(targetSectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
            return true;
          }
        }
        return false;
      };

      // 1. Execute synchronously before paint
      applyScroll();

      // 2. Micro-task & animation frame re-check
      const raf = requestAnimationFrame(applyScroll);
      const timer = setTimeout(() => {
        applyScroll();
        sessionStorage.removeItem('home_scroll_pid');
        sessionStorage.removeItem('home_scroll_y');
        sessionStorage.removeItem('home_scroll_target');
      }, 150);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, []);

  // Ensure restoration if properties loaded asynchronously after mount
  useEffect(() => {
    if (loading || properties.length === 0) return;
    if (typeof window === 'undefined') return;

    const savedPid = sessionStorage.getItem('home_scroll_pid');
    const savedY = sessionStorage.getItem('home_scroll_y');

    if (!savedPid && !savedY) return;

    const restore = () => {
      if (savedPid) {
        const el = document.getElementById(`prop-card-${savedPid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
          sessionStorage.removeItem('home_scroll_pid');
          sessionStorage.removeItem('home_scroll_y');
          sessionStorage.removeItem('home_scroll_target');
          return true;
        }
      }
      if (savedY && Number(savedY) > 0) {
        window.scrollTo({ top: Number(savedY), behavior: 'instant' });
        sessionStorage.removeItem('home_scroll_pid');
        sessionStorage.removeItem('home_scroll_y');
        sessionStorage.removeItem('home_scroll_target');
        return true;
      }
      return false;
    };

    restore();
    const raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, [loading, properties]);

  const handleCityNavigation = (cityName: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('home_scroll_target', 'explore-locations');
      sessionStorage.setItem('home_scroll_y', String(window.scrollY));
    }
    router.push(`/properties?city=${encodeURIComponent(cityName)}`);
  };

  const handleSpaceCategoryNavigation = (type: string, city: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('home_scroll_target', 'spaces-by-city');
      sessionStorage.setItem('home_scroll_y', String(window.scrollY));
      sessionStorage.setItem('home_active_city', city);
    }
    router.push(`/properties?type=${encodeURIComponent(type)}&city=${encodeURIComponent(city)}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('home_scroll_target', 'hero-search');
      sessionStorage.setItem('home_scroll_y', String(window.scrollY));
    }
    const params = new URLSearchParams();
    params.set('category', activeTab);
    if (propertyType !== 'all') params.set('type', propertyType);
    if (selectedCity) params.set('city', selectedCity);
    if (budgetFilter !== 'any') params.set('maxPrice', budgetFilter);

    router.push(`/properties?${params.toString()}`);
  };

  const locationsList = [
    { name: 'Chandigarh', count: '7,110 Properties', img: '/Image (Chandigarh).png', featured: false },
    { name: 'Mohali', count: '2,777 Properties', img: '/Image (Mohali).png', featured: false },
    { name: 'Zirakpur', count: '4,937 Properties', img: '/Image (Zirakpur).png', featured: true},
    { name: 'Kharar', count: '7,92 Properties', img: '/Image (Kharar).png', featured: false },
    { name: 'Panchkula', count: '12,145 Properties', img: '/Image (Panchkula).png', featured: false }
  ];

  const spaceCategories = [
    { title: 'Apartment', count: '4,270 Listings', img: '/Apprtment.png', type: 'flat' },
    { title: 'House', count: '1,344 Listings', img: '/Image (House).png', type: 'house' },
    { title: 'PG', count: '884 Listings', img: '/Image (PG).png', type: 'pg' },
    { title: 'Commercial', count: '63 Listings', img: '/Image (Commercial).png', type: 'commercial' },
  ];

  return (
    <div className="bg-[#050806] text-gray-100 min-h-screen space-y-16 sm:space-y-24 pb-28 lg:pb-20">
     
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: HERO SECTION 
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-8 sm:pt-12 pb-16 sm:pb-20 overflow-hidden">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/hero-bg.png"
            alt="Hero Background"
            fill
            priority
            unoptimized
            className="object-cover object-center opacity-75"
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-[#050806]/60 via-[#050806]/30 to-[#050806] pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-6 mb-8 sm:mb-12">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[11px] sm:text-xs font-semibold tracking-wide">
              <span className="text-emerald-400">★</span>
              <span>Find your perfect home </span>  <span className='px-2'>• 0% Brokerage</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.15]">
              Trusted Properties for<br />
              <span className="font-serif italic text-emerald-500 bg-clip-text font-normal">
                Rent . Buy . Sell
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed px-2">
             Find trusted flats, homes, PGs and premium properties in Chandigarh Tricity, directly from verified owners with no brokerage.
            </p>
          </div>

          {/* Search Box Container  */}
          <div className="max-w-4xl mx-auto bg-[#0a110d]/90 backdrop-blur-2xl border border-emerald-900/60 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-emerald-950/50">
            {/* Tabs Row */}
            <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-4 sm:mb-6 bg-[#060a08] p-1.5 rounded-2xl border border-emerald-950 max-w-md mx-auto overflow-x-auto">
              {(['rent', 'buy', 'pg'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 sm:py-2 px-2.5 cursor-pointer sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase transition-all tracking-wider whitespace-nowrap ${activeTab === tab
                      ? 'bg-[#153b28] text-emerald-400 border border-emerald-700/80 shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Form Fields Row */}
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0c140f] p-3 rounded-2xl border border-emerald-950">
              {/* Location Select */}
              <div className="p-3 bg-[#070c09] rounded-xl border border-emerald-950 flex flex-col justify-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Location
                </label>
                <select
                  suppressHydrationWarning
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent cursor-pointer text-xs font-bold text-white focus:outline-none"
                >
                  <option value="Mohali" className="bg-[#0a110d] text-white">Mohali</option>
                  <option value="Chandigarh" className="bg-[#0a110d] text-white">Chandigarh</option>
                  <option value="Zirakpur" className="bg-[#0a110d] text-white">Zirakpur</option>
                  <option value="Kharar" className="bg-[#0a110d] text-white">Kharar</option>
                  <option value="Panchkula" className="bg-[#0a110d] text-white">Panchkula</option>
                </select>
              </div>

              {/* Property Type Select */}
              <div className="p-3 bg-[#070c09] rounded-xl border border-emerald-950 flex flex-col justify-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Property Type
                </label>
                <select
                  suppressHydrationWarning
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#0a110d] text-white">All Types</option>
                  <option value="flat" className="bg-[#0a110d] text-white">Flat</option>
                  <option value="house" className="bg-[#0a110d] text-white">House</option>
                  <option value="pg" className="bg-[#0a110d] text-white">PG</option>
                  <option value="commercial" className="bg-[#0a110d] text-white">Commercial</option>
                </select>
              </div>

              {/* Budget Select */}
              <div className="p-3 bg-[#070c09] rounded-xl border border-emerald-950 flex flex-col justify-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Budget
                </label>
                <select
                  suppressHydrationWarning
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="any" className="bg-[#0a110d] text-white">Any Budget</option>
                  <option value="10000" className="bg-[#0a110d] text-white">Under ₹10,000</option>
                  <option value="25000" className="bg-[#0a110d] text-white">Under ₹25,000</option>
                  <option value="50000" className="bg-[#0a110d] text-white">Under ₹50,000</option>
                  <option value="100000" className="bg-[#0a110d] text-white">Under ₹1 Lakh</option>
                  <option value="250000" className="bg-[#0a110d] text-white">Under ₹2.5 Lakhs</option>
                  <option value="500000" className="bg-[#0a110d] text-white">Under ₹5 Lakhs</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                suppressHydrationWarning
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl py-3 px-4 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Search size={16} className="stroke-[2.5]" />
                <span>Search Properties</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: LOCATION CAROUSEL
      ───────────────────────────────────────────────────────────── */}
      <section id="explore-locations" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28">
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[11px] font-extrabold tracking-widest uppercase">
            <MapPin size={13} />
            <span>EXPLORE BY LOCATION</span>
          </div>

          <h2 className="text-xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-xl mx-auto">
            Where would you like to <br className="sm:hidden" />
            <span className="block sm:inline font-serif italic text-emerald-400 font-normal">live?</span>
          </h2>

          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
            Discover verified homes, apartments, villas and commercial spaces across the most sought-after locations.
          </p>

          {/* Stats Bar */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-xs font-semibold text-gray-300 max-w-3xl mx-auto">
            <div className="w-full max-w-72 sm:max-w-none mx-auto flex items-center justify-start space-x-3 rounded-2xl bg-[#06110c]/70 border border-emerald-950/70 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                <HomeIcon size={14} />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold text-white">{getRoundedDisplayCount(totalPropertiesCount)}</div>
                <div className="text-[10px] text-gray-400">Verified Listings</div>
              </div>
            </div>

            <div className="w-full max-w-72 sm:max-w-none mx-auto flex items-center justify-start space-x-3 rounded-2xl bg-[#06110c]/70 border border-emerald-950/70 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                <Compass size={14} />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold text-white">5 Cities</div>
                <div className="text-[10px] text-gray-400">Active Tricity</div>
              </div>
            </div>

            <div className="w-full max-w-72 sm:max-w-none mx-auto flex items-center justify-start space-x-3 rounded-2xl bg-[#06110c]/70 border border-emerald-950/70 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={14} />
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold text-white">100%</div>
                <div className="text-[10px] text-gray-400">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Cards Grid/Row*/}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 justify-center max-w-6xl mx-auto">
          {locationsList.map((loc, idx) => (
            <div
              key={idx}
              onClick={() => handleCityNavigation(loc.name)}
              className={`group relative aspect-3/4 w-full rounded-3xl overflow-hidden cursor-pointer border transition-all duration-300 ${loc.featured
                  ? 'border-emerald-500 shadow-xl shadow-emerald-950/50 scale-[1.02]'
                  : 'border-emerald-950/80 hover:border-emerald-700/60'
                }`}
            >
              <LazyImage
                src={loc.img}
                alt={loc.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

              

              {/* Card Footer Text */}
              <div className="absolute bottom-3 left-3 right-3 space-y-1">
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {loc.name}
                  
                </h3>
                
                <div className="pt-1">
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-900/60 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                    <span>Explore</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Button */}
        <div className="text-center pt-8">
          <Link
            href="/properties"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-full bg-[#0b140f] border border-emerald-900/80 hover:border-emerald-500 text-white font-extrabold text-xs tracking-wide transition-all shadow-lg"
          >
            <span>Explore All Locations</span>
            <span className="text-emerald-400 font-bold">→</span>
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: HAND PICKED & VERIFIED (PROPERTY SLIDER)
      ───────────────────────────────────────────────────────────── */}
      <section id="handpicked-properties" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[11px] font-extrabold tracking-widest uppercase">
              <ShieldCheck size={13} />
              <span>HAND PICKED AND VERIFIED</span>
            </div>

            <h2 className="text-xl sm:text-5xl font-extrabold text-white tracking-tight">
              Homes worth <br className="hidden sm:inline" />
              <span className="font-serif italic text-emerald-400 font-normal">discovering.</span>
            </h2>

            <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
              Carefully selected, owner-listed properties. Verified for your peace of mind.
            </p>
          </div>

          {/* Slider Left & Right Control Buttons */}
          <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => scrollPropertySlider('left')}
              className="w-11 h-11 rounded-2xl bg-[#08120b] border border-emerald-900/80 hover:border-emerald-500 hover:bg-emerald-500 hover:text-black text-emerald-400 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              aria-label="Previous Slide"
            >
              <ChevronLeft size={20} className="stroke-[2.5]" />
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => scrollPropertySlider('right')}
              className="w-11 h-11 rounded-2xl bg-[#08120b]  border border-emerald-900/80 hover:border-emerald-500 hover:bg-emerald-500 hover:text-black text-emerald-400 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
              aria-label="Next Slide"
            >
              <ChevronRight size={20} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Property Cards Horizontal Slider */}
        <div
          ref={propertySliderRef}
          className="flex space-x-4 sm:space-x-6 overflow-x-auto pb-6 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading && properties.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-${i}`} className="w-[82vw] max-w-[340px] sm:w-80 lg:w-85 shrink-0 snap-center sm:snap-start">
                <SkeletonPropertyCard />
              </div>
            ))
          ) : (
            properties.map((prop) => (
              <div
                key={prop.id || prop.pid}
                className="w-[82vw] max-w-[340px] sm:w-80 lg:w-85 shrink-0 snap-center sm:snap-start"
              >
                <PropertyCard
                  property={prop}
                  onContactClick={(p) => {
                    if (!user) {
                      showToast('Please login to contact the property owner');
                      openAuthModal();
                      return;
                    }
                    setSelectedPropertyForInquiry(p);
                  }}
                />
              </div>
            ))
          )}
        </div>

        {/* Explore All Properties Button */}
        <div className="text-center pt-8">
          <Link
            href="/properties"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-full bg-[#0b140f] border border-emerald-900/80 hover:border-emerald-500 text-white font-extrabold text-xs tracking-wide transition-all shadow-lg"
          >
            <span>Explore All Properties</span>
            <span className="text-emerald-400 font-bold">→</span>
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: PERSONAL MANAGER CARD 
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-[#080e0a] border border-emerald-950/90 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl">
          {/* Concentric Circle Background Rings */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-125 h-125 rounded-full border border-emerald-950/60 pointer-events-none hidden md:block" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-90 h-90 rounded-full border border-emerald-950/80 pointer-events-none hidden md:block" />

          {/* Header Row: Badge & Talk to Expert */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="inline-flex items-center justify-center sm:justify-start space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-xs font-bold tracking-wide self-start">
              <ShieldCheck size={14} />
              <span>Personal Assistance</span>
            </div>

            <Link
              href="/tenant/relaxplan"
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-3 sm:py-2 rounded-full bg-[#0d1812] border border-emerald-900/80 hover:border-emerald-500 text-gray-200 text-xs font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] w-full sm:w-auto"
            >
              <PhoneCall size={14} className="text-emerald-400" />
              <span>Talk to our expert</span>
              <span>→</span>
            </Link>
          </div>

          {/* Section Title */}
          <div className="max-w-2xl space-y-2.5 sm:space-y-3 mb-6 sm:mb-10">
            <h2 className="text-xl sm:text-5xl font-extrabold text-white tracking-tight leading-snug sm:leading-tight">
              Your personal manager <br className="sm:hidden" />
              finds your perfect home, <br className="sm:hidden" />
              <span className="font-serif italic text-emerald-400 font-normal">10× faster.</span>
            </h2>
            <p className="text-[11px] sm:text-sm text-gray-400">
              From understanding your needs to finalizing the perfect property – we handle it all, end to end.
            </p>
          </div>
          

          {/* 4 Step Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-10">
            {/* Step 01 */}
            <div className="bg-[#050806] border border-emerald-950/90 rounded-2xl p-3.5 sm:p-5 space-y-2 sm:space-y-3 relative group hover:border-emerald-800/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/80 border border-emerald-900/60 flex items-center justify-center text-emerald-400">
                  <FileText size={15} className="sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">01</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Understand</h3>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                We understand your needs, budget & preferences to short-list the best options for you.
              </p>
            </div>

            {/* Step 02 */}
            <div className="bg-[#050806] border border-emerald-950/90 rounded-2xl p-3.5 sm:p-5 space-y-2 sm:space-y-3 relative group hover:border-emerald-800/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/80 border border-emerald-900/60 flex items-center justify-center text-emerald-400">
                  <UserCheck size={15} className="sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">02</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Personalize</h3>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                We curate a personalized plan with the best properties that match your lifestyle.
              </p>
            </div>

            {/* Step 03 */}
            <div className="bg-[#050806] border border-emerald-950/90 rounded-2xl p-3.5 sm:p-5 space-y-2 sm:space-y-3 relative group hover:border-emerald-800/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/80 border border-emerald-900/60 flex items-center justify-center text-emerald-400">
                  <Bell size={15} className="sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">03</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Stay Updated</h3>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                Your Relationship Manager keeps you updated on new listings & price changes.
              </p>
            </div>

            {/* Step 04 */}
            <div className="bg-[#050806] border border-emerald-950/90 rounded-2xl p-3.5 sm:p-5 space-y-2 sm:space-y-3 relative group hover:border-emerald-800/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-950/80 border border-emerald-900/60 flex items-center justify-center text-emerald-400">
                  <HeartHandshake size={15} className="sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">04</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Get Results</h3>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                We negotiate, finalize & help you move in with 100% transparency.
              </p>
            </div>
          </div>

          {/* Bottom Feature Tags Bar (Separate boxes on mobile view) */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-gray-300 font-normal mx-auto max-w-3xl">
            <div className="w-full max-w-72 sm:w-auto flex items-center justify-start sm:justify-center space-x-3 px-6 py-3 rounded-2xl sm:rounded-full bg-[#050806] border border-emerald-900/50 shadow-md">
              <CircleDollarSign size={16} className="text-emerald-400 stroke-[1.5] shrink-0" />
              <span className="text-gray-200 font-medium">0% Brokerage</span>
            </div>
            <div className="w-full max-w-72 sm:w-auto flex items-center justify-start sm:justify-center space-x-3 px-6 py-3 rounded-2xl sm:rounded-full bg-[#050806] border border-emerald-900/50 shadow-md">
              <ShieldCheck size={16} className="text-emerald-400 stroke-[1.5] shrink-0" />
              <span className="text-gray-200 font-medium">100% Transparency</span>
            </div>
            <div className="w-full max-w-72 sm:w-auto flex items-center justify-start sm:justify-center space-x-3 px-6 py-3 rounded-2xl sm:rounded-full bg-[#050806] border border-emerald-900/50 shadow-md">
              <User size={16} className="text-emerald-400 stroke-[1.5] shrink-0" />
              <span className="text-gray-200 font-medium">Direct Owner Properties</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: SPACES BY CATEGORY 
      ───────────────────────────────────────────────────────────── */}
      <section id="spaces-by-city" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[11px] font-extrabold tracking-widest uppercase">
            <Compass size={13} />
            <span>EXPLORE</span>
          </div>

          <h2 className="text-xl sm:text-5xl font-extrabold text-white tracking-tight">
            Spaces that fit <br className="hidden sm:inline" />
            <span className="font-serif italic text-emerald-400 font-normal">your life</span>
          </h2>

          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
            Explore verified properties across Mohali and nearby cities.
          </p>
        </div>

        {/* City Filter Pills  */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {['Mohali', 'Chandigarh', 'Zirakpur', 'Kharar', 'Panchkula'].map((city) => (
            <button
              key={city}
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveCategoryCity(city)}
              className={`cursor-pointer px-5 py-2 rounded-full text-xs font-bold transition-all ${activeCategoryCity === city
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-[#0b140f] border border-emerald-900/80 text-gray-300 hover:text-white hover:border-emerald-700'
                }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Property Category Cards Row   */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {spaceCategories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => handleSpaceCategoryNavigation(cat.type, activeCategoryCity)}
              className="group relative aspect-4/3 sm:aspect-square rounded-3xl overflow-hidden border border-emerald-400 hover:border-emerald-700/80 cursor-pointer transition-all shadow-xl"
            >
              <LazyImage
                src={cat.img}
                alt={cat.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

              {/* Title & Arrow Button */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <h3 className="text-base font-bold group-hover:text-emerald-400 transition-colors">
                    {cat.title}
                  </h3>
            
                </div>

                <div className="w-9 h-9 rounded-full bg-emerald-500/30 text-black flex items-center justify-center border border-emerald-800 shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-bold text-sm text-white ">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: EVERYTHING HANDLED 
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Heading */}
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[11px] font-extrabold tracking-widest uppercase">
              <MapPin size={13} />
              <span>WE HAVE GOT YOU</span>
            </div>

            <h2 className="text-xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Everything 
              handled, <br />
              <span className="font-serif italic text-emerald-400 font-normal">hassle free.</span>
            </h2>

            <p className="text-xs sm:text-sm text-gray-400">
              So you can focus on what matters most.
            </p>
          </div>

          {/* Right 2 Cards Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Service 1 */}
            <Link href="/properties" className="bg-[#080d0a] border border-emerald-950/90 hover:border-emerald-800/60 rounded-3xl p-6 space-y-4 group transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0e1a13] border border-emerald-900/60 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                0% Brokerage
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Connect directly with property owners and save on heavy agent commissions.
              </p>
            </Link>

            {/* Service 2 */}
            <Link href="/localities" className="bg-[#080d0a] border border-emerald-950/90 hover:border-emerald-800/60 rounded-3xl p-6 space-y-4 group transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0e1a13] border border-emerald-900/60 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <MapPin size={22} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Explore Locality
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Explore neighbourhoods and choose the perfect location.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: READY TO MOVE CTA BANNER 
      ───────────────────────────────────────────────────────────── */}
      <section className="py-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CallToActionBanner
          subTag="IS READY TO MOVE"
          titleMain="Let's find your"
          titleItalic="perfect space."
          description="Verified homes. Zero brokerage. Hassle-free renting."
          buttonText="Explore Properties"
          buttonHref="/properties"
        />
      </section>

      {/* Inquiry Modal */}
      {selectedPropertyForInquiry && (
        <InquiryModal
          property={selectedPropertyForInquiry}
          onClose={() => setSelectedPropertyForInquiry(null)}
        />
      )}
    </div>
  );
}
