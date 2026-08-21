import Razorpay from "razorpay";
import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export function getRazorpayCredentials() {
  const key_id = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    "rzp_live_TSNFYlCuSqOO9T"
  ).trim();

  const key_secret = (
    process.env.RAZORPAY_KEY_SECRET ||
    "xZBZLVV88iOlu7nDj9LnixCJ"
  ).trim();

  return { key_id, key_secret };
}


export function getRazorpayInstance() {
  const { key_id, key_secret } = getRazorpayCredentials();
  return {
    instance: new Razorpay({ key_id, key_secret }),
    key_id,
    key_secret,
  };
}

/**
 * STEP 1: BACKEND - Create Razorpay Order
 */
export async function createOrderBackend(opts: {
  amountInRupees?: number;
  amountInPaise?: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}) {
  const { instance, key_id } = getRazorpayInstance();

  const amount = opts.amountInPaise
    ? Math.round(opts.amountInPaise)
    : Math.round((opts.amountInRupees || 1) * 100);

  if (amount < 100) {
    throw new Error("Minimum Razorpay order amount is 100 paise (₹1).");
  }

  const currency = opts.currency || "INR";
  const receipt = opts.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const order = await instance.orders.create({
      amount,
      currency,
      receipt,
      notes: opts.notes || { platform: "Agrisynapse", developer: "AJ STUDIOZ" },
    });

    return {
      order_id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt,
      key_id,
    };
  } catch (err: any) {
    console.error("[Razorpay Order Creation Error]:", err);
    throw new Error(err?.error?.description || err?.message || "Failed to create Razorpay order.");
  }
}

/**
 * STEP 3: BACKEND - Verify Payment Signature
 */
export async function verifyPaymentSignature(opts: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const { key_secret } = getRazorpayCredentials();

  if (!opts.razorpay_order_id || !opts.razorpay_payment_id || !opts.razorpay_signature) {
    return {
      success: false,
      error: "Missing required Razorpay verification parameters.",
    };
  }

  const body = `${opts.razorpay_order_id}|${opts.razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(body)
    .digest("hex");

  const isMatch = expectedSignature === opts.razorpay_signature;

  if (!isMatch) {
    return {
      success: false,
      error: "Signature mismatch! Payment verification failed.",
    };
  }

  return {
    success: true,
    order_id: opts.razorpay_order_id,
    payment_id: opts.razorpay_payment_id,
  };
}

// ── TanStack Start Type-Safe Server Functions ──

export const createRazorpayOrderFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      amount: z.number().positive(),
      isPaise: z.boolean().optional().default(false),
      currency: z.string().optional().default("INR"),
      receipt: z.string().optional(),
      notes: z.record(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const amountInPaise = data.isPaise ? data.amount : Math.round(data.amount * 100);
    return createOrderBackend({
      amountInPaise,
      currency: data.currency,
      receipt: data.receipt,
      notes: data.notes,
    });
  });

export const verifyRazorpayPaymentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    return verifyPaymentSignature({
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    });
  });
