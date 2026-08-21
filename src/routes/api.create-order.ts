import { eventHandler, readBody, createError } from "h3";
import { createOrderBackend } from "@/lib/razorpay.server";

export default eventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as any;
    const amountInPaise = body?.amountInPaise || (body?.amount ? Math.round(body.amount * 100) : 100);


    if (!amountInPaise || amountInPaise < 100) {
      throw createError({
        statusCode: 400,
        statusMessage: "Minimum Razorpay order amount is 100 paise (₹1).",
      });
    }

    const order = await createOrderBackend({
      amountInPaise,
      currency: body?.currency || "INR",
      receipt: body?.receipt,
      notes: body?.notes,
    });

    return order;
  } catch (err: any) {
    console.error("[POST /api/create-order Error]:", err);
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || "Failed to create Razorpay order.",
    });
  }
});
