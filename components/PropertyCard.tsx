'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShieldCheck, MapPin, Bed, Bath, Maximize, PhoneCall, ChevronLeft, ChevronRight, UserCheck, Building2, Video, Play } from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { useApp } from '@/context/AppContext';

import { LazyImage } from '@/components/LazyImage';

interface PropertyCardProps {
  property: PropertyItem;
  onContactClick?: (property: PropertyItem) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = React.memo(({ property, onContactClick }) => {
  const router = useRouter();
  const { user, openAuthModal, showToast, toggleWishlist, isWishlisted } = useApp();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const wish = mounted ? (isWishlisted(property.pid) || (property.id ? isWishlisted(property.id) : false)) : false;

  const rawVideos = property.videos && property.videos.length > 0
    ? property.videos
    : property.video ? [property.video] : [];
  const rawImages = property.images && property.images.length > 0
    ? property.images
    : [];

  const getVideoPoster = (url: string) => {
    if (!url) return '';
    if (url.includes('res.cloudinary.com')) {
      return url.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg').replace('/video/upload/', '/video/upload/so_0,q_auto,f_auto/');
    }
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return '';
  };

  const videoPoster = rawVideos.length > 0
    ? (property.videoThumbnail || getVideoPoster(rawVideos[0]))
    : '';

  const mediaList: { url: string; isVideo: boolean }[] = [
    ...(rawVideos.length > 0 ? [{ url: videoPoster, isVideo: true }] : []),
    ...rawImages.map(img => ({ url: img, isVideo: false }))
  ];

  const images = mediaList;

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const formatPrice = (val: number | string | any) => {
    if (val === undefined || val === null || val === '') return '₹0';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.includes('-')) {
        const parts = trimmed.split('-').map(p => p.trim().replace(/[^0-9.]/g, ''));
        if (parts.length === 2 && parts[0] && parts[1]) {
          const p1 = Number(parts[0]);
          const p2 = Number(parts[1]);
          if (!isNaN(p1) && !isNaN(p2)) {
            return `₹${p1.toLocaleString('en-IN')} - ₹${p2.toLocaleString('en-IN')}`;
          }
        }
        return trimmed.startsWith('₹') ? trimmed : `₹${trimmed}`;
      }
      const num = Number(trimmed.replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        val = num;
      } else {
        return trimmed.startsWith('₹') ? trimmed : `₹${trimmed}`;
      }
    }
    const numVal = Number(val);
    if (numVal >= 10000000) return `₹${(numVal / 10000000).toFixed(2)} Cr`;
    if (numVal >= 100000) return `₹${(numVal / 100000).toFixed(2)} Lakh`;
    return `₹${numVal.toLocaleString('en-IN')}`;
  };

  const propertyUrl = `/properties/${property.pid || property.id}`;

