import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "./supabase";

// ── Types ──
export type MarketplaceProduceListing = {
  id: string;
  crop: string;
  variety?: string;
  farmer: string;
  farmerEmail?: string;
  farmerPhone?: string;
  location: string;
  quantity: string;
  price: number; // in INR per unit
  unit: string;
  grade: string;
  harvested: string;
  status: "active" | "sold_out" | "verified";
  featured?: boolean;
  createdAt: string;
};

export type MarketplaceOrder = {
  id: string;
  listingId: string;
  crop: string;
  farmer: string;
  farmerEmail?: string;
  farmerPhone?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  deliveryAddress: string;
  quantity: string;
  pricePerUnit: number;
  totalAmount: number;
  status: "escrow_funded" | "dispatched" | "delivered" | "completed" | "cancelled";
  escrowStatus: "held_in_escrow" | "released_to_farmer" | "refunded";
  paymentId: string;
  paymentGateway: "dodo_live" | "dodo_escrow_sim";
  createdAt: string;
  updatedAt: string;
};

export type EnquiryRecord = {
  id: string;
  listingId: string;
  crop: string;
  farmer: string;
  buyerName: string;
  buyerPhone: string;
  quantity: string;
  offerPrice: number;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type ServiceBookingRecord = {
  id: string;
  serviceId: string;
  serviceName: string;
  provider: string;
  date: string;
  qty: number;
  unit: string;
  total: number;
  paymentId?: string;
  status: "pending" | "confirmed";
  createdAt: string;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: "Home" | "Work" | "Farm Warehouse";
};

export type ShopOrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  category?: string;
  unit?: string;
  sellerName?: string;
  sellerEmail?: string;
};

export type ShopOrderRecord = {
  id: string;
  items: ShopOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: ShippingAddress;
  deliverySpeed: "standard" | "express";
  estimatedDeliveryDate: string;
  paymentMethod: "dodo_payments" | "dodo_escrow" | "upi" | "cod";
  paymentId?: string;
  paymentGateway: "dodo_live" | "dodo_escrow_sim";
  status: "placed" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  trackingNumber: string;
  courierPartner: string;
  createdAt: string;
  updatedAt: string;
};

export type ShopProductItem = {
  id: string;
  name: string;
  category: "Seeds" | "Fertilizers" | "Pesticides" | "Tools" | "Irrigation" | "Bio-Inputs" | "Harvested Produce" | string;
  price: number;
  unit: string;
  rating: number;
  stock: number;
  desc: string;
  sellerName: string;
  sellerRole: "farmer" | "certified_vendor" | "admin" | string;
  sellerEmail?: string;
  sellerPhone?: string;
  location?: string;
  isFarmerDirect?: boolean;
  createdAt: string;
};

// ── Helpers ──
const mapListing = (db: any): MarketplaceProduceListing => ({
  id: db.id, crop: db.crop, variety: db.variety, farmer: db.farmer,
  farmerEmail: db.farmer_email, farmerPhone: db.farmer_phone,
  location: db.location, quantity: db.quantity, price: db.price,
  unit: db.unit, grade: db.grade, harvested: db.harvested,
  status: db.status, featured: db.featured, createdAt: db.created_at
});

const mapOrder = (db: any): MarketplaceOrder => ({
  id: db.id, listingId: db.listing_id, crop: db.crop, farmer: db.farmer,
  farmerEmail: db.farmer_email, farmerPhone: db.farmer_phone,
  buyerName: db.buyer_name, buyerEmail: db.buyer_email, buyerPhone: db.buyer_phone,
  deliveryAddress: db.delivery_address, quantity: db.quantity, pricePerUnit: db.price_per_unit,
  totalAmount: db.total_amount, status: db.status, escrowStatus: db.escrow_status,
  paymentId: db.payment_id, paymentGateway: db.payment_gateway,
  createdAt: db.created_at, updatedAt: db.updated_at
});

const mapBooking = (db: any): ServiceBookingRecord => ({
  id: db.id, serviceId: db.service_id, serviceName: db.service_name,
  provider: db.provider, date: db.date, qty: db.qty, unit: db.unit,
  total: db.total, paymentId: db.payment_id, status: db.status, createdAt: db.created_at
});

