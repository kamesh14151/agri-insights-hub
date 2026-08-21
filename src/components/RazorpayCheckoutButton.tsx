import { useState } from "react";
import { openRazorpayCheckout } from "@/lib/razorpay";

import { CreditCard, ShieldCheck, Loader2 } from "lucide-react";

type RazorpayCheckoutButtonProps = {
  amountInRupees: number;
  label?: string;
  name?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (payment: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  onFailure?: (error: any) => void;
  className?: string;
};

export function RazorpayCheckoutButton({
  amountInRupees,
  label,
  name = "Agrisynapse Trade Platform",
  description = "Certified Agricultural Purchase",
  customerName = "Agri Buyer",
  customerEmail = "buyer@agrisynapse.in",
  customerPhone = "+91 98765 43210",
  onSuccess,
  onFailure,
  className,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await openRazorpayCheckout({
        amountInRupees,
        name,
        description,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        onSuccess: (paymentResult) => {
          setLoading(false);
          onSuccess?.(paymentResult);
        },
        onFailure: (err) => {
          setLoading(false);
          onFailure?.(err);
        },
        onDismiss: () => {
          setLoading(false);
        },
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm px-5 py-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Opening Razorpay...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          <span>{label || `Pay ₹${amountInRupees.toLocaleString("en-IN")} via Razorpay`}</span>
          <ShieldCheck className="w-3.5 h-3.5 opacity-80" />
        </>
      )}
    </button>
  );
}
