'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building, Search, Phone, MessageSquare, ExternalLink, Copy, Check,
  RefreshCw, MapPin, Video, Star, User
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatPrice } from '@/lib/format';
import { TableSkeletonLoader } from '@/components/Loader';

interface SalesProperty {
  _id: string;
  pid: string;
  title: string;
  category: string;
  type: string;
  city: string;
  locality: string;
  price: number | string;
  deposit?: number | string;
  bedrooms?: number;
  areaSqFt?: number;
  furnishing?: string;
  verified: boolean;
  featured: boolean;
  videos?: string[];
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  available: boolean;
  createdAt: string;
}

export default function SalesPropertiesDirectoryPage() {
  const { showToast } = useApp();
  const [properties, setProperties] = useState<SalesProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProperties = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/sales/properties', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProperties(data.data);
      }
    } catch (err) {
      console.warn('Failed to load sales property directory:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(false);
  }, [fetchProperties]);

  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    showToast('Phone number copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      if (cityFilter !== 'all' && item.city?.toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter !== 'all' && item.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchPid = (item.pid || '').toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchLocality = (item.locality || '').toLowerCase().includes(q);
        const matchCity = (item.city || '').toLowerCase().includes(q);
        const matchOwnerName = (item.ownerName || '').toLowerCase().includes(q);
        const matchOwnerPhone = (item.ownerPhone || '').includes(q);
        if (!matchPid && !matchTitle && !matchLocality && !matchCity && !matchOwnerName && !matchOwnerPhone) {
          return false;
        }
      }

      return true;
    });
  }, [properties, cityFilter, categoryFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Building className="text-emerald-400" size={24} />
            <span>Property Calling Directory</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse verified listings with unmasked direct owner contacts, click-to-call, and WhatsApp outreach.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await fetchProperties(true);
              setRefreshing(false);
              showToast('Properties directory refreshed!');
            }}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#0a110d] p-3 sm:p-4 rounded-2xl border border-emerald-950/90 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PID, Title, Locality, Owner..."
            className="w-full pl-9 pr-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
          <Search className="absolute left-3 top-2.5 text-emerald-400" size={14} />
        </div>

        {/* City Filter */}
        <div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Cities</option>
            <option value="Mohali">Mohali</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Kharar">Kharar</option>
            <option value="Zirakpur">Zirakpur</option>
            <option value="Panchkula">Panchkula</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="rent">Rent</option>
            <option value="pg">PG / Hostel</option>
            <option value="commercial">Commercial</option>
            <option value="buy">Buy / Sell</option>
          </select>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-emerald-950 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-semibold">
            Showing <span className="text-white font-bold">{filteredProperties.length}</span> active listings
          </span>
          <span className="text-[10px] text-emerald-400/90 font-mono">
            Direct Owner Contacts Revealed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3.5 whitespace-nowrap">PROP-ID</th>
                <th className="p-3.5 min-w-[180px]">Property Details</th>
                <th className="p-3.5 whitespace-nowrap">Category</th>
                <th className="p-3.5 whitespace-nowrap">Price</th>
                <th className="p-3.5 whitespace-nowrap">Owner Name</th>
                <th className="p-3.5 whitespace-nowrap">Direct Owner Contact</th>
                <th className="p-3.5 text-right whitespace-nowrap">Outreach Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {loading && properties.length === 0 ? (
                <TableSkeletonLoader rows={6} cols={7} message="Loading properties directory..." />
              ) : filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No properties match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProperties.map((item) => {
                  const targetId = item.pid || item._id;
                  const cleanPhone = (item.ownerPhone || '').replace(/\D/g, '');
                  const waNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                  const waText = encodeURIComponent(
                    `Hello ${item.ownerName || 'Sir/Madam'}, I am reaching out from Propzy Tricity regarding your property listing: "${item.title}" (ID: ${item.pid}).`
                  );

                  return (
                    <tr
                      key={targetId}
                      onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                      className="hover:bg-[#07160d] transition-colors cursor-pointer group"
                      title="Click to view public listing"
                    >
                      {/* PID */}
                      <td className="p-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 group-hover:underline">
                          {item.pid?.replace(/^(PZ|LR)-/i, '')}
                          <ExternalLink size={10} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                        </span>
                      </td>

                      {/* Details */}
                      <td className="p-3.5 max-w-xs">
                        <div className="flex items-center space-x-1.5">
                          <div className="font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                            {item.title}
                          </div>
                          {item.featured && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[8px] font-extrabold flex items-center space-x-0.5 shrink-0">
                              <Star size={8} className="fill-purple-300 text-purple-300" />
                              <span>Featured</span>
                            </span>
                          )}
                          {item.videos && item.videos.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-extrabold flex items-center space-x-0.5 shrink-0">
                              <Video size={8} />
                              <span>Tour</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-emerald-500 shrink-0" />
                          <span>{item.locality}, {item.city}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 capitalize font-semibold whitespace-nowrap">
                        {item.category} ({item.type})
                      </td>

                      {/* Price */}
                      <td className="p-3.5 font-bold text-emerald-400 whitespace-nowrap">
                        {formatPrice(item.price)}
                      </td>

                      {/* Owner Name */}
                      <td className="p-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                            <User size={13} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs truncate max-w-[140px]" title={item.ownerName || 'Property Owner'}>
                              {item.ownerName || 'Property Owner'}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Direct Owner
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Direct Owner Contact */}
                      <td className="p-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {item.ownerPhone ? (
                          <div className="flex flex-col space-y-0.5">
                            <a
                              href={`tel:${cleanPhone}`}
                              className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 w-fit"
                              title={`Call ${item.ownerName || 'Owner'} (${item.ownerPhone})`}
                            >
                              <Phone size={11} className="stroke-[2.5] text-emerald-400 shrink-0" />
                              <span>{item.ownerPhone}</span>
                            </a>
                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                              {item.ownerEmail || 'Direct Phone'}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-gray-500">N/A</span>
                        )}
                      </td>

                      {/* Outreach Tools */}
                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end space-x-1.5">
                          {/* WhatsApp Button */}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${waNumber}?text=${waText}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-[#06180f] hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 transition-all cursor-pointer shadow-sm"
                              title="Message Owner on WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}

                          {/* Copy Phone Button */}
                          {cleanPhone && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(item.pid, item.ownerPhone, e)}
                              className="p-2 rounded-xl bg-[#0a1810] hover:bg-[#0f281b] text-gray-300 hover:text-white border border-emerald-900 transition-all cursor-pointer"
                              title="Copy Phone Number"
                            >
                              {copiedId === item.pid ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          )}

                          {/* Open Listing in New Tab */}
                          <button
                            type="button"
                            onClick={() => window.open(`/properties/${targetId}`, '_blank')}
                            className="p-2 rounded-xl bg-[#0a1810] hover:bg-[#0f281b] text-gray-300 hover:text-white border border-emerald-900 transition-all cursor-pointer"
                            title="View Property on Website"
                          >
                            <ExternalLink size={13} />
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
    </div>
  );
}
