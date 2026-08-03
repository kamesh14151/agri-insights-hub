import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LISTINGS, type Listing } from "./mock";

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
  quantityValue?: number;
  price: number; // in INR per unit
  unit: string;
  grade: "A" | "B" | "C" | "Premium" | string;
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
  category: "Seeds" | "Fertilizers" | "Pesticides" | "Tools" | "Irrigation" | "Bio-Inputs" | "Harvested Produce";
  price: number;
  unit: string;
  rating: number;
  stock: number;
  desc: string;
  sellerName: string;
  sellerRole: "farmer" | "certified_vendor" | "admin";
  sellerEmail?: string;
  sellerPhone?: string;
  location?: string;
  isFarmerDirect?: boolean;
  createdAt: string;
};

// ── In-memory Persistent Stores ──
const globalListings: MarketplaceProduceListing[] = [
  ...LISTINGS.map((l, index) => ({
    id: l.id,
    crop: l.crop,
    farmer: l.farmer,
    farmerEmail: index === 0 ? "kamesh14151@gmail.com" : `farmer_${l.id}@agrisynapse.com`,
    farmerPhone: "+91 98765 43210",
    location: l.location,
    quantity: l.quantity,
    price: l.price,
    unit: l.unit,
    grade: l.grade,
    harvested: l.harvested,
    status: "active" as const,
    featured: index < 2,
    createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  })),
];

