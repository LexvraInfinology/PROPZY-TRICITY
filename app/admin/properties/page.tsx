'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building, ShieldCheck, Search, Filter, RefreshCw, PlusCircle,
  CheckCircle2, Clock, Trash2, Edit3, Star, X, MapPin, Phone, XCircle, Video, ExternalLink, Sparkles
} from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { formatPrice } from '@/lib/format';
import { useApp } from '@/context/AppContext';
import { getCachedProperties, setCachedProperties, hasCachedProperties } from '@/lib/adminCache';
import { useAdminSync } from '@/hooks/useAdminSync';
import { TableSkeletonLoader, BrandSpinner } from '@/components/Loader';

function AdminPropertiesContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('pid') || searchParams.get('search') || '';
  const { showToast } = useApp();

  const [properties, setProperties] = useState<PropertyItem[]>(() => getCachedProperties() || []);
  const [loading, setLoading] = useState<boolean>(() => !hasCachedProperties());
  const [refreshing, setRefreshing] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, verified, pending, featured
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Pagination State (Show 10 listings initially)
  const [visibleCount, setVisibleCount] = useState(10);

  // Sync searchTerm when URL search params change
  useEffect(() => {
    const q = searchParams.get('pid') || searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  // Edit Modal State
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [propertyPendingDeletion, setPropertyPendingDeletion] = useState<PropertyItem | null>(null);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, cityFilter, statusFilter, categoryFilter]);

  const fetchProperties = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/properties?admin=true&limit=1000', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProperties(data.data);
        setCachedProperties(data.data, false);
      }
    } catch (e) {
      console.warn('Failed to fetch admin properties:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if client cache is empty
    if (!hasCachedProperties()) {
      fetchProperties(false);
    }
  }, [fetchProperties]);

  // Real-time cross-tab sync
  useAdminSync({
    dataType: 'properties',
    onSync: () => {
      const latest = getCachedProperties();
      if (latest && latest.length > 0) {
        setProperties(latest);
      } else {
        fetchProperties(true);
      }
    },
    enablePolling: false,
  });

  // Filtered List
  const filteredProperties = properties.filter(item => {
    if (!item) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchPid = (item.pid || '').toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchLocality = (item.locality || '').toLowerCase().includes(q);
      const matchOwnerName = (item.ownerName || '').toLowerCase().includes(q);
      const matchOwnerEmail = (item.ownerEmail || '').toLowerCase().includes(q);
      const matchOwnerPhone = (item.ownerPhone || '').toLowerCase().includes(q);
      if (!matchPid && !matchTitle && !matchLocality && !matchOwnerName && !matchOwnerEmail && !matchOwnerPhone) return false;
    }

    if (cityFilter !== 'all' && !(item.city || '').toLowerCase().includes(cityFilter.toLowerCase())) {
      return false;
    }

    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }

    if (statusFilter === 'verified' && !item.verified) return false;
    if (statusFilter === 'pending' && item.verified) return false;
    if (statusFilter === 'featured' && !item.featured) return false;
    if (statusFilter === 'active' && item.available === false) return false;
    if (statusFilter === 'inactive' && item.available !== false) return false;

    return true;
  });

  const displayedProperties = filteredProperties.slice(0, visibleCount);

  // Actions
  const handleActiveToggle = async (id: string, currentAvailable: boolean) => {
    if (actionPendingId) return;
    setActionPendingId(id);
    const newAvailableStatus = !currentAvailable;

    setProperties(prev => {
      const updated = prev.map(p =>
        (p._id === id || p.pid === id || p.id === id)
          ? { ...p, available: newAvailableStatus }
          : p
      );
      setCachedProperties(updated, true);
      return updated;
    });

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newAvailableStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update active status');
      }
      showToast(newAvailableStatus ? `Listing ${id} is now Active (Visible in listings)` : `Listing ${id} is now Inactive (Hidden from listings)`);
    } catch (e: any) {
      console.error('Active toggle error:', e);
      // Revert optimistic update
      setProperties(prev => {
        const reverted = prev.map(p =>
          (p._id === id || p.pid === id || p.id === id)
            ? { ...p, available: currentAvailable }
            : p
        );
        setCachedProperties(reverted, true);
        return reverted;
      });
      showToast(`Failed to update active status: ${e.message || 'Server error'}`);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleVerifyToggle = async (id: string, currentVerified: boolean) => {
    if (actionPendingId) return;
    setActionPendingId(id);
    const newVerifiedStatus = !currentVerified;

    setProperties(prev => {
      const updated = prev.map(p =>
        (p._id === id || p.pid === id || p.id === id)
          ? { ...p, verified: newVerifiedStatus }
          : p
      );
      setCachedProperties(updated, true);
      return updated;
    });

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: newVerifiedStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update status');
      }
      showToast(newVerifiedStatus ? `Listing ${id} verified successfully!` : `Listing ${id} marked as Unverified (Pending Review)`);
    } catch (e: any) {
      console.error('Verify toggle error:', e);
      // Revert optimistic update
      setProperties(prev => {
        const reverted = prev.map(p =>
          (p._id === id || p.pid === id || p.id === id)
            ? { ...p, verified: currentVerified }
            : p
        );
        setCachedProperties(reverted, true);
        return reverted;
      });
      showToast(`Failed to update status: ${e.message || 'Server error'}`);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleFeatureToggle = async (id: string, currentFeatured: boolean) => {
    if (actionPendingId) return;
    setActionPendingId(id);
    const newFeaturedStatus = !currentFeatured;

    setProperties(prev => {
      const updated = prev.map(p =>
        (p._id === id || p.pid === id || p.id === id)
          ? { ...p, featured: newFeaturedStatus }
          : p
      );
      setCachedProperties(updated, true);
      return updated;
    });

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: newFeaturedStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update feature status');
      }
      showToast(newFeaturedStatus ? `Listing featured on homepage!` : `Listing removed from featured`);
    } catch (e: any) {
      console.error('Feature toggle error:', e);
      // Revert optimistic update
      setProperties(prev => {
        const reverted = prev.map(p =>
          (p._id === id || p.pid === id || p.id === id)
            ? { ...p, featured: currentFeatured }
            : p
        );
        setCachedProperties(reverted, true);
        return reverted;
      });
      showToast(`Failed to update feature status: ${e.message || 'Server error'}`);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!propertyPendingDeletion) return;
    if (actionPendingId) return;
    const id = propertyPendingDeletion._id || propertyPendingDeletion.pid || propertyPendingDeletion.id;
    if (!id) return;

    setActionPendingId(id);
    setProperties(prev => {
      const updated = prev.filter(p => p._id !== id && p.pid !== id && p.id !== id);
      setCachedProperties(updated);
      return updated;
    });
    setPropertyPendingDeletion(null);

    try {
      await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    } catch (e) {
    } finally {
      setActionPendingId(null);
    }
    showToast('Property listing deleted.');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    const targetId = editingProperty._id || editingProperty.pid || editingProperty.id;

    setProperties(prev => {
      const updated = prev.map(p =>
        (p._id === targetId || p.pid === targetId || p.id === targetId) ? editingProperty : p
      );
      setCachedProperties(updated);
      return updated;
    });

    try {
      await fetch(`/api/properties/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProperty)
      });
    } catch (e) { }

    setEditingProperty(null);
    showToast('Property updated successfully!');
  };

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-emerald-950/80 pb-3.5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            Property Listings Manager
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
            Search, moderate, verify, feature, or edit all registered property listings.
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 self-start sm:self-auto">
          <Link
            href="/admin/properties/quick-ingest"
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-[11px] sm:text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
          >
            <Sparkles size={13} className="text-black" />
            <span>AI Quick Ingest</span>
          </Link>
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchProperties(true);
              setRefreshing(false);
              showToast('Properties refreshed from database!');
            }}
            disabled={refreshing || loading}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] sm:text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              setCityFilter('all');
              setStatusFilter('all');
              setCategoryFilter('all');
              setVisibleCount(10);
            }}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#0b140f] border border-emerald-900/80 text-emerald-400 text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5 hover:bg-emerald-950 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#0a110d] p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Search ID or Keyword */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID, Title, Locality..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2.5 bg-[#050806] border border-emerald-900/80 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-2.5 top-2.5 sm:top-3 text-emerald-400" size={13} />
        </div>

        {/* City Select */}
        <div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2.5 bg-[#050806] border border-emerald-900/80 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Cities</option>
            <option value="Mohali">Mohali</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Zirakpur">Zirakpur</option>
            <option value="Kharar">Kharar</option>
            <option value="Panchkula">Panchkula</option>
          </select>
        </div>

        {/* Purpose / Category */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2.5 bg-[#050806] border border-emerald-900/80 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="rent">Rent</option>
            <option value="buy">Buy / Sale</option>
            <option value="pg">PG / Co-living</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        {/* Verification / Feature / Active Status */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2.5 bg-[#050806] border border-emerald-900/80 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only (Visible)</option>
            <option value="inactive">Inactive Only (Hidden)</option>
            <option value="verified">Verified Only</option>
            <option value="pending">Unverified</option>
            <option value="featured">Featured Homes</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-xl overflow-hidden">
        <div className="p-2.5 sm:p-4 border-b border-emerald-950 flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-gray-300">
            Showing <span className="text-emerald-400 font-extrabold">{displayedProperties.length}</span> of {filteredProperties.length} Listings
          </span>
          {loading && (
            <span className="text-[11px] sm:text-xs text-emerald-400 font-bold flex items-center space-x-1.5 animate-pulse">
              <RefreshCw size={11} className="animate-spin" />
              <span>Fetching properties...</span>
            </span>
          )}
        </div>

        {/* Mobile View: Dedicated Distinct Compact Property Cards (sm:hidden) */}
        <div className="block sm:hidden p-2.5 space-y-2.5 bg-[#050806]">
          {loading && properties.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">Loading properties...</div>
          ) : filteredProperties.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs bg-[#09110c] border border-emerald-950 rounded-xl">
              No properties match your filter criteria.
            </div>
          ) : (
            displayedProperties.map((item: any) => {
              const targetId = item.pid || item._id || item.id;
              const getVideoPoster = (url?: string) => {
                if (!url) return null;
                if (url.includes('res.cloudinary.com')) {
                  return url.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg').replace('/video/upload/', '/video/upload/so_0,q_auto,f_auto/');
                }
                const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
                if (ytMatch && ytMatch[1]) {
                  return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                }
                return null;
              };
              const mainImg = (item.images && item.images.length > 0 ? item.images[0] : null) || item.videoThumbnail || (item.videos && item.videos[0] ? getVideoPoster(item.videos[0]) : null);

              return (
                <div
                  key={`m-${targetId}`}
                  className="p-3 space-y-2.5 bg-[#08120c] border border-emerald-900/70 hover:border-emerald-700/90 rounded-xl shadow-md transition-all"
                >
                  {/* Top Row: PID, Category Pill & Status Badges */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap pb-2 border-b border-emerald-950/70">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono font-bold text-[11px]">
                        PROP-ID: {item.pid?.replace(/^(PZ|LR)-/i, '')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-[#0d1f15] border border-emerald-900/80 text-gray-300 text-[9px] font-semibold capitalize">
                        {item.category} • {item.type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 flex-wrap">
                      {item.available === false ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-700 text-[9px] font-bold whitespace-nowrap shadow-sm">
                          <span>INACTIVE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-800 text-[9px] font-bold whitespace-nowrap shadow-sm">
                          <span>ACTIVE</span>
                        </span>
                      )}

                      {item.verified ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-800 text-[9px] font-extrabold whitespace-nowrap shadow-sm">
                          <CheckCircle2 size={10} />
                          <span>VERIFIED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-400 border border-amber-800 text-[9px] font-extrabold whitespace-nowrap shadow-sm">
                          <Clock size={10} />
                          <span>UNVERIFIED</span>
                        </span>
                      )}

                      {item.featured && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-800 text-[9px] font-extrabold whitespace-nowrap shadow-sm">
                          <Star size={9} className="fill-purple-400 text-purple-400" />
                          <span>FEATURED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Image Thumbnail + Title + Price + Location */}
                  <div className="flex items-start gap-2.5">
                    {mainImg ? (
                      <img
                        src={mainImg}
                        alt={item.title}
                        className="w-11 h-11 rounded-lg object-cover border border-emerald-900/80 shrink-0 bg-[#040805]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-[#040805] border border-emerald-950 flex items-center justify-center text-emerald-500 shrink-0">
                        <Building size={16} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <div className="font-bold text-white text-xs line-clamp-1 flex-1">{item.title}</div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-emerald-400 whitespace-nowrap">
                            {formatPrice(item.price)}
                          </span>
                          <span className="text-[9px] text-gray-500 font-medium block -mt-0.5">
                            {item.category === 'rent' || item.category === 'pg' ? '/mo' : 'total'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400 truncate flex items-center space-x-1">
                        <MapPin size={10} className="text-emerald-500 shrink-0" />
                        <span>{item.locality}, {item.city}</span>
                      </div>

                      {/* Specs badges */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {item.videos && item.videos.length > 0 && (
                          <span className="text-[8px] font-extrabold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                            <Video size={9} />
                            <span>Video Tour</span>
                          </span>
                        )}
                        {item.bedrooms && (
                          <span className="text-[8px] font-bold bg-[#050806] text-gray-300 border border-emerald-950 px-1 py-0.2 rounded">
                            {item.bedrooms} BHK
                          </span>
                        )}
                        {item.areaSqFt && (
                          <span className="text-[8px] font-bold bg-[#050806] text-gray-300 border border-emerald-950 px-1 py-0.2 rounded">
                            {item.areaSqFt} sq.ft
                          </span>
                        )}
                        {item.furnishing && (
                          <span className="text-[8px] font-semibold bg-[#050806] text-gray-400 border border-emerald-950 px-1 py-0.2 rounded capitalize">
                            {item.furnishing}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Owner Contact Bar */}
                  <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#040805] border border-emerald-950/80 text-[10px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-1.5 truncate mr-2">
                      <span className="text-gray-400 text-[10px]">Owner:</span>
                      <span className="text-white font-medium truncate max-w-[120px]" title={item.ownerName || 'Owner'}>
                        {item.ownerName || 'Direct Owner'}
                      </span>
                    </div>
                    {item.ownerPhone ? (
                      <a
                        href={`tel:${String(item.ownerPhone).replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono font-bold text-emerald-400 flex items-center space-x-1 hover:underline whitespace-nowrap text-[11px] shrink-0"
                        title={`Call ${item.ownerName || 'Owner'} (${item.ownerPhone})`}
                      >
                        <Phone size={10} className="stroke-[2.5]" />
                        <span>{item.ownerPhone}</span>
                      </a>
                    ) : (
                      <span className="font-mono text-gray-400 text-[11px]">N/A</span>
                    )}
                  </div>

                  {/* Moderation Actions Toolbar */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {/* Active / Inactive Sliding Toggle Switch */}
                    <button
                      disabled={Boolean(actionPendingId)}
                      onClick={() => handleActiveToggle(targetId, item.available !== false)}
                      className={`h-7 px-2 flex items-center space-x-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                        item.available !== false
                          ? 'bg-[#06180f] border-emerald-800/80 text-emerald-300 hover:bg-emerald-950'
                          : 'bg-[#0e0e0e] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                      title={item.available !== false ? 'Click to make Inactive (Hide from listings)' : 'Click to make Active (Show in listings)'}
                    >
                      <div
                        className={`w-6 h-3.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                          item.available !== false ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                            item.available !== false ? 'translate-x-2.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold">{item.available !== false ? 'Active' : 'Inactive'}</span>
                    </button>

                    {/* Verify / Unverify Button */}
                    <button
                      disabled={Boolean(actionPendingId)}
                      onClick={() => handleVerifyToggle(targetId, !!item.verified)}
                      className={`flex-1 h-7 flex items-center justify-center space-x-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm active:scale-95 ${item.verified
                          ? 'bg-[#180d10] text-rose-300 border border-rose-800/80 hover:bg-rose-950'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-emerald-500/20'
                        }`}
                    >
                      {item.verified ? (
                        <>
                          <XCircle size={11} />
                          <span>Unverify</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={11} />
                          <span>Verify</span>
                        </>
                      )}
                    </button>

                    {/* Feature Button */}
                    <button
                      disabled={Boolean(actionPendingId)}
                      onClick={() => handleFeatureToggle(targetId, !!item.featured)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 ${item.featured
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-[#0a1810] text-gray-300 border-emerald-900 hover:text-white'
                        }`}
                      title="Toggle Featured"
                    >
                      <Star size={12} className={item.featured ? 'text-purple-400 fill-purple-400' : ''} />
                    </button>

                    {/* Edit Button */}
                    <button
                      disabled={Boolean(actionPendingId)}
                      onClick={() => setEditingProperty(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0a1810] border border-emerald-900 text-gray-300 hover:text-emerald-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Edit Property Details"
                    >
                      <Edit3 size={12} />
                    </button>

                    {/* Delete Button */}
                    <button
                      disabled={Boolean(actionPendingId)}
                      onClick={() => setPropertyPendingDeletion(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#180a0a] border border-rose-950 text-rose-400 hover:bg-rose-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Delete Listing"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet Table View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3.5 whitespace-nowrap">PROP-ID</th>
                <th className="p-3.5 min-w-[160px]">Property Details</th>
                <th className="p-3.5 whitespace-nowrap">Category</th>
                <th className="p-3.5 whitespace-nowrap">Price</th>
                <th className="p-3.5 whitespace-nowrap">Owner Contact</th>
                <th className="p-3.5 text-right whitespace-nowrap">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {loading && properties.length === 0 ? (
                <TableSkeletonLoader rows={6} cols={6} message="Loading properties..." />
              ) : filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No properties match your filter criteria.
                  </td>
                </tr>
              ) : (
                displayedProperties.map((item: any) => {
                  const targetId = item.pid || item._id || item.id;
                  return (
                    <tr
                      key={targetId}
                      onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                      className="hover:bg-[#07160d] transition-colors cursor-pointer group"
                      title="Click to view full property listing"
                    >
                      <td className="p-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 group-hover:underline">
                          {item.pid?.replace(/^(PZ|LR)-/i, '')}
                          <ExternalLink size={10} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="flex items-center space-x-1.5">
                          <div className="font-bold text-white truncate group-hover:text-emerald-300 transition-colors">{item.title}</div>
                          {item.featured && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[8px] font-extrabold flex items-center space-x-0.5 shrink-0" title="Featured Listing">
                              <Star size={8} className="fill-purple-300 text-purple-300" />
                              <span>Featured</span>
                            </span>
                          )}
                          {item.videos && item.videos.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-extrabold flex items-center space-x-0.5 shrink-0" title="Walkthrough Video Tour Available">
                              <Video size={8} />
                              <span>Tour</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">{item.locality}, {item.city}</div>
                      </td>
                      <td className="p-3.5 capitalize font-semibold whitespace-nowrap">{item.category} ({item.type})</td>
                      <td className="p-3.5 font-bold text-emerald-400 whitespace-nowrap">{formatPrice(item.price)}</td>
                      <td className="p-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {item.ownerPhone ? (
                          <div className="flex flex-col space-y-0.5">
                            <a
                              href={`tel:${String(item.ownerPhone).replace(/\s+/g, '')}`}
                              className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 w-fit"
                              title={`Call ${item.ownerName || 'Owner'} (${item.ownerPhone})`}
                            >
                              <Phone size={11} className="stroke-[2.5] text-emerald-400 shrink-0" />
                              <span>{item.ownerPhone}</span>
                            </a>
                            {item.ownerName && (
                              <span className="text-[10px] text-gray-400 truncate max-w-[140px]" title={item.ownerName}>
                                {item.ownerName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end space-x-1.5">
                          {/* Active / Inactive Sliding Toggle Switch */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActiveToggle(targetId, item.available !== false);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm select-none ${
                              item.available !== false
                                ? 'bg-[#06180f] border-emerald-800/80 text-emerald-300 hover:bg-emerald-950'
                                : 'bg-[#0e0e0e] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                            title={item.available !== false ? 'Click to make Inactive (Hide from listings)' : 'Click to make Active (Show in listings)'}
                          >
                            <div
                              className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                                item.available !== false ? 'bg-emerald-500' : 'bg-zinc-600'
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded-full bg-white shadow transform transition-transform duration-200 ${
                                  item.available !== false ? 'translate-x-3' : 'translate-x-0'
                                }`}
                              />
                            </div>
                            <span>{item.available !== false ? 'Active' : 'Inactive'}</span>
                          </button>

                          {/* Verify / Unverify Button */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => handleVerifyToggle(targetId, !!item.verified)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm active:scale-95 ${item.verified
                                ? 'bg-[#180d10] text-rose-300 border-rose-900/80 hover:bg-rose-950'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-500 shadow-md shadow-emerald-500/20'
                              }`}
                          >
                            {item.verified ? 'Unverify' : 'Verify'}
                          </button>

                          {/* Feature Button */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => handleFeatureToggle(targetId, !!item.featured)}
                            className={`p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${item.featured
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-[#0a1810] text-gray-300 border-emerald-900 hover:text-white'
                              }`}
                            title="Toggle Featured status"
                          >
                            <Star size={13} className={item.featured ? 'text-purple-400 fill-purple-400' : ''} />
                          </button>

                          {/* Edit Button */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => setEditingProperty(item)}
                            className="p-1.5 rounded-xl bg-[#0a1810] border border-emerald-900 text-gray-300 hover:text-emerald-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Edit Property Details"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete Button */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => setPropertyPendingDeletion(item)}
                            className="p-1.5 rounded-xl bg-[#180a0a] border border-rose-950 text-rose-400 hover:bg-rose-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Delete Listing"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination: Show More Button */}
        {visibleCount < filteredProperties.length && (
          <div className="p-4 border-t border-emerald-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#060b08]">
            <span className="text-xs text-gray-400">
              Showing <span className="text-emerald-400 font-extrabold">{displayedProperties.length}</span> of <span className="text-white font-bold">{filteredProperties.length}</span> listings
            </span>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <span>Show More ({filteredProperties.length - displayedProperties.length} remaining)</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Property Confirmation */}
      {propertyPendingDeletion && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setPropertyPendingDeletion(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-property-title"
            aria-describedby="delete-property-description"
            className="bg-[#0a110d] rounded-3xl border border-rose-900/80 p-6 max-w-md w-full space-y-5 text-gray-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-rose-950/80 border border-rose-900 p-2.5 text-rose-400">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 id="delete-property-title" className="text-base font-extrabold text-white">Delete property listing?</h3>
                <p id="delete-property-description" className="mt-1 text-xs leading-5 text-gray-400">
                  You are about to permanently delete <span className="font-bold text-gray-200">{propertyPendingDeletion.title}</span> ({propertyPendingDeletion.pid}). This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-emerald-950 pt-4">
              <button
                type="button"
                onClick={() => setPropertyPendingDeletion(null)}
                className="px-4 py-2 rounded-xl bg-[#050806] border border-emerald-900 text-gray-300 text-xs font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-500 transition-colors shadow-md shadow-rose-950/50"
              >
                Delete listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-900/80 p-6 max-w-lg w-full space-y-5 text-gray-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
              <h3 className="text-base font-extrabold text-white">Edit Property ({editingProperty.pid})</h3>
              <button onClick={() => setEditingProperty(null)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Property Title</label>
                <input
                  type="text"
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editingProperty.price}
                    onChange={(e) => setEditingProperty({ ...editingProperty, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={editingProperty.city}
                    onChange={(e) => setEditingProperty({ ...editingProperty, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Locality / Sector</label>
                  <input
                    type="text"
                    value={editingProperty.locality}
                    onChange={(e) => setEditingProperty({ ...editingProperty, locality: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Bedrooms (BHK)</label>
                  <select
                    value={editingProperty.bedrooms !== undefined ? editingProperty.bedrooms : 1}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bedrooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>PG</option>
                    <option value={0.5}>1 RK</option>
                    <option value={1}>1 BHK</option>
                    <option value={2}>2 BHK</option>
                    <option value={3}>3 BHK</option>
                    <option value={4}>4 BHK</option>
                    <option value={5}>4+ BHK / Villa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editingProperty.ownerName || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-medium"
                    placeholder="Owner name"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Owner Contact Number</label>
                  <input
                    type="text"
                    value={editingProperty.ownerPhone || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, ownerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-mono"
                    placeholder="Owner phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Listing Status</label>
                  <select
                    value={editingProperty.available !== false ? 'true' : 'false'}
                    onChange={(e) => setEditingProperty({ ...editingProperty, available: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">● Active (Visible in listings)</option>
                    <option value="false">○ Inactive (Hidden from public)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Verification</label>
                  <select
                    value={editingProperty.verified ? 'true' : 'false'}
                    onChange={(e) => setEditingProperty({ ...editingProperty, verified: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">Verified & Live</option>
                    <option value="false">Unverified (Pending Review)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-950 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2 rounded-xl bg-[#050806] text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-extrabold shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <BrandSpinner message="Loading properties manager..." size="md" />
      </div>
    }>
      <AdminPropertiesContent />
    </Suspense>
  );
}
