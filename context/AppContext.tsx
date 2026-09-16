'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';

export type { BillingRecord, UserProfile, AppState } from '@/store/useAppStore';
export { useAppStore } from '@/store/useAppStore';

export const useApp = useAppStore;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUser } = useAppStore();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function syncSession() {
      try {
        // 1. Try session check via cookie
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (isMounted && data.success && data.user) {
          setUser(data.user);
          return;
        }

        // 2. Fallback: sync by stored email if cookie not present
        const currentUser = useAppStore.getState().user;
        if (isMounted && currentUser?.email) {
          const syncRes = await fetch('/api/user/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email })
          });
          const syncData = await syncRes.json();
          if (isMounted && syncData.success && syncData.user) {
            setUser({
              ...currentUser,
              ...syncData.user
            });
          }
        }
      } catch (err) {
        console.warn('Session sync error:', err);
      }
    }

    syncSession();

    return () => {
      isMounted = false;
    };
  }, [setUser]);

  return <>{children}</>;
};