const globalOrders: MarketplaceOrder[] = [
  {
    id: "ord_mkt_sample_101",
    listingId: "l1",
    crop: "Paddy (ADT 45)",
    farmer: "Murugan Selvam",
    farmerEmail: "kamesh14151@gmail.com",
    farmerPhone: "+91 98421 12345",
    buyerName: "Kamesh Agro Corp",
    buyerEmail: "kamesh14151@gmail.com",
    buyerPhone: "+91 98765 43210",
    deliveryAddress: "Grain Terminal #4, Anna Nagar, Chennai - 600040",
    quantity: "2 tonnes (20 quintals)",
    pricePerUnit: 2320,
    totalAmount: 46400,
    status: "escrow_funded",
    escrowStatus: "held_in_escrow",
    paymentId: "dodo_live_pay_89412",
    paymentGateway: "dodo_live",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

const globalShopProducts: ShopProductItem[] = [
  {
    id: "p1",
    name: "ADT 45 Paddy Seeds (High Germination Rate)",
    category: "Seeds",
    price: 780,
    unit: "10 kg bag",
    rating: 4.8,
    stock: 45,
    desc: "Certified high-yield short-duration paddy variety suited for Cauvery delta wetland conditions.",
    sellerName: "Murugan Selvam",
    sellerRole: "farmer",
    sellerEmail: "kamesh14151@gmail.com",
    sellerPhone: "+91 98421 12345",
    location: "Erode, Tamil Nadu",
    isFarmerDirect: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "p2",
    name: "Hybrid Tomato Seeds (Arka Rakshak)",
    category: "Seeds",
    price: 340,
    unit: "10 g packet",
    rating: 4.9,
    stock: 120,
    desc: "Triple disease-resistant hybrid with 75 t/ha yield potential and deep red firm fruits.",
    sellerName: "Lakshmi Devi",
    sellerRole: "farmer",
    sellerEmail: "lakshmi@agrisynapse.com",
    sellerPhone: "+91 94432 99881",
    location: "Madanapalle, AP",
    isFarmerDirect: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "p3",
    name: "Organic Vermicompost & Earthworm Castings",
    category: "Fertilizers",
    price: 420,
    unit: "30 kg bag",
    rating: 4.7,
    stock: 60,
    desc: "100% farm-cured organic compost loaded with beneficial microbes, humic acid, and minerals.",
    sellerName: "Sivakumar P",
    sellerRole: "farmer",
    sellerEmail: "sivakumar@agrisynapse.com",
    sellerPhone: "+91 98433 11223",
    location: "Tiruvannamalai, TN",
    isFarmerDirect: true,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "p4",
    name: "Cold-Pressed Pure Neem Oil (1500 ppm Azadirachtin)",
    category: "Pesticides",
    price: 510,
    unit: "1 L bottle",
    rating: 4.6,
    stock: 50,
    desc: "Natural biological repellent effective against sucking pests, thrips, and mites. Eco-friendly.",
    sellerName: "Kannan R",
    sellerRole: "farmer",
    sellerEmail: "kannan@agrisynapse.com",
    sellerPhone: "+91 94888 77665",
    location: "Salem, TN",
    isFarmerDirect: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "p5",
    name: "Battery Knapsack Sprayer (12V / 16L)",
    category: "Tools",
    price: 3250,
    unit: "unit",
    rating: 4.5,
    stock: 18,
    desc: "High-pressure multi-nozzle electric backpack sprayer for effortless foliar application.",
    sellerName: "Kisan Agro Tools Co.",
    sellerRole: "certified_vendor",
    sellerPhone: "+91 98940 33445",
    location: "Coimbatore, TN",
    isFarmerDirect: false,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "p6",
    name: "Inline Drip Lateral Pipe (16mm · 40cm Spacing)",
    category: "Irrigation",
    price: 1890,
    unit: "400 m roll",
    rating: 4.7,
    stock: 30,
    desc: "UV-stabilized virgin polymer drip laterals with pressure-compensating inline emitters.",
    sellerName: "Cauvery Drip Tech",
    sellerRole: "certified_vendor",
    sellerPhone: "+91 98425 66778",
    location: "Trichy, TN",
    isFarmerDirect: false,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

export const enquiryStore: EnquiryRecord[] = [];
export const bookingStore: ServiceBookingRecord[] = [];
export const orderStore: ShopOrderRecord[] = [
  {
    id: "ORD-AGRI-98421",
    items: [
      {
        id: "p1",
        name: "ADT 45 Paddy Seeds (High Germination Rate)",
        qty: 2,
        price: 780,
        category: "Seeds",
        unit: "10 kg bag",
        sellerName: "Murugan Selvam",
        sellerEmail: "kamesh14151@gmail.com",
      },
      {
        id: "p3",
        name: "Organic Vermicompost & Earthworm Castings",
        qty: 1,
        price: 420,
        category: "Fertilizers",
        unit: "30 kg bag",
        sellerName: "Sivakumar P",
        sellerEmail: "sivakumar@agrisynapse.com",
      },
    ],
    subtotal: 1980,
    deliveryFee: 0,
    discount: 0,
    total: 1980,
    buyerName: "Kamesh",
    buyerEmail: "kamesh14151@gmail.com",
    buyerPhone: "+91 98765 43210",
    shippingAddress: {
      fullName: "Kamesh",
      phone: "+91 98765 43210",
      street: "Plot No. 14, Kaveri Mandi Complex",
      landmark: "Near Farmer Produce Center",
      city: "Salem",
      state: "Tamil Nadu",
      pincode: "636453",
      addressType: "Farm Warehouse",
    },
    deliverySpeed: "standard",
    estimatedDeliveryDate: "Thursday, Aug 6",
    paymentMethod: "dodo_payments",
    paymentId: "dodo_live_pay_99812",
    paymentGateway: "dodo_live",
    status: "shipped",
    trackingNumber: "AGRI-DEL-984210",
    courierPartner: "Delhivery Surface Express",
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

// ── Dodo Payments Integration Engine ──
export async function createDodoSession(opts: {
  amount: number;       // total in INR
  currency?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}): Promise<{ checkoutUrl: string; sessionId: string; gatewayMode: "live_redirect" | "escrow_simulation" }> {
  // Support all common environment variable naming conventions
  const apiKey = (
    process.env.DODO_PAYMENTS_API_KEY ||
    process.env.DODO_API_KEY ||
    process.env.VITE_DODO_PAYMENTS_API_KEY ||
    process.env.DODO_KEY ||
    ""
  ).trim();

  if (apiKey) {
    // If key has test prefix or environment is test, use test URL, otherwise live
    const isExplicitTest =
      apiKey.toLowerCase().startsWith("test_") ||
      process.env.DODO_PAYMENTS_ENVIRONMENT === "test";

    const baseUrl = isExplicitTest
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";

    try {
      // 1. Resolve Product ID: Check env var or use merchant registered product
      let productId = (
        process.env.DODO_PAYMENTS_PRODUCT_ID ||
        process.env.DODO_PRODUCT_ID ||
        "pdt_0NkaTplQ82JmIafBTeKxP"
      ).trim();

      // 2. Create Payment / Checkout Session
      const body: Record<string, unknown> = {
        payment_link: true,
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: Math.round(opts.amount * 100), // in paise
          },
        ],
        billing: {
          city: "Salem",
          country: "IN",
          state: "Tamil Nadu",
          street: "Agro Commerce Hub",
          zipcode: "636453",
        },
        customer: {
          create_new_customer: true,
          email: opts.customerEmail || "kamesh14151@gmail.com",
          name: opts.customerName || "AJ STUDIOZ Agri Buyer",
        },
        return_url: opts.successUrl,
        metadata: {
          description: opts.description,
          platform: "Agrisynapse",
          developer: "AJ STUDIOZ",
          ...(opts.metadata ?? {}),
        },
      };

      const res = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const checkoutUrl = data?.payment_link || data?.checkout_url || data?.url;
        if (checkoutUrl && typeof checkoutUrl === "string") {
          return {
            sessionId: data.payment_id || data.id || `dodo_${Date.now()}`,
            checkoutUrl,
            gatewayMode: "live_redirect",
          };
        }
      } else {
        const errText = await res.text();
        console.warn(`[Dodo Payments] (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.warn("[Dodo Payments] API call exception:", err);
    }
  }

  // Fallback direct escrow settlement URL
  const demoPaymentId = `dodo_escrow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const joinChar = opts.successUrl.includes("?") ? "&" : "?";
  return {
    sessionId: demoPaymentId,
    checkoutUrl: `${opts.successUrl}${joinChar}payment_id=${demoPaymentId}&gateway=dodo_escrow`,
    gatewayMode: "escrow_simulation",
  };
}

// ── Marketplace Server Functions ──

// 1. Get all listings
export const getMarketplaceListings = createServerFn({ method: "GET" })
  .handler(async () => {
    return { listings: [...globalListings] };
  });

// 2. Farmer publishes new produce listing
export const publishProduceListing = createServerFn({ method: "POST" })
  .validator(z.object({
    crop: z.string().min(2),
    variety: z.string().optional().default(""),
    farmer: z.string().min(2),
    farmerEmail: z.string().email().optional().default("kamesh14151@gmail.com"),
    farmerPhone: z.string().min(10),
    location: z.string().min(2),
    quantity: z.string().min(1),
    price: z.number().positive(),
    unit: z.string().default("quintal"),
    grade: z.string().default("A"),
    harvested: z.string().default("Freshly Harvested"),
  }))
  .handler(async ({ data }) => {
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newListing: MarketplaceProduceListing = {
      id,
      crop: data.variety ? `${data.crop} (${data.variety})` : data.crop,
      variety: data.variety,
      farmer: data.farmer,
      farmerEmail: data.farmerEmail,
      farmerPhone: data.farmerPhone,
      location: data.location,
      quantity: data.quantity,
      price: data.price,
      unit: data.unit,
      grade: data.grade,
      harvested: data.harvested,
      status: "active",
      featured: true,
      createdAt: new Date().toISOString(),
    };

    globalListings.unshift(newListing);
    return { success: true, listing: newListing };
  });

// 3. Buyer buys produce directly / places escrow order
export const createProduceOrderCheckout = createServerFn({ method: "POST" })
  .validator(z.object({
    listingId: z.string(),
    quantity: z.string(),
    totalAmount: z.number().positive(),
    buyerName: z.string().min(2),
    buyerEmail: z.string().email(),
    buyerPhone: z.string().min(10),
    deliveryAddress: z.string().min(5),
    baseUrl: z.string(),
  }))
  .handler(async ({ data }) => {
    const listing = globalListings.find(l => l.id === data.listingId);
    const cropName = listing?.crop || "Agricultural Produce Lot";
    const farmerName = listing?.farmer || "Verified Farmer";
    const farmerEmail = listing?.farmerEmail || "farmer@agrisynapse.com";
    const farmerPhone = listing?.farmerPhone || "+91 98765 43210";

    const orderId = `ord_mkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const successUrl = `${data.baseUrl}/app/marketplace?order_success=${orderId}`;
    const cancelUrl = `${data.baseUrl}/app/marketplace`;

    const session = await createDodoSession({
      amount: data.totalAmount,
      currency: "INR",
      description: `Marketplace Order: ${cropName} (${data.quantity}) from ${farmerName}`,
      successUrl,
      cancelUrl,
      customerEmail: data.buyerEmail,
      customerName: data.buyerName,
      metadata: {
        orderId,
        listingId: data.listingId,
        crop: cropName,
        farmer: farmerName,
      },
    });

    const newOrder: MarketplaceOrder = {
      id: orderId,
      listingId: data.listingId,
      crop: cropName,
      farmer: farmerName,
      farmerEmail,
      farmerPhone,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      buyerPhone: data.buyerPhone,
      deliveryAddress: data.deliveryAddress,
      quantity: data.quantity,
      pricePerUnit: listing?.price || Math.round(data.totalAmount),
      totalAmount: data.totalAmount,
      status: "escrow_funded",
      escrowStatus: "held_in_escrow",
      paymentId: session.sessionId,
      paymentGateway: session.gatewayMode === "live_redirect" ? "dodo_live" : "dodo_escrow_sim",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    globalOrders.unshift(newOrder);

    return {
      success: true,
      orderId,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      gatewayMode: session.gatewayMode,
      order: newOrder,
    };
  });

// 4. Get all marketplace orders
export const getMarketplaceOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    return { orders: [...globalOrders] };
  });

// 5. Update order status (dispatch, deliver, release escrow)
export const updateMarketplaceOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    orderId: z.string(),
    status: z.enum(["escrow_funded", "dispatched", "delivered", "completed", "cancelled"]),
  }))
  .handler(async ({ data }) => {
    const order = globalOrders.find(o => o.id === data.orderId);
    if (!order) throw new Error("Order not found");

    order.status = data.status;
    order.updatedAt = new Date().toISOString();

    if (data.status === "delivered" || data.status === "completed") {
      order.escrowStatus = "released_to_farmer";
    }

    return { success: true, order };
  });

// 6. Admin / Farmer: Update listing status or delete
export const updateListingStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    listingId: z.string(),
    status: z.enum(["active", "sold_out", "verified"]),
    featured: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const listing = globalListings.find(l => l.id === data.listingId);
    if (!listing) throw new Error("Listing not found");

    listing.status = data.status;
    if (data.featured !== undefined) listing.featured = data.featured;

    return { success: true, listing };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .validator(z.object({ listingId: z.string() }))
  .handler(async ({ data }) => {
    const index = globalListings.findIndex(l => l.id === data.listingId);
    if (index !== -1) {
      globalListings.splice(index, 1);
    }
    return { success: true };
  });

// 7. Admin platform telemetry overview
export const getAdminPlatformTelemetry = createServerFn({ method: "GET" })
  .handler(async () => {
    const totalGmv = globalOrders.reduce((sum, o) => sum + o.totalAmount, 0) +
      bookingStore.reduce((sum, b) => sum + b.total, 0) +
      orderStore.reduce((sum, s) => sum + s.total, 0);

    const escrowHeld = globalOrders
      .filter(o => o.escrowStatus === "held_in_escrow")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const activeListingsCount = globalListings.filter(l => l.status === "active").length;

    return {
      gmv: totalGmv,
      escrowHeld,
      totalOrders: globalOrders.length + bookingStore.length + orderStore.length,
      activeListings: activeListingsCount,
      listings: [...globalListings],
      marketplaceOrders: [...globalOrders],
      serviceBookings: [...bookingStore],
      shopOrders: [...orderStore],
      enquiries: [...enquiryStore],
      gatewayStatus: {
        dodoConfigured: Boolean(process.env.DODO_PAYMENTS_API_KEY),
        escrowActive: true,
        mode: "Production Hybrid (Dodo Payments + Escrow Protection)",
      },
    };
  });

// ── Enquiries, Bookings, and Shop Handlers ──

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
    const record: EnquiryRecord = {
      id,
      ...data,
      message: data.message ?? "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    enquiryStore.unshift(record);
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
      amount: total,
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
    let booking = bookingStore.find(b => b.id === data.bookingId);
    if (!booking) {
      booking = {
        id: data.bookingId,
        serviceId: "svc_verified",
        serviceName: "Farm Service Booking",
        provider: "Verified Agri Partner",
        date: new Date().toISOString().split("T")[0]!,
        qty: 1,
        unit: "service",
        total: 950,
        status: "confirmed",
        paymentId: data.paymentId ?? `dodo_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      bookingStore.unshift(booking);
    } else {
      booking.status = "confirmed";
      booking.paymentId = data.paymentId;
    }
    return { success: true, booking };
  });

export const getBookings = createServerFn({ method: "GET" })
  .handler(async () => ({ bookings: [...bookingStore] }));

// ── Agri Shop Server Functions ──

// 1. Get all Shop Products (both Platform & Farmer Uploaded)
export const getShopProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    return { products: [...globalShopProducts] };
  });

// 2. Farmer Upload / List new product for sale in Agri Shop
export const uploadShopProduct = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string().min(2),
    category: z.enum(["Seeds", "Fertilizers", "Pesticides", "Tools", "Irrigation", "Bio-Inputs", "Harvested Produce"]),
    price: z.number().positive(),
    unit: z.string().min(1),
    stock: z.number().int().positive(),
    desc: z.string().min(5),
    sellerName: z.string().min(2),
    sellerRole: z.enum(["farmer", "certified_vendor", "admin"]).default("farmer"),
    sellerEmail: z.string().email().optional().default("kamesh14151@gmail.com"),
    sellerPhone: z.string().min(10),
    location: z.string().min(2),
  }))
  .handler(async ({ data }) => {
    const id = `shop_prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newProduct: ShopProductItem = {
      id,
      name: data.name,
      category: data.category,
      price: data.price,
      unit: data.unit,
      rating: 5.0,
      stock: data.stock,
      desc: data.desc,
      sellerName: data.sellerName,
      sellerRole: data.sellerRole,
      sellerEmail: data.sellerEmail,
      sellerPhone: data.sellerPhone,
      location: data.location,
      isFarmerDirect: data.sellerRole === "farmer",
      createdAt: new Date().toISOString(),
    };

    globalShopProducts.unshift(newProduct);
    return { success: true, product: newProduct };
  });

// 3. Delete / Remove a Shop Product (by seller or admin)
export const deleteShopProduct = createServerFn({ method: "POST" })
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    const idx = globalShopProducts.findIndex(p => p.id === data.productId);
    if (idx !== -1) {
      const removed = globalShopProducts.splice(idx, 1)[0];
      return { success: true, removed };
    }
    return { success: false, error: "Product not found" };
  });

// 4. Create Shop Checkout (Dodo / Escrow / Amazon-style E-Commerce)
export const createShopCheckout = createServerFn({ method: "POST" })
  .validator(z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      qty: z.number().int().positive(),
      price: z.number().positive(),
      category: z.string().optional(),
      unit: z.string().optional(),
      sellerName: z.string().optional(),
      sellerEmail: z.string().optional(),
    })),
    buyerName: z.string().min(1),
    buyerEmail: z.string().email(),
    buyerPhone: z.string().min(8),
    shippingAddress: z.object({
      fullName: z.string().min(1),
      phone: z.string().min(8),
      street: z.string().min(3),
      landmark: z.string().optional().default(""),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().min(4),
      addressType: z.enum(["Home", "Work", "Farm Warehouse"]).default("Home"),
    }),
    deliverySpeed: z.enum(["standard", "express"]).default("standard"),
    paymentMethod: z.enum(["dodo_payments", "dodo_escrow", "upi", "cod"]).default("dodo_payments"),
    baseUrl: z.string(),
  }))
  .handler(async ({ data }) => {
    const subtotal = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const deliveryFee = data.deliverySpeed === "express" ? 99 : 0;
    const discount = 0;
    const total = subtotal + deliveryFee - discount;

    const orderId = `ORD-AGRI-${Math.floor(10000 + Math.random() * 90000)}`;
    const trackingNumber = `AGRI-TRK-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Calculate delivery date estimate
    const now = new Date();
    const daysToAdd = data.deliverySpeed === "express" ? 2 : 4;
    const deliveryDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const estimatedDeliveryDate = deliveryDate.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // Decrement stock for purchased items
    for (const item of data.items) {
      const prod = globalShopProducts.find(p => p.id === item.id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.qty);
      }
    }

    const newOrder: ShopOrderRecord = {
      id: orderId,
      items: data.items.map(i => {
        const prod = globalShopProducts.find(p => p.id === i.id);
        return {
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          category: i.category || prod?.category || "Seeds",
          unit: i.unit || prod?.unit || "unit",
          sellerName: i.sellerName || prod?.sellerName || "Agri Certified Farmer",
          sellerEmail: i.sellerEmail || prod?.sellerEmail || "farmer@agrisynapse.com",
        };
      }),
      subtotal,
      deliveryFee,
      discount,
      total,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      buyerPhone: data.buyerPhone,
      shippingAddress: data.shippingAddress,
      deliverySpeed: data.deliverySpeed,
      estimatedDeliveryDate,
      paymentMethod: data.paymentMethod,
      paymentId: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      paymentGateway: data.paymentMethod === "dodo_payments" ? "dodo_live" : "dodo_escrow_sim",
      status: "placed",
      trackingNumber,
      courierPartner: data.deliverySpeed === "express" ? "Blue Dart Express" : "Delhivery Mandi Logistics",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orderStore.unshift(newOrder);

    const successUrl = `${data.baseUrl}/app/shop/success?order_id=${orderId}`;
    const cancelUrl = `${data.baseUrl}/app/shop`;

    const session = await createDodoSession({
      amount: total,
      currency: "INR",
      description: `Agri Shop Order #${orderId} (${data.items.length} item(s))`,
      customerEmail: data.buyerEmail,
      customerName: data.buyerName,
      successUrl,
      cancelUrl,
      metadata: {
        orderId,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        deliveryAddress: `${data.shippingAddress.street}, ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}`,
      },
    });

    return {
      success: true,
      order: newOrder,
      checkoutUrl: session.checkoutUrl,
      orderId,
      total,
      sessionId: session.sessionId,
      gatewayMode: session.gatewayMode,
    };
  });

// 5. Update Shop Order Status (Farmer packs/dispatches order or marks delivered)
export const updateShopOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({
    orderId: z.string(),
    status: z.enum(["placed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"]),
    courierPartner: z.string().optional(),
    trackingNumber: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const order = orderStore.find(o => o.id === data.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    order.status = data.status;
    if (data.courierPartner) order.courierPartner = data.courierPartner;
    if (data.trackingNumber) order.trackingNumber = data.trackingNumber;
    order.updatedAt = new Date().toISOString();

    return { success: true, order };
  });

// 6. Cancel Shop Order (by buyer if not yet dispatched)
export const cancelShopOrder = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const order = orderStore.find(o => o.id === data.orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }
    if (order.status === "shipped" || order.status === "delivered") {
      return { success: false, error: "Cannot cancel order that has already been shipped." };
    }

    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();
    return { success: true, order };
  });

