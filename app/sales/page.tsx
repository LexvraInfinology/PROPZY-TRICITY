'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard, Search, Plus, Minus, Phone, Mail, RefreshCw, CheckCircle2,
  AlertCircle, ShieldAlert, Sparkles, Users, Award
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TableSkeletonLoader } from '@/components/Loader';

interface SubscribedTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  credits: number;
  activePlan: string;
  planExpiresAt: string | null;
  totalInvoices: number;
  createdAt: string;
}

export default function SubscribedTenantsPage() {
  const { showToast } = useApp();
  const [tenants, setTenants] = useState<SubscribedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const fetchTenants = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/sales/subscribed-tenants', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTenants(data.data);
      }
    } catch (err) {
      console.warn('Failed to load subscribed tenants:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants(false);
  }, [fetchTenants]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalSubscribers = tenants.length;
    const totalCredits = tenants.reduce((acc, t) => acc + (t.credits || 0), 0);
    const paidPlansCount = tenants.filter((t) => t.activePlan && !t.activePlan.toLowerCase().includes('free')).length;
    return { totalSubscribers, totalCredits, paidPlansCount };
  }, [tenants]);

  // Filtered List
  const filteredTenants = useMemo(() => {
    if (!searchTerm.trim()) return tenants;
    const q = searchTerm.toLowerCase().trim();
    return tenants.filter((t) =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.phone || '').includes(q) ||
      (t.activePlan || '').toLowerCase().includes(q)
    );
  }, [tenants, searchTerm]);

  // Single-Step Credit Adjustment (+1 or -1) with Optimistic UI & Revert
  const handleAdjustCredit = async (tenant: SubscribedTenant, delta: 1 | -1) => {
    if (pendingUserId) return;
    if (delta === -1 && (tenant.credits || 0) <= 0) {
      showToast('Tenant balance is already at 0 credits.', 'error');
      return;
    }

    setPendingUserId(tenant.id);
    const previousCredits = tenant.credits;
    const newCredits = Math.max(0, previousCredits + delta);

    // 1. Optimistic UI update
    setTenants((prev) =>
      prev.map((t) => (t.id === tenant.id ? { ...t, credits: newCredits } : t))
    );

    try {
      const res = await fetch('/api/sales/credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: tenant.id,
          delta,
          reason: 'Sales Courtesy Adjustment'
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to adjust credit');
      }

      // Authoritative update from server payload
      if (typeof data.data?.credits === 'number') {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, credits: data.data.credits } : t))
        );
      }

      showToast(data.message || `${delta === 1 ? '+1' : '-1'} credit applied!`, 'success');
    } catch (err: any) {
      console.error('Credit adjustment error:', err);
      // Revert optimistic update on failure
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, credits: previousCredits } : t))
      );
      showToast(err.message || 'Credit adjustment failed. Reverting balance.', 'error');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <CreditCard className="text-emerald-400" size={24} />
            <span>Subscribed Tenants & Credits</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage paying subscribers, monitor remaining balance, and grant courtesy credits.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await fetchTenants(true);
              setRefreshing(false);
              showToast('Subscriber records refreshed!');
            }}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#0a110d] border border-emerald-950/80 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
              Subscribers Managed
            </span>
            <span className="text-2xl font-mono font-extrabold text-white mt-0.5 block">
              {metrics.totalSubscribers}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-[#0a110d] border border-emerald-950/80 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
              Active Credits in Use
            </span>
            <span className="text-2xl font-mono font-extrabold text-emerald-400 mt-0.5 block">
              {metrics.totalCredits}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-[#0a110d] border border-emerald-950/80 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
              Paid Plan Holders
            </span>
            <span className="text-2xl font-mono font-extrabold text-teal-400 mt-0.5 block">
              {metrics.paidPlansCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-800 flex items-center justify-center text-teal-400">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#0a110d] p-3 sm:p-4 rounded-2xl border border-emerald-950/90 shadow-xl flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tenant by name, mobile phone, email, or plan..."
            className="w-full pl-9 pr-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
          <Search className="absolute left-3 top-2.5 text-emerald-400" size={14} />
        </div>

        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="px-3 py-2 rounded-xl bg-[#050806] border border-emerald-900 text-gray-400 hover:text-white text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tenants Table */}
      <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-emerald-950 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-semibold">
            Showing <span className="text-white font-bold">{filteredTenants.length}</span> subscribed tenants
          </span>
          <span className="text-[10px] text-emerald-400/80 font-mono">
            Micro-Adjustments: Exactly +1 or -1 per click
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3.5 min-w-[200px]">Tenant Details</th>
                <th className="p-3.5 whitespace-nowrap">Active Plan</th>
                <th className="p-3.5 whitespace-nowrap text-center">Remaining Credits</th>
                <th className="p-3.5 whitespace-nowrap text-right">Credit Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {loading && tenants.length === 0 ? (
                <TableSkeletonLoader rows={5} cols={4} message="Loading subscribers..." />
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No subscribed tenants found matching &quot;{searchTerm}&quot;.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const isPending = pendingUserId === t.id;
                  const isZero = (t.credits || 0) <= 0;

                  return (
                    <tr key={t.id} className="hover:bg-[#07160d] transition-colors">
                      {/* Tenant Identity */}
                      <td className="p-3.5">
                        <div className="font-bold text-white text-xs">{t.name}</div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                          {t.phone && (
                            <a
                              href={`tel:${t.phone.replace(/\D/g, '')}`}
                              className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
                              title={`Call ${t.name}`}
                            >
                              <Phone size={10} className="stroke-[2.5]" />
                              <span>{t.phone}</span>
                            </a>
                          )}
                          {t.email && (
                            <span className="truncate max-w-[160px] text-gray-400" title={t.email}>
                              {t.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active Plan */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col space-y-0.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800 w-fit">
                            {t.activePlan}
                          </span>
                          {t.totalInvoices > 0 && (
                            <span className="text-[9px] text-gray-400">
                              {t.totalInvoices} invoice{t.totalInvoices > 1 ? 's' : ''} on record
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Remaining Credits Badge */}
                      <td className="p-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-xl font-mono text-xs font-bold border transition-all ${
                            t.credits > 0
                              ? 'bg-[#0a2315] text-emerald-300 border-emerald-700/80 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          <Sparkles size={11} className={`mr-1.5 ${t.credits > 0 ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <span>{t.credits} Credit{t.credits !== 1 ? 's' : ''}</span>
                        </span>
                      </td>

                      {/* Micro-Actions (+1 / -1 Stepper) */}
                      <td className="p-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center space-x-1.5 bg-[#050806] p-1 rounded-xl border border-emerald-950">
                          {/* Decrement (-1) Button */}
                          <button
                            type="button"
                            disabled={isPending || isZero}
                            onClick={() => handleAdjustCredit(t, -1)}
                            className="w-8 h-8 rounded-lg bg-[#0e0e0e] hover:bg-rose-950/40 text-gray-300 hover:text-rose-400 border border-zinc-800 hover:border-rose-900 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            title={isZero ? 'Credits cannot be decreased below 0' : 'Deduct 1 credit (-1)'}
                          >
                            <Minus size={13} className="stroke-[2.5]" />
                          </button>

                          {/* Increment (+1) Button */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAdjustCredit(t, 1)}
                            className="w-8 h-8 rounded-lg bg-[#071a10] hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 border border-emerald-900 hover:border-emerald-700 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm shadow-emerald-500/10"
                            title="Add 1 courtesy credit (+1)"
                          >
                            <Plus size={13} className="stroke-[2.5]" />
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
