'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  X, Mail, Lock, User, ShieldCheck, UserCheck, KeyRound, Building,
  Home, ArrowRight, Eye, EyeOff, Check, CheckCircle2, XCircle, AlertCircle, MapPin
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { UserProfile } from '@/store/useAppStore';
import {
  sanitizeName,
  sanitizePhone,
  isValidName,
  isValidPhone,
  isValidEmail,
  checkPasswordCriteria,
  isValidStrongPassword,
  getPasswordValidationMessage
} from '@/lib/validation';


export const AuthModal: React.FC = () => {

  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams?.get('auth');
  const fromParam = searchParams?.get('from') || '';

  const { isAuthModalOpen, openAuthModal, closeAuthModal, setUser, user, logoutUser, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const modalScrollRef = React.useRef<HTMLDivElement>(null);
  const errorBannerRef = React.useRef<HTMLDivElement>(null);

  // Automatically open modal if ?auth=login or ?auth=register is present
  React.useEffect(() => {
    if (authParam === 'login') {
      setMode('login');
      openAuthModal();
    } else if (authParam === 'register') {
      setMode('register');
      openAuthModal();
    }
  }, [authParam, openAuthModal]);

  const handleModalClose = () => {
    closeAuthModal();
    if (typeof window !== 'undefined' && (authParam || fromParam)) {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Mohali');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'tenant' | 'owner'>('tenant');

  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setFormError = (errMsg: string) => {
    setError(errMsg);
  };

  // Automatically scroll to the error notification whenever an error occurs
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (errorBannerRef.current) {
          errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (modalScrollRef.current) {
          modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!isAuthModalOpen) return null;

  // Google Auth Handlers
  const handleGoogleSuccess = (googleUser: UserProfile) => {
    setUser(googleUser);
    showToast(`Welcome to PROPZY TRICITY, ${googleUser.name}!`);
    resetForm();
    navigateByRole(googleUser.role);
  };

  const handleGoogleError = (errMsg: string) => {
    setFormError(errMsg);
  };

  // Helper for role-based navigation
  const navigateByRole = (userRole: string, openDashboard = false) => {
    closeAuthModal();
    if (typeof window !== 'undefined' && (authParam || fromParam)) {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }

    if (userRole === 'admin') {
      showToast('Redirecting to Admin Portal Dashboard...');
      const target = fromParam && fromParam.startsWith('/admin') ? fromParam : '/admin';
      router.replace(target);
    } else if (fromParam && !fromParam.startsWith('/admin')) {
      router.push(fromParam);
    } else if (openDashboard && userRole === 'owner') {
      router.push('/dashboard?tab=my-properties');
    } else if (openDashboard) {
      router.push('/dashboard?tab=account');
    } else {
      router.replace('/');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setFormError('Please enter your email/username and password');
      return;
    }

    if (loginIdentifier.includes('@') && !isValidEmail(loginIdentifier)) {
      setFormError('Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        showToast(data.message || `Welcome back, ${data.user.name}!`);
        resetForm();
        navigateByRole(data.user.role);
      } else {
        setFormError(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setFormError('Unable to sign in right now. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setFormError('Please fill out all registration fields.');
      return;
    }

    if (!isValidName(name)) {
      setFormError('Please enter a valid full name (letters only, no numbers).');
      return;
    }

    if (!isValidPhone(phone)) {
      setFormError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    if (!isValidEmail(email)) {
      setFormError('Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }


    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim() || 'Mohali',
          password,
          role: registerRole
        })
      });

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        showToast(data.message || 'Account created successfully!');
        resetForm();
        navigateByRole(data.user.role);
      } else {
        setFormError(data.message || 'Registration failed.');
      }
    } catch (err: any) {
      setFormError('Unable to create your account right now. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCity('Mohali');
    setPassword('');
    setConfirmPassword('');
    setLoginIdentifier('');
    setLoginPassword('');
    setError('');
  };

  const handleLogout = () => {
    logoutUser();
    handleModalClose();
    router.replace('/');
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleModalClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        ref={modalScrollRef}
        className="relative w-full max-w-md bg-[#0a110d] rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/80 p-6 sm:p-8 text-gray-100 max-h-[92vh] overflow-y-auto scroll-smooth"
      >
        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-emerald-950 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {user ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto font-extrabold text-2xl shadow-lg shadow-emerald-500/20">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">{user.name}</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{user.email || user.phone}</p>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#0f281b] text-emerald-400 border border-emerald-800/80 text-xs font-extrabold rounded-full uppercase tracking-wider">
              <UserCheck size={14} />
              <span>Role: {user.role.toUpperCase()}</span>
            </div>

            <div className="pt-4 border-t border-emerald-950 space-y-3">
              <button
                onClick={() => navigateByRole(user.role, true)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-2xl transition-colors uppercase tracking-wider cursor-pointer shadow-md"
              >
                Go to My Dashboard →
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-[#180909] text-rose-400 border border-rose-900/60 hover:bg-rose-950 rounded-2xl font-extrabold text-xs transition-colors uppercase tracking-wider cursor-pointer"
              >
                Log Out Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header Title */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#0d2217] text-emerald-400 border border-emerald-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <ShieldCheck size={26} />
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {mode === 'login' ? 'Sign In to PROPZY TRICITY' : 'Create Account'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">Verified 0% Brokerage Property Portal</p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#050806] border border-emerald-950 rounded-2xl p-1 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${mode === 'login'
                    ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Sign In / Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${mode === 'register'
                    ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Register / Sign Up
              </button>
            </div>

            {/* Google Sign-In Action */}
            <div className="mb-5 space-y-4">
              <GoogleAuthButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                disabled={submitting}
              />
              <div className="flex items-center space-x-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <div className="flex-1 h-px bg-emerald-950/80" />
                <span>or continue with email</span>
                <div className="flex-1 h-px bg-emerald-950/80" />
              </div>
            </div>

            {error && (
              <div
                ref={errorBannerRef}
                tabIndex={-1}
                className="mb-5 p-3.5 bg-[#1f090b] border border-rose-800/80 text-rose-300 text-xs rounded-2xl text-center font-bold flex items-center justify-center gap-2 shadow-lg animate-in fade-in zoom-in-95 duration-200"
              >
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM (No role dropdown - verifies role from database!) */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email / Identifier */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email, Mobile, or Admin ID</label>
                  <div className="flex items-center border border-emerald-900/80 bg-[#050806] rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <span className="px-3 text-emerald-400">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="name@example.com, mobile or admin ID"
                      className="w-full py-3 pr-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
                  <div className="flex items-center border border-emerald-900/80 bg-[#050806] rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all pr-2">
                    <span className="px-3 text-emerald-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Authenticating...' : 'Sign In Now'}
                </button>

                <p className="text-center text-xs text-gray-400 pt-2">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); }}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Register here
                  </button>
                </p>
              </form>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                  <div className="flex items-center border border-emerald-900/80 bg-[#050806] rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <span className="px-3 text-emerald-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      maxLength={50}
                      value={name}
                      onChange={(e) => setName(sanitizeName(e.target.value))}
                      placeholder="Aman Kumar"
                      className="w-full py-3 pr-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none"
                      required
                    />

                  </div>
                </div>

                {/* Account Role Selector Cards */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Registering As (Account Role)</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRegisterRole('tenant')}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${registerRole === 'tenant'
                          ? 'bg-[#0b2619] border-emerald-500 text-white font-extrabold shadow-md'
                          : 'bg-[#050806] border-emerald-950 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Home size={16} className={registerRole === 'tenant' ? 'text-emerald-400' : 'text-gray-500'} />
                        <span className="text-xs">Tenant</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">Search & Rent Homes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegisterRole('owner')}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${registerRole === 'owner'
                          ? 'bg-[#0b2619] border-emerald-500 text-white font-extrabold shadow-md'
                          : 'bg-[#050806] border-emerald-950 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Building size={16} className={registerRole === 'owner' ? 'text-emerald-400' : 'text-gray-500'} />
                        <span className="text-xs">Property Owner</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">Post & List Properties</span>
                    </button>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                  <div className="flex items-center border border-emerald-900/80 bg-[#050806] rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <span className="px-3 text-emerald-400">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="abc@example.com"
                      className="w-full py-3 pr-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Mobile Phone Number</label>
                  <div className="flex items-center border border-emerald-900/80 bg-[#050806] rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <span className="px-3 text-emerald-400 font-mono text-xs">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full py-3 pr-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {/* City / Location Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">City / Region</label>
                  <div className="flex items-center border border-emerald-900/80 bg-[#050806] rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <span className="px-3 text-emerald-400">
                      <MapPin size={16} />
                    </span>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mohali, Agra, Delhi, Mumbai"
                      className="w-full py-3 pr-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Create Password</label>
                  <div className={`flex items-center border bg-[#050806] rounded-xl overflow-hidden transition-all pr-2 ${password.length > 0
                      ? checkPasswordCriteria(password).isValid
                        ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'border-amber-700/80 focus-within:border-amber-400'
                      : 'border-emerald-900/80 focus-within:border-emerald-500'
                    }`}>
                    <span className="px-3 text-emerald-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                      title={showRegisterPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Real-time Password Strength Meter & Security Criteria Checklist */}
                  {password.length > 0 && (() => {
                    const criteria = checkPasswordCriteria(password);
                    return (
                      <div className="mt-2.5 p-3 rounded-2xl bg-[#060e09] border border-emerald-950/90 space-y-2.5">
                        {/* Header & Level Label */}
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-gray-400">Password Strength:</span>
                          <span className={
                            criteria.score <= 2
                              ? 'text-rose-400 font-extrabold'
                              : criteria.score <= 4
                                ? 'text-amber-400 font-extrabold'
                                : 'text-emerald-400 font-extrabold flex items-center space-x-1'
                          }>
                            {criteria.score <= 1 && 'Weak (Incomplete)'}
                            {criteria.score === 2 && 'Fair (Weak)'}
                            {criteria.score === 3 && 'Moderate'}
                            {criteria.score === 4 && 'Good (Almost ready)'}
                            {criteria.score === 5 && 'Strong & Secure ✓'}
                          </span>
                        </div>

                        {/* Segmented Strength Bar (5 Criteria) */}
                        <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-full rounded-full transition-all duration-300 ${idx < criteria.score
                                  ? criteria.score <= 2
                                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                                    : criteria.score <= 4
                                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                  : 'bg-emerald-950/70 border border-emerald-900/30'
                                }`}
                            />
                          ))}
                        </div>

                        {/* 5 Security Requirements Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                          <div className={`flex items-center space-x-1.5 transition-colors ${criteria.minLength ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                            <Check size={13} className={criteria.minLength ? 'text-emerald-400 stroke-[3]' : 'text-gray-600'} />
                            <span>8+ characters</span>
                          </div>

                          <div className={`flex items-center space-x-1.5 transition-colors ${criteria.hasUppercase ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                            <Check size={13} className={criteria.hasUppercase ? 'text-emerald-400 stroke-[3]' : 'text-gray-600'} />
                            <span>1 uppercase letter (A-Z)</span>
                          </div>

                          <div className={`flex items-center space-x-1.5 transition-colors ${criteria.hasLowercase ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                            <Check size={13} className={criteria.hasLowercase ? 'text-emerald-400 stroke-[3]' : 'text-gray-600'} />
                            <span>1 lowercase letter (a-z)</span>
                          </div>

                          <div className={`flex items-center space-x-1.5 transition-colors ${criteria.hasNumber ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                            <Check size={13} className={criteria.hasNumber ? 'text-emerald-400 stroke-[3]' : 'text-gray-600'} />
                            <span>1 number (0-9)</span>
                          </div>

                          <div className={`flex items-center space-x-1.5 col-span-1 sm:col-span-2 transition-colors ${criteria.hasSpecial ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                            <Check size={13} className={criteria.hasSpecial ? 'text-emerald-400 stroke-[3]' : 'text-gray-600'} />
                            <span>1 special symbol (!@#$%^&*...)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Confirm Password</label>
                  <div className={`flex items-center border bg-[#050806] rounded-xl overflow-hidden transition-all pr-2 ${confirmPassword.length > 0
                      ? password === confirmPassword
                        ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'border-rose-700/80 focus-within:border-rose-400'
                      : 'border-emerald-900/80 focus-within:border-emerald-500'
                    }`}>
                    <span className="px-3 text-emerald-400">
                      <KeyRound size={16} />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-3 text-xs text-white placeholder-gray-600 bg-transparent focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] font-bold">
                      {password === confirmPassword ? (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 size={13} />
                          <span>Passwords match securely</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center space-x-1">
                          <XCircle size={13} />
                          <span>Passwords do not match</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating Account...' : 'Create Account FREE'}
                </button>

                <p className="text-center text-xs text-gray-400 pt-2">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Sign in to your account
                  </button>
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
