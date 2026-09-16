'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Heart, User, Building, PhoneCall, ShieldCheck, CheckCircle2,
  XCircle, RefreshCw, CreditCard, Sparkles, FileText, Download, Check, Edit3, Save, AlertTriangle, Upload,
  Phone, Mail, X, Home, MapPin, Printer, Zap, Calendar
} from 'lucide-react';

import { useApp, UserProfile, BillingRecord } from '@/context/AppContext';
import { PropertyItem } from '@/lib/seedData';
import { PropertyCard } from '@/components/PropertyCard';
import { LazyImage } from '@/components/LazyImage';
import { BrandSpinner } from '@/components/Loader';
import { sanitizeName, sanitizePhone, isValidName, isValidPhone, isValidEmail, isValidElectricityBillDocument, isValidHttpUrl } from '@/lib/validation';
import { initiateRazorpaySubscription } from '@/lib/razorpayClient';


interface InquiryItem {
  _id?: string;
  propertyId: string;
  propertyTitle: string;
  propertyPid: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  tenantMessage?: string;
  status: string;
  createdAt?: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { wishlist, user, setUser, openAuthModal, logoutUser, showToast } = useApp();

  const tabParam = searchParams.get('tab') as 'account' | 'wishlist' | 'my-properties' | 'billing' | 'explore-plans' | 'inquiries' | null;
  const [activeTab, setActiveTab] = useState<'account' | 'wishlist' | 'my-properties' | 'billing' | 'explore-plans' | 'inquiries'>(tabParam || 'account');

