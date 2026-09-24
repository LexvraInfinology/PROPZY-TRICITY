'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building, ShieldCheck, MessageSquare, Users, FileText,
  ArrowUpRight, Clock, PlusCircle, CheckCircle2, XCircle, Search, Sparkles, RefreshCw,
  Trash2, AlertTriangle, ExternalLink, Phone, Eye, Edit3, X
} from 'lucide-react';
import { PropertyItem } from '@/lib/seedData';
import { formatPrice } from '@/lib/format';
import { useApp } from '@/context/AppContext';
import { getCachedProperties, setCachedProperties, hasCachedProperties, getCachedInquiries, setCachedInquiries, hasCachedInquiries } from '@/lib/adminCache';
import { useAdminSync } from '@/hooks/useAdminSync';
import { TableSkeletonLoader } from '@/components/Loader';

export default function AdminOverviewPage() {
  const { showToast } = useApp();
  const [properties, setProperties] = useState<PropertyItem[]>(() => getCachedProperties() || []);
  const [inquiries, setInquiries] = useState<any[]>(() => getCachedInquiries() || []);
  const [loading, setLoading] = useState<boolean>(() => !hasCachedProperties());
  const [refreshing, setRefreshing] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [propertyPendingDeletion, setPropertyPendingDeletion] = useState<PropertyItem | null>(null);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [propsRes, inqRes] = await Promise.all([
        fetch('/api/properties?admin=true&limit=1000', { cache: 'no-store' }).catch(() => null),
        fetch('/api/inquiries', { cache: 'no-store' }).catch(() => null)
      ]);

      if (propsRes && propsRes.ok) {
        const propsData = await propsRes.json();
        if (propsData.success && Array.isArray(propsData.data)) {
          setProperties(propsData.data);
          setCachedProperties(propsData.data, false);
        }
      }

      if (inqRes && inqRes.ok) {
        const inqData = await inqRes.json();
        if (inqData.success && Array.isArray(inqData.data)) {
          setInquiries(inqData.data);
          setCachedInquiries(inqData.data, false);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch live admin data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch if client cache is missing properties or inquiries, and always revalidate in background
    fetchData();
  }, [fetchData]);

  // Real-time cross-tab sync hook for Admin Dashboard Overview
  useAdminSync({
    dataType: 'all',
    onSync: () => {
      const cachedProps = getCachedProperties();
      const cachedInqs = getCachedInquiries();
      if (cachedProps && cachedProps.length > 0) setProperties(cachedProps);
      if (cachedInqs && cachedInqs.length > 0) setInquiries(cachedInqs);
      if (!cachedProps || !cachedInqs) {
        fetchData();
      }
    },
    enablePolling: false,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
      await Promise.race([fetchData(), timeoutPromise]);
      showToast('Dashboard data refreshed successfully!');
    } catch (e) {
      showToast('Dashboard data refreshed!');
    } finally {
      setRefreshing(false);
    }
  };

  const totalListings = properties.length;
  const verifiedListings = properties.filter(p => p.verified).length;
  const pendingVerification = totalListings - verifiedListings;
  const featuredListings = properties.filter(p => p.featured).length;

  const handleVerifyToggle = async (propertyId: string, currentVerified: boolean) => {
    if (actionPendingId) return;
    setActionPendingId(propertyId);
    const newStatus = !currentVerified;

    setProperties(prev => {
      const updated = prev.map(p =>
        (p._id === propertyId || p.pid === propertyId || p.id === propertyId)
          ? { ...p, verified: newStatus }
          : p
      );
      setCachedProperties(updated, true);
      return updated;
    });

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update status');
      }
      showToast(newStatus ? 'Property verified successfully!' : 'Property marked as unverified');
    } catch (e: any) {
      console.error('Verify toggle error:', e);
      // Revert optimistic update
      setProperties(prev => {
        const reverted = prev.map(p =>
          (p._id === propertyId || p.pid === propertyId || p.id === propertyId)
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    const targetId = editingProperty._id || editingProperty.pid || editingProperty.id;

    // Optimistic update
    setProperties(prev =>
      prev.map(p =>
        (p._id === targetId || p.pid === targetId || p.id === targetId) ? editingProperty : p
      )
    );
    setCachedProperties(properties.map(p =>
      (p._id === targetId || p.pid === targetId || p.id === targetId) ? editingProperty : p
    ), true);

    try {
      const res = await fetch(`/api/properties/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProperty)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update property details');
      }
      showToast(`Property ${editingProperty.pid} updated successfully!`);
    } catch (err: any) {
      showToast(`Failed to update property: ${err.message || 'Server error'}`);
    }
    setEditingProperty(null);
  };

  const handleDelete = async () => {
    if (!propertyPendingDeletion || actionPendingId) return;
    const id = propertyPendingDeletion.pid || propertyPendingDeletion._id || propertyPendingDeletion.id;
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
    showToast('Property listing deleted successfully.');
  };

  const citiesSummary = [
    { city: 'Mohali', count: properties.filter(p => (p.city || '').toLowerCase().includes('mohali')).length },
    { city: 'Chandigarh', count: properties.filter(p => (p.city || '').toLowerCase().includes('chandigarh')).length },
    { city: 'Zirakpur', count: properties.filter(p => (p.city || '').toLowerCase().includes('zirakpur')).length },
    { city: 'Kharar', count: properties.filter(p => (p.city || '').toLowerCase().includes('kharar')).length },
    { city: 'Panchkula', count: properties.filter(p => (p.city || '').toLowerCase().includes('panchkula')).length },
  ];

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-emerald-950/80 pb-3.5 sm:pb-6">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#0a2618] border border-emerald-800/60 text-emerald-400 text-[10px] sm:text-xs font-semibold mb-1 sm:mb-2">
            <Sparkles size={11} />
            <span>Propzy Administrative Portal</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
            Real-time platform statistics, property moderation queue & tenant lead tracker.
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 sm:gap-3 sm:space-x-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          <Link
            href="/admin/properties"
            className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#0a1810] border border-emerald-900/80 text-emerald-400 hover:bg-emerald-950 text-[11px] sm:text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors whitespace-nowrap"
          >
            <Building size={12} />
            <span>Manage All ({loading ? '...' : totalListings})</span>
          </Link>
        </div>
      </div>

      {/* 4 KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {/* Metric 1 */}
        <div className="bg-[#0a110d] p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-2 sm:space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400">Total Listings</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0e2216] border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
              <Building size={14} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {loading ? <span className="inline-block w-10 h-7 bg-emerald-950/80 rounded animate-pulse" /> : totalListings}
            </div>
            <div className="text-[9px] sm:text-[11px] text-emerald-400 font-semibold mt-0.5 sm:mt-1 flex items-center space-x-1">
              <span>{loading ? 'Fetching...' : `${verifiedListings} Verified Listings`}</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0a110d] p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-2 sm:space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400">Pending Review</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#261c0a] border border-amber-800/60 text-amber-400 flex items-center justify-center">
              <Clock size={14} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {loading ? <span className="inline-block w-8 h-7 bg-amber-950/80 rounded animate-pulse" /> : pendingVerification}
            </div>
            <div className="text-[9px] sm:text-[11px] text-amber-400 font-semibold mt-0.5 sm:mt-1 flex items-center space-x-1">
              <span>Awaiting Moderation</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0a110d] p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-2 sm:space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400">Tenant Leads</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0d2426] border border-cyan-800/60 text-cyan-400 flex items-center justify-center">
              <MessageSquare size={14} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {loading ? <span className="inline-block w-8 h-7 bg-cyan-950/80 rounded animate-pulse" /> : inquiries.length}
            </div>
            <div className="text-[9px] sm:text-[11px] text-cyan-400 font-semibold mt-0.5 sm:mt-1 flex items-center space-x-1">
              <span>Active Inquiries & Visits</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0a110d] p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-2 sm:space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400">Featured</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#1d0e26] border border-purple-800/60 text-purple-400 flex items-center justify-center">
              <ShieldCheck size={14} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {loading ? <span className="inline-block w-8 h-7 bg-purple-950/80 rounded animate-pulse" /> : featuredListings}
            </div>
            <div className="text-[9px] sm:text-[11px] text-purple-400 font-semibold mt-0.5 sm:mt-1 flex items-center space-x-1">
              <span>Promoted on Home</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: City Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-8">
        {/* City Breakdown Stats */}
        <div className="lg:col-span-2 bg-[#0a110d] p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-3 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-emerald-950 pb-2 sm:pb-3 gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
              City-Wise Property Distribution
            </h3>
            <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold bg-[#0a2014] border border-emerald-800/60 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
              Tricity Region
            </span>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {citiesSummary.map((item) => {
              const percentage = Math.round((item.count / (totalListings || 1)) * 100);
              return (
                <div key={item.city} className="space-y-1">
                  <div className="flex justify-between text-[11px] sm:text-xs font-semibold">
                    <span className="text-gray-200">{item.city}</span>
                    <span className="text-emerald-400 text-[10px] sm:text-xs">{item.count} properties ({percentage}%)</span>
                  </div>
                  <div className="h-1.5 sm:h-2 w-full bg-[#050806] rounded-full overflow-hidden border border-emerald-950">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="bg-[#0a110d] p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-3 sm:space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide border-b border-emerald-950 pb-2 sm:pb-3 mb-2.5 sm:mb-4">
              Quick Admin Actions
            </h3>
            <div className="space-y-2 sm:space-y-2.5">
              <Link
                href="/admin/properties"
                className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#07140c] border border-emerald-900/60 hover:border-emerald-500 flex items-center justify-between text-[11px] sm:text-xs font-bold text-gray-200 hover:text-emerald-400 transition-all group"
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <ShieldCheck size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
                  <span>Moderate & Verify Listings</span>
                </div>
                <ArrowUpRight size={13} className="text-gray-500 group-hover:text-emerald-400" />
              </Link>

              <Link
                href="/admin/inquiries"
                className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#07140c] border border-emerald-900/60 hover:border-emerald-500 flex items-center justify-between text-[11px] sm:text-xs font-bold text-gray-200 hover:text-emerald-400 transition-all group"
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <MessageSquare size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
                  <span>Manage Tenant Leads</span>
                </div>
                <ArrowUpRight size={13} className="text-gray-500 group-hover:text-emerald-400" />
              </Link>
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-[10px] sm:text-xs font-medium text-center">
            0% Brokerage verification system active.
          </div>
        </div>
      </div>

      {/* Property Moderation Queue Table & Mobile Cards */}
      <div className="bg-[#0a110d] p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-md space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-emerald-950 pb-2.5 sm:pb-4">
          <div>
            <h3 className="text-xs sm:text-base font-extrabold text-white tracking-wide">
              Property Verification Queue
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
              Review and verify direct owner listings with 1-click status toggles.
            </p>
          </div>

          <Link
            href="/admin/properties"
            className="text-[11px] sm:text-xs font-bold text-emerald-400 hover:text-emerald-300 self-start sm:self-auto"
          >
            View All Properties →
          </Link>
        </div>

        {/* Mobile View: Dedicated Distinct Compact Queue Cards (sm:hidden) */}
        <div className="block sm:hidden p-1 space-y-2 bg-[#050806] rounded-xl">
          {properties.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">Loading queue...</div>
          ) : (
            properties.slice(0, 6).map((item) => {
              const targetId = item.pid || item._id || item.id;
              return (
                <div
                  key={`queue-m-${targetId}`}
                  onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                  className="p-3 space-y-2.5 bg-[#08120c] border border-emerald-900/70 hover:border-emerald-500/60 rounded-xl cursor-pointer transition-all active:scale-[0.99] group"
                  title="Click to view full property listing"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-emerald-400 font-bold text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900 flex items-center gap-1">
                      {item.pid}
                      <ExternalLink size={9} className="text-emerald-400 opacity-60 group-hover:opacity-100" />
                    </span>
                    <span className="text-xs font-extrabold text-emerald-400 whitespace-nowrap">
                      {formatPrice(item.price)}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-white text-xs line-clamp-1 group-hover:text-emerald-400 transition-colors">{item.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.locality}, {item.city}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-emerald-950/70 gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {/* Active / Inactive switch */}
                    <button
                      disabled={Boolean(actionPendingId)}
                      onClick={() => handleActiveToggle(targetId, item.available !== false)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center space-x-1.5 select-none ${
                        item.available !== false
                          ? 'bg-[#06180f] border-emerald-800/80 text-emerald-300'
                          : 'bg-[#0e0e0e] border-zinc-800 text-zinc-400'
                      }`}
                      title={item.available !== false ? 'Click to make Inactive' : 'Click to make Active'}
                    >
                      <div
                        className={`w-5 h-3 rounded-full relative flex items-center p-0.5 transition-colors ${
                          item.available !== false ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-white transition-transform ${
                            item.available !== false ? 'translate-x-2' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span>{item.available !== false ? 'Active' : 'Inactive'}</span>
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        disabled={Boolean(actionPendingId)}
                        onClick={() => handleVerifyToggle(targetId, !!item.verified)}
                        className={`h-6 px-2 rounded-md text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap ${item.verified
                            ? 'bg-[#180d10] text-rose-300 border border-rose-900/80'
                            : 'bg-emerald-500 text-black font-extrabold'
                          }`}
                      >
                        {item.verified ? 'Unverify' : 'Verify'}
                      </button>

                      <button
                        onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                        className="h-6 w-6 flex items-center justify-center rounded-md bg-[#0a1810] text-gray-300 hover:text-emerald-400 border border-emerald-900 cursor-pointer"
                        title="View Public Listing"
                      >
                        <Eye size={11} />
                      </button>

                      <button
                        disabled={Boolean(actionPendingId)}
                        onClick={() => setEditingProperty(item)}
                        className="h-6 w-6 flex items-center justify-center rounded-md bg-[#0a1810] text-gray-300 hover:text-emerald-400 border border-emerald-900 cursor-pointer disabled:opacity-50"
                        title="Edit Property"
                      >
                        <Edit3 size={11} />
                      </button>

                      <button
                        disabled={Boolean(actionPendingId)}
                        onClick={() => setPropertyPendingDeletion(item)}
                        className="h-6 w-6 flex items-center justify-center rounded-md bg-[#180a0a] text-rose-400 border border-rose-950 cursor-pointer disabled:opacity-50"
                        title="Delete Property"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3 whitespace-nowrap">ID</th>
                <th className="p-3 min-w-[170px]">Property Title</th>
                <th className="p-3 whitespace-nowrap">City & Locality</th>
                <th className="p-3 whitespace-nowrap">Price</th>
                <th className="p-3 whitespace-nowrap">Owner Contact</th>
                <th className="p-3 whitespace-nowrap">Status</th>
                <th className="p-3 whitespace-nowrap">Verification</th>
                <th className="p-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {properties.length === 0 ? (
                <TableSkeletonLoader rows={4} cols={8} message="Loading property queue..." />
              ) : (
                properties.slice(0, 6).map((item) => {
                  const targetId = item.pid || item._id || item.id;
                  return (
                    <tr
                      key={item.id || item.pid}
                      onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                      className="hover:bg-[#07160d] transition-colors cursor-pointer group"
                      title="Click to view full property listing"
                    >
                      {/* ID */}
                      <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 group-hover:underline">
                          {item.pid}
                          <ExternalLink size={10} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                        </span>
                      </td>

                      {/* Property Title */}
                      <td className="p-3 font-bold text-white max-w-xs truncate group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </td>

                      {/* City & Locality */}
                      <td className="p-3 text-gray-300 whitespace-nowrap">{(item.locality || '')}, {(item.city || '')}</td>

                      {/* Price */}
                      <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">
                        {formatPrice(item.price)}
                      </td>

                      {/* Owner Contact */}
                      <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {item.ownerPhone ? (
                          <div className="flex flex-col space-y-0.5">
                            <a
                              href={`tel:${String(item.ownerPhone).replace(/\s+/g, '')}`}
                              className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 w-fit text-xs"
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
                          <span className="font-mono text-gray-500 text-xs">N/A</span>
                        )}
                      </td>

                      {/* Status: Active / Inactive Button */}
                      <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={Boolean(actionPendingId)}
                          onClick={() => handleActiveToggle(targetId, item.available !== false)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-sm select-none ${
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
                          <span>{item.available !== false ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Verification Status & Toggle */}
                      <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          {item.verified ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-extrabold">
                              <CheckCircle2 size={12} />
                              <span>VERIFIED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-extrabold">
                              <Clock size={12} />
                              <span>PENDING</span>
                            </span>
                          )}

                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => handleVerifyToggle(targetId, !!item.verified)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${item.verified
                              ? 'bg-[#140b0d] text-rose-400 border-rose-900/80 hover:bg-rose-950'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-500'
                              }`}
                          >
                            {item.verified ? 'Unverify' : 'Verify'}
                          </button>
                        </div>
                      </td>

                      {/* Actions: View, Edit, Delete */}
                      <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                            className="p-1.5 rounded-xl bg-[#0a1810] border border-emerald-900 text-gray-300 hover:text-emerald-400 hover:border-emerald-700 transition-colors cursor-pointer"
                            title="View Public Listing"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Edit Button */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => setEditingProperty(item)}
                            className="p-1.5 rounded-xl bg-[#0a1810] border border-emerald-900 text-gray-300 hover:text-emerald-400 hover:border-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                            title="Edit Property Details"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete Button */}
                          <button
                            disabled={Boolean(actionPendingId)}
                            onClick={() => setPropertyPendingDeletion(item)}
                            className="p-1.5 rounded-xl bg-[#140b0d] text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-900/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Property"
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
      </div>

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-900/80 p-6 max-w-lg w-full space-y-5 text-gray-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
              <h3 className="text-base font-extrabold text-white">Edit Property ({editingProperty.pid})</h3>
              <button onClick={() => setEditingProperty(null)} className="p-1 text-gray-400 hover:text-white cursor-pointer">
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
                  className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={editingProperty.city}
                    onChange={(e) => setEditingProperty({ ...editingProperty, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
                    placeholder="Owner name"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Owner Contact Number</label>
                  <input
                    type="text"
                    value={editingProperty.ownerPhone || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, ownerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#050806] border border-emerald-900 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
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
                  className="px-4 py-2 rounded-xl bg-[#050806] text-gray-300 font-semibold hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {propertyPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a110d] border border-rose-900/60 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-white">Delete Property Listing?</h3>
              <p className="text-xs text-gray-400">
                Are you sure you want to permanently remove <span className="font-mono text-emerald-400 font-bold">{propertyPendingDeletion.pid}</span> ({propertyPendingDeletion.title})?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setPropertyPendingDeletion(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#050806] border border-emerald-950 text-gray-300 font-bold text-xs hover:bg-[#0e1813] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