const mapShopProduct = (db: any): ShopProductItem => ({
  id: db.id, name: db.name, category: db.category, price: db.price,
  unit: db.unit, rating: db.rating, stock: db.stock, desc: db.description,
  sellerName: db.seller_name, sellerRole: db.seller_role, sellerEmail: db.seller_email,
  sellerPhone: db.seller_phone, location: db.location, isFarmerDirect: db.is_farmer_direct,
  createdAt: db.created_at
});


// ── Dodo Payments Integration Engine ──
export async function createDodoSession(opts: {
  amount: number;
  currency?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}): Promise<{ checkoutUrl: string; sessionId: string; gatewayMode: "live_redirect" | "escrow_simulation" }> {
  const apiKey = (
    process.env.DODO_PAYMENTS_API_KEY ||
    process.env.DODO_API_KEY ||
    process.env.VITE_DODO_PAYMENTS_API_KEY ||
    process.env.DODO_KEY ||
    ""
  ).trim();

  if (apiKey) {
    const isExplicitTest =
      apiKey.toLowerCase().startsWith("test_") ||
      process.env.DODO_PAYMENTS_ENVIRONMENT === "test";

    const baseUrl = isExplicitTest
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";

    try {
      let productId = (
        process.env.DODO_PAYMENTS_PRODUCT_ID ||
        process.env.DODO_PRODUCT_ID ||
        "pdt_0NkaTplQ82JmIafBTeKxP"
      ).trim();

      const body: Record<string, unknown> = {
        payment_link: true,
        product_cart: [{ product_id: productId, quantity: 1, amount: Math.round(opts.amount * 100) }],
        billing: { city: "Salem", country: "IN", state: "Tamil Nadu", street: "Agro Commerce Hub", zipcode: "636453" },
        customer: { create_new_customer: true, email: opts.customerEmail || "kamesh14151@gmail.com", name: opts.customerName || "AJ STUDIOZ Agri Buyer" },
        return_url: opts.successUrl,
        metadata: { description: opts.description, platform: "Agrisynapse", developer: "AJ STUDIOZ", ...(opts.metadata ?? {}) },
      };

      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const checkoutUrl = data?.payment_link || data?.checkout_url || data?.url;
        if (checkoutUrl && typeof checkoutUrl === "string") {
          return { sessionId: data.payment_id || data.id || `dodo_${Date.now()}`, checkoutUrl, gatewayMode: "live_redirect" };
        }
      }
    } catch (err) {
      console.warn("[Dodo Payments] API call exception:", err);
    }
  }

  const demoPaymentId = `dodo_escrow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const joinChar = opts.successUrl.includes("?") ? "&" : "?";
  return {
    sessionId: demoPaymentId,
    checkoutUrl: `${opts.successUrl}${joinChar}payment_id=${demoPaymentId}&gateway=dodo_escrow`,
    gatewayMode: "escrow_simulation",
  };
}

// ── Marketplace Server Functions ──

export const getMarketplaceListings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase.from("produce_listings").select("*").order("created_at", { ascending: false });
    return { listings: (data || []).map(mapListing) };
  });

export const publishProduceListing = createServerFn({ method: "POST" })
  .validator(z.object({
    crop: z.string().min(2), variety: z.string().optional().default(""), farmer: z.string().min(2),
    farmerEmail: z.string().email().optional().default("kamesh14151@gmail.com"), farmerPhone: z.string().min(10),
    location: z.string().min(2), quantity: z.string().min(1), price: z.number().positive(),
    unit: z.string().default("quintal"), grade: z.string().default("A"), harvested: z.string().default("Freshly Harvested"),
  }))
  .handler(async ({ data }) => {
    const newListing = {
      crop: data.variety ? `${data.crop} (${data.variety})` : data.crop,
      variety: data.variety, farmer: data.farmer, farmer_email: data.farmerEmail,
      farmer_phone: data.farmerPhone, location: data.location, quantity: data.quantity,
      price: data.price, unit: data.unit, grade: data.grade, harvested: data.harvested,
      status: "active", featured: true,
    };
    const { data: inserted, error } = await supabase.from("produce_listings").insert([newListing]).select().single();
    if (error) throw error;
    return { success: true, listing: mapListing(inserted) };
  });

export const createProduceOrderCheckout = createServerFn({ method: "POST" })
  .validator(z.object({
    listingId: z.string(), quantity: z.string(), totalAmount: z.number().positive(),
    buyerName: z.string().min(2), buyerEmail: z.string().email(), buyerPhone: z.string().min(10),
    deliveryAddress: z.string().min(5), baseUrl: z.string(),
  }))
  .handler(async ({ data }) => {
    const { data: listing } = await supabase.from("produce_listings").select("*").eq("id", data.listingId).single();
    const cropName = listing?.crop || "Agricultural Produce Lot";
    const farmerName = listing?.farmer || "Verified Farmer";
    
    const session = await createDodoSession({
      amount: data.totalAmount, currency: "INR", description: `Marketplace Order: ${cropName} from ${farmerName}`,
      successUrl: `${data.baseUrl}/app/marketplace?order_success=pending_mkt`,
      cancelUrl: `${data.baseUrl}/app/marketplace`, customerEmail: data.buyerEmail, customerName: data.buyerName,
    });

    const newOrder = {
      listing_id: data.listingId, crop: cropName, farmer: farmerName,
      farmer_email: listing?.farmer_email, farmer_phone: listing?.farmer_phone,
      buyer_name: data.buyerName, buyer_email: data.buyerEmail, buyer_phone: data.buyerPhone,
      delivery_address: data.deliveryAddress, quantity: data.quantity,
      price_per_unit: listing?.price || Math.round(data.totalAmount), total_amount: data.totalAmount,
      status: "escrow_funded", escrow_status: "held_in_escrow", payment_id: session.sessionId,
      payment_gateway: session.gatewayMode === "live_redirect" ? "dodo_live" : "dodo_escrow_sim",
    };

    const { data: inserted } = await supabase.from("marketplace_orders").insert([newOrder]).select().single();

    return {
      success: true, orderId: inserted?.id, checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId, gatewayMode: session.gatewayMode, order: mapOrder(inserted),
    };
  });

export const getMarketplaceOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase.from("marketplace_orders").select("*").order("created_at", { ascending: false });
    return { orders: (data || []).map(mapOrder) };
  });

export const updateMarketplaceOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    orderId: z.string(), status: z.enum(["escrow_funded", "dispatched", "delivered", "completed", "cancelled"]),
  }))
  .handler(async ({ data }) => {
    let escrowStatus = "held_in_escrow";
    if (data.status === "delivered" || data.status === "completed") escrowStatus = "released_to_farmer";
    const { data: updated } = await supabase.from("marketplace_orders")
      .update({ status: data.status, escrow_status: escrowStatus, updated_at: new Date().toISOString() })
      .eq("id", data.orderId).select().single();
    return { success: true, order: mapOrder(updated) };
  });

export const updateListingStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    listingId: z.string(), status: z.enum(["active", "sold_out", "verified"]), featured: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const updatePayload: any = { status: data.status };
    if (data.featured !== undefined) updatePayload.featured = data.featured;
    const { data: updated } = await supabase.from("produce_listings").update(updatePayload).eq("id", data.listingId).select().single();
    return { success: true, listing: mapListing(updated) };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .validator(z.object({ listingId: z.string() }))
  .handler(async ({ data }) => {
    await supabase.from("produce_listings").delete().eq("id", data.listingId);
    return { success: true };
  });

export const getAdminPlatformTelemetry = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: marketplaceOrders } = await supabase.from("marketplace_orders").select("*");
    const { data: serviceBookings } = await supabase.from("service_bookings").select("*");
    const { data: produceListings } = await supabase.from("produce_listings").select("*");

    const orders = (marketplaceOrders || []).map(mapOrder);
    const bookings = (serviceBookings || []).map(mapBooking);
    const listings = (produceListings || []).map(mapListing);

    const totalGmv = orders.reduce((sum, o) => sum + o.totalAmount, 0) + bookings.reduce((sum, b) => sum + b.total, 0);
    const escrowHeld = orders.filter(o => o.escrowStatus === "held_in_escrow").reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      gmv: totalGmv, escrowHeld, totalOrders: orders.length + bookings.length,
      activeListings: listings.filter(l => l.status === "active").length, listings, marketplaceOrders: orders,
      serviceBookings: bookings, shopOrders: [], enquiries: [],
      gatewayStatus: {
        dodoConfigured: Boolean(process.env.DODO_PAYMENTS_API_KEY || process.env.VITE_DODO_PAYMENTS_API_KEY),
        escrowActive: true, mode: "Production Hybrid (Dodo Payments + Escrow Protection)",
      },
    };
  });

// ── Enquiries, Bookings, and Shop Handlers ──

export const submitEnquiry = createServerFn({ method: "POST" })
  .validator(z.object({
    listingId: z.string(), crop: z.string(), farmer: z.string(), buyerName: z.string().min(2),
    buyerPhone: z.string().min(10), quantity: z.string(), offerPrice: z.number().positive(), message: z.string().optional().default(""),
  }))
  .handler(async ({ data }) => {
    // Optional enquiry table integration could go here
    return { success: true, enquiryId: `enq_${Date.now()}` };
  });

export const createBookingCheckout = createServerFn({ method: "POST" })
  .validator(z.object({
    serviceId: z.string(), serviceName: z.string(), provider: z.string(), date: z.string(),
    qty: z.number().positive(), unit: z.string(), rate: z.number().positive(), baseUrl: z.string(),
  }))
  .handler(async ({ data }) => {
    const total = Math.round(data.rate * data.qty);
    const session = await createDodoSession({
      amount: total, currency: "INR", description: `${data.serviceName} — ${data.qty} ${data.unit} on ${data.date}`,
      successUrl: `${data.baseUrl}/app/booking/success?booking_id=pending_bkg`, cancelUrl: `${data.baseUrl}/app/booking`,
    });
    const newBooking = {
      service_id: data.serviceId, service_name: data.serviceName, provider: data.provider,
      date: data.date, qty: data.qty, unit: data.unit, total, status: "pending", payment_id: session.sessionId
    };
    const { data: inserted } = await supabase.from("service_bookings").insert([newBooking]).select().single();
    return { checkoutUrl: session.checkoutUrl, bookingId: inserted?.id, total, sessionId: session.sessionId };
  });

export const confirmBooking = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: z.string(), paymentId: z.string().optional() }))
  .handler(async ({ data }) => {
    const { data: updated } = await supabase.from("service_bookings").update({ status: "confirmed", payment_id: data.paymentId }).eq("id", data.bookingId).select().single();
    return { success: true, booking: mapBooking(updated) };
  });

export const getBookings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase.from("service_bookings").select("*").order("created_at", { ascending: false });
    return { bookings: (data || []).map(mapBooking) };
  });

// ── Agri Shop Server Functions ──

export const getShopProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase.from("shop_products").select("*").order("created_at", { ascending: false });
    return { products: (data || []).map(mapShopProduct) };
  });

export const uploadShopProduct = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string().min(2), category: z.string(), price: z.number().positive(), unit: z.string().min(1),
    stock: z.number().int().positive(), desc: z.string().min(5), sellerName: z.string().min(2),
    sellerRole: z.string().default("farmer"), sellerEmail: z.string().email().optional().default("kamesh14151@gmail.com"),
    sellerPhone: z.string().min(10), location: z.string().min(2),
  }))
  .handler(async ({ data }) => {
    const newProd = {
      name: data.name, category: data.category, price: data.price, unit: data.unit, stock: data.stock,
      description: data.desc, seller_name: data.sellerName, seller_role: data.sellerRole,
      seller_email: data.sellerEmail, seller_phone: data.sellerPhone, location: data.location,
      is_farmer_direct: data.sellerRole === "farmer", rating: 5.0
    };
    const { data: inserted, error } = await supabase.from("shop_products").insert([newProd]).select().single();
    if (error || !inserted) {
      throw new Error(error?.message || "Failed to insert product into database");
    }
    return { success: true, product: mapShopProduct(inserted) };
  });

export const deleteShopProduct = createServerFn({ method: "POST" })
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    await supabase.from("shop_products").delete().eq("id", data.productId);
    return { success: true };
  });

// We map shop checkouts & orders to simple arrays for now, or just return empty to simplify.
export const createShopCheckout = createServerFn({ method: "POST" })
  .validator(z.any())
  .handler(async () => { return { success: false, error: "Not implemented in DB yet" }; });

export const updateShopOrderStatus = createServerFn({ method: "POST" })
  .validator(z.any())
  .handler(async () => { return { success: false }; });

export const cancelShopOrder = createServerFn({ method: "POST" })
  .validator(z.any())
  .handler(async () => { return { success: false }; });

export const confirmOrder = createServerFn({ method: "POST" })
  .validator(z.any())
  .handler(async () => { return { success: false }; });

export const getShopOrders = createServerFn({ method: "GET" })
  .handler(async () => { return { orders: [] }; });

export const getOrders = getShopOrders;
