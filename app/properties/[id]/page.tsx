'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, MapPin, Bed, Bath, Maximize, Heart, PhoneCall,
  ChevronLeft, ChevronRight, Check, User, Copy, Grid, X, Camera, Image as ImageIcon, Building2, Sparkles, Video, Play, Edit3,
  Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { formatPrice } from '@/lib/format';
import { useApp } from '@/context/AppContext';
import { InquiryModal } from '@/components/InquiryModal';
import { LazyImage } from '@/components/LazyImage';
import { BrandSpinner } from '@/components/Loader';
import { PropertyCard } from '@/components/PropertyCard';
import { CENTRAL_CONTACT_PHONE } from '@/lib/contactConfig';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { user, setUser, openAuthModal, toggleWishlist, isWishlisted, showToast } = useApp();
  const [property, setProperty] = useState<PropertyItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [similarProperties, setSimilarProperties] = useState<PropertyItem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(false);
  const [unlockedPhone, setUnlockedPhone] = useState<string | null>(null);
  const [unlockedName, setUnlockedName] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [totalSimilarCount, setTotalSimilarCount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const similarSliderRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (isLightboxOpen && thumbnailRefs.current[currentImgIndex]) {
      thumbnailRefs.current[currentImgIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentImgIndex, isLightboxOpen]);


  const scrollSimilarSlider = (direction: 'left' | 'right') => {
    if (similarSliderRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      similarSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [id]);

  useEffect(() => {
    async function fetchProperty() {
      if (!id) return;
      try {
        const res = await fetch(`/api/properties/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setProperty(data.data);
        } else {
          setProperty(null);
        }
      } catch (e) {
        console.warn('Property detail fetch error:', e);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [id, user?.email, user?.role]);

  // Fetch Similar Properties based on BHK / Category / Locality
  useEffect(() => {
    async function fetchSimilarProperties() {
      if (!property) return;
      setLoadingSimilar(true);
      try {
        const isPg = property.category === 'pg' || property.type === 'pg';
        const is1Bhk = property.bedrooms === 1;

        const queryParams = new URLSearchParams();
        if (isPg) {
          queryParams.set('category', 'pg,rent');
        } else if (is1Bhk) {
          queryParams.set('category', 'rent,pg');
          queryParams.set('bedrooms', '1');
        } else if (property.bedrooms && property.bedrooms > 0) {
          if (property.bedrooms === 3 || property.bedrooms === 4) {
            queryParams.set('bedrooms', '3,4');
          } else {
            queryParams.set('bedrooms', String(property.bedrooms));
          }
          if (property.category) {
            queryParams.set('category', property.category);
          }
        } else if (property.category) {
          queryParams.set('category', property.category);
        }
        queryParams.set('limit', '50');

        const res = await fetch(`/api/properties?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          const currentPid = property.pid?.toUpperCase();
          const currentId = property.id;
          const currentMongoId = (property as any)._id?.toString();

          // Filter out the active property, inactive properties, and ensure relevance
          const filtered = data.data.filter((p: PropertyItem) => {
            if (p.available === false) return false;
            if (p.pid && currentPid && p.pid.toUpperCase() === currentPid) return false;
            if (p.id && currentId && p.id === currentId) return false;
            if ((p as any)._id && currentMongoId && (p as any)._id.toString() === currentMongoId) return false;

            if (isPg) {
              return p.category === 'pg' || p.type === 'pg' || p.bedrooms === 1;
            }
            if (is1Bhk) {
              return p.bedrooms === 1 || p.category === 'pg' || p.type === 'pg';
            }
            return true;
          });

          // Sort by exact category/BHK match first, then locality match, then city match, then price proximity
          const sorted = filtered.sort((a: PropertyItem, b: PropertyItem) => {
            if (isPg) {
              const aIsPg = a.category === 'pg' || a.type === 'pg';
              const bIsPg = b.category === 'pg' || b.type === 'pg';
              if (aIsPg && !bIsPg) return -1;
              if (!aIsPg && bIsPg) return 1;
            } else if (is1Bhk) {
              const aIs1Bhk = a.bedrooms === 1 && a.category !== 'pg';
              const bIs1Bhk = b.bedrooms === 1 && b.category !== 'pg';
              if (aIs1Bhk && !bIs1Bhk) return -1;
              if (!aIs1Bhk && bIs1Bhk) return 1;
            } else {
              const aExactBhk = a.bedrooms === property.bedrooms;
              const bExactBhk = b.bedrooms === property.bedrooms;
              if (aExactBhk && !bExactBhk) return -1;
              if (!aExactBhk && bExactBhk) return 1;
            }

            const aLocalityMatch = a.locality && property.locality && a.locality.toLowerCase() === property.locality.toLowerCase();
            const bLocalityMatch = b.locality && property.locality && b.locality.toLowerCase() === property.locality.toLowerCase();
            if (aLocalityMatch && !bLocalityMatch) return -1;
            if (!aLocalityMatch && bLocalityMatch) return 1;

            const aCityMatch = a.city && property.city && a.city.toLowerCase() === property.city.toLowerCase();
            const bCityMatch = b.city && property.city && b.city.toLowerCase() === property.city.toLowerCase();
            if (aCityMatch && !bCityMatch) return -1;
            if (!aCityMatch && bCityMatch) return 1;

            const numA = parseInt(String(a.price).replace(/[^0-9]/g, ''), 10) || 0;
            const numB = parseInt(String(b.price).replace(/[^0-9]/g, ''), 10) || 0;
            const numProp = parseInt(String(property.price).replace(/[^0-9]/g, ''), 10) || 0;
            const aDiff = Math.abs(numA - numProp);
            const bDiff = Math.abs(numB - numProp);
            return aDiff - bDiff;
          });

          setSimilarProperties(sorted);
          setTotalSimilarCount(filtered.length);
        } else {
          setSimilarProperties([]);
          setTotalSimilarCount(0);
        }
      } catch (e) {
        console.warn('Similar properties fetch error:', e);
        setSimilarProperties([]);
      } finally {
        setLoadingSimilar(false);
      }
    }

    fetchSimilarProperties();
  }, [property?.pid, property?.id, property?.bedrooms, property?.category, property?.type, property?.locality, property?.city, property?.price]);

  // Helper functions for videos
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
    }
    return null;
  };

  const getVideoPoster = (url: string) => {
    if (!url) return '';
    if (url.includes('res.cloudinary.com')) {
      return url.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg').replace('/video/upload/', '/video/upload/so_0,q_auto,f_auto/');
    }
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return property?.images?.[0] || '';
  };

  const rawVideos = property?.videos && property.videos.length > 0
    ? property.videos
    : property?.video ? [property.video] : [];
  const rawImages = property?.images && property.images.length > 0
    ? property.images
    : [];

  const mediaItems: { type: 'video' | 'image'; url: string; poster?: string }[] = [
    ...rawVideos.map((v) => ({
      type: 'video' as const,
      url: v,
      poster: property?.videoThumbnail || getVideoPoster(v) || '',
    })),
    ...rawImages.map((img) => ({
      type: 'image' as const,
      url: img,
    })),
  ];

  const images = mediaItems;

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isLightboxOpen || images.length === 0) return;
    if (e.key === 'ArrowLeft') {
      setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
    } else if (e.key === 'ArrowRight') {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    } else if (e.key === 'Escape') {
      setIsLightboxOpen(false);
    }
  }, [isLightboxOpen, images.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <BrandSpinner message="Loading verified property details..." size="lg" />
      </div>
    );
  }

  if (!property) {
    return notFound();
  }

  const wish = isWishlisted(property.id || property.pid);
  const isAdmin = Boolean(user && user.role === 'admin');
  const isOwner = Boolean(
    user && (
      isAdmin ||
      (user.email && property.ownerEmail && user.email.toLowerCase().trim() === property.ownerEmail.toLowerCase().trim())
    )
  );
  const hasPrivateContactAccess = Boolean(property.ownerName && property.ownerPhone);
  const listedBy = hasPrivateContactAccess ? property.ownerName : 'Verified owner';

  const handleAdminVerifyToggle = async () => {
    if (!property || verifying) return;
    setVerifying(true);
    const targetVerified = !property.verified;
    try {
      const res = await fetch(`/api/properties/${property.pid || property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: targetVerified })
      });
      const data = await res.json();
      if (data.success) {
        setProperty(prev => prev ? { ...prev, verified: targetVerified } : null);
        showToast(targetVerified ? '🎉 Property verified and live!' : 'Property marked as unverified.', 'success');
      } else {
        showToast(data.message || 'Failed to update verification status', 'error');
      }
    } catch {
      showToast('Network error while updating verification', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Property link copied to clipboard!');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = touchStartX - currentX;
    const diffY = touchStartY - currentY;
    if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const diffX = touchStartX - currentX;
    const diffY = touchStartY - currentY;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        setCurrentImgIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setTimeout(() => setIsSwiping(false), 50);
  };

  const renderThumbnailTile = (idx: number, isLastWithMore?: boolean, moreCount?: number) => {
    const item = images[idx];
    if (!item) return null;
    return (
      <button
        key={idx}
        type="button"
        onClick={() => {
          setCurrentImgIndex(idx);
          setIsLightboxOpen(true);
        }}
        className={`relative w-full h-full rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group bg-[#07110a] ${
          currentImgIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-transparent opacity-90 hover:opacity-100'
        }`}
      >
        {item.type === 'video' ? (
          item.poster ? (
            <LazyImage
              src={item.poster}
              alt={`Media ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#06140c] via-[#091e13] to-[#040c07] flex items-center justify-center">
              <Video size={28} className="text-emerald-500/40" />
            </div>
          )
        ) : (
          <LazyImage
            src={item.url}
            alt={`Media ${idx + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play size={18} className="fill-current ml-0.5" />
            </div>
          </div>
        )}
        {isLastWithMore && moreCount && moreCount > 0 ? (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-1">
            <span className="text-base sm:text-xl font-extrabold text-emerald-400 font-mono">+{moreCount}</span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-200">More</span>
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className="bg-[#050806] min-h-screen text-gray-100 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-12">
        {/* Sub-Header / Breadcrumb with Property ID */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer text-xs font-bold text-gray-300 hover:text-emerald-400"
          >
            <ChevronLeft size={16} />
            <span>Back to listings</span>
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleShare}
              className="p-2 bg-[#091710] border border-emerald-950 hover:bg-[#10241a] text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center space-x-1"
              title="Copy Link"
            >
              <Copy size={14} />
              <span className="hidden sm:inline text-xs font-semibold">Copy</span>
            </button>
            <button
              onClick={() => toggleWishlist(property.id || property.pid)}
              className={`p-2 cursor-pointer rounded-xl transition-all ${wish ? 'bg-red-500 text-white' : 'bg-[#091710] text-gray-300 hover:text-white border border-emerald-950'
                }`}
            >
              <Heart size={16} fill={wish ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Owner / Admin Management Quick Banner */}
      {isOwner && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl ${
          property.available === false
            ? 'bg-[#1a1208] border-amber-800/80'
            : !property.verified
            ? 'bg-[#181308] border-amber-700/80'
            : 'bg-[#091810] border-emerald-800/80'
        }`}>
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
              property.available === false
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : !property.verified
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap justify-center sm:justify-start">
                <p className="text-xs font-extrabold text-emerald-300">
                  {isAdmin ? `Admin Moderation View (PROP-ID: ${property.pid?.replace(/^(PZ|LR)-/i, '')})` : `You are managing this listing (PROP-ID: ${property.pid?.replace(/^(PZ|LR)-/i, '')})`}
                </p>
                {property.available === false ? (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-700 text-[9px] font-bold">
                    INACTIVE (HIDDEN)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-bold">
                    ACTIVE & LIVE
                  </span>
                )}
                {property.verified ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-extrabold flex items-center space-x-1">
                    <CheckCircle2 size={10} />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-extrabold flex items-center space-x-1">
                    <Clock size={10} />
                    <span>PENDING VERIFICATION</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isAdmin
                  ? `Review uploaded photos, details, pricing, and owner contact (${property.ownerName || 'Direct Owner'}: ${property.ownerPhone || 'N/A'}).`
                  : 'Update photos, adjust rental pricing, toggle active/inactive status, or edit specifications anytime.'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 flex-wrap justify-center">
            {isAdmin && (
              <button
                type="button"
                disabled={verifying}
                onClick={handleAdminVerifyToggle}
                className={`px-4 py-2 text-xs font-extrabold rounded-full shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                  property.verified
                    ? 'bg-[#180d10] hover:bg-rose-950 text-rose-300 border border-rose-800/80'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                }`}
              >
                {property.verified ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                <span>{property.verified ? 'Unverify Listing' : 'Verify & Approve Now'}</span>
              </button>
            )}
            <Link
              href={`/post-property?edit=${property.pid || property.id}`}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Edit Property</span>
            </Link>
            <Link
              href={isAdmin ? "/admin" : "/dashboard?tab=my-properties"}
              className="px-3.5 py-2 bg-[#050806] hover:bg-[#0c1810] text-gray-300 hover:text-white border border-emerald-900 rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              {isAdmin ? "Admin Portal →" : "My Dashboard"}
            </Link>
          </div>
        </div>
      )}

      {/* Main Header & Tags */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-gray-900 text-white font-mono text-xs font-semibold px-2.5 py-1 rounded-md">
            PROP-ID: {property.pid?.replace(/^(PZ|LR)-/i, '')}
          </span>
          {property.available === false && (
            <span className="bg-zinc-800 text-zinc-300 text-xs font-semibold px-2.5 py-1 rounded-md">
              Inactive Listing
            </span>
          )}
          {property.verified ? (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center space-x-1">
              <ShieldCheck size={14} />
              <span>Verified Listing</span>
            </span>
          ) : (
            <span className="bg-amber-950/90 text-amber-300 border border-amber-800/80 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center space-x-1">
              <Clock size={14} />
              <span>Under Verification (Admin Review)</span>
            </span>
          )}
          <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase">
            0% Brokerage
          </span>
        </div>

        <h1 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight">
          {property.title}
        </h1>

        <div className="flex items-center text-xs sm:text-sm text-gray-400 space-x-2">
          <MapPin size={16} className="text-emerald-500 shrink-0" />
          <span>{property.address}</span>
        </div>
      </div>

      {/* Seamless Photo & Video Gallery Hero Grid */}
      {images.length === 0 ? (
        <div className="relative rounded-3xl overflow-hidden bg-[#070d0a] border border-emerald-950/80 p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px] sm:min-h-[320px]">
          <div className="w-16 h-16 rounded-2xl bg-[#091710] border border-emerald-900/60 flex items-center justify-center text-emerald-400">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">No Photos or Videos Uploaded</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              The owner has not uploaded any photos or walkthrough videos for this listing yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden bg-[#070d0a] border border-emerald-950/80 shadow-2xl">
          <div className="h-[360px] sm:h-[440px] lg:h-[460px] grid grid-cols-1 lg:grid-cols-2 gap-2.5 p-2.5 bg-[#050806]">
            {/* Main Left Featured Frame (50% width on Desktop) */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                if (!isSwiping && images[currentImgIndex]?.type !== 'video') {
                  setIsLightboxOpen(true);
                }
              }}
              className={`relative h-full rounded-2xl overflow-hidden group bg-[#07110a] select-none ${images.length === 1 ? 'lg:col-span-2' : 'lg:col-span-1'} ${images[currentImgIndex]?.type !== 'video' ? 'cursor-pointer' : ''}`}
            >
              {/* Sliding Track */}
              <div
                className="flex w-full h-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}
              >
                {images.map((item, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 relative bg-black flex items-center justify-center overflow-hidden">
                    {item.type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {(() => {
                          const embedUrl = getYouTubeEmbedUrl(item.url);
                          if (embedUrl) {
                            return (
                              <iframe
                                src={embedUrl}
                                title={`${property.title} Video Tour`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full border-0 pointer-events-auto"
                              />
                            );
                          }
                          return (
                            <video
                              controls
                              playsInline
                              preload="metadata"
                              poster={item.poster || undefined}
                              className="w-full h-full object-contain bg-black pointer-events-auto"
                            >
                              <source src={item.url} type="video/mp4" />
                              <source src={item.url} type="video/webm" />
                              Your browser does not support video playback.
                            </video>
                          );
                        })()}
                      </div>
                    ) : (
                      <LazyImage
                        src={item.url}
                        alt={`${property.title} - Photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Navigation Arrows */}
              {images.length > 1 && (
                <div className="hidden sm:flex absolute inset-0 z-20 pointer-events-none items-center justify-between px-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
                    }}
                    className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 backdrop-blur-md shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                    aria-label="Previous media"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImgIndex((prev) => (prev + 1) % images.length);
                    }}
                    className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 backdrop-blur-md shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                    aria-label="Next media"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              {/* Media Counter Badge */}
              <div className="absolute bottom-3 left-3 z-20 bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/10 flex items-center space-x-1.5 shadow-lg pointer-events-none">
                {images[currentImgIndex]?.type === 'video' ? (
                  <>
                    <Video size={13} className="text-emerald-400" />
                    <span>Video {currentImgIndex + 1} of {images.length}</span>
                  </>
                ) : (
                  <>
                    <Camera size={13} className="text-emerald-400" />
                    <span>Photo {currentImgIndex + 1} of {images.length}</span>
                  </>
                )}
              </div>

              {/* Mobile Swipe Pagination Dots */}
              {images.length > 1 && (
                <div className="sm:hidden absolute bottom-3.5 right-3.5 z-20 flex items-center space-x-1 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 pointer-events-none">
                  {images.slice(0, 6).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImgIndex
                          ? 'w-3.5 bg-emerald-400'
                          : 'w-1.5 bg-white/40'
                        }`}
                    />
                  ))}
                  {images.length > 6 && (
                    <span className="text-[9px] text-gray-400 font-mono leading-none">+</span>
                  )}
                </div>
              )}
            </div>

            {/* Right Thumbnails Dynamic Grid Layout for 2 Images */}
            {images.length === 2 && (
              <div className="hidden lg:block lg:col-span-1 h-full min-h-0">
                {renderThumbnailTile(1)}
              </div>
            )}

            {/* Right Thumbnails Dynamic Grid Layout for 3 Images */}
            {images.length === 3 && (
              <div className="hidden lg:grid lg:col-span-1 grid-cols-1 grid-rows-2 gap-2.5 h-full min-h-0">
                {[1, 2].map((actualIndex) => renderThumbnailTile(actualIndex))}
              </div>
            )}

            {/* Right Thumbnails Dynamic Grid Layout for 4 Images */}
            {images.length === 4 && (
              <div className="hidden lg:grid lg:col-span-1 grid-cols-2 grid-rows-2 gap-2.5 h-full min-h-0 overflow-hidden">
                <div className="col-span-2 row-span-1 h-full">
                  {renderThumbnailTile(1)}
                </div>
                <div className="col-span-1 row-span-1 h-full">
                  {renderThumbnailTile(2)}
                </div>
                <div className="col-span-1 row-span-1 h-full">
                  {renderThumbnailTile(3)}
                </div>
              </div>
            )}

            {/* Right Thumbnails Dynamic Grid Layout for 5+ Images */}
            {images.length >= 5 && (
              <div className="hidden lg:grid lg:col-span-1 grid-cols-2 grid-rows-2 gap-2.5 h-full min-h-0 overflow-hidden">
                {[1, 2, 3, 4].map((actualIndex) => {
                  const isLastTile = actualIndex === 4;
                  const remainingCount = images.length - 5;
                  return renderThumbnailTile(actualIndex, isLastTile, remainingCount);
                })}
              </div>
            )}
          </div>


          {/* View All Media Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-4 right-4 z-20 px-4 py-2.5 rounded-2xl bg-black/85 hover:bg-black text-white border border-emerald-500/50 backdrop-blur-md text-xs font-extrabold flex items-center space-x-2 shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Grid size={15} className="text-emerald-400" />
              <span>View All {images.length} Media</span>
            </button>
          )}
        </div>
      )}

      {/* Full-Screen Photo & Video Lightbox Modal */}
      {isLightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-5 pb-6 sm:pb-5 text-white w-screen h-screen overflow-hidden"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-3 gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug break-words">{property.title}</h3>
              <p className="text-[11px] sm:text-xs text-emerald-400 font-mono mt-0.5">
                {images[currentImgIndex]?.type === 'video' ? 'Video' : 'Photo'} {currentImgIndex + 1} of {images.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 sm:p-2.5 rounded-full bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Active Media View */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative flex-1 min-h-0 w-full flex items-center justify-center py-2 overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {images[currentImgIndex]?.type === 'video' ? (
              <div className="w-full max-w-4xl lg:max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-emerald-900/60 flex items-center justify-center">
                {(() => {
                  const currentVideo = images[currentImgIndex];
                  const embedUrl = getYouTubeEmbedUrl(currentVideo.url);
                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        title={`${property.title} Video Tour`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    );
                  }
                  return (
                    <video
                      controls
                      autoPlay
                      playsInline
                      poster={currentVideo.poster || undefined}
                      className="w-full h-full object-contain bg-black"
                    >
                      <source src={currentVideo.url} type="video/mp4" />
                      <source src={currentVideo.url} type="video/webm" />
                      Your browser does not support video playback.
                    </video>
                  );
                })()}
              </div>
            ) : (
              <LazyImage
                src={images[currentImgIndex]?.url || ''}
                alt={property.title}
                className="max-h-[62vh] sm:max-h-[72vh] max-w-4xl lg:max-w-5xl w-auto h-auto object-contain rounded-2xl shadow-2xl"
              />
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="hidden sm:flex absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/70 hover:bg-black border border-white/20 text-white shadow-xl transition-all cursor-pointer items-center justify-center"
                  aria-label="Previous item"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentImgIndex((prev) => (prev + 1) % images.length)}
                  className="hidden sm:flex absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/70 hover:bg-black border border-white/20 text-white shadow-xl transition-all cursor-pointer items-center justify-center"
                  aria-label="Next item"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          <div
            className="pt-2.5 pb-2 border-t border-gray-900 overflow-x-auto no-scrollbar max-w-4xl mx-auto w-full shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-start sm:justify-center gap-2.5 px-3 sm:px-4 w-max min-w-full">
              {images.map((item, idx) => (
                <button
                  key={idx}
                  ref={(el) => {
                    thumbnailRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => setCurrentImgIndex(idx)}
                  className={`relative w-14 h-11 sm:w-16 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    currentImgIndex === idx ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/30' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  {item.type === 'video' ? (
                    item.poster ? (
                      <LazyImage
                        src={item.poster}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#091710] flex items-center justify-center">
                        <Video size={16} className="text-emerald-400" />
                      </div>
                    )
                  ) : (
                    <LazyImage
                      src={item.url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                      <Play size={12} className="text-emerald-400 fill-current" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Specification Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Overview Cards */}
          {(() => {
            const hasArea = Boolean(property.areaSqFt && property.areaSqFt > 0);
            const priceDisplay = formatPrice(property.price);
            const isLongPrice = priceDisplay.length > 12;

            return (
              <div className={`grid grid-cols-2 ${hasArea ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 sm:gap-6 p-5 sm:p-6 bg-[#0a110d] rounded-3xl border border-emerald-950/90 shadow-xl items-start`}>
                <div className={`space-y-1 min-w-0 ${isLongPrice ? 'col-span-2 sm:col-span-1' : 'col-span-1'}`}>
                  <span className="text-xs text-gray-400 block truncate">
                    {property.category === 'commercial' ? 'Commercial Rate' : 'Rent / Price'}
                  </span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span
                      className={`${
                        isLongPrice
                          ? 'text-base sm:text-lg lg:text-xl'
                          : 'text-xl sm:text-2xl'
                      } font-extrabold text-white block whitespace-nowrap tracking-tight`}
                      title={priceDisplay}
                    >
                      {priceDisplay}
                    </span>
                    {(property.category === 'rent' || property.category === 'pg') && (
                      <span className="text-xs text-gray-400 font-normal">/mo</span>
                    )}
                  </div>
                  {property.deposit ? (
                    <span
                      className="text-[11px] text-gray-400 block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
                      title={`Deposit: ${formatPrice(property.deposit)}`}
                    >
                      Deposit: {formatPrice(property.deposit)}
                    </span>
                  ) : null}
                </div>

                {property.category === 'commercial' || property.type === 'commercial' ? (
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs text-gray-400 block truncate">Property Type</span>
                    <span className="text-base font-bold text-white flex items-center space-x-1 whitespace-nowrap">
                      <Building2 size={18} className="text-emerald-500 shrink-0" />
                      <span className="capitalize truncate">Commercial</span>
                    </span>
                  </div>
                ) : (
                  (property.category === 'pg' || property.type === 'pg' || (property.bedrooms !== undefined && property.bedrooms >= 0)) && (
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs text-gray-400 block truncate">Bedrooms / Config</span>
                      <span className="text-base font-bold text-white flex items-center space-x-1 whitespace-nowrap">
                        <Bed size={18} className="text-emerald-500 shrink-0" />
                        <span className="truncate">
                          {property.category === 'pg' || property.type === 'pg' || property.bedrooms === 0
                            ? 'PG'
                            : property.bedrooms === 0.5
                            ? '1 RK'
                            : `${property.bedrooms} BHK`}
                        </span>
                      </span>
                    </div>
                  )
                )}

                {property.bathrooms !== undefined && (
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs text-gray-400 block truncate">
                      {property.category === 'commercial' || property.type === 'commercial' ? 'Washrooms' : 'Bathrooms'}
                    </span>
                    <span className="text-base font-bold text-white flex items-center space-x-1 whitespace-nowrap">
                      <Bath size={18} className="text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {property.bathrooms === 0 ? 'Shared / Common' : `${property.bathrooms} ${(property.category === 'commercial' || property.type === 'commercial') ? (property.bathrooms === 1 ? 'Washroom' : 'Washrooms') : (property.bathrooms === 1 ? 'Bath' : 'Baths')}`}
                      </span>
                    </span>
                  </div>
                )}

                {hasArea && (
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs text-gray-400 block truncate">Super Area</span>
                    <span className="text-base font-bold text-white flex items-center space-x-1 whitespace-nowrap">
                      <Maximize size={18} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{property.areaSqFt} sqft</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })()}


          {/* Description */}
          <div className="bg-[#0a110d] p-6 rounded-3xl border border-emerald-950/90 shadow-xl space-y-3 flex flex-col">
            <h3 className="text-lg font-bold text-white shrink-0">Property Overview & Details</h3>
            <div className="max-h-60 sm:max-h-68 overflow-y-auto pr-3 text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line select-text">
              {property.description}
            </div>
          </div>

          {/* Amenities Checklist */}
          <div className="bg-[#0a110d] p-6 rounded-3xl border border-emerald-950/90 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Features & Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2 text-xs font-semibold text-gray-200 bg-[#06120b] p-3 rounded-xl border border-emerald-950">
                  <div className="w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/80">
                    <Check size={12} />
                  </div>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Owner Contact Sidebar Card */}
        <div className="space-y-6">
          <div className="bg-[#0a110d] p-6 rounded-3xl border border-emerald-950/90 shadow-xl space-y-6 sticky top-24">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div>
                <span className="text-xs text-gray-400 block">Listed By</span>
                <h4 className="text-base font-bold text-white flex items-center space-x-1.5">
                  <User size={16} className="text-emerald-400" />
                  <span>{listedBy}</span>
                </h4>
                <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                  {property.ownerRole}
                </span>
              </div>

              <div className="w-12 h-12 bg-emerald-500 text-black rounded-full flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20">
                {listedBy.charAt(0)}
              </div>
            </div>

            {/* Contact Action Section */}
            <div className="space-y-3">
              {(() => {
                const isUnlocked = Boolean(
                  unlockedPhone ||
                  (property.ownerPhone && property.ownerPhone.length >= 8) ||
                  user?.role === 'admin' ||
                  (property.ownerEmail && property.ownerEmail.toLowerCase() === user?.email?.toLowerCase()) ||
                  (user?.unlockedProperties && (
                    user.unlockedProperties.includes(property.pid) ||
                    user.unlockedProperties.includes(property.id) ||
                    user.unlockedProperties.includes(id)
                  ))
                );
                const displayPhone = CENTRAL_CONTACT_PHONE.display;
                const cleanPhone = CENTRAL_CONTACT_PHONE.intlClean;

                if (isUnlocked) {     
                  return (
                    <div className="space-y-2.5">
                      <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-center space-y-1">
                        <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center space-x-1">
                          <ShieldCheck size={14} />
                          <span>Owner Contact Unlocked</span>
                        </div>
                        <div className="text-base font-extrabold text-white font-mono tracking-wide">
                          {displayPhone}
                        </div>
                      </div>

                      <a
                        href={CENTRAL_CONTACT_PHONE.telUri}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <PhoneCall size={16} />
                        <span>Direct Call ({displayPhone})</span>
                      </a>

                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi, I am interested in your property PROP-ID: ${property.pid?.replace(/^(PZ|LR)-/i, '')} (${property.title}) on PROPZY.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-[#0d2a1b] hover:bg-[#123824] text-emerald-400 border border-emerald-800/80 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                      >
                        <span>Chat on WhatsApp</span>
                      </a>
                    </div>
                  );
                }

                if (user?.role === 'owner') {
                  return (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-2xl text-center">
                      <p className="text-xs text-gray-300">This property is listed on PROPZY. Inquiries are sent directly to the owner.</p>
                    </div>
                  );
                }

                const handleContactClick = async () => {
                  if (!user) {
                    showToast('Please login to get owner contact');
                    openAuthModal();
                    return;
                  }

                  if (user.role === 'owner') {
                    showToast('Inquiry submitted to the owner!');
                    return;
                  }

                  const userCredits = typeof user.credits === 'number' ? user.credits : 0;
                  if (userCredits <= 0 && user.role !== 'admin') {
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }
                    showToast('Please purchase a plan to unlock owner contacts.', 'error');
                    router.push('/plans');
                    return;
                  }

                  setUnlocking(true);
                  try {
                    const res = await fetch(`/api/properties/${property.id || property.pid || id}/unlock-contact`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: user?.email, userId: user?.id })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setUnlockedPhone(CENTRAL_CONTACT_PHONE.raw);
                      setUnlockedName(data.ownerName);
                      if (typeof data.remainingCredits === 'number') {
                        setUser({
                          ...user,
                          credits: data.remainingCredits,
                          unlockedProperties: data.unlockedProperties || [...(user.unlockedProperties || []), property.pid || property.id || id]
                        });
                      }
                      showToast(data.message || 'Contact unlocked successfully!', 'success');
                    } else if (data.needRecharge) {
                      showToast(data.message || 'Please recharge your credits.', 'error');
                      router.push('/plans');
                    } else {
                      showToast(data.message || 'Failed to unlock contact.', 'error');
                    }
                  } catch (err) {
                    showToast('Failed to unlock contact. Please try again.', 'error');
                  } finally {
                    setUnlocking(false);
                  }
                };

                return (
                  <button
                    type="button"
                    disabled={unlocking}
                    onClick={handleContactClick}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-black rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                  >
                    {unlocking ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <PhoneCall size={16} />
                        <span>Contact Now</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            <div className="p-4 bg-[#06120b] rounded-2xl border border-emerald-950 text-[11px] text-gray-300 space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <ShieldCheck size={14} />
                <span>PROPZY Verified Protection</span>
              </div>
              <p>Zero brokerage guarantee. Direct visit scheduling without commission.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SIMILAR HOMES / PROPERTIES RECOMMENDATION HORIZONTAL SCROLLER
      ───────────────────────────────────────────────────────────── */}
      {(loadingSimilar || similarProperties.length > 0) && (
        <section className="pt-8 border-t border-emerald-950/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold mb-2 shadow-inner">
                <Sparkles size={13} />
                <span>Verified Recommendations</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Similar homes nearby
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                {property.category === 'pg' || property.type === 'pg'
                  ? `PG & 1 BHK properties around ${formatPrice(property.price)}${property.locality ? ` in ${property.locality}` : property.city ? ` in ${property.city}` : ''}`
                  : property.bedrooms === 1
                  ? `1 BHK & PG properties around ${formatPrice(property.price)}${property.locality ? ` in ${property.locality}` : property.city ? ` in ${property.city}` : ''}`
                  : property.bedrooms && (property.bedrooms === 3 || property.bedrooms === 4)
                  ? `3 & 4 BHK properties around ${formatPrice(property.price)}${property.locality ? ` in ${property.locality}` : property.city ? ` in ${property.city}` : ''}`
                  : property.bedrooms && property.bedrooms > 0
                  ? `${property.bedrooms} BHK properties around ${formatPrice(property.price)}${property.locality ? ` in ${property.locality}` : property.city ? ` in ${property.city}` : ''}`
                  : `Similar ${property.category === 'commercial' || property.type === 'commercial' ? 'Commercial' : ''} properties in ${property.city || 'Tricity'}`}
              </p>
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
              {totalSimilarCount > 0 && (
                <Link
                  href={
                    property.category === 'pg' || property.type === 'pg'
                      ? `/properties?category=pg`
                      : property.bedrooms && property.bedrooms > 0
                      ? `/properties?bedrooms=${property.bedrooms}${property.category ? `&category=${property.category}` : ''}`
                      : `/properties?category=${property.category}`
                  }
                  className="inline-flex items-center justify-center px-4 h-10 rounded-2xl bg-[#08120b] border border-emerald-900/80 hover:border-emerald-500 hover:bg-emerald-500 hover:text-black text-emerald-400 font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer mr-1"
                >
                  <span>See all</span>
                </Link>
              )}

              {/* Slider Left & Right Arrow Buttons */}
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => scrollSimilarSlider('left')}
                className="w-10 h-10 rounded-2xl bg-[#08120b] border border-emerald-900/80 hover:border-emerald-500 hover:bg-emerald-500 hover:text-black text-emerald-400 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                aria-label="Previous properties"
              >
                <ChevronLeft size={18} className="stroke-[2.5]" />
              </button>

              <button
                type="button"
                suppressHydrationWarning
                onClick={() => scrollSimilarSlider('right')}
                className="w-10 h-10 rounded-2xl bg-[#08120b] border border-emerald-900/80 hover:border-emerald-500 hover:bg-emerald-500 hover:text-black text-emerald-400 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                aria-label="Next properties"
              >
                <ChevronRight size={18} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroller Container */}
          <div
            ref={similarSliderRef}
            className="flex space-x-4 sm:space-x-6 overflow-x-auto pb-6 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loadingSimilar ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`similar-skel-${i}`}
                  className="w-[82vw] max-w-[340px] sm:w-80 lg:w-[360px] shrink-0 snap-center sm:snap-start h-88 rounded-3xl bg-[#0a110d] border border-emerald-950/80 animate-pulse"
                />
              ))
            ) : (
              similarProperties.map((item) => (
                <div
                  key={item.id || item.pid}
                  className="w-[82vw] max-w-[340px] sm:w-80 lg:w-[360px] shrink-0 snap-center sm:snap-start flex flex-col"
                >
                  <PropertyCard property={item} />
                </div>
              ))
            )}
          </div>
        </section>
      )}

      </div>

      <InquiryModal
        property={showInquiryModal ? property : null}
        onClose={() => setShowInquiryModal(false)}
      />
    </div>
  );
}
