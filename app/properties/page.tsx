'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, ShieldCheck, Search, RefreshCw, X, ChevronLeft, ArrowLeft, Home as HomeIcon, Sparkles } from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { PropertyCard } from '@/components/PropertyCard';
import { InquiryModal } from '@/components/InquiryModal';
import { SkeletonGrid } from '@/components/Loader';
import { useApp } from '@/context/AppContext';
import { getClientPropertiesCache, setClientPropertiesCache } from '@/lib/clientPropertiesCache';
import { partitionPropertiesByLocation } from '@/lib/proximity';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

function PropertySearchContent() {
  const { user, openAuthModal, showToast } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const urlCategory = searchParams.get('category') || 'all';
  const urlCity = searchParams.get('city') || 'all';
  const urlLocality = searchParams.get('locality') || '';
  const urlPid = searchParams.get('pid') || '';
  const urlType = searchParams.get('type') || 'all';
  const urlBedrooms = searchParams.get('bedrooms') || 'all';
  const urlVerified = searchParams.get('verified') === 'true';

  // Synchronously control scroll position on filter changes unless restoring previous position
  useIsomorphicLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      const hasSavedScroll = sessionStorage.getItem('properties_scroll_y') || sessionStorage.getItem('properties_scroll_pid');
      if (!hasSavedScroll) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [urlCategory, urlCity, urlType]);

  const isBuyOrSell = (c: string) => c === 'buy' || c === 'sell';
  const defaultRentMax = 1500000; // 15 Lakh
  const defaultBuyMax = 50000000; // 5 Cr

  const rawUrlMax = searchParams.get('maxPrice');
  const initialMaxPrice = rawUrlMax
    ? Number(rawUrlMax)
    : (isBuyOrSell(urlCategory) ? defaultBuyMax : defaultRentMax);

  const [category, setCategory] = useState(urlCategory);
  const [city, setCity] = useState(urlCity);
  const [locality, setLocality] = useState(urlLocality);
  const [pidSearch, setPidSearch] = useState(urlPid);
  const [maxPrice, setMaxPrice] = useState<number>(initialMaxPrice);
  const [type, setType] = useState(urlType);
  const [bedrooms, setBedrooms] = useState(urlBedrooms);
  const [verifiedOnly, setVerifiedOnly] = useState(urlVerified);

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(21);
  const [selectedPropertyForInquiry, setSelectedPropertyForInquiry] = useState<PropertyItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (isBuyOrSell(newCat)) {
      if (maxPrice < 1000000) setMaxPrice(defaultBuyMax);
    } else {
      if (maxPrice > defaultRentMax) setMaxPrice(defaultRentMax);
    }
  };

  // Sync state when URL params change
  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    setCategory(cat);
    setCity(searchParams.get('city') || 'all');
    setLocality(searchParams.get('locality') || '');
    setPidSearch(searchParams.get('pid') || '');
    setType(searchParams.get('type') || 'all');
    setBedrooms(searchParams.get('bedrooms') || 'all');
    setVerifiedOnly(searchParams.get('verified') === 'true');

    const rawMax = searchParams.get('maxPrice');
    if (rawMax) {
      setMaxPrice(Number(rawMax));
    } else {
      setMaxPrice(isBuyOrSell(cat) ? defaultBuyMax : defaultRentMax);
    }
  }, [searchParams]);

  const fetchFilteredProperties = async () => {
    // Build query params for the API (fetches matching category, budget, BHK, type, verified status)
    const apiParams = new URLSearchParams();
    if (category !== 'all') apiParams.set('category', category);
    if (pidSearch) apiParams.set('pid', pidSearch);
    if (type !== 'all') apiParams.set('type', type);
    if (bedrooms !== 'all') apiParams.set('bedrooms', bedrooms);
    if (verifiedOnly) apiParams.set('verified', 'true');
    if (debouncedMaxPrice) apiParams.set('maxPrice', debouncedMaxPrice.toString());
    apiParams.set('limit', '100');

    // For client-side caching, incorporate city & locality so cache states stay distinct
    const clientCacheParams = new URLSearchParams(apiParams);
    if (city !== 'all') clientCacheParams.set('city', city);
    if (locality) clientCacheParams.set('locality', locality);
    const clientCacheKey = clientCacheParams.toString();

    // 1. Client-Side Instant Cache Check
    const cached = getClientPropertiesCache(clientCacheKey);
    let shouldFetch = true;

    if (cached && Array.isArray(cached.data)) {
      const filteredCached = cached.data.filter((p: any) => {
        if (p.available === false) return false;
        if (verifiedOnly && !p.verified) return false;
        return true;
      });
      setProperties(filteredCached);
      setLoading(false);

      // If client cache is fresh (< 30 seconds), avoid network fetch
      if (Date.now() - cached.timestamp < 30000) {
        shouldFetch = false;
      }
    } else {
      setLoading(true);
    }

    if (!shouldFetch) return;

    // 2. Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++latestRequestIdRef.current;

    try {
      const fetchUrl = `/api/properties?${apiParams.toString()}`;
      const res = await fetch(fetchUrl, {
        signal: controller.signal
      });

      const data = await res.json();

      // Guard: Ignore if a newer request was dispatched in the meantime
      if (currentRequestId !== latestRequestIdRef.current) return;

      if (res.ok && data.success && Array.isArray(data.data)) {
        const filteredData = data.data.filter((p: any) => {
          if (p.available === false) return false;
          if (verifiedOnly && !p.verified) return false;
          return true;
        });
        setProperties(filteredData);
        setClientPropertiesCache(clientCacheKey, filteredData, data.pagination);
      } else {
        setProperties([]);
      }
    } catch (e: any) {
      // Ignore intentional abort cancellations silently
      if (e?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }

      if (currentRequestId !== latestRequestIdRef.current) return;

      console.warn('Properties fetch API error:', e);
      setProperties([]);
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Debounce maxPrice slider changes (400ms) to avoid request flooding
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(maxPrice);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMaxPrice(maxPrice), 400);
    return () => clearTimeout(timer);
  }, [maxPrice]);

  // Clean up in-flight abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchFilteredProperties();
  }, [category, city, locality, pidSearch, debouncedMaxPrice, type, bedrooms, verifiedOnly]);

  const isPgFilter = category === 'pg' || type === 'pg';
  const isPgProperty = (p: PropertyItem) => p.category === 'pg' || p.type === 'pg';

  const orderedProperties = useMemo(() => {
    if (!isPgFilter) return properties;
    const pgs = properties.filter(isPgProperty);
    const oneBhks = properties.filter(p => !isPgProperty(p));
    return [...pgs, ...oneBhks];
  }, [properties, isPgFilter]);

  // Partition properties into exact location matches and nearby matches
  const { exactMatches, nearbyMatches, hasLocationFilter } = useMemo(() => {
    return partitionPropertiesByLocation(orderedProperties, city, locality);
  }, [orderedProperties, city, locality]);

  // Synchronize browser address bar URL with active filter state
  useEffect(() => {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (city && city !== 'all') params.set('city', city);
    if (locality) params.set('locality', locality);
    if (pidSearch) params.set('pid', pidSearch);
    if (type && type !== 'all') params.set('type', type);
    if (bedrooms && bedrooms !== 'all') params.set('bedrooms', bedrooms);
    if (verifiedOnly) params.set('verified', 'true');
    const isCustomMax = isBuyOrSell(category)
      ? debouncedMaxPrice !== defaultBuyMax
      : debouncedMaxPrice !== defaultRentMax;
    if (debouncedMaxPrice && isCustomMax) {
      params.set('maxPrice', debouncedMaxPrice.toString());
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `/properties?${queryString}` : '/properties';

    if (typeof window !== 'undefined') {
      const currentFullUrl = `${window.location.pathname}${window.location.search}`;
      if (currentFullUrl !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  }, [category, city, locality, pidSearch, debouncedMaxPrice, type, bedrooms, verifiedOnly]);

  // Reset lazy load batch size whenever filter options change (unless restoring scroll position)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSavedScroll = sessionStorage.getItem('properties_scroll_pid');
      if (hasSavedScroll) return;
    }
    setDisplayedCount(21);
  }, [category, city, locality, pidSearch, debouncedMaxPrice, type, bedrooms, verifiedOnly]);

  // Restore scroll position when navigating back from a property detail page
  useEffect(() => {
    if (loading || properties.length === 0) return;
    if (typeof window === 'undefined') return;

    const savedPid = sessionStorage.getItem('properties_scroll_pid');
    const savedY = sessionStorage.getItem('properties_scroll_y');

    if (!savedPid && !savedY) return;

    // Expand displayed count if the target property is beyond current pagination batch
    if (savedPid) {
      const targetIdx = properties.findIndex(p => p.pid === savedPid || p.id === savedPid);
      if (targetIdx >= 0 && targetIdx >= displayedCount) {
        setDisplayedCount(Math.ceil((targetIdx + 1) / 21) * 21);
      }
    }

    const restore = () => {
      if (savedPid) {
        const el = document.getElementById(`prop-card-${savedPid}`);
        if (el) {
          el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
          sessionStorage.removeItem('properties_scroll_pid');
          sessionStorage.removeItem('properties_scroll_y');
          return true;
        }
      }
      if (savedY && Number(savedY) > 0) {
        window.scrollTo({ top: Number(savedY), behavior: 'instant' });
        sessionStorage.removeItem('properties_scroll_pid');
        sessionStorage.removeItem('properties_scroll_y');
        return true;
      }
      return false;
    };

    if (!restore()) {
      const raf = requestAnimationFrame(() => {
        if (!restore()) {
          setTimeout(restore, 120);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [loading, properties, displayedCount]);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setLocality('');
    setDisplayedCount(21);
  };

  const handleResetFilters = () => {
    setCategory('all');
    setCity('all');
    setLocality('');
    setPidSearch('');
    setMaxPrice(defaultRentMax);
    setType('all');
    setBedrooms('all');
    setVerifiedOnly(false);
    setDisplayedCount(21);
    router.push('/properties');
  };

  const handleContactClick = (p: PropertyItem) => {
    if (!user) {
      showToast('Please login to contact the property owner');
      openAuthModal();
      return;
    }
    setSelectedPropertyForInquiry(p);
  };

  const getDynamicPageHeading = () => {
    const typeNames: Record<string, string> = {
      flat: 'Apartments & Flats',
      house: 'Houses & Villas',
      pg: 'PG & Hostels',
      commercial: 'Commercial Properties'
    };

    const typeLabel = type !== 'all' ? typeNames[type] || type : 'Properties';
    const cityLabel = city !== 'all' ? `in ${city}` : 'in Chandigarh Tricity';
    const purposeLabel = category === 'buy' ? 'for Sale' : category === 'rent' ? 'for Rent' : category === 'pg' || type === 'pg' ? 'PG & Rooms' : '';
    const localityLabel = locality ? `(${locality})` : '';

    return `${typeLabel} ${purposeLabel} ${cityLabel} ${localityLabel}`.replace(/\s+/g, ' ').trim();
  };

  const getBreadcrumbTypeLabel = () => {
    if (type === 'flat') return 'Apartments';
    if (type === 'house') return 'Houses';
    if (type === 'pg') return 'PG & Hostels';
    if (type === 'commercial') return 'Commercial';
    if (category === 'pg') return 'PG';
    if (category === 'buy') return 'Buy';
    return 'Properties';
  };

  const visibleAll = orderedProperties.slice(0, displayedCount);
  const exactLocationTitle = locality ? (city !== 'all' ? `${locality}, ${city}` : locality) : city;

  const exactPg = exactMatches.filter(isPgProperty);
  const nearbyPg = nearbyMatches.filter(isPgProperty);
  const exactOneBhk = exactMatches.filter(p => !isPgProperty(p));
  const nearbyOneBhk = nearbyMatches.filter(p => !isPgProperty(p));

  const allPg = orderedProperties.filter(isPgProperty);
  const allOneBhk = orderedProperties.filter(p => !isPgProperty(p));

  return (
    <div className="bg-[#050806] text-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-h-[85vh]">
        {/* Top Back Navigation Bar & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              router.push('/');
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0a140f] border border-emerald-900/80 hover:border-emerald-500 hover:bg-[#0f2219] text-gray-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95 group cursor-pointer"
          >
            <ArrowLeft size={15} className="text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>

          {/* Breadcrumb Links */}
          <nav className="flex items-center space-x-1.5 text-xs text-gray-400 overflow-x-auto whitespace-nowrap py-1">
            <Link href="/" className="hover:text-emerald-400 transition-colors flex items-center space-x-1">
              <HomeIcon size={12} className="text-emerald-400" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="text-emerald-400 font-semibold">{getBreadcrumbTypeLabel()}</span>
            {city !== 'all' && (
              <>
                <span>/</span>
                <span className="text-gray-300 font-semibold">{city}</span>
              </>
            )}
            {locality && (
              <>
                <span>/</span>
                <span className="text-emerald-400 font-semibold">{locality}</span>
              </>
            )}
          </nav>
        </div>

        {/* Dynamic SEO Header */}
        <div className="space-y-1.5 border-b border-emerald-950 pb-5">
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            {getDynamicPageHeading()}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Verified direct-owner real estate options across Chandigarh, Mohali, Panchkula, Zirakpur & Kharar at 0% brokerage.
          </p>
        </div>

        {/* Mobile Filter Trigger Button */}
        <div className="md:hidden flex items-center justify-between bg-[#0a110d] p-3 rounded-2xl border border-emerald-950/80">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-md"
          >
            <SlidersHorizontal size={14} />
            <span>Filter Properties</span>
          </button>

          {(category !== 'all' || city !== 'all' || locality || type !== 'all' || bedrooms !== 'all' || verifiedOnly) && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={handleResetFilters}
              className="text-xs text-gray-400 hover:text-emerald-400 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Mobile Filter Drawer Modal (Full Width) */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md md:hidden flex flex-col animate-in fade-in duration-200">
            <div className="w-full h-full bg-[#0a110d] overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between pb-24">
              <div className="space-y-6 max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
                  <div className="flex items-center space-x-2">
                    <Filter size={20} className="text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">Filter Properties</h3>
                  </div>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 rounded-xl bg-[#0e261a] border border-emerald-900/80 text-gray-300 hover:text-white hover:bg-emerald-900/50 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Purpose Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Purpose</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => handleCategoryChange('all')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'all'
                        ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                        : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                        }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => handleCategoryChange('rent')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'rent'
                        ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                        : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                        }`}
                    >
                      Rent
                    </button>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => handleCategoryChange('buy')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'buy' || category === 'sell'
                        ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                        : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                        }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => handleCategoryChange('pg')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'pg'
                        ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                        : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                        }`}
                    >
                      PG
                    </button>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => handleCategoryChange('commercial')}
                      className={`col-span-2 px-3 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'commercial'
                        ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                        : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                        }`}
                    >
                      Commercial
                    </button>
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">City</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'all', label: 'All Cities' },
                      { value: 'Mohali', label: 'Mohali' },
                      { value: 'Chandigarh', label: 'Chandigarh' },
                      { value: 'Kharar', label: 'Kharar' },
                      { value: 'Zirakpur', label: 'Zirakpur' },
                      { value: 'Panchkula', label: 'Panchkula' }
                    ].map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        suppressHydrationWarning
                        onClick={() => handleCityChange(c.value)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center truncate ${city === c.value
                          ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                          : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                          }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Property Type</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { value: 'all', label: 'All Types' },
                      { value: 'flat', label: 'Flat' },
                      { value: 'house', label: 'House' },
                      { value: 'pg', label: 'PG' },
                      { value: 'commercial', label: 'Commercial' }
                    ].map((t, idx) => (
                      <button
                        key={t.value}
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setType(t.value)}
                        className={`${idx === 0 ? 'col-span-2' : ''} py-2.5 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center truncate ${type === t.value
                          ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                          : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Budget Slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-300">Max Budget</span>
                    <span className="text-emerald-400 font-extrabold">
                      {`₹${maxPrice.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    suppressHydrationWarning
                    min={isBuyOrSell(category) ? 1000000 : 5000}
                    max={isBuyOrSell(category) ? defaultBuyMax : defaultRentMax}
                    step={isBuyOrSell(category) ? 500000 : 5000}
                    value={maxPrice > (isBuyOrSell(category) ? defaultBuyMax : defaultRentMax) ? (isBuyOrSell(category) ? defaultBuyMax : defaultRentMax) : maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>{isBuyOrSell(category) ? '₹10 Lakhs' : '₹5,000'}</span>
                    <span>{isBuyOrSell(category) ? '₹5 Cr+' : '₹15 Lakhs+'}</span>
                  </div>
                </div>

                {/* Bedrooms */}
                {category !== 'commercial' && type !== 'commercial' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">Bedrooms (BHK)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['all', '0.5', '1', '2', '3', '4+'].map((bhk) => (
                        <button
                          key={bhk}
                          type="button"
                          suppressHydrationWarning
                          onClick={() => setBedrooms(bhk)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${bedrooms === bhk
                            ? 'bg-emerald-500 text-black border-emerald-500 shadow-md font-extrabold'
                            : 'bg-[#050806] text-gray-400 border-emerald-950 hover:text-white'
                            }`}
                        >
                          {bhk === 'all' ? 'All' : bhk === '0.5' ? '1 RK' : bhk === '4+' ? '4+ BHK' : `${bhk} BHK`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}


              </div>

              <div className="pt-4 border-t border-emerald-950 space-y-2 max-w-lg mx-auto w-full">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => {
                    handleResetFilters();
                    setIsMobileFilterOpen(false);
                  }}
                  className="w-full py-2.5 bg-transparent text-gray-400 hover:text-white rounded-xl font-semibold text-xs text-center cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Content Layout (Desktop Sidebar + Main Listing Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Left Filter Sidebar */}
          <aside className="hidden md:block bg-[#0a110d] p-4 rounded-3xl border border-emerald-950/90 shadow-xl space-y-3.5 sticky top-20">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5">
              <div className="flex items-center space-x-1.5">
                <Filter size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Filters</h3>
              </div>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleResetFilters}
                className="text-[11px] text-gray-400 hover:text-emerald-400 font-semibold cursor-pointer transition-colors"
                title="Reset all filters"
              >
                Reset All
              </button>
            </div>

            {/* Purpose Category */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">Purpose</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleCategoryChange('all')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'all'
                    ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                    : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                    }`}
                >
                  All
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleCategoryChange('rent')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'rent'
                    ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                    : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                    }`}
                >
                  Rent
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleCategoryChange('buy')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'buy' || category === 'sell'
                    ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                    : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                    }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleCategoryChange('pg')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'pg'
                    ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                    : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                    }`}
                >
                  PG
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleCategoryChange('commercial')}
                  className={`col-span-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all cursor-pointer text-center ${category === 'commercial'
                    ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                    : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                    }`}
                >
                  Commercial
                </button>
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">City</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'all', label: 'All Cities' },
                  { value: 'Mohali', label: 'Mohali' },
                  { value: 'Chandigarh', label: 'Chandigarh' },
                  { value: 'Kharar', label: 'Kharar' },
                  { value: 'Zirakpur', label: 'Zirakpur' },
                  { value: 'Panchkula', label: 'Panchkula' }
                ].map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => handleCityChange(c.value)}
                    className={`py-1.5 px-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer text-center truncate ${city === c.value
                      ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                      : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                      }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">Property Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'flat', label: 'Flat' },
                  { value: 'house', label: 'House' },
                  { value: 'pg', label: 'PG' },
                  { value: 'commercial', label: 'Commercial' }
                ].map((t, idx) => (
                  <button
                    key={t.value}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setType(t.value)}
                    className={`${idx === 0 ? 'col-span-2' : ''} py-1.5 px-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center truncate ${type === t.value
                      ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                      : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Budget Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-gray-300">Max Budget</span>
                <span className="text-emerald-400 font-extrabold text-xs">
                  {`₹${maxPrice.toLocaleString('en-IN')}`}
                </span>
              </div>
              <input
                type="range"
                suppressHydrationWarning
                min={isBuyOrSell(category) ? 1000000 : 5000}
                max={isBuyOrSell(category) ? defaultBuyMax : defaultRentMax}
                step={isBuyOrSell(category) ? 500000 : 5000}
                value={maxPrice > (isBuyOrSell(category) ? defaultBuyMax : defaultRentMax) ? (isBuyOrSell(category) ? defaultBuyMax : defaultRentMax) : maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9.5px] text-gray-400 mt-0.5">
                <span>{isBuyOrSell(category) ? '₹10 Lakhs' : '₹5,000'}</span>
                <span>{isBuyOrSell(category) ? '₹5 Cr+' : '₹15 Lakhs+'}</span>
              </div>
            </div>

            {/* Bedrooms (Residential Only) */}
            {category !== 'commercial' && type !== 'commercial' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Bedrooms (BHK)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['all', '0.5', '1', '2', '3', '4+'].map((bhk) => (
                    <button
                      key={bhk}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setBedrooms(bhk)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${bedrooms === bhk
                        ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-md'
                        : 'bg-[#050806] text-gray-400 border-emerald-950 hover:text-white'
                        }`}
                    >
                      {bhk === 'all' ? 'All' : bhk === '0.5' ? '1 RK' : bhk === '4+' ? '4+ BHK' : `${bhk} BHK`}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </aside>

          {/* Main Property Listings Grid */}
          <main className="md:col-span-2 lg:col-span-3 space-y-6">
            {/* Active Locality Filter Pill */}
            {locality && (
              <div className="flex items-center space-x-2 bg-[#0a110d] px-4 py-2.5 rounded-2xl border border-emerald-950/80">
                <span className="text-xs text-gray-400 font-medium">Filtering by Locality:</span>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#0e261a] border border-emerald-800 text-emerald-400 text-xs font-bold rounded-full">
                  <span>{locality}</span>
                  <button
                    type="button"
                    onClick={() => setLocality('')}
                    className="hover:text-white cursor-pointer ml-1 transition-colors"
                    title="Clear locality filter"
                  >
                    <X size={12} />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setLocality('')}
                  className="text-[11px] text-gray-400 hover:text-emerald-400 font-semibold underline underline-offset-2 ml-auto cursor-pointer"
                >
                  Clear Locality
                </button>
              </div>
            )}

            {loading ? (
              <SkeletonGrid count={6} />
            ) : properties.length === 0 || (hasLocationFilter && exactMatches.length === 0 && nearbyMatches.length === 0) ? (
              <div className="bg-[#0a110d] p-12 text-center rounded-3xl border border-emerald-950 shadow-xl space-y-4">
                <div className="w-16 h-16 bg-[#0e261a] text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-800/60">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-white">No properties matched your filters</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Try expanding your budget range or selecting "All Cities" to view more verified 0% brokerage options.
                </p>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : hasLocationFilter ? (
              isPgFilter ? (
                <div className="space-y-10">
                  {/* 1A. Exact Location PG Matches */}
                  {exactPg.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-base sm:text-lg font-extrabold text-white">
                        PG & Hostels in {exactLocationTitle}
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exactPg.slice(0, displayedCount).map((property) => (
                          <PropertyCard
                            key={property.id || property.pid}
                            property={property}
                            onContactClick={handleContactClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1B. Nearby Location PG Recommendations */}
                  {nearbyPg.length > 0 && (
                    <div className={`space-y-5 ${exactPg.length > 0 ? 'pt-8 border-t border-emerald-950/80' : ''}`}>
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
                          <Sparkles size={13} />
                          <span>Nearby PG Options</span>
                        </div>
                        <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                          Similar PG & Hostels in nearby locations
                        </h2>
                        <p className="text-xs text-gray-400 max-w-2xl">
                          {exactPg.length > 0
                            ? `Since you searched in ${exactLocationTitle}, here are verified PG & hostel options in surrounding sectors and nearby areas.`
                            : `No PG listings found in this exact location. Here are verified PG & hostel options in nearby areas:`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nearbyPg.slice(0, displayedCount).map((property) => (
                          <PropertyCard
                            key={property.id || property.pid}
                            property={property}
                            onContactClick={handleContactClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. 1 BHK Section (Lower: strictly below ALL PG listings) */}
                  {(exactOneBhk.length > 0 || nearbyOneBhk.length > 0) && (
                    <div className={`space-y-8 ${exactPg.length > 0 || nearbyPg.length > 0 ? 'pt-10 border-t border-emerald-950/80' : ''}`}>
                      {/* 2A. Exact Location 1 BHK Matches */}
                      {exactOneBhk.length > 0 && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
                              <Sparkles size={13} />
                              <span>Private Living Options</span>
                            </div>
                            <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                              1 BHK Flats & Rentals in {exactLocationTitle}
                            </h2>
                            <p className="text-xs text-gray-400 max-w-2xl">
                              Looking for independent living or private space? Explore verified 1 BHK homes available for rent in {exactLocationTitle}.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {exactOneBhk.slice(0, displayedCount).map((property) => (
                              <PropertyCard
                                key={property.id || property.pid}
                                property={property}
                                onContactClick={handleContactClick}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2B. Nearby Location 1 BHK Recommendations */}
                      {nearbyOneBhk.length > 0 && (
                        <div className={`space-y-5 ${exactOneBhk.length > 0 ? 'pt-8 border-t border-emerald-950/80' : ''}`}>
                          <div className="space-y-1.5">
                            {exactOneBhk.length === 0 && (
                              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
                                <Sparkles size={13} />
                                <span>Private Living Options</span>
                              </div>
                            )}
                            <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                              Similar 1 BHK Flats in nearby locations
                            </h2>
                            <p className="text-xs text-gray-400 max-w-2xl">
                              Explore verified 1 BHK homes and flats in surrounding sectors and nearby areas.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {nearbyOneBhk.slice(0, displayedCount).map((property) => (
                              <PropertyCard
                                key={property.id || property.pid}
                                property={property}
                                onContactClick={handleContactClick}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show More Pagination */}
                  {(displayedCount < exactMatches.length || displayedCount < nearbyMatches.length) ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-4">
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setDisplayedCount(prev => prev + 21)}
                        className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs rounded-full shadow-xl shadow-emerald-500/25 transition-all cursor-pointer flex items-center space-x-2.5"
                      >
                        <span>Show More Properties</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400 font-semibold border-t border-emerald-950/60 mt-6">
                      ✨ Showing all verified properties in Tricity
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  {/* Non-PG: Exact Location Matches */}
                  {exactMatches.length > 0 && (
                    <div className="space-y-5">
                      <h2 className="text-base sm:text-lg font-extrabold text-white">
                        Properties in {exactLocationTitle}
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exactMatches.slice(0, displayedCount).map((property) => (
                          <PropertyCard
                            key={property.id || property.pid}
                            property={property}
                            onContactClick={handleContactClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Non-PG: Nearby Location Recommendations */}
                  {nearbyMatches.length > 0 && (
                    <div className={`space-y-5 ${exactMatches.length > 0 ? 'pt-8 border-t border-emerald-950/80' : ''}`}>
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
                          <Sparkles size={13} />
                          <span>Nearby Options in Tricity</span>
                        </div>
                        <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                          Similar properties in nearby locations
                        </h2>
                        <p className="text-xs text-gray-400 max-w-2xl">
                          {exactMatches.length > 0
                            ? `Since you searched in ${exactLocationTitle}, here are verified options in surrounding sectors and nearby areas matching your criteria.`
                            : `No properties found in this exact location matching all filters. Here are top verified options in nearby areas:`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nearbyMatches.slice(0, displayedCount).map((property) => (
                          <PropertyCard
                            key={property.id || property.pid}
                            property={property}
                            onContactClick={handleContactClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show More Pagination */}
                  {(displayedCount < exactMatches.length || displayedCount < nearbyMatches.length) ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-4">
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setDisplayedCount(prev => prev + 21)}
                        className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs rounded-full shadow-xl shadow-emerald-500/25 transition-all cursor-pointer flex items-center space-x-2.5"
                      >
                        <span>Show More Properties</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400 font-semibold border-t border-emerald-950/60 mt-6">
                      ✨ Showing all verified properties in Tricity
                    </div>
                  )}
                </div>
              )
            ) : isPgFilter ? (
              <>
                {/* Upper: All PG Listings */}
                {allPg.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-base sm:text-lg font-extrabold text-white">
                      PG & Hostel Listings
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allPg.slice(0, displayedCount).map((property) => (
                        <PropertyCard
                          key={property.id || property.pid}
                          property={property}
                          onContactClick={handleContactClick}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Lower: 1 BHK Listings strictly below ALL PG listings */}
                {allOneBhk.length > 0 && (
                  <div className={`space-y-5 ${allPg.length > 0 ? 'pt-10 border-t border-emerald-950/80' : ''}`}>
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
                        <Sparkles size={13} />
                        <span>Private Living Options</span>
                      </div>
                      <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                        1 BHK Flats & Rental Options
                      </h2>
                      <p className="text-xs text-gray-400 max-w-2xl">
                        Looking for independent living or private space? Explore verified 1 BHK homes and flats available for rent in Tricity.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allOneBhk.slice(0, displayedCount).map((property) => (
                        <PropertyCard
                          key={property.id || property.pid}
                          property={property}
                          onContactClick={handleContactClick}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual "Show More Properties" (+21) Pagination Controls */}
                {displayedCount < orderedProperties.length ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setDisplayedCount(prev => prev + 21)}
                      className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs rounded-full shadow-xl shadow-emerald-500/25 transition-all cursor-pointer flex items-center space-x-2.5"
                    >
                      <span>Show More Properties</span>
                    </button>
                  </div>
                ) : orderedProperties.length > 0 ? (
                  <div className="py-10 text-center text-xs text-gray-400 font-semibold border-t border-emerald-950/60 mt-8">
                    ✨ Showing all verified properties in Tricity
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleAll.map((property) => (
                    <PropertyCard
                      key={property.id || property.pid}
                      property={property}
                      onContactClick={handleContactClick}
                    />
                  ))}
                </div>

                {/* Manual "Show More Properties" (+21) Pagination Controls */}
                {displayedCount < orderedProperties.length ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setDisplayedCount(prev => prev + 21)}
                      className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-xs rounded-full shadow-xl shadow-emerald-500/25 transition-all cursor-pointer flex items-center space-x-2.5"
                    >
                      <span>Show More Properties</span>
                    </button>
                  </div>
                ) : orderedProperties.length > 0 ? (
                  <div className="py-10 text-center text-xs text-gray-400 font-semibold border-t border-emerald-950/60 mt-8">
                    ✨ Showing all verified properties in Tricity
                  </div>
                ) : null}
              </>
            )}
          </main>
        </div>

        <InquiryModal
          property={selectedPropertyForInquiry}
          onClose={() => setSelectedPropertyForInquiry(null)}
        />
      </div>
    </div>
  );
}

export default function PropertySearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <SkeletonGrid count={6} />
      </div>
    }>
      <PropertySearchContent />
    </Suspense>
  );
}
