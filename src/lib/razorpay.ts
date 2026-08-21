import { toast } from "sonner";
import { createRazorpayOrderFn, verifyRazorpayPaymentFn } from "./razorpay.server";

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Dynamically loads the Razorpay Standard Checkout SDK script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export type RazorpayCheckoutOptions = {
  amountInRupees: number;
  name?: string;
  description?: string;
  receipt?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  onSuccess?: (result: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
};

/**
 * Full Razorpay Standard Web Checkout Handler:
 * 1. Creates Razorpay Order on Backend
 * 2. Opens Razorpay Standard Modal
 * 3. Verifies Signature on Backend
 */
export async function openRazorpayCheckout(opts: RazorpayCheckoutOptions) {
  if (typeof window === "undefined") return;

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    toast.error("Unable to load Razorpay SDK. Please check your network connection.");
    opts.onFailure?.("SDK Load Failed");
    return;
  }

  const key_id =
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    "rzp_live_TSNFYlCuSqOO9T";


  const amountInPaise = Math.round(opts.amountInRupees * 100);
  if (amountInPaise < 100) {
    toast.error("Minimum payment amount is ₹1.00 (100 paise).");
    return;
  }

  const loadingToastId = toast.loading("Initializing Razorpay Secure Checkout...");

  try {
    // 1. Create order on backend via REST endpoint or Server Function
    let orderData: { order_id: string; amount: number; currency: string; key_id: string };

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: opts.amountInRupees,
          receipt: opts.receipt,
          notes: opts.notes,
        }),
      });

      if (res.ok) {
        orderData = await res.json();
      } else {
        orderData = await createRazorpayOrderFn({
          data: {
            amount: opts.amountInRupees,
            receipt: opts.receipt,
            notes: opts.notes,
          },
        });
      }
    } catch {
      orderData = await createRazorpayOrderFn({
        data: {
          amount: opts.amountInRupees,
          receipt: opts.receipt,
          notes: opts.notes,
        },
      });
    }

    toast.dismiss(loadingToastId);

    if (!orderData?.order_id) {
      toast.error("Failed to generate Razorpay order ID.");
      opts.onFailure?.("Order Creation Failed");
      return;
    }

    // 2. Open Razorpay Modal
    const razorpayOptions = {
      key: orderData.key_id || key_id,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: opts.name || "Agrisynapse Intelligence Platform",
      description: opts.description || "Agricultural Trade & Supplies Checkout",
      image: "/favicon.png",
      order_id: orderData.order_id,
      prefill: {
        name: opts.prefill?.name || "Agri Buyer",
        email: opts.prefill?.email || "buyer@agrisynapse.in",
        contact: opts.prefill?.contact || "+919876543210",
      },
      notes: opts.notes || { platform: "Agrisynapse", developer: "AJ STUDIOZ" },
      theme: {
        color: "#166534",
      },
      modal: {
        ondismiss: () => {
          toast.info("Razorpay payment window closed.");
          opts.onDismiss?.();
        },
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        const verifyToastId = toast.loading("Verifying cryptographic signature with Razorpay...");

        try {
          // 3. Verify signature on backend
          let verifyRes: { success: boolean; error?: string };

          try {
            const vFetch = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            verifyRes = await vFetch.json();
          } catch {
            verifyRes = await verifyRazorpayPaymentFn({
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
          }

          toast.dismiss(verifyToastId);

          if (verifyRes.success) {
            toast.success("Payment Successful! Razorpay signature verified.");
            opts.onSuccess?.(response);
          } else {
            toast.error(verifyRes.error || "Payment verification failed. Invalid signature.");
            opts.onFailure?.(verifyRes.error || "Verification failed");
          }
        } catch (vErr: any) {
          toast.dismiss(verifyToastId);
          toast.error("Server error verifying payment signature.");
          opts.onFailure?.(vErr);
        }
      },
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.on("payment.failed", function (response: any) {
      toast.error(`Payment Failed: ${response.error?.description || "Transaction declined"}`);
      opts.onFailure?.(response.error);
    });
    rzp.open();
  } catch (err: any) {
    toast.dismiss(loadingToastId);
    console.error("[Razorpay Checkout Exception]:", err);
    toast.error(err?.message || "Failed to initiate Razorpay checkout.");
    opts.onFailure?.(err);
  }
}
