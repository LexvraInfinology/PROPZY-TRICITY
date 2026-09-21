'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Check,
  ShieldCheck,
  PhoneCall,
  ArrowLeft,
  Headphones,
  Zap,
  Clock,
  Star,
  Home,
  X
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CallToActionBanner } from '@/components/CallToActionBanner';
import { initiateRazorpaySubscription } from '@/lib/razorpayClient';

export default function ExplorePlansPage() {
  const router = useRouter();
  const { user, setUser, openAuthModal, showToast } = useApp();
  const [processingPlan, setProcessingPlan] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (user?.role === 'owner') {
      showToast('Subscription plans are only for tenants. Property owners can list properties for free!');
      router.replace('/dashboard?tab=my-properties');
    }
  }, [user, router, showToast]);

  const handleSubscribe = async (planName: string, amount: number) => {
    if (!user) {
      showToast(`Please login to subscribe to the ${planName}`, 'error');
      openAuthModal();
      return;
    }

    if (user.role === 'owner') {
      showToast('Subscription plans are for tenants. Property owners can list properties for free!', 'error');
      router.replace('/dashboard?tab=my-properties');
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
        showToast(message || `🎉 Successfully subscribed to ${planName}!`, 'success');
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

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#040806] text-white flex flex-col justify-between">
      {/* ─────────────────────────────────────────────────────────────
          TOP APP BAR (Clean Minimal Header with Back & Brand)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#060a08]/95 backdrop-blur-xl border-b border-emerald-950/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#0a140f] border border-emerald-900/80 hover:border-emerald-500 hover:bg-[#0f2219] text-gray-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95 group cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={15} className="text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden xs:inline">Back</span>
          </button>

          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-extrabold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Home size={15} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm sm:text-base font-extrabold tracking-wider uppercase text-white">
                PROP<span className="text-emerald-400">ZY</span>
              </span>
              <span className="text-[7px] font-extrabold tracking-widest text-emerald-400 uppercase">
                TRICITY
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2 bg-[#0a1510] border border-emerald-900/80 px-3 py-1 rounded-full text-xs">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-black font-extrabold text-[10px] flex items-center justify-center">
                {user.name?.charAt(0) || 'U'}
              </div>
              <span className="text-gray-200 font-semibold hidden sm:inline">{user.name?.split(' ')[0]}</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ({user.role === 'owner' ? 'Owner' : (user.activePlan || 'Free')})
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wide transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              Login / Sign Up
            </button>
          )}

          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-emerald-950/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ─────────────────────────────────────────────────────────────
            HERO TITLE (Compact & Direct)
        ───────────────────────────────────────────────────────────── */}
        <section className="relative pt-6 pb-8 overflow-hidden bg-gradient-to-b from-[#06120b] via-[#040906] to-[#040806]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 sm:px-4 sm:py-1 rounded-full bg-[#081f13] border border-emerald-800/60 text-emerald-400 text-xs font-semibold shadow-inner">
              <Sparkles size={13} />
              <span>Exclusively for Tenants • 0% Brokerage</span>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
              Tenant <span className="text-emerald-400 font-sans italic">Credit Plans</span>
            </h1>

            <p className="text-gray-300 text-xs sm:text-sm max-w-2xl mx-auto font-normal leading-relaxed">
              Directly unlock verified owner contacts across Chandigarh, Mohali, Zirakpur, Panchkula & Kharar with 0% brokerage.
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            PLANS PRICING CARDS (Top Priority)
        ───────────────────────────────────────────────────────────── */}
        <section className="pb-12 sm:pb-16 pt-2 border-b border-emerald-950/60 bg-[#030604]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 items-stretch">
              {/* PLAN 1: ₹399 - 20 Contact Credits */}
              <div className="bg-[#06150d] border-2 border-emerald-500 hover:border-emerald-400 transition-all rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6 flex flex-col justify-between shadow-2xl shadow-emerald-950/80">
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Standard Plan
                    </span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                      <Clock size={13} className="text-emerald-400" />
                      <span>30 Days Validity</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">20 Credits</h3>
                    <p className="text-xs text-gray-300 mt-1">
                      Perfect for renters looking to unlock up to 20 verified owner contacts in specific localities.
                    </p>
                  </div>

                  <div className="py-2 border-y border-emerald-900/60">
                    <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">
                      ₹399 <span className="text-xs text-gray-400 font-sans font-normal">/ 30 days</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-gray-200">
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span className="font-bold text-emerald-400">20 Credits</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span className="font-semibold text-white">Direct Phone Call & WhatsApp Connect</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span className="font-semibold text-white">100% Zero Brokerage Guarantee</span>
                    </li>

                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span>Instant PROP-ID unlocks</span>
                    </li>
                   
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span>Standard Support & Advice</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={Boolean(processingPlan)}
                  onClick={() => handleSubscribe('Standard Plan (20 Credits)', 399)}
                  className="w-full py-3.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:opacity-75 text-black font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed mt-2 flex items-center justify-center space-x-2"
                >
                  {processingPlan === 'Standard Plan (20 Credits)' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Subscribe Now • ₹399</span>
                  )}
                </button>
              </div>

              {/* PLAN 2: ₹999 - 100 Credits / 90 Days */}
              <div className="bg-[#06150d] border-2 border-emerald-500 hover:border-emerald-400 transition-all rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6 flex flex-col justify-between shadow-2xl shadow-emerald-950/80 relative">
                {/* Popular Ribbon */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] sm:text-[11px] font-extrabold uppercase px-3.5 sm:px-4 py-1 rounded-full shadow-lg tracking-wider flex items-center space-x-1 whitespace-nowrap">
                  <Star size={12} className="fill-black stroke-black" />
                  <span>Most Popular • Best Value</span>
                </div>

                <div className="space-y-4 sm:space-y-5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Premium Plan
                    </span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                      <Clock size={13} className="text-emerald-400" />
                      <span>90 Days Validity</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">100 Credits</h3>
                    <p className="text-xs text-gray-300 mt-1">
                      Get 100 credits with 90 days validity.
                    </p>
                  </div>

                  <div className="py-2 border-y border-emerald-900/60">
                    <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">
                      ₹999 <span className="text-xs text-gray-400 font-sans font-normal">/ 90 days</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-gray-200">
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span className="font-bold text-emerald-400">100 Credits</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span className="font-semibold text-white">Direct Phone Call & WhatsApp Unlock</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span className="font-semibold text-white">90 Days Extended Validity</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span>Priority Alerts on Fresh Verified Listings</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span>Price Negotiation Guidance on Your Behalf</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={13} className="stroke-[3]" />
                      </div>
                      <span>100% Zero Brokerage Guarantee</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={Boolean(processingPlan)}
                  onClick={() => handleSubscribe('Premium Plan (100 Credits)', 999)}
                  className="w-full py-3.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:opacity-75 text-black font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed mt-2 flex items-center justify-center space-x-2"
                >
                  {processingPlan === 'Premium Plan (100 Credits)' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Subscribe Now • ₹999</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            WHY CHOOSE PROPZY PLANS
        ───────────────────────────────────────────────────────────── */}
        <section className="py-12 sm:py-20 border-b border-emerald-950/60 bg-[#061009]/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
            <div className="text-center space-y-2 sm:space-y-3">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                Why Tenants Choose PROPZY TRICITY Contact Plans
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
                Save thousands on brokerage while getting direct access to genuine property owners.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#06120b] border border-emerald-950 space-y-2.5 sm:space-y-3 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl sm:rounded-2xl bg-[#0a2315] border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">100% Verified Owners</h4>
                <p className="text-xs text-gray-400">Every contact number is verified against property documentation.</p>
              </div>

              <div className="p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#06120b] border border-emerald-950 space-y-2.5 sm:space-y-3 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl sm:rounded-2xl bg-[#0a2315] border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Zap size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">0% Commission</h4>
                <p className="text-xs text-gray-400">Never pay 15-30 days of rent to a middleman. Save ₹15k - ₹50k.</p>
              </div>

              <div className="p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#06120b] border border-emerald-950 space-y-2.5 sm:space-y-3 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl sm:rounded-2xl bg-[#0a2315] border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <PhoneCall size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">Direct Connect</h4>
                <p className="text-xs text-gray-400">Call, chat, or WhatsApp landlords directly on your schedule.</p>
              </div>

              <div className="p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#06120b] border border-emerald-950 space-y-2.5 sm:space-y-3 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl sm:rounded-2xl bg-[#0a2315] border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Headphones size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">Dedicated Support</h4>
                <p className="text-xs text-gray-400">Our local Tricity support team is always ready to guide your search.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            CALL TO ACTION
        ───────────────────────────────────────────────────────────── */}
        <section className="py-12 max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <CallToActionBanner
            subTag="IS READY TO MOVE"
            titleMain="Let's find your"
            titleItalic="perfect space."
            description="Verified homes. Zero brokerage. Hassle-free renting."
            buttonText="Explore Properties"
            buttonHref="/properties"
          />
        </section>
      </main>
    </div>
  );
}
