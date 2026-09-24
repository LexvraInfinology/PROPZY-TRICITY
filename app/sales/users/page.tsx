'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Search, Phone, Mail, MapPin, RefreshCw, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TableSkeletonLoader } from '@/components/Loader';

interface SalesUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  rawRole: string;
  city: string;
  activePlan: string;
  credits: number;
  createdAt: string;
}

function normalizePlanKey(plan?: string): 'Free' | 'Standard' | 'Premium' {
  if (!plan) return 'Free';
  const lower = plan.toLowerCase();
  if (lower.includes('premium')) return 'Premium';
  if (lower.includes('standard')) return 'Standard';
  return 'Free';
}

export default function SalesUsersDirectoryPage() {
  const { showToast } = useApp();
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'tenant' | 'owner' | 'sales' | 'admin'>('all');
  const [updatingPlanUserId, setUpdatingPlanUserId] = useState<string | null>(null);

  const handlePlanChange = async (userId: string, newPlan: 'Free' | 'Standard' | 'Premium') => {
    const previousUsers = [...users];

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        const estCredits = newPlan === 'Premium' ? 100 : newPlan === 'Standard' ? 20 : 0;
        return {
          ...user,
          activePlan: newPlan === 'Free' ? 'Free' : `${newPlan} Plan`,
          credits: estCredits
        };
      })
    );

    setUpdatingPlanUserId(userId);

    try {
      const res = await fetch('/api/sales/users/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, plan: newPlan })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update plan in database.');
      }

      // Sync confirmed state from database
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          return {
            ...user,
            activePlan: data.data?.activePlan || (newPlan === 'Free' ? 'Free' : `${newPlan} Plan`),
            credits: typeof data.data?.credits === 'number' ? data.data.credits : user.credits
          };
        })
      );

      showToast(`🎉 Plan successfully updated to ${newPlan}!`);
    } catch (err: any) {
      // Revert optimistic update on failure
      setUsers(previousUsers);
      showToast(err.message || 'Failed to update plan in database.', 'error');
    } finally {
      setUpdatingPlanUserId(null);
    }
  };

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/sales/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      console.warn('Failed to load users directory:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(false);
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all') {
        const r = (u.rawRole || u.role || '').toLowerCase();
        if (roleFilter === 'tenant' && !r.includes('tenant') && !r.includes('user')) return false;
        if (roleFilter === 'owner' && !r.includes('owner') && !r.includes('landlord')) return false;
        if (roleFilter === 'sales' && !r.includes('sales')) return false;
        if (roleFilter === 'admin' && !r.includes('admin')) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = (u.name || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchPhone = (u.phone || '').includes(q);
        const matchCity = (u.city || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
      }

      return true;
    });
  }, [users, roleFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="text-emerald-400" size={24} />
            <span>Users Directory</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Directory of registered tenants, property owners, and sales staff with direct plan management and customer support.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await fetchUsers(true);
              setRefreshing(false);
              showToast('Users directory refreshed!');
            }}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Users'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#0a110d] p-3 sm:p-4 rounded-2xl border border-emerald-950/90 shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, email, or city..."
            className="w-full pl-9 pr-3 py-2 bg-[#050806] border border-emerald-900/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
          <Search className="absolute left-3 top-2.5 text-emerald-400" size={14} />
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'tenant', 'owner', 'sales', 'admin'] as const).map((r) => {
            const isActive = roleFilter === r;
            const label = r === 'all' ? 'All Roles' : r === 'sales' ? 'Sales Desk' : r.charAt(0).toUpperCase() + r.slice(1) + 's';

            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-black font-extrabold shadow-sm shadow-emerald-500/20'
                    : 'bg-[#050806] border border-emerald-950 text-gray-400 hover:text-white hover:border-emerald-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-emerald-950 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-semibold">
            Showing <span className="text-white font-bold">{filteredUsers.length}</span> registered users
          </span>
          <span className="text-[10px] text-emerald-400/90 font-mono">
            Direct Plan Management Enabled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3.5 min-w-[180px]">User Name</th>
                <th className="p-3.5 whitespace-nowrap">Contact Details</th>
                <th className="p-3.5 whitespace-nowrap">Account Role</th>
                <th className="p-3.5 whitespace-nowrap">City</th>
                <th className="p-3.5 whitespace-nowrap">Active Plan</th>
                <th className="p-3.5 whitespace-nowrap text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {loading && users.length === 0 ? (
                <TableSkeletonLoader rows={6} cols={6} message="Loading user directory..." />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No users found matching your search filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isAdmin = u.role === 'Admin';
                  const isSales = u.role.includes('Sales');
                  const isOwner = u.role === 'Owner';

                  return (
                    <tr key={u.id} className="hover:bg-[#07160d] transition-colors">
                      {/* Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-white text-xs">{u.name}</div>
                      </td>

                      {/* Contact Info */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col space-y-0.5">
                          {u.phone ? (
                            <a
                              href={`tel:${u.phone.replace(/\D/g, '')}`}
                              className="font-mono font-semibold text-emerald-400 hover:underline flex items-center gap-1 w-fit"
                              title={`Call ${u.name}`}
                            >
                              <Phone size={11} className="stroke-[2.5]" />
                              <span>{u.phone}</span>
                            </a>
                          ) : (
                            <span className="font-mono text-gray-500 text-[11px]">N/A</span>
                          )}
                          {u.email && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[180px]" title={u.email}>
                              {u.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                            isAdmin
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : isSales
                              ? 'bg-teal-950 text-teal-300 border-teal-800'
                              : isOwner
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-[#0a2014] text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* City */}
                      <td className="p-3.5 whitespace-nowrap text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-emerald-500 shrink-0" />
                          <span>{u.city || 'Mohali'}</span>
                        </span>
                      </td>

                      {/* Active Plan Dropdown */}
                      <td className="p-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <select
                              value={normalizePlanKey(u.activePlan)}
                              onChange={(e) => handlePlanChange(u.id, e.target.value as 'Free' | 'Standard' | 'Premium')}
                              disabled={updatingPlanUserId === u.id}
                              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer outline-none ${
                                normalizePlanKey(u.activePlan) === 'Premium'
                                  ? 'bg-purple-950/80 text-purple-300 border-purple-700/80 hover:border-purple-500'
                                  : normalizePlanKey(u.activePlan) === 'Standard'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:border-emerald-500'
                                  : 'bg-[#050806] text-gray-300 border-emerald-950 hover:border-emerald-800'
                              } disabled:opacity-50`}
                            >
                              <option value="Free" className="bg-[#050806] text-gray-300">Free</option>
                              <option value="Standard" className="bg-[#050806] text-emerald-400">Standard</option>
                              <option value="Premium" className="bg-[#050806] text-purple-400">Premium</option>
                            </select>
                          </div>

                          {updatingPlanUserId === u.id ? (
                            <Loader2 size={13} className="animate-spin text-emerald-400 shrink-0" />
                          ) : (
                            u.credits > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-bold shrink-0">
                                {u.credits} cr
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 whitespace-nowrap text-right text-gray-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
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
