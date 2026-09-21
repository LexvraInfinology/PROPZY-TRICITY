'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, ShieldCheck, UserCheck, Search, Filter, RefreshCw, Phone, Mail, Building } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getCachedUsers, setCachedUsers, hasCachedUsers } from '@/lib/adminCache';
import { useAdminSync } from '@/hooks/useAdminSync';
import { TableSkeletonLoader } from '@/components/Loader';

export default function AdminUsersPage() {
  const { showToast } = useApp();
  const [users, setUsers] = useState<any[]>(() => getCachedUsers() || []);
  const [loading, setLoading] = useState<boolean>(() => !hasCachedUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'tenant' | 'admin'>('all');

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
        setCachedUsers(data.data, true);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Show cached immediately, and silently revalidate in background to keep listings count accurate
    if (!hasCachedUsers()) {
      fetchUsers(false);
    } else {
      fetchUsers(true);
    }
  }, [fetchUsers]);

  // Real-time cross-tab sync
  useAdminSync({
    dataType: 'users',
    onSync: () => {
      const latest = getCachedUsers();
      if (latest && latest.length > 0) {
        setUsers(latest);
      } else {
        fetchUsers(true);
      }
    },
    enablePolling: false,
  });

  const filteredUsers = users.filter((u) => {
    const roleKey = (u.role || '').toLowerCase();
    const normalizedRole = roleKey.includes('admin') ? 'admin' : roleKey.includes('owner') || roleKey.includes('landlord') ? 'owner' : 'tenant';
    if (roleFilter !== 'all' && normalizedRole !== roleFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchPhone = (u.phone || '').includes(q);
      const matchRole = normalizedRole.includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchRole) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-emerald-950/80 pb-3.5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            User Directory
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
            Registered property owners, tenants, and admin account permissions.
          </p>
        </div>

        <button
          onClick={() => fetchUsers(false)}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#091a12] border border-emerald-800 text-emerald-400 hover:bg-emerald-900/60 rounded-lg sm:rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0a110d] p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Role Filter Tabs */}
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {(['all', 'owner', 'tenant', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${roleFilter === r
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-[#050806] text-gray-400 border border-emerald-950 hover:text-white'
                }`}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-2.5 sm:top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-[#050806] border border-emerald-950 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table & Mobile Cards */}
      <div className="bg-[#0a110d] rounded-2xl sm:rounded-3xl border border-emerald-950/90 shadow-xl overflow-hidden">
        <div className="p-2.5 sm:p-4 border-b border-emerald-950 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] sm:text-xs font-bold text-gray-300">
              Total Users: <span className="text-emerald-400 font-extrabold">{filteredUsers.length}</span> of {users.length}
            </span>
            <button
              onClick={() => fetchUsers(false)}
              disabled={loading}
              className="p-1 sm:p-1.5 rounded-lg bg-[#050806] border border-emerald-950 hover:border-emerald-500 text-gray-400 hover:text-emerald-400 transition-all cursor-pointer"
              title="Refresh users and listing counts"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
          {loading && (
            <span className="text-[11px] sm:text-xs text-emerald-400 font-bold flex items-center space-x-1.5 animate-pulse">
              <RefreshCw size={11} className="animate-spin" />
              <span>Fetching live users...</span>
            </span>
          )}
        </div>

        {/* Mobile View: Dedicated Compact User Cards */}
        <div className="block sm:hidden p-2.5 space-y-2.5 bg-[#050806]">
          {loading && users.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs bg-[#09110c] border border-emerald-950 rounded-xl">
              No registered users found.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const roleKey = (u.role || '').toLowerCase();
              const isAdmin = roleKey.includes('admin');
              const isOwner = roleKey.includes('owner') || roleKey.includes('landlord');
              const displayRole = isAdmin ? 'Admin' : isOwner ? 'Owner' : 'Tenant';

              return (
                <div
                  key={`m-${u.id || u._id || u.email}`}
                  className="p-3 space-y-2 bg-[#08120c] border border-emerald-900/70 rounded-xl shadow-md"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-[10px] shadow shrink-0">
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs flex items-center space-x-1 min-w-0">
                          <span className="truncate">{u.name || 'Anonymous User'}</span>
                          {u.ownerVerified && (
                            <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 py-0.2 rounded font-bold shrink-0">
                              Verified
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[10px] text-gray-400 font-mono truncate cursor-pointer hover:text-emerald-400 transition-colors"
                          title={`Click to copy: ${u.email}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (u.email && navigator.clipboard) {
                              navigator.clipboard.writeText(u.email);
                              showToast('Email copied to clipboard!');
                            }
                          }}
                        >
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap uppercase tracking-wider border shrink-0 ${isAdmin
                        ? 'bg-purple-950/80 text-purple-400 border-purple-800/80'
                        : isOwner
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                          : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/80'
                      }`}>
                      {displayRole}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-emerald-950/70 min-w-0">
                    <div className="font-mono truncate mr-2">{u.phone || 'No phone'}</div>
                    <Link
                      href={`/admin/properties?search=${encodeURIComponent(u.email || u.name || '')}`}
                      className="text-emerald-400 font-bold shrink-0 hover:underline hover:text-emerald-300 transition-colors"
                      title="View user listings in Property Manager"
                    >
                      {u.propertiesCount !== undefined ? u.propertiesCount : (u.postedProperties?.length || 0)} Listings
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs text-gray-300">
            <thead className="bg-[#050806] text-gray-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-emerald-950">
              <tr>
                <th className="p-3.5">User Profile</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Account Role</th>
                <th className="p-3.5">Posted Properties</th>
                <th className="p-3.5 text-right">Status Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {loading ? (
                <TableSkeletonLoader rows={5} cols={5} message="Loading directory users..." />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-emerald-900/60" />
                    <p className="font-bold text-white text-sm">No registered users found</p>
                    <p className="text-[11px] text-gray-500 mt-1">Try resetting search filters or refreshing directory.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleKey = (u.role || '').toLowerCase();
                  const isAdmin = roleKey.includes('admin');
                  const isOwner = roleKey.includes('owner') || roleKey.includes('landlord');
                  const displayRole = isAdmin ? 'Admin' : isOwner ? 'Owner' : 'Tenant';

                  return (
                    <tr key={u.id || u._id || u.email} className="hover:bg-[#07120a] transition-colors">
                      <td className="p-3.5 flex items-center space-x-3 min-w-0 max-w-[280px]">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-xs shadow shrink-0">
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white flex items-center space-x-1.5 min-w-0">
                            <span className="truncate">{u.name || 'Anonymous User'}</span>
                            {u.ownerVerified && (
                              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                                Verified
                              </span>
                            )}
                          </div>
                          <div
                            className="text-[10px] text-gray-400 font-mono truncate cursor-pointer hover:text-emerald-400 transition-colors"
                            title={`Click to copy: ${u.email}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (u.email && navigator.clipboard) {
                                navigator.clipboard.writeText(u.email);
                                showToast('Email copied to clipboard!');
                              }
                            }}
                          >
                            {u.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-gray-300">{u.phone || 'Not provided'}</td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap uppercase tracking-wider ${isAdmin
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-800/80'
                            : isOwner
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/80'
                          }`}>
                          {displayRole}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        <Link
                          href={`/admin/properties?search=${encodeURIComponent(u.email || u.name || '')}`}
                          className="hover:text-emerald-400 hover:underline transition-colors"
                          title="View user listings in Property Manager"
                        >
                          {u.propertiesCount !== undefined ? u.propertiesCount : (u.postedProperties?.length || 0)} Listings
                        </Link>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => showToast(`User ${u.name || u.email} is active and verified`)}
                          className="px-3 py-1 rounded-xl bg-[#0a1810] border border-emerald-900 hover:border-emerald-500 text-emerald-400 text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                        >
                          Active
                        </button>
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
