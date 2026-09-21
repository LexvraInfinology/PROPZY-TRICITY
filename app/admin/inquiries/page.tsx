'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, Phone, User, Calendar, CheckCircle2, 
  Clock, Search, ArrowUpRight, Sparkles, Filter, RefreshCw,
  Inbox, Building2, CalendarCheck, Check
} from 'lucide-react';
import { INITIAL_INQUIRIES } from '@/lib/seedData';
import { useApp } from '@/context/AppContext';
import { getCachedInquiries, setCachedInquiries, hasCachedInquiries } from '@/lib/adminCache';
import { useAdminSync } from '@/hooks/useAdminSync';
import { TableSkeletonLoader } from '@/components/Loader';

export default function AdminInquiriesPage() {
  const { showToast } = useApp();
  const [inquiries, setInquiries] = useState<any[]>(() => getCachedInquiries() || []);
  const [loading, setLoading] = useState<boolean>(() => !hasCachedInquiries());
  const [statusFilter, setStatusFilter] = useState('New');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchInquiries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/inquiries', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInquiries(data.data);
        setCachedInquiries(data.data, false);
      }
    } catch (e) {
      console.warn('Failed to fetch inquiries:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasCachedInquiries()) {
      fetchInquiries(false);
    }
  }, [fetchInquiries]);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(10);
  }, [statusFilter, searchQuery]);

  // Real-time cross-tab sync hook
  useAdminSync({
    dataType: 'inquiries',
    onSync: () => {
      const latest = getCachedInquiries();
      if (latest && latest.length > 0) {
        setInquiries(latest);
      } else {
        fetchInquiries(true);
      }
    },
    enablePolling: false,
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Immediate optimistic state update
    setInquiries(prev => {
      const updated = prev.map(inq => (inq.id === id || inq._id === id || inq._id?.toString() === id) ? { ...inq, status: newStatus } : inq);
      setCachedInquiries(updated);
      return updated;
    });

    showToast(`Lead status updated to ${newStatus}`);

    // Persistent database update in MongoDB
    try {
      await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (e) {
      console.warn('Failed to update lead status in database:', e);
    }
  };

  // Metrics counters
  const totalLeadsCount = inquiries.length;
  const newLeadsCount = inquiries.filter(item => {
    const st = (item.status || 'New').toLowerCase();
    return st === 'new' || st === 'pending';
  }).length;
  const contactedCount = inquiries.filter(item => (item.status || '').toLowerCase() === 'contacted').length;
  const visitScheduledCount = inquiries.filter(item => (item.status || '').toLowerCase() === 'visit scheduled').length;
  const closedCount = inquiries.filter(item => (item.status || '').toLowerCase() === 'closed').length;

  const filteredInquiries = inquiries.filter(item => {
    const itemStatus = (item.status || 'New').toLowerCase();

    if (statusFilter === 'New') {
      if (itemStatus !== 'new' && itemStatus !== 'pending') return false;
    } else if (statusFilter !== 'all') {
      if (itemStatus !== statusFilter.toLowerCase()) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (item.tenantName || '').toLowerCase();
      const phone = (item.tenantPhone || '').toLowerCase();
      const email = (item.tenantEmail || '').toLowerCase();
      const pid = (item.propertyPid || '').toLowerCase();
      const title = (item.propertyTitle || '').toLowerCase();
      const msg = (item.tenantMessage || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || pid.includes(q) || title.includes(q) || msg.includes(q);
    }

    return true;
  });

  const displayedInquiries = filteredInquiries.slice(0, visibleCount);

  // Status Filter Tabs: New Leads first on the left, All Leads last on the right
  const filterTabs = [
    { key: 'New', label: 'New Leads', count: newLeadsCount },
    { key: 'Contacted', label: 'Contacted', count: contactedCount },
    { key: 'Visit Scheduled', label: 'Visit Scheduled', count: visitScheduledCount },
    { key: 'Closed', label: 'Closed', count: closedCount },
    { key: 'all', label: 'All Leads', count: totalLeadsCount }
  ];

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-emerald-950/80 pb-3.5 sm:pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tenant Leads & Visit Inquiries
            </h1>
            {newLeadsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-[10px] sm:text-xs whitespace-nowrap shrink-0">
                {newLeadsCount} New
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
            Stream of tenant interest forms, property visit requests & direct lead status tracking.
          </p>
        </div>
        <button
          onClick={() => {
            setVisibleCount(10);
            fetchInquiries(false);
          }}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#091a12] border border-emerald-800 text-emerald-400 hover:bg-emerald-900/60 rounded-lg sm:rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('New')}
          className="bg-[#09110c] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-950/90 shadow hover:border-emerald-800/80 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider">New Leads</span>
            <Clock size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white mt-1">{newLeadsCount}</p>
          <span className="text-[9px] sm:text-[10px] text-gray-500">Uncontacted requests</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Contacted')}
          className="bg-[#09110c] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-950/90 shadow hover:border-emerald-800/80 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Contacted</span>
            <Phone size={14} className="text-cyan-400 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-cyan-400 mt-1">{contactedCount}</p>
          <span className="text-[9px] sm:text-[10px] text-gray-500">In discussion</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Visit Scheduled')}
          className="bg-[#09110c] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-950/90 shadow hover:border-emerald-800/80 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-purple-400 uppercase tracking-wider">Visit Scheduled</span>
            <CalendarCheck size={14} className="text-purple-400 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-purple-400 mt-1">{visitScheduledCount}</p>
          <span className="text-[9px] sm:text-[10px] text-gray-500">Visits booked</span>
        </div>

        <div 
          onClick={() => setStatusFilter('all')}
          className="bg-[#09110c] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-950/90 shadow hover:border-emerald-800/80 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">All Leads</span>
            <Inbox size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white mt-1">{totalLeadsCount}</p>
          <span className="text-[9px] sm:text-[10px] text-gray-500">Total pipeline</span>
        </div>
      </div>

      {/* Filter Bar with New Leads First on Left, All Leads Last on Right */}
      <div className="bg-[#0a110d] p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by tenant name, phone, PID, message..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-[#050806] border border-emerald-900/80 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs (New Leads on Left, All Leads at the End) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                statusFilter === tab.key
                  ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                  : 'bg-[#050806] text-gray-400 border border-emerald-950 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.key ? 'bg-black/20 text-black' : 'bg-[#0a1610] text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries List & Table */}
      <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-xl overflow-hidden">
        <div className="p-2.5 sm:p-4 border-b border-emerald-950 flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-gray-300">
            Showing <span className="text-emerald-400 font-extrabold">{displayedInquiries.length}</span> of {filteredInquiries.length} Leads
          </span>
          {loading && (
            <span className="text-[11px] sm:text-xs text-emerald-400 font-bold flex items-center space-x-1.5 animate-pulse">
              <RefreshCw size={11} className="animate-spin" />
              <span>Updating leads...</span>
            </span>
          )}
        </div>

        {/* Mobile Lead Cards View (sm:hidden) */}
        <div className="block sm:hidden p-2.5 space-y-2.5 bg-[#050806]">
          {loading && inquiries.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">Loading tenant leads...</div>
          ) : filteredInquiries.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs bg-[#09110c] border border-emerald-950 rounded-xl">
              No leads found matching {statusFilter === 'all' ? 'search' : statusFilter} status.
            </div>
          ) : (
            displayedInquiries.map((item) => {
              const id = item.id || item._id?.toString() || item._id;
              const currentStatus = item.status || 'New';
              return (
                <div 
                  key={`m-${id}`} 
                  className="p-3 space-y-2.5 bg-[#08120c] border border-emerald-900/70 hover:border-emerald-700/90 rounded-xl shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-emerald-950/70">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-800/80 font-mono font-bold text-[11px] text-emerald-400">
                        PROP-ID: {item.propertyPid ? item.propertyPid.replace(/^(PZ|LR)-/i, '') : '101'}
                      </span>
                    </div>

                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(id, e.target.value)}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border bg-[#050806] cursor-pointer whitespace-nowrap ${
                        currentStatus === 'Closed'
                          ? 'text-gray-400 border-gray-800'
                          : currentStatus === 'Visit Scheduled'
                          ? 'text-purple-400 border-purple-800'
                          : currentStatus === 'Contacted'
                          ? 'text-cyan-400 border-cyan-800'
                          : 'text-emerald-400 border-emerald-800'
                      }`}
                    >
                      <option value="New">NEW LEAD</option>
                      <option value="Contacted">CONTACTED</option>
                      <option value="Visit Scheduled">VISIT SCHEDULED</option>
                      <option value="Closed">CLOSED</option>
                    </select>
                  </div>

                  <div>
                    <div className="font-bold text-white text-xs">{item.tenantName}</div>
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">{item.tenantPhone}</div>
                  </div>

                  {item.tenantMessage && (
                    <div className="p-2 rounded-lg bg-[#040805] border border-emerald-950/80 text-[11px] text-gray-300 italic leading-relaxed">
                      "{item.tenantMessage}"
                    </div>
                  )}

                  <a
                    href={`tel:${item.tenantPhone}`}
                    className="w-full flex items-center justify-center space-x-1.5 h-7 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Phone size={11} className="stroke-[2.5]" />
                    <span>Call Tenant ({item.tenantPhone})</span>
                  </a>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3.5 whitespace-nowrap">PROP-ID</th>
                <th className="p-3.5 whitespace-nowrap">Tenant Details</th>
                <th className="p-3.5">Message / Request</th>
                <th className="p-3.5 whitespace-nowrap">Lead Status</th>
                <th className="p-3.5 text-right whitespace-nowrap">Quick Contact Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {loading && inquiries.length === 0 ? (
                <TableSkeletonLoader rows={5} cols={5} message="Loading tenant leads..." />
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No leads found matching {statusFilter === 'all' ? 'search' : statusFilter} status.
                  </td>
                </tr>
              ) : (
                displayedInquiries.map((item) => {
                  const id = item.id || item._id?.toString() || item._id;
                  const currentStatus = item.status || 'New';
                  return (
                    <tr key={id} className="hover:bg-[#07120a] transition-colors">
                      <td className="p-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">{item.propertyPid ? item.propertyPid.replace(/^(PZ|LR)-/i, '') : '101'}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-white">{item.tenantName}</div>
                        <div className="text-[10px] font-mono text-gray-400">{item.tenantPhone}</div>
                      </td>
                      <td className="p-3.5 max-w-xs text-gray-300">
                        <div className="line-clamp-2 italic">"{item.tenantMessage}"</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(id, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-[#050806] cursor-pointer whitespace-nowrap ${
                            currentStatus === 'Closed'
                              ? 'text-gray-400 border-gray-800'
                              : currentStatus === 'Visit Scheduled'
                              ? 'text-purple-400 border-purple-800'
                              : currentStatus === 'Contacted'
                              ? 'text-cyan-400 border-cyan-800'
                              : 'text-emerald-400 border-emerald-800'
                          }`}
                        >
                          <option value="New">NEW LEAD</option>
                          <option value="Contacted">CONTACTED</option>
                          <option value="Visit Scheduled">VISIT SCHEDULED</option>
                          <option value="Closed">CLOSED</option>
                        </select>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <a
                          href={`tel:${item.tenantPhone}`}
                          className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-extrabold transition-all whitespace-nowrap shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer"
                        >
                          <Phone size={12} className="stroke-[2.5]" />
                          <span>Call Tenant</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination: Show More Button */}
        {visibleCount < filteredInquiries.length && (
          <div className="p-4 border-t border-emerald-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#060b08]">
            <span className="text-xs text-gray-400">
              Showing <span className="text-emerald-400 font-extrabold">{displayedInquiries.length}</span> of <span className="text-white font-bold">{filteredInquiries.length}</span> leads
            </span>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <span>Show More Leads ({filteredInquiries.length - displayedInquiries.length} remaining)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