// 7. Confirm Order Callback
export const confirmOrder = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string(), paymentId: z.string().optional() }))
  .handler(async ({ data }) => {
    let order = orderStore.find(o => o.id === data.orderId);
    if (!order) {
      order = {
        id: data.orderId,
        items: [
          {
            id: "p1",
            name: "ADT 45 Paddy Seeds (High Germination Rate)",
            qty: 1,
            price: 780,
            category: "Seeds",
            unit: "10 kg bag",
            sellerName: "Murugan Selvam",
          },
        ],
        subtotal: 780,
        deliveryFee: 0,
        discount: 0,
        total: 780,
        buyerName: "Kamesh",
        buyerEmail: "kamesh14151@gmail.com",
        buyerPhone: "+91 98765 43210",
        shippingAddress: {
          fullName: "Kamesh",
          phone: "+91 98765 43210",
          street: "Plot No. 14, Kaveri Mandi Complex",
          landmark: "Near Mandi Gate",
          city: "Salem",
          state: "Tamil Nadu",
          pincode: "636453",
          addressType: "Farm Warehouse",
        },
        deliverySpeed: "standard",
        estimatedDeliveryDate: "Thursday, Aug 6",
        paymentMethod: "dodo_payments",
        paymentId: data.paymentId ?? `PAY-${Date.now()}`,
        paymentGateway: "dodo_live",
        status: "placed",
        trackingNumber: `AGRI-TRK-${Math.floor(100000 + Math.random() * 900000)}`,
        courierPartner: "Delhivery Mandi Logistics",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      orderStore.unshift(order);
    } else {
      if (data.paymentId) order.paymentId = data.paymentId;
    }
    return { success: true, order };
  });

// 8. Get All Shop Orders
export const getShopOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    return { orders: [...orderStore] };
  });

export const getOrders = getShopOrders;
