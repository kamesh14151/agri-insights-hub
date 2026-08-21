import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  sendWelcomeEmail,
  sendLoginEmail,
  sendOrderConfirmationEmail,
} from "@/lib/email.server";

export const sendEmailFn = createServerFn({ method: "POST" })
  .validator(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("welcome"),
        to: z.string().email(),
        name: z.string(),
        role: z.string(),
      }),
      z.object({
        type: z.literal("login"),
        to: z.string().email(),
        name: z.string(),
      }),
      z.object({
        type: z.literal("order"),
        to: z.string().email(),
        buyerName: z.string(),
        crop: z.string(),
        farmer: z.string(),
        quantity: z.string(),
        totalAmount: z.number(),
        paymentId: z.string(),
        deliveryAddress: z.string(),
      }),
    ])
  )
  .handler(async ({ data }) => {
    if (data.type === "welcome") {
      return sendWelcomeEmail({ to: data.to, name: data.name, role: data.role });
    }
    if (data.type === "login") {
      return sendLoginEmail({ to: data.to, name: data.name });
    }
    if (data.type === "order") {
      return sendOrderConfirmationEmail({
        to: data.to,
        buyerName: data.buyerName,
        crop: data.crop,
        farmer: data.farmer,
        quantity: data.quantity,
        totalAmount: data.totalAmount,
        paymentId: data.paymentId,
        deliveryAddress: data.deliveryAddress,
      });
    }
    return { success: false, error: "Unknown email type" };
  });
