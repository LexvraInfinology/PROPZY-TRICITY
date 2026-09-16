'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '@/store/useAppStore';

interface GoogleAuthButtonProps {
  onSuccess: (user: UserProfile) => void;
  onError: (errorMessage: string) => void;
  text?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  onError,
  text = 'Continue with Google',
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const hiddenBtnRef = useRef<HTMLDivElement>(null);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response || !response.credential) {
      onErrorRef.current('No credential received from Google.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        onSuccessRef.current(data.user);
      } else {
        onErrorRef.current(data.message || 'Google authentication failed.');
      }
    } catch (err: any) {
      onErrorRef.current(err?.message || 'Network error during Google authentication.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if Google GSI SDK is loaded on window
    const checkGsiReady = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        setSdkReady(true);
        if (googleClientId) {
          try {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            if (hiddenBtnRef.current) {
              window.google.accounts.id.renderButton(hiddenBtnRef.current, {
                type: 'standard',
                theme: 'filled_black',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                width: 280,
              });
            }
          } catch (e) {
            console.warn('Google GSI initialization error:', e);
          }
        }
        return true;
      }
      return false;
    };

    if (!checkGsiReady()) {
      const interval = setInterval(() => {
        if (checkGsiReady()) {
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  const handleButtonClick = () => {
    if (loading || disabled) return;

    if (!googleClientId) {
      onError('Google Sign-In is not configured yet. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID in your hosting provider environment variables (e.g. Vercel) or .env.local.');
      return;
    }

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setLoading(true);
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });

        // Trigger Google One-Tap or native account selector popup
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If one-tap prompt was dismissed or blocked, trigger hidden official render button
            if (hiddenBtnRef.current) {
              const nativeBtn = hiddenBtnRef.current.querySelector('div[role="button"]') as HTMLElement;
              if (nativeBtn) {
                nativeBtn.click();
              }
            }
            setLoading(false);
          }
        });
      } catch (err: any) {
        setLoading(false);
        onError('Unable to open Google Sign-In prompt. Please check your browser settings.');
      }
    } else {
      onError('Google Identity Service is loading. Please try again in a moment.');
    }
  };

  return (
    <div className="w-full">
      {/* Hidden container for rendering native Google button if needed */}
      <div ref={hiddenBtnRef} className="hidden" aria-hidden="true" />

      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleButtonClick}
        className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-2xl bg-[#09130e] hover:bg-[#0e1f16] border border-emerald-900/60 hover:border-emerald-500/80 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span className="group-hover:text-emerald-300 transition-colors">{loading ? 'Connecting to Google...' : text}</span>
      </button>
    </div>
  );
};
