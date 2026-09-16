export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

/**
 * Dynamically injects and loads the official Razorpay Checkout JavaScript SDK.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }

    if (window.Razorpay) {
      return resolve(true);
    }

    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load checkout script');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

export interface InitiateCheckoutParams {
  planName: string;
  amount: number;
  user: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess: (result: { user: any; invoice: any; message: string }) => void;
  onError: (errorMsg: string) => void;
  onDismiss?: () => void;
}

/**
 * Handles end-to-end Razorpay checkout: creates order, opens checkout popup, and verifies signature.
 */
export async function initiateRazorpaySubscription({
  planName,
  amount,
  user,
  onSuccess,
  onError,
  onDismiss
}: InitiateCheckoutParams) {
  try {
    // 1. Ensure Razorpay SDK script is loaded
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      onError('Unable to load Razorpay payment gateway. Please check your internet connection.');
      return;
    }

    // 2. Create Order on backend
    const orderRes = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName, amount })
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      onError(orderData.message || 'Failed to initialize payment order.');
      return;
    }

    const { orderId, amount: amountInPaise, currency, keyId } = orderData;

    if (!keyId) {
      onError('Razorpay Key ID is not configured. Please check environment configuration.');
      return;
    }

    // 3. Configure Razorpay Checkout Options
    const options: RazorpayOptions = {
      key: keyId,
      amount: amountInPaise,
      currency: currency || 'INR',
      name: 'PROPZY TRICITY',
      description: `${planName} - Rental Contact Credits`,
      image: '/favicon.ico',
      order_id: orderId,
      prefill: {
        name: user.name || '',
        email: user.email || '',
        contact: user.phone ? user.phone.replace(/\D/g, '') : ''
      },
      theme: {
        color: '#10b981' // Emerald 500
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) onDismiss();
        }
      },
      handler: async (response: RazorpayResponse) => {
        try {
          // 4. Server-Side Signature Verification & Account Crediting
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planName,
              amount
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            onSuccess({
              user: verifyData.user,
              invoice: verifyData.invoice,
              message: verifyData.message
            });
          } else {
            onError(verifyData.message || 'Payment signature verification failed.');
          }
        } catch (verifyErr: any) {
          onError(verifyErr?.message || 'Failed to verify payment with server.');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err: any) {
    console.error('[Razorpay Checkout Error]:', err);
    onError(err?.message || 'An unexpected error occurred during payment processing.');
  }
}