  const [savedProperties, setSavedProperties] = useState<PropertyItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [allProperties, setAllProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribeToPlan = async (planName: string, amount: number) => {
    if (!user) {
      showToast(`Please login to subscribe to the ${planName}`, 'error');
      openAuthModal();
      return;
    }

    setProcessingPlan(planName);
    showToast(`Initializing Razorpay payment for ${planName} (₹${amount})...`);

    await initiateRazorpaySubscription({
      planName,
      amount,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      onSuccess: ({ user: updatedUser, message }) => {
        setProcessingPlan(null);
        if (updatedUser) {
          setUser(updatedUser);
        }
        showToast(message || ` Successfully subscribed to ${planName}!`, 'success');
      },
      onError: (errorMsg) => {
        setProcessingPlan(null);
        showToast(errorMsg || 'Payment failed. Please try again.', 'error');
      },
      onDismiss: () => {
        setProcessingPlan(null);
        showToast('Payment window closed.', 'error');
      }
    });
  };

  // Account Edit Form State
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    city: user?.city || 'Mohali',
    role: user?.role || 'tenant'
  });

  // Owner Verification State
  const [verifyForm, setVerifyForm] = useState({
    consumerNumber: user?.consumerNumber || '',
    billUrl: user?.electricityBillUrl || ''
  });
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [billUrlError, setBillUrlError] = useState('');
  const [billFileError, setBillFileError] = useState('');
  const [uploadedBillName, setUploadedBillName] = useState('');
  const [billInputMode, setBillInputMode] = useState<'url' | 'upload'>('url');

  const selectBillInputMode = (mode: 'url' | 'upload') => {
    setBillInputMode(mode);
    setVerifyForm(prev => ({ ...prev, billUrl: '' }));
    setUploadedBillName('');
    setBillUrlError('');
    setBillFileError('');
  };

  const validateBillUrl = (value: string) => {
    const valid = isValidHttpUrl(value);
    setBillUrlError(value.trim() && !valid ? 'Enter a valid document URL starting with http:// or https://.' : '');
    return valid;
  };

  const validateUploadedBillFile = async (file: File): Promise<boolean> => {
    if (file.type === 'application/pdf') {
      const [header, footer, documentText] = await Promise.all([
        file.slice(0, 8).text(),
        file.slice(Math.max(file.size - 1024, 0)).text(),
        file.text()
      ]);
      return header.startsWith('%PDF-') &&
        footer.includes('%%EOF') &&
        /(?:xref|\/Type\s*\/XRef)/.test(documentText) &&
        /\/Type\s*\/Page\b/.test(documentText);
    }

    return new Promise((resolve) => {
      const previewUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(previewUrl);
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      };
      image.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        resolve(false);
      };
      image.src = previewUrl;
    });
  };

  const handleBillFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf'];
    if (!acceptedTypes.includes(file.type)) {
      setBillFileError('Upload a JPG, PNG, WEBP, GIF, HEIC image, or PDF file.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBillFileError('The document must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    if (!(await validateUploadedBillFile(file))) {
      setBillFileError('This file is corrupted or not a valid image/PDF. Please choose another document.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const billUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!isValidElectricityBillDocument(billUrl)) {
        setBillFileError('The uploaded file could not be processed. Please choose another document.');
        return;
      }
      setVerifyForm(prev => ({ ...prev, billUrl }));
      setUploadedBillName(file.name);
      setBillUrlError('');
      setBillFileError('');
    };
    reader.onerror = () => setBillFileError('Unable to read the selected file. Please try again.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleViewVerificationDocument = (documentUrl?: string) => {
    if (!documentUrl) {
      showToast('Your submitted document is unavailable.');
      return;
    }

    try {
      if (documentUrl.startsWith('data:')) {
        const separatorIndex = documentUrl.indexOf(',');
        if (separatorIndex === -1) throw new Error('Invalid document data');

        const mimeType = documentUrl.slice(5, separatorIndex).split(';')[0];
        const bytes = Uint8Array.from(atob(documentUrl.slice(separatorIndex + 1)), (character) => character.charCodeAt(0));
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        const previewWindow = window.open(blobUrl, '_blank');
        if (!previewWindow) {
          URL.revokeObjectURL(blobUrl);
          showToast('Allow pop-ups to view your submitted document.');
          return;
        }
        previewWindow.opener = null;
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
        return;
      }

      window.open(documentUrl, '_blank', 'noopener,noreferrer');
    } catch {
      showToast('Your submitted document could not be opened.');
    }
  };

  useEffect(() => {
    if (tabParam) {
      if (user?.role === 'owner' && (tabParam === 'billing' || tabParam === 'explore-plans')) {
        setActiveTab('account');
      } else if (user?.role === 'tenant' && tabParam === 'inquiries') {
        setActiveTab('account');
      } else {
        setActiveTab(tabParam);
      }
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [tabParam, user?.role]);

  useEffect(() => {
    if (user?.role === 'owner' && (activeTab === 'billing' || activeTab === 'explore-plans')) {
      setActiveTab('account');
    } else if (user?.role === 'tenant' && activeTab === 'inquiries') {
      setActiveTab('account');
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, user?.role]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      router.replace('/admin');
    }
  }, [user, router]);

  // The persisted browser profile is only display state. Reconcile it with
  // the HttpOnly-cookie session before an owner can submit verification data.
  useEffect(() => {
    let active = true;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data.success || !data.user) return;
        setUser(data.user);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [setUser]);

  // Auto-sync Pawan Kumar role to sales executive
  useEffect(() => {
    if (user?.email && user.email.toLowerCase().trim() === 'pawanpropzy@gmail.com') {
      if (user.role !== 'sales executive') {
        setUser({
          ...user,
          role: 'sales executive' as any,
          ownerVerified: true,
          verificationStatus: 'approved'
        });
      }
    }
  }, [user, setUser]);

  useEffect(() => {
    if (user) {
      setAccountForm({
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        city: user.city || 'Mohali',
        role: user.role
      });
      setVerifyForm({
        consumerNumber: user.consumerNumber || '',
        billUrl: user.electricityBillUrl || ''
      });
    }
  }, [user]);

  const syncedProfileRef = React.useRef(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Sync latest user profile status once (e.g. owner verification approval from Admin)
      if (user?.email && !syncedProfileRef.current) {
        syncedProfileRef.current = true;
        fetch('/api/user/sync-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.user) {
              if (
                user.verificationStatus !== data.user.verificationStatus ||
                user.ownerVerified !== data.user.ownerVerified ||
                user.role !== data.user.role
              ) {
                setUser({ ...user, ...data.user });
              }
            }
          })
          .catch(() => {});
      }

      // Fetch all properties (including owner's unverified listings awaiting moderation)
      const pRes = await fetch('/api/properties?verified=all');
      const pData = await pRes.json();
      if (pData.success && pData.data) {
        setAllProperties(pData.data);
        const filteredWishlist = pData.data.filter((p: any) => {
          if (wishlist.includes(p.pid)) return true;
          if (p.id && wishlist.includes(p.id)) return true;
          if (p._id && wishlist.includes(p._id.toString())) return true;
          if (p.id && p.id.startsWith('prop-') && (wishlist.includes(`PZ-${p.id.replace('prop-', '')}`) || wishlist.includes(`LR-${p.id.replace('prop-', '')}`))) return true;
          if (p.pid && (p.pid.startsWith('PZ-') || p.pid.startsWith('LR-')) && wishlist.includes(`prop-${p.pid.replace(/^(PZ|LR)-/, '')}`)) return true;
          return false;
        });
        setSavedProperties(filteredWishlist);
      }

      // Fetch inquiries
      const iRes = await fetch('/api/inquiries');
      const iData = await iRes.json();
      if (iData.success && iData.data) {
        setInquiries(iData.data);
      }
    } catch (e) {
      console.warn('Dashboard fetch fallback:', e);
      setSavedProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const myProperties = allProperties.filter((p: PropertyItem) => {
    if (!user) return false;

    // 1. Strict Email Match (most accurate)
    if (user.email && p.ownerEmail && user.email.toLowerCase().trim() === p.ownerEmail.toLowerCase().trim()) {
      return true;
    }

    // 2. Phone Match (ignore generic dummy numbers like 9876543210)
    const userPhoneClean = user.phone ? user.phone.replace(/\D/g, '') : '';
    const propPhoneClean = p.ownerPhone ? p.ownerPhone.replace(/\D/g, '') : '';
    const isDummyPhone = userPhoneClean === '9876543210' || userPhoneClean.length < 10;

    if (!isDummyPhone && userPhoneClean.length >= 10 && userPhoneClean === propPhoneClean) {
      const userFirst = user.name ? user.name.toLowerCase().trim().split(' ')[0] : '';
      const propFirst = p.ownerName ? p.ownerName.toLowerCase().trim().split(' ')[0] : '';
      if (userFirst && propFirst && userFirst === propFirst) {
        return true;
      }
    }

    // 3. Full Name Match (only if ownerEmail is unassigned or matches)
    if (user.name && p.ownerName && user.name.toLowerCase().trim() === p.ownerName.toLowerCase().trim()) {
      if (!p.ownerEmail || p.ownerEmail.toLowerCase().trim() === user.email?.toLowerCase().trim()) {
        return true;
      }
    }

    return false;
  });

  const myInquiries = inquiries.filter((inq: InquiryItem) => {
    if (!user) return false;

    const userPhoneClean = user.phone ? user.phone.replace(/\D/g, '') : '';
    const inqPhoneClean = inq.tenantPhone ? inq.tenantPhone.replace(/\D/g, '') : '';

    if (userPhoneClean && inqPhoneClean && userPhoneClean === inqPhoneClean) {
      return true;
    }
    if (user.name && inq.tenantName && user.name.toLowerCase().trim() === inq.tenantName.toLowerCase().trim()) {
      return true;
    }

    if (user.role === 'owner') {
      const isMyProp = myProperties.some(p => p.pid === inq.propertyPid || p.id === inq.propertyId);
      if (isMyProp) return true;
    }

    return false;
  });

  const handleToggleAvailability = async (prop: PropertyItem) => {
    const targetId = prop.id || prop.pid || (prop as any)._id;
    const currentAvailable = prop.available !== false;
    const newAvailable = !currentAvailable;

    // Optimistically update local state
    setAllProperties(prev => prev.map(p => (p.id === targetId || p.pid === targetId || (p as any)._id === targetId) ? { ...p, available: newAvailable } : p));

    try {
      const res = await fetch(`/api/properties/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newAvailable })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(newAvailable ? `Listing ${prop.pid} is now Active (Visible in public listings)` : `Listing ${prop.pid} is now Inactive (Hidden from public listings)`, 'success');
      } else {
        throw new Error(data.message || 'Failed to update active status');
      }
    } catch (err: any) {
      // Revert optimistic update
      setAllProperties(prev => prev.map(p => (p.id === targetId || p.pid === targetId || (p as any)._id === targetId) ? { ...p, available: currentAvailable } : p));
      showToast(err.message || 'Failed to update active status', 'error');
    }
  };

  const handleAccountFormSave = (e: React.FormEvent) => {

    e.preventDefault();
    if (!user) return;

    if (!isValidName(accountForm.name)) {
      showToast('Please enter a valid full name (letters only)');
      return;
    }

    if (!isValidPhone(accountForm.phone)) {
      showToast('Please enter a valid 10-digit mobile phone number');
      return;
    }

    if (accountForm.email && !isValidEmail(accountForm.email)) {
      showToast('Please enter a valid email address (e.g., name@example.com)');
      return;
    }

    const updatedUser: UserProfile = {
      ...user,
      name: accountForm.name.trim(),
      phone: accountForm.phone.trim(),
      email: accountForm.email,
      city: accountForm.city,
      role: (accountForm.role as any) || user.role
    };

    setUser(updatedUser);
    setIsEditingAccount(false);
    showToast('Account details updated successfully!');
  };


  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submittingVerify || user.verificationStatus === 'pending' || user.verificationStatus === 'approved') return;
    
    const cleanCA = verifyForm.consumerNumber.replace(/[^a-zA-Z0-9]/g, '').trim();
    if (!cleanCA || cleanCA.length < 3) {
      showToast('Please enter a valid Electricity Bill Consumer / CA Number (min 3 digits)');
      return;
    }
    if (cleanCA.length > 15) {
      showToast('Consumer / CA Number cannot exceed 15 digits');
      return;
    }

    if (!verifyForm.billUrl) {
      showToast('Please provide an Electricity Bill photo or document link');
      return;
    }
    if (!isValidElectricityBillDocument(verifyForm.billUrl)) {
      if (uploadedBillName) {
        setBillFileError('The uploaded document is invalid. Please choose another file.');
      } else {
        validateBillUrl(verifyForm.billUrl);
      }
      showToast('Please enter a valid Electricity Bill document URL or upload an image/PDF.');
      return;
    }
    setSubmittingVerify(true);
    try {
      const res = await fetch('/api/user/verify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          consumerNumber: cleanCA,
          electricityBillUrl: verifyForm.billUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser({
          ...user,
          role: 'owner',
          ownerVerified: false,
          verificationStatus: 'pending',
          consumerNumber: cleanCA,
          electricityBillUrl: verifyForm.billUrl
        });
        showToast(data.message);
      } else {
        showToast(data.message || 'Submission failed');
      }
    } catch (e) {
      showToast('Error submitting verification');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      syncedProfileRef.current = false;
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
      await Promise.race([fetchDashboardData(), timeoutPromise]);
      showToast('Dashboard overview refreshed!');
    } catch (e) {
      showToast('Dashboard overview refreshed!');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabChange = (tab: 'account' | 'wishlist' | 'my-properties' | 'billing' | 'explore-plans' | 'inquiries') => {
    setActiveTab(tab);
    router.push(`/dashboard?tab=${tab}`);
  };

  // The persisted session exists only in the browser. Rendering this stable shell
  // first keeps the server and initial client markup identical during hydration.
  if (!isClientReady) {
    return <div className="bg-[#050806] min-h-screen" aria-busy="true" />;
  }

  if (!user) {
    return (
      <div className="bg-[#050806] text-gray-100 min-h-screen py-16">
        <div className="max-w-md mx-auto px-4 text-center space-y-4">
          <div className="w-16 h-16 bg-[#0a1e14] text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Login Required</h2>
          <p className="text-xs text-gray-400">
            Please log in to your Propzy account to access your user dashboard, saved properties, and billing history.
          </p>
          <button
            onClick={openAuthModal}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider"
          >
            Log In / Register
          </button>
        </div>
      </div>
    );
  }

  const isPawanPropzy = Boolean(
    (user?.email && user.email.toLowerCase().trim() === 'pawanpropzy@gmail.com') ||
    user?.role === 'sales executive' ||
    user?.role === 'sales_executive'
  );

  const roleDisplayName = isPawanPropzy
    ? 'Sales Executive'
    : user?.role === 'owner'
    ? 'Property Owner'
    : user?.role === 'admin'
    ? 'Admin'
    : 'Tenant Account';

  const roleBadgeName = isPawanPropzy
    ? 'Sales Executive'
    : user?.role === 'owner'
    ? 'Owner'
    : user?.role === 'admin'
    ? 'Admin'
    : 'Tenant';

  return (
    <div className="bg-[#050806] text-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* User Profile Header Card */}
        <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 text-black font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">{user.name}</h2>
                <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                  isPawanPropzy
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold shadow-md'
                    : 'bg-[#092618] text-emerald-400 border border-emerald-800/80'
                }`}>
                  {roleBadgeName}
                </span>

                {user.role !== 'owner' && (
                  <span className="inline-flex items-center space-x-1.5 text-[10px] font-extrabold px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/50 text-amber-300 shadow-sm">
                    <Sparkles size={11} className="text-amber-400" />
                    <span>{user.activePlan || 'Standard Plan'}</span>
                  </span>
                )}

                {user.role !== 'owner' && (
                  <span className="inline-flex items-center space-x-1.5 text-[10px] font-extrabold px-3 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 shadow-sm">
                    <Zap size={11} className="text-emerald-400 fill-emerald-400" />
                    <span>{user.credits ?? 0} Credits</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">{user.phone} {user.email ? `• ${user.email}` : ''}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full lg:w-auto">
            {user.role !== 'owner' && (
              <button
                type="button"
                onClick={() => handleTabChange('explore-plans')}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black rounded-full text-xs font-black transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
              >
                <Sparkles size={14} className="stroke-[2.5]" />
                <span>Get Credits / Upgrade</span>
              </button>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => {
                logoutUser();
                router.replace('/');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#140808] hover:bg-red-950/60 text-red-400 border border-red-900/60 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center cursor-pointer space-x-6 border-b border-emerald-950 overflow-x-auto text-xs font-medium pb-px">
          <button
            onClick={() => handleTabChange('account')}
            className={`pb-3.5 border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === 'account'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
            <User size={16} />
            <span>My Profile</span>
          </button>

          {user.role === 'owner' && (
            <button
              onClick={() => handleTabChange('my-properties')}
              className={`pb-3.5 cursor-pointer border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === 'my-properties'
                  ? 'border-emerald-400 text-emerald-400 font-bold'
                  : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <Building size={16} />
              <span>My Properties ({myProperties.length})</span>
            </button>
          )}

          <button
            onClick={() => handleTabChange('wishlist')}
            className={`pb-3.5 border-b-2 cursor-pointer flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === 'wishlist'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
            <Heart size={16} />
            <span>Saved Property ({savedProperties.length})</span>
          </button>

          {user?.role !== 'owner' && (
            <button
              onClick={() => handleTabChange('billing')}
              className={`pb-3.5 cursor-pointer border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === 'billing'
                  ? 'border-emerald-400 text-emerald-400 font-bold'
                  : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <CreditCard size={16} />
              <span>Billing History</span>
            </button>
          )}

          {user?.role !== 'owner' && (
            <button
              onClick={() => handleTabChange('explore-plans')}
              className={`pb-3.5 border-b-2 cursor-pointer flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === 'explore-plans'
                  ? 'border-emerald-400 text-emerald-400 font-bold'
                  : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <Sparkles size={16} />
              <span>Explore Plans</span>
            </button>
          )}

          {user?.role === 'owner' && (
            <button
              onClick={() => handleTabChange('inquiries')}
              className={`pb-3.5 border-b-2 cursor-pointer flex items-center space-x-2 whitespace-nowrap transition-all ${activeTab === 'inquiries'
                  ? 'border-emerald-400 text-emerald-400 font-bold'
                  : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              <PhoneCall size={16} />
              <span>Inquiries ({myInquiries.length})</span>
            </button>
          )}
        </div>

        {/* TAB 1: ACCOUNT PROFILE */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* PAWAN KUMAR OFFICIAL PROFESSIONAL ID CARD */}
            {isPawanPropzy && (
              <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-5 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center space-x-2">
                      <ShieldCheck className="text-emerald-400" size={20} />
                      <span>Official Executive Identity Card</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Propzy Tricity Official Employee & Sales Executive Badge
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.print();
                      }
                    }}
                    className="self-start sm:self-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Printer size={14} />
                    <span>Print ID Card</span>
                  </button>
                </div>

                {/* Physical ID Card Container */}
                <div className="flex justify-center py-2">
                  <div className="w-full max-w-[340px] sm:max-w-[360px] rounded-3xl overflow-hidden border-2 border-emerald-500/70 shadow-[0_0_50px_rgba(16,185,129,0.25)] bg-gradient-to-b from-[#0c2417] via-[#07150e] to-[#040805] text-white p-5 sm:p-6 space-y-4 relative">
                    
                    {/* Top Lanyard Slot Cutout */}
                    <div className="w-14 h-2.5 bg-[#030604] rounded-full border border-emerald-900/80 mx-auto shadow-inner" />

                    {/* Div 1: Logo of Propzy */}
                    <div className="flex items-center justify-center space-x-2.5 pt-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/30">
                        <Home size={18} className="stroke-[2.5]" />
                      </div>
                      <div className="flex flex-col leading-none text-left">
                        <span className="text-xl font-black tracking-wider uppercase text-white font-sans">
                          PROP<span className="text-emerald-400">ZY</span>
                        </span>
                        <span className="text-[9px] font-extrabold tracking-widest text-emerald-400 uppercase mt-0.5">
                          TRICITY
                        </span>
                      </div>
                    </div>

                    {/* Div 2: Image, Name & Employee ID */}
                    <div className="flex flex-col items-center text-center space-y-2 pt-1">
                      <div className="relative">
                        <img
                          src="/Pawan_image.jpeg"
                          alt="Pawan Kumar"
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl shadow-emerald-950/80 ring-4 ring-emerald-500/20"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black p-1 rounded-full shadow-md">
                          <ShieldCheck size={16} className="stroke-[2.5]" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <h3 className="text-xl font-extrabold text-white tracking-wide">Pawan Kumar</h3>
                        <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-800/80 inline-block">
                          Employee ID: PZ-EMP-001
                        </div>
                      </div>
                    </div>

                    {/* Div 3: Large text of "Sales Executive" */}
                    <div className="w-full">
                      <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-black py-2 px-4 rounded-xl text-center shadow-lg shadow-emerald-500/25">
                        <span className="text-base sm:text-lg font-black tracking-wider uppercase block">
                          SALES EXECUTIVE
                        </span>
                      </div>
                    </div>

                    {/* Div 4: Proper address of company (from contact page) */}
                    <div className="bg-[#050e09] border border-emerald-900/80 rounded-2xl p-3 text-center space-y-1">
                      <div className="flex items-center justify-center space-x-1.5 text-emerald-400 text-xs font-bold">
                        <MapPin size={13} className="shrink-0" />
                        <span>Propzy Tricity Official Office</span>
                      </div>
                      <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
                        4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307
                      </p>
                      <div className="flex items-center justify-center space-x-3 text-[10px] font-mono text-gray-400 pt-0.5">
                        <span> 9317902609</span>
                        <span>•</span>
                        <span> pawanpropzy@gmail.com  </span>
                      </div>
                    </div>

                    {/* Div 5: Scanner */}
                    <div className="flex flex-col items-center justify-center space-y-1.5 pt-1">
                      <div className="bg-white p-2 rounded-2xl border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/60">
                        <img
                          src="/Propzy QR Code.png"
                          alt="Propzy Verification Scanner"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase">
                        SCAN TO VERIFY OFFICIAL ID
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-5 sm:p-8 shadow-xl space-y-6">
              {/* Header with Avatar and Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950 pb-5">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-black font-extrabold text-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 uppercase">
                    {user.name ? user.name[0] : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-extrabold text-white tracking-tight">{user.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isPawanPropzy
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold shadow-md'
                          : 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-400'
                      }`}>
                        {roleBadgeName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Manage your contact details, city, and account role</p>
                  </div>
                </div>

                {!isEditingAccount ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingAccount(true)}
                    className="self-start sm:self-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-xs font-extrabold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                  >
                    <Edit3 size={14} className="stroke-[2.5]" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingAccount(false)}
                    className="self-start sm:self-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#0b1610] hover:bg-[#12241a] text-gray-300 hover:text-white border border-emerald-900/60 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

            {!isEditingAccount ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Full Name</span>
                    <span className="text-sm font-bold text-white truncate block">{user.name}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                    <Phone size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Phone Number</span>
                    <span className="text-sm font-mono font-bold text-white truncate block">{user.phone}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Email Address</span>
                    <span className="text-sm font-bold text-white truncate block">{user.email || 'Not provided'}</span>
                  </div>
                </div>

                {user.role === 'owner' ? (
                  <>
                    {/* Card 4: City / Location */}
                    <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                        <MapPin size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 font-medium block text-[11px] mb-0.5">City / Location</span>
                        <span className="text-sm font-bold text-white truncate block">{user.city || 'Mohali'}</span>
                      </div>
                    </div>

                    {/* Card 5: Account Role */}
                    <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                        <Building size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Account Role</span>
                        <span className="text-sm font-bold text-emerald-400 truncate block">
                          {roleDisplayName}
                        </span>
                      </div>
                    </div>

                    {/* Card 6: Listed Properties */}
                    <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                        <Home size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 font-medium block text-[11px] mb-0.5">My Listed Properties</span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {myProperties.length} {myProperties.length === 1 ? 'Property' : 'Properties'}
                          </span>
                          {myProperties.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleTabChange('my-properties')}
                              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                            >
                              View All
                            </button>
                          ) : (
                            <Link
                              href="/post-property"
                              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                            >
                              + Post Property
                            </Link>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          Properties posted under your account
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Card 4: Account Role */}
                    <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                        <Building size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Account Role</span>
                        <span className="text-sm font-bold text-emerald-400 truncate block">
                          {roleDisplayName}
                        </span>
                      </div>
                    </div>

                    {/* Card 5: Subscription Plan */}
                    <div className="p-4 bg-[#050806] rounded-2xl border border-amber-950/60 flex items-start space-x-3 group hover:border-amber-900/80 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-[#1f1709] text-amber-400 border border-amber-800/50 flex items-center justify-center shrink-0">
                        <Sparkles size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Active Subscription</span>
                        <span className="text-sm font-bold text-amber-300 truncate block">
                          {user.activePlan || 'Standard Plan'}
                        </span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {user.planExpiresAt ? (
                            new Date(user.planExpiresAt) > new Date()
                              ? `Valid till ${new Date(user.planExpiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : 'Plan Expired'
                          ) : (
                            'Active Plan'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Card 6: Contact Credits */}
                    <div className="p-4 bg-[#050806] rounded-2xl border border-emerald-950/90 flex items-start space-x-3 group hover:border-emerald-900 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-[#091f14] text-emerald-400 border border-emerald-800/50 flex items-center justify-center shrink-0">
                        <Zap size={15} className="fill-emerald-400/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 font-medium block text-[11px] mb-0.5">Contact Credits</span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {user.credits ?? 0} Credits
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTabChange('explore-plans')}
                            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                          >
                            + Recharge
                          </button>
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          Used to unlock verified owner contacts
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleAccountFormSave} className="space-y-5 max-w-2xl mx-auto text-xs py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-gray-300 font-semibold">Full Name</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: sanitizeName(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-gray-300 font-semibold">Phone Number (10 Digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm({ ...accountForm, phone: sanitizePhone(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="10-digit mobile number"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-gray-300 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-gray-300 font-semibold">City</label>
                    <input
                      type="text"
                      value={accountForm.city}
                      onChange={(e) => setAccountForm({ ...accountForm, city: e.target.value })}
                      className="w-full px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none transition-colors"
                      placeholder="e.g. Mohali, Chandigarh, Zirakpur"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-300 font-semibold">Account Type / Role</label>
                  <div className="w-full px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white font-bold capitalize flex items-center justify-between">
                    <span className="text-emerald-400 font-extrabold">{roleDisplayName}</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono uppercase">
                      {roleBadgeName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-3 border-t border-emerald-950/60">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAccount(false)}
                    className="px-5 py-2.5 bg-[#050806] hover:bg-[#09150e] text-gray-400 hover:text-white border border-emerald-950 rounded-full font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ELECTRICITY BILL OWNER VERIFICATION SECTION (Rendered ONLY for Property Owners) */}
            {user.role === 'owner' && (
              <div className="border-t border-emerald-950 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>Electricity Bill Owner Verification</span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      Upload your Electricity Bill & Consumer Number to verify your property ownership. Only verified owners can post property listings.
                    </p>
                  </div>

                  {user.ownerVerified || user.verificationStatus === 'approved' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-extrabold flex items-center space-x-1">
                      <ShieldCheck size={14} />
                      <span>VERIFIED OWNER</span>
                    </span>
                  ) : user.verificationStatus === 'pending' ? (
                    <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-xs font-extrabold flex items-center space-x-1">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>PENDING ADMIN REVIEW</span>
                    </span>
                  ) : user.verificationStatus === 'rejected' ? (
                    <span className="px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-xs font-extrabold flex items-center space-x-1">
                      <XCircle size={14} />
                      <span>VERIFICATION REJECTED</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-900 text-gray-400 border border-gray-800 text-xs font-bold">
                      NOT VERIFIED
                    </span>
                  )}
                </div>

                {/* Status Notice Banner or Verification Form */}
                {user.ownerVerified || user.verificationStatus === 'approved' ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-[#0d2218] border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 font-medium flex items-center space-x-3">
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold block text-white text-sm">Account Fully Verified!</span>
                        Your Electricity Bill and Consumer Number (<span className="font-mono font-bold text-white break-all">{user.consumerNumber || 'Verified'}</span>) have been approved by Admin. You can post unlimited property listings.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-emerald-900/70 bg-[#07110b] p-3 sm:p-4 text-xs">
                      <div className="rounded-xl border border-emerald-950 bg-[#050806] p-3">
                        <span className="block text-gray-500 font-medium">Submitted Consumer / CA Number</span>
                        <span className="mt-1 block font-mono font-bold text-emerald-400 text-sm break-all">{user.consumerNumber || 'Not available'}</span>
                      </div>
                      <div className="rounded-xl border border-emerald-950 bg-[#050806] p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="block text-gray-500 font-medium">Submitted Electricity Bill</span>
                          <span className="mt-1 block font-bold text-gray-200">
                            {user.electricityBillUrl ? (user.electricityBillUrl.startsWith('data:') ? 'Uploaded document' : 'Document URL') : 'Not available'}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={!user.electricityBillUrl}
                          onClick={() => handleViewVerificationDocument(user.electricityBillUrl)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-[11px] font-bold text-emerald-400 transition-colors hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FileText size={14} />
                          <span>View document</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : user.verificationStatus === 'pending' ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl text-xs text-amber-300 font-medium flex items-center space-x-3">
                    <RefreshCw size={20} className="text-amber-400 shrink-0 animate-spin" />
                    <div>
                      <span className="font-bold block text-white text-sm">Under Review by Admin</span>
                      Your Electricity Bill (CA/Consumer No: <strong className="font-mono text-amber-400 break-all">{user.consumerNumber}</strong>) is currently being reviewed by our Admin team. You will be able to post properties as soon as it is approved.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerifySubmit} className="space-y-4 max-w-xl text-xs pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-gray-300 font-semibold">Electricity Bill Consumer / CA Number *</label>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {verifyForm.consumerNumber.length}/15 digits max
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        placeholder="e.g. 1004829103 or CA100982"
                        value={verifyForm.consumerNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
                          setVerifyForm({ ...verifyForm, consumerNumber: val });
                        }}
                        className="w-full px-4 py-3 bg-[#050806] border border-emerald-900/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none placeholder-gray-600 tracking-wider text-sm"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Enter your 3 to 15 digit Consumer Account (CA) number as printed on your electricity bill.
                      </p>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-semibold mb-2">Electricity Bill Document *</label>
                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-950 bg-[#050806] p-1.5 mb-3">
                        <button
                          type="button"
                          onClick={() => selectBillInputMode('url')}
                          className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${billInputMode === 'url' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                          Use document URL
                        </button>
                        <button
                          type="button"
                          onClick={() => selectBillInputMode('upload')}
                          className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${billInputMode === 'upload' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                          Upload file
                        </button>
                      </div>
                      {billInputMode === 'url' && (
                        <>
                      <input
                        type="url"
                        required
                        placeholder="Paste image link or URL of your electricity bill document"
                        value={uploadedBillName ? '' : verifyForm.billUrl}
                        onChange={(e) => {
                          const billUrl = e.target.value;
                          setVerifyForm({ ...verifyForm, billUrl });
                          setUploadedBillName('');
                          validateBillUrl(billUrl);
                        }}
                        onBlur={(e) => validateBillUrl(e.target.value)}
                        aria-invalid={Boolean(billUrlError)}
                        className={`w-full px-4 py-3 bg-[#050806] border rounded-xl text-white focus:outline-none placeholder-gray-600 ${billUrlError ? 'border-red-500 focus:border-red-400' : 'border-emerald-900/80 focus:border-emerald-500'}`}
                      />
                      {billUrlError && <p role="alert" className="text-[11px] text-red-400 mt-1">{billUrlError}</p>}
                        </>
                      )}
                      {billInputMode === 'upload' && (
                        <>
                      <div className="mt-3 rounded-xl border border-dashed border-emerald-800/80 bg-[#07110b] px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex items-center gap-2 text-[11px]">
                          <FileText size={15} className="shrink-0 text-emerald-400" />
                          <span className={uploadedBillName ? 'truncate text-emerald-300 font-semibold' : 'text-gray-400'}>
                            {uploadedBillName || 'Or upload a JPG, PNG, WEBP, GIF, HEIC image or PDF (max 5 MB)'}
                          </span>
                        </div>
                        <label className="shrink-0 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-[11px] font-bold text-emerald-400 transition-colors hover:bg-emerald-900/60">
                          <Upload size={13} />
                          <span>{uploadedBillName ? 'Replace file' : 'Choose file'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf"
                            className="hidden"
                            onChange={handleBillFileUpload}
                          />
                        </label>
                      </div>
                      {billFileError && <p role="alert" className="text-[11px] text-red-400 mt-1">{billFileError}</p>}
                        </>
                      )}
                      <p className="text-[11px] text-gray-500 mt-1">
                        💡 Tip: You can paste any image link (e.g. Unsplash sample link or image URL) or upload a photo of your latest electricity bill.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingVerify || !verifyForm.consumerNumber.trim() || !isValidElectricityBillDocument(verifyForm.billUrl)}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingVerify ? 'Submitting...' : 'Submit Electricity Bill for Admin Verification'}
                    </button>
                  </form>
                )}
              </div>
            )}


            </div>
          </div>
        )}


        {/* TAB 2: MY PROPERTIES */}
        {activeTab === 'my-properties' && (
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Posted Properties</h3>
                <p className="text-xs text-gray-400">Properties listed under your account ({user.name})</p>
              </div>
              <Link
                href="/post-property"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-full shadow-md transition-all"
              >
                + Post New Listing
              </Link>
            </div>

            {myProperties.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-[#06180f] text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto">
                  <Building size={24} />
                </div>
                <p className="text-sm font-bold text-white">No properties posted under your account</p>
                <p className="text-xs text-gray-400">
                  You haven't posted any property listings under your account ({user.name}) yet.
                </p>
                <Link
                  href="/post-property"
                  className="inline-block px-6 py-3 bg-emerald-500 text-black rounded-full text-xs font-extrabold shadow-lg mt-2"
                >
                  + Post Property Now
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-emerald-950">
                {myProperties.map((p: PropertyItem) => {
                  const propThumb = (p.images && p.images.length > 0 ? p.images[0] : null) || p.videoThumbnail || (p.videos && p.videos[0] && p.videos[0].includes('res.cloudinary.com') ? p.videos[0].replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg').replace('/video/upload/', '/video/upload/so_0,q_auto,f_auto/') : '') || '';
                  return (
                  <div key={p.id || p.pid} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {propThumb ? (
                        <LazyImage src={propThumb} alt={p.title} className="w-16 h-16 rounded-2xl border border-emerald-950 object-cover shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl border border-emerald-950 bg-[#06140c] flex items-center justify-center text-emerald-500/60 shrink-0">
                          <Building size={20} />
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-emerald-400 font-extrabold">{p.pid}</span>
                          {p.verified ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-extrabold">VERIFIED & LIVE</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-extrabold">UNDER REVIEW</span>
                          )}
                          {p.available === false && (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-700 text-[9px] font-bold">INACTIVE</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">{p.title}</h4>
                        <p className="text-xs text-gray-400">{p.locality}, {p.city} • ₹{p.price.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                      {/* Proper Sliding Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(p)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none ${
                          p.available !== false
                            ? 'bg-[#06180f] border-emerald-800/80 hover:bg-emerald-950/80'
                            : 'bg-[#0e0e0e] border-zinc-800 hover:border-zinc-700'
                        }`}
                        title={p.available !== false ? 'Click to make Inactive (Hide from public listings)' : 'Click to make Active (Show in public listings)'}
                      >
                        {/* Switch Track */}
                        <div
                          className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                            p.available !== false
                              ? 'bg-emerald-500'
                              : 'bg-zinc-600'
                          }`}
                        >
                          {/* Sliding Thumb Knob */}
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                              p.available !== false
                                ? 'translate-x-3.5'
                                : 'translate-x-0'
                            }`}
                          />
                        </div>

                        {/* Label */}
                        <span
                          className={`text-xs font-bold transition-colors ${
                            p.available !== false
                              ? 'text-emerald-300'
                              : 'text-zinc-400'
                          }`}
                        >
                          {p.available !== false ? 'Active' : 'Inactive'}
                        </span>
                      </button>

                      {/* Edit Button */}
                      <Link
                        href={`/post-property?edit=${p.id || p.pid}`}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-full text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </Link>

                      {/* View Button */}
                      <Link
                        href={`/properties/${p.id || p.pid}`}
                        className="px-3.5 py-1.5 bg-[#06180f] text-emerald-400 border border-emerald-800/60 rounded-full text-xs font-bold hover:bg-emerald-900/60 transition-colors"
                      >
                        View Property →
                      </Link>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WISHLIST / SAVED */}
        {activeTab === 'wishlist' && (
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-emerald-950 pb-4">
              <h3 className="text-lg font-bold text-white">Saved Properties</h3>
              <p className="text-xs text-gray-400">Shortlisted rental homes and properties for quick access</p>
            </div>

            {savedProperties.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-[#06180f] text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto">
                  <Heart size={24} />
                </div>
                <p className="text-sm font-bold text-white">Your wishlist is empty</p>
                <p className="text-xs text-gray-400">
                  Click the heart icon on any property card to save it to your wishlist.
                </p>
                <Link href="/properties" className="inline-block px-6 py-3 bg-emerald-500 text-black rounded-full text-xs font-extrabold shadow-lg">
                  Explore Properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProperties.map((p: PropertyItem) => (
                  <PropertyCard key={p.id || p.pid} property={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BILLING HISTORY (TENANT ONLY) */}
        {activeTab === 'billing' && user?.role !== 'owner' && (
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Billing History & Invoices</h3>
                <p className="text-xs text-gray-400">View payment history and download tax invoice receipts</p>
              </div>
              <span className="text-xs bg-[#092618] text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-800/80">
                Active Plan: {user?.activePlan || 'Free Member'}
              </span>
            </div>

            {!user?.billingHistory || user.billingHistory.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No billing history found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#050806] text-gray-400 uppercase text-[10px] tracking-wider font-extrabold border-y border-emerald-950">
                    <tr>
                      <th className="py-3 px-4">Invoice No</th>
                      <th className="py-3 px-4">Plan / Service</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950 text-gray-300 font-medium">
                    {user.billingHistory?.map((item: BillingRecord) => (
                      <tr key={item.id} className="hover:bg-[#0e1813] transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-emerald-400">{item.invoiceNo}</td>
                        <td className="py-4 px-4 font-semibold text-white">{item.planName}</td>
                        <td className="py-4 px-4 text-gray-400">{item.date}</td>
                        <td className="py-4 px-4 font-bold text-white">₹{item.amount.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-4 text-gray-400">{item.paymentMethod}</td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-0.5 bg-[#092618] text-emerald-400 text-[10px] font-extrabold border border-emerald-800/60 rounded-full">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => showToast(`Downloading Invoice ${item.invoiceNo}...`)}
                            className="p-2 text-emerald-400 hover:text-emerald-300 bg-[#050806] rounded-xl border border-emerald-950"
                          >
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: EXPLORE PLANS (TENANT ONLY) */}
        {activeTab === 'explore-plans' && user?.role !== 'owner' && (
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
                <Sparkles size={13} />
                <span>Exclusively for Tenants</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Tenant Contact Credit Plans</h3>
              <p className="text-xs text-gray-400">Unlock direct phone numbers and WhatsApp contacts of verified property owners using credits with 0% brokerage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
              {/* Plan 1: ₹399 - 20 Contact Credits */}
              <div className="bg-[#06140c] border-2 border-emerald-500/80 hover:border-emerald-400 transition-all rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-2xl shadow-emerald-950/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Standard Plan
                    </span>
                    <span className="text-xs font-bold text-emerald-400">30 Days Validity</span>
                  </div>

                  <h4 className="text-xl font-bold text-white">20 Credits</h4>
                  <div className="text-3xl font-extrabold text-emerald-400">
                    ₹399 <span className="text-xs text-gray-400 font-normal">/ 30 days</span>
                  </div>

                  <p className="text-xs text-gray-300">
                    Ideal for tenants looking to unlock up to 20 verified owner contact details in Tricity.
                  </p>

                  <ul className="space-y-2.5 text-xs text-gray-200 pt-2 border-t border-emerald-900/60">
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-bold text-emerald-400">20 Credits</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-semibold text-white">Direct Phone Number & WhatsApp Access</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-semibold text-white">0% Brokerage Guarantee</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Instant Property ID (PID) Unlock</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Standard Support Assistance</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={Boolean(processingPlan)}
                  onClick={() => handleSubscribeToPlan('Standard Plan (20 Credits)', 399)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:opacity-75 text-black font-extrabold text-xs rounded-2xl shadow-xl shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {processingPlan === 'Standard Plan (20 Credits)' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Subscribe Now • ₹399</span>
                  )}
                </button>
              </div>

              {/* Plan 2: ₹999 - 100 Contact Credits / 90 Days */}
              <div className="bg-[#06140c] border-2 border-emerald-500/80 hover:border-emerald-400 transition-all rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-2xl shadow-emerald-950/50 relative">
                {/* Popular Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-extrabold uppercase px-4 py-1 rounded-full shadow-md tracking-wider">
                  ★ Most Popular • Best Value
                </div>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Premium Plan
                    </span>
                    <span className="text-xs font-bold text-emerald-400">90 Days Validity</span>
                  </div>

                  <h4 className="text-xl font-bold text-white">100 Credits</h4>
                  <div className="text-3xl font-extrabold text-emerald-400">
                    ₹999 <span className="text-xs text-gray-400 font-normal">/ 90 days</span>
                  </div>

                  <p className="text-xs text-gray-300">
                    Get 100 credits with 90 days validity & dedicated Relationship Manager assistance.
                  </p>

                  <ul className="space-y-2.5 text-xs text-gray-200 pt-2 border-t border-emerald-900/60">
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-bold text-emerald-400">100 Credits</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-semibold text-white">Direct Phone & WhatsApp Unlock</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-semibold text-white">90 Days Extended Validity</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Dedicated Relationship Manager (RM)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Priority Alerts on Fresh Verified Listings</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Price Negotiation Guidance on Your Behalf</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check size={15} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>100% Zero Brokerage Guarantee</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={Boolean(processingPlan)}
                  onClick={() => handleSubscribeToPlan('Premium Plan (100 Credits)', 999)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:opacity-75 text-black font-extrabold text-xs rounded-2xl shadow-xl shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {processingPlan === 'Premium Plan (100 Credits)' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Subscribe Now • ₹999</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: INQUIRIES (OWNER ONLY) */}
        {activeTab === 'inquiries' && user?.role === 'owner' && (
          <div className="bg-[#0a110d] rounded-3xl border border-emerald-950/90 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Tenant Leads & Inquiries on Your Properties</h3>
            {myInquiries.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No tenant inquiries recorded for your properties yet.</p>
            ) : (
              <div className="divide-y divide-emerald-950">
                {myInquiries.map((inq: InquiryItem, idx: number) => (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono bg-[#092618] text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-bold mr-2">
                        {inq.propertyPid}
                      </span>
                      <strong className="text-white">{inq.propertyTitle}</strong>
                      <div className="text-gray-400 mt-1">
                        Tenant: <strong className="text-white">{inq.tenantName}</strong>
                      </div>
                      {inq.tenantMessage && (
                        <div className="text-gray-400 text-[11px] mt-1 italic">
                          "{inq.tenantMessage}"
                        </div>
                      )}
                    </div>

                    <span className="px-3 py-1 bg-[#092618] text-emerald-400 border border-emerald-800/80 text-[10px] font-bold rounded-full uppercase">
                      {inq.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <BrandSpinner message="Loading user dashboard..." size="lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