  const saveScrollState = () => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const pid = property.pid || property.id;
      if (currentPath === '/') {
        sessionStorage.setItem('home_scroll_y', String(window.scrollY));
        if (pid) sessionStorage.setItem('home_scroll_pid', String(pid));
      } else if (currentPath.startsWith('/properties')) {
        sessionStorage.setItem('properties_scroll_y', String(window.scrollY));
        if (pid) sessionStorage.setItem('properties_scroll_pid', String(pid));
      }
    }
  };

  return (
    <Link
      id={`prop-card-${property.pid || property.id}`}
      href={propertyUrl}
      onClick={saveScrollState}
      className="group bg-[#0a110d] rounded-3xl border border-emerald-950/90 hover:border-emerald-800/60 shadow-xl hover:shadow-emerald-950/40 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer"
    >
      {/* Photo Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-[#050806] flex items-center justify-center">
        {images.length > 0 ? (
          images[currentImgIndex]?.url ? (
            <LazyImage
              src={images[currentImgIndex].url}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : images[currentImgIndex]?.isVideo ? (
            <div className="w-full h-full bg-gradient-to-br from-[#06140c] via-[#091e13] to-[#040c07] flex flex-col items-center justify-center text-emerald-400">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Play size={20} className="fill-current ml-0.5" />
              </div>
              <span className="text-[11px] font-extrabold text-emerald-300 mt-2 tracking-wide uppercase">Watch Video Tour</span>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#07110a] text-gray-400 p-4 text-center">
              <Building2 size={32} className="text-emerald-500/50 mb-1" />
              <span className="text-xs font-bold text-gray-300">No Photo</span>
            </div>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#07110a] text-gray-400 p-4 text-center">
            <Building2 size={36} className="text-emerald-500/40 mb-1.5" />
            <span className="text-xs font-bold text-gray-300">No Photos Uploaded</span>
            <span className="text-[10px] text-gray-500">Owner has not added media</span>
          </div>
        )}

        {/* Video Play Overlay Indicator if current slide is video with poster */}
        {images.length > 0 && images[currentImgIndex]?.isVideo && images[currentImgIndex]?.url && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 group-hover:bg-black/10 transition-colors">
            <div className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl shadow-emerald-500/40 group-hover:scale-110 transition-transform">
              <Play size={18} className="fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Verified Badge */}
        {property.verified && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-black text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center space-x-1 shadow-md z-10">
            <ShieldCheck size={13} className="stroke-[2.5]" />
            <span>Verified</span>
          </div>
        )}

        {/* Video Tour Badge */}
        {property.videos && property.videos.length > 0 && (
          <div className={`absolute ${property.verified ? 'top-10' : 'top-3'} left-3 bg-black/85 backdrop-blur-md text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-md border border-emerald-500/50 z-10`}>
            <Video size={11} className="stroke-[2.5] text-emerald-400" />
            <span>Video Tour</span>
          </div>
        )}

        {/* PID Badge */}
        <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-900/60 z-10">
          {property.pid}
        </div>

        {/* Wishlist Button */}
        <div
          role="button"
          tabIndex={0}
          suppressHydrationWarning
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(property.pid || property.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 z-20 ${wish ? 'bg-emerald-500 text-black' : 'bg-black/60 text-gray-300 hover:bg-black/90 hover:text-white'
            }`}
          title="Save Property"
        >
          <Heart size={16} fill={wish ? 'currentColor' : 'none'} />
        </div>

        {/* Slider Controls */}
        {images.length > 1 && (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <ChevronRight size={16} />
            </div>
          </>
        )}
      </div>

      {/* Card Content matching Screenshot 3 */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Locality */}
          <p className="text-xs text-gray-400 font-medium truncate mb-1">
            {property.locality}, {property.city}
          </p>

          {/* Title & Price Header Row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-gray-100 group-hover:text-emerald-400 transition-colors line-clamp-1 flex-1">
              {property.title}
            </h3>
            <div className="text-right shrink-0">
              <span className="text-sm font-extrabold text-emerald-400">
                {formatPrice(property.price)}
              </span>
              {property.category === 'rent' && <span className="text-[11px] font-normal text-gray-400">/month</span>}
            </div>
          </div>

          {/* Specs Row */}
          <div className="flex items-center space-x-4 py-2 text-xs text-gray-300 border-t border-emerald-950/80">
            {property.category === 'commercial' || property.type === 'commercial' ? (
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <Building2 size={14} className="text-emerald-400" />
                <span>Commercial</span>
              </div>
            ) : (
              property.bedrooms !== undefined && property.bedrooms > 0 && (
                <div className="flex items-center space-x-1.5">
                  <Bed size={14} className="text-emerald-500" />
                  <span>{property.bedrooms === 0.5 ? '1 RK' : `${property.bedrooms} Bed`}</span>
                </div>
              )
            )}
            {property.bathrooms !== undefined && (
              <div className="flex items-center space-x-1.5">
                <Bath size={14} className="text-emerald-500" />
                <span>{property.bathrooms} {(property.category === 'commercial' || property.type === 'commercial') ? 'Washroom' : 'Bath'}</span>
              </div>
            )}
            {Boolean(property.areaSqFt && property.areaSqFt > 0 && property.areaSqFt <= 99999) && (
              <div className="flex items-center space-x-1.5">
                <Maximize size={14} className="text-emerald-500" />
                <span>{property.areaSqFt} sq.ft</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-2.5 flex items-center justify-between border-t border-emerald-950/80 text-xs">
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              if (!user) {
                showToast('Please login to get owner contact');
                openAuthModal();
                return;
              }

              try {
                await fetch('/api/inquiries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  keepalive: true,
                  body: JSON.stringify({
                    propertyId: property.id || property.pid,
                    propertyTitle: property.title,
                    propertyPid: property.pid,
                    tenantName: user.name || 'Interested Tenant',
                    tenantPhone: user.phone || '',
                    tenantEmail: user.email || '',
                    tenantMessage: `Direct contact request for ${property.pid} (${property.title})`,
                    status: 'New'
                  })
                });
              } catch (err) {
                console.warn('Inquiry submission error:', err);
              }

              if (user.role === 'owner') {
                showToast('Inquiry submitted to the owner!');
                saveScrollState();
                router.push(`/properties/${property.id || property.pid}`);
                return;
              }

              const userCredits = typeof user.credits === 'number' ? user.credits : 0;
              const isUnlocked = Boolean(
                property.ownerPhone ||
                user.role === 'admin' ||
                (user.unlockedProperties && (
                  user.unlockedProperties.includes(property.pid) ||
                  user.unlockedProperties.includes(property.id)
                ))
              );

              if (isUnlocked || userCredits > 0) {
                saveScrollState();
                router.push(`/properties/${property.id || property.pid}`);
                return;
              }

              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }
              showToast('Please purchase a plan to unlock owner contacts.', 'error');
              router.push('/plans');
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 z-20"
          >
            <PhoneCall size={12} className="stroke-[2.5]" />
            <span>Contact Now</span>
          </button>

          <div className="flex items-center space-x-1 text-emerald-400 font-bold group-hover:text-emerald-300 transition-colors">
            <span>Explore</span>
            <span className="text-sm group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
});

PropertyCard.displayName = 'PropertyCard';
