import { eventHandler, readBody, createError } from "h3";
import { verifyPaymentSignature } from "@/lib/razorpay.server";

export default eventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as any;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};


    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required verification fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
      });
    }

    const result = await verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: result.error || "Signature verification failed.",
      });
    }

    return result;
  } catch (err: any) {
    console.error("[POST /api/verify-payment Error]:", err);
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || "Signature verification failed.",
    });
  }
});
