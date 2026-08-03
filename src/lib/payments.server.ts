import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── In-memory stores (survive hot-reload in dev, reset on server restart) ──
export const enquiryStore: {
  id: string; listingId: string; crop: string; farmer: string;
  buyerName: string; buyerPhone: string; quantity: string; offerPrice: number; message: string; createdAt: string;
}[] = [];

export const bookingStore: {
  id: string; serviceId: string; serviceName: string; provider: string;
  date: string; qty: number; unit: string; total: number; paymentId?: string; status: "pending" | "confirmed"; createdAt: string;
}[] = [];

export const orderStore: {
  id: string; items: { name: string; qty: number; price: number }[];
  total: number; paymentId?: string; status: "pending" | "confirmed"; createdAt: string;
}[] = [];

// ── Helpers ──
// ── Dodo Payments ──
// Key is read from env first, then falls back to the hardcoded test key
const DODO_API_KEY =
  process.env.DODO_PAYMENTS_API_KEY ??
  "xiCIHXP09LVD7Wjc.CZKZPRH-nGELUqTVMNwKYwQ2Ux969UlHF_TWzWMcE75_MJkZ";

// Creates a Dodo Payments payment link
async function createDodoSession(opts: {
  amount: number;       // total in INR (whole rupees)
  currency?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const body: Record<string, unknown> = {
    payment_link: true,
    billing: {
      city: "Chennai",
      country: "IN",
      state: "Tamil Nadu",
      street: "Farm Road",
      zipcode: "600001",
    },
    customer: { create_new_customer: true },
    return_url: opts.successUrl,
    metadata: { description: opts.description, ...(opts.metadata ?? {}) },
  };

  const res = await fetch("https://test.dodopayments.com/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Dodo Payments error (${res.status}): ${errText}`);
  }

  const data = await res.json() as { payment_id: string; payment_link: string };
  return {
    sessionId: data.payment_id,
    checkoutUrl: data.payment_link,
  };
}

// ── Server Functions ──

export const submitEnquiry = createServerFn({ method: "POST" })
  .validator(z.object({
    listingId: z.string(),
    crop: z.string(),
    farmer: z.string(),
    buyerName: z.string().min(2),
    buyerPhone: z.string().min(10),
    quantity: z.string(),
    offerPrice: z.number().positive(),
    message: z.string().optional().default(""),
  }))
  .handler(async ({ data }) => {
    const id = `enq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    enquiryStore.unshift({
      id, ...data, message: data.message ?? "",
      createdAt: new Date().toISOString(),
    });
    return { success: true, enquiryId: id };
  });

export const createBookingCheckout = createServerFn({ method: "POST" })
  .validator(z.object({
    serviceId: z.string(),
    serviceName: z.string(),
    provider: z.string(),
    date: z.string(),
    qty: z.number().positive(),
    unit: z.string(),
    rate: z.number().positive(),
    baseUrl: z.string(),
  }))
  .handler(async ({ data }) => {
    const total = Math.round(data.rate * data.qty);
    const bookingId = `bkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Save pending booking
    bookingStore.unshift({
      id: bookingId,
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      provider: data.provider,
      date: data.date,
      qty: data.qty,
      unit: data.unit,
      total,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    const successUrl = `${data.baseUrl}/app/booking/success?booking_id=${bookingId}`;
    const cancelUrl = `${data.baseUrl}/app/booking`;

    const session = await createDodoSession({
      amount: total * 100, // paise
      currency: "INR",
      description: `${data.serviceName} — ${data.qty} ${data.unit} on ${data.date}`,
      successUrl,
      cancelUrl,
      metadata: { bookingId, serviceId: data.serviceId },
    });

    return { checkoutUrl: session.checkoutUrl, bookingId, total, sessionId: session.sessionId };
  });

export const confirmBooking = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: z.string(), paymentId: z.string().optional() }))
  .handler(async ({ data }) => {
    const booking = bookingStore.find(b => b.id === data.bookingId);
    if (!booking) throw new Error("Booking not found");
    booking.status = "confirmed";
    booking.paymentId = data.paymentId;
    return { success: true, booking };
  });

export const getBookings = createServerFn({ method: "GET" })
  .handler(async () => ({ bookings: [...bookingStore] }));

export const createShopCheckout = createServerFn({ method: "POST" })
  .validator(z.object({
    items: z.array(z.object({ id: z.string(), name: z.string(), qty: z.number(), price: z.number() })),
    baseUrl: z.string(),
  }))
  .handler(async ({ data }) => {
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    orderStore.unshift({
      id: orderId,
      items: data.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    const successUrl = `${data.baseUrl}/app/shop/success?order_id=${orderId}`;
    const cancelUrl = `${data.baseUrl}/app/shop`;

    const session = await createDodoSession({
      amount: total * 100,
      currency: "INR",
      description: `Agri Shop order — ${data.items.length} item(s)`,
      successUrl,
      cancelUrl,
      metadata: { orderId },
    });

    return { checkoutUrl: session.checkoutUrl, orderId, total, sessionId: session.sessionId };
  });

export const confirmOrder = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string(), paymentId: z.string().optional() }))
  .handler(async ({ data }) => {
    const order = orderStore.find(o => o.id === data.orderId);
    if (!order) throw new Error("Order not found");
    order.status = "confirmed";
    order.paymentId = data.paymentId;
    return { success: true, order };
  });

export const getOrders = createServerFn({ method: "GET" })
  .handler(async () => ({ orders: [...orderStore] }));
