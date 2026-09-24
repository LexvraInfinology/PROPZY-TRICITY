import { PropertyItem } from './seedData';

const CACHE_KEY = 'propzy_admin_session_v5';
const CHANNEL_NAME = 'propzy_admin_sync_channel';

export type AdminDataType = 'properties' | 'inquiries' | 'users' | 'verifications' | 'contacts';

interface AdminCacheStore {
  properties: PropertyItem[] | null;
  inquiries: any[] | null;
  users: any[] | null;
  verifications: any[] | null;
  contacts: any[] | null;
}

// In-memory instant cache for zero-latency client navigation across sidebar tabs
let memoryStore: AdminCacheStore = {
  properties: null,
  inquiries: null,
  users: null,
  verifications: null,
  contacts: null,
};

let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined') {
  try {
    // Clear out any old legacy persistent localStorage keys from earlier builds
    localStorage.removeItem('propzy_admin_data');
    localStorage.removeItem('propzy_admin_data_v2');
  } catch (e) {}

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      syncChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch (e) {
      console.warn('BroadcastChannel initialization failed:', e);
    }
  }
}

const getStore = (): AdminCacheStore => {
  if (typeof window === 'undefined') {
    return memoryStore;
  }
  // Check in-memory store first (0ms)
  if (memoryStore.properties !== null || memoryStore.inquiries !== null || memoryStore.users !== null || memoryStore.verifications !== null || memoryStore.contacts !== null) {
    return memoryStore;
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryStore = { ...memoryStore, ...parsed };
      return memoryStore;
    }
  } catch (e) { }
  return memoryStore;
};

const saveStore = (data: Partial<AdminCacheStore>) => {
  memoryStore = { ...memoryStore, ...data };
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryStore));
  } catch (e) { }
};

export const notifyAdminSync = (type: AdminDataType): void => {
  if (typeof window === 'undefined') return;

  // Post to BroadcastChannel for instant cross-tab sync only
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type, timestamp: Date.now() });
    } catch (e) { }
  }
};

export const subscribeAdminSync = (callback: (type: AdminDataType) => void): (() => void) => {
  if (typeof window === 'undefined') return () => { };

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.type) callback(detail.type);
  };
  window.addEventListener('admin_cache_updated', handleCustomEvent);

  const handleBroadcastMessage = (e: MessageEvent) => {
    if (e.data?.type) {
      callback(e.data.type);
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener('admin_cache_updated', handleCustomEvent);
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
};

export const getCachedProperties = (): PropertyItem[] | null => getStore().properties;
export const hasCachedProperties = (): boolean => Array.isArray(getStore().properties) && (getStore().properties?.length ?? 0) > 0;
export const setCachedProperties = (data: PropertyItem[], notify = true): void => {
  saveStore({ properties: data });
  if (notify) notifyAdminSync('properties');
};

export const getCachedInquiries = (): any[] | null => getStore().inquiries;
export const hasCachedInquiries = (): boolean => Array.isArray(getStore().inquiries) && (getStore().inquiries?.length ?? 0) > 0;
export const setCachedInquiries = (data: any[], notify = true): void => {
  saveStore({ inquiries: data });
  if (notify) notifyAdminSync('inquiries');
};

export const getCachedUsers = (): any[] | null => getStore().users;
export const hasCachedUsers = (): boolean => Array.isArray(getStore().users) && (getStore().users?.length ?? 0) > 0;
export const setCachedUsers = (data: any[], notify = true): void => {
  saveStore({ users: data });
  if (notify) notifyAdminSync('users');
};

export const getCachedVerifications = (): any[] | null => getStore().verifications;
export const hasCachedVerifications = (): boolean => Array.isArray(getStore().verifications) && (getStore().verifications?.length ?? 0) > 0;
export const setCachedVerifications = (data: any[], notify = true): void => {
  saveStore({ verifications: data });
  if (notify) notifyAdminSync('verifications');
};

export const getCachedContacts = (): any[] | null => getStore().contacts;
export const hasCachedContacts = (): boolean => Array.isArray(getStore().contacts) && (getStore().contacts?.length ?? 0) > 0;
export const setCachedContacts = (data: any[], notify = true): void => {
  saveStore({ contacts: data });
  if (notify) notifyAdminSync('contacts');
};

export const clearAdminCache = (): void => {
  memoryStore = {
    properties: null,
    inquiries: null,
    users: null,
    verifications: null,
    contacts: null,
  };
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('propzy_admin_data_v2');
    localStorage.removeItem('propzy_admin_data');
  } catch (e) { }
};

