/**
 * Resend Email Service — Agrisynapse Transactional Emails
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim() || "Agrisynapse <onboarding@resend.dev>";

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email to", opts.to);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    const data = await res.json() as any;
    if (res.ok) { console.log("[Email] Sent to", opts.to, "id:", data.id); return { success: true, id: data.id }; }
    return { success: false, error: data.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function base(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#161b22;border-radius:16px;border:1px solid #21262d;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:28px 32px;"><p style="margin:0;font-size:22px;font-weight:700;color:#fff;">🌾 Agrisynapse</p><p style="margin:4px 0 0;font-size:12px;color:#a7f3d0;">Agricultural Intelligence Platform · AJ STUDIOZ</p></td></tr><tr><td style="padding:32px;">${content}</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #21262d;"><p style="margin:0;font-size:11px;color:#6e7681;text-align:center;">© 2025 Agrisynapse · AJ STUDIOZ · Tamil Nadu, India</p></td></tr></table></td></tr></table></body></html>`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${text}</a>`;
}

export async function sendWelcomeEmail(opts: { to: string; name: string; role: string }) {
  const firstName = opts.name.split(" ")[0];
  const roleLabel = opts.role === "farmer" ? "Farmer" : opts.role === "admin" ? "Admin" : "Buyer";
  const roleDesc = opts.role === "farmer"
    ? "List produce, track IoT sensors, and get AI crop advice."
    : opts.role === "admin"
    ? "Platform dashboard, audit tools and escrow controls are ready."
    : "Browse farmer-direct produce, book agri services, and track orders.";
  return sendEmail({
    to: opts.to,
    subject: `🌾 Welcome to Agrisynapse, ${firstName}!`,
    html: base(`<h1 style="margin:0 0 8px;font-size:24px;color:#f0f6fc;font-weight:700;">Welcome aboard, ${firstName}! 👋</h1><p style="margin:0 0 16px;font-size:14px;color:#8b949e;line-height:1.6;">Your <strong style="color:#34d399;">${roleLabel}</strong> account is ready.</p><div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:18px 20px;margin:16px 0;"><p style="margin:0 0 6px;font-size:12px;color:#6e7681;text-transform:uppercase;letter-spacing:0.5px;">What you can do</p><p style="margin:0;font-size:14px;color:#c9d1d9;line-height:1.6;">${roleDesc}</p></div><div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:16px 20px;"><p style="margin:0 0 10px;font-size:12px;color:#6e7681;text-transform:uppercase;letter-spacing:0.5px;">Platform highlights</p><p style="margin:4px 0;font-size:13px;color:#c9d1d9;">🗺️ <strong>Satellite Field Maps</strong> — Google Earth + Gemini AI</p><p style="margin:4px 0;font-size:13px;color:#c9d1d9;">🦠 <strong>Disease Detection</strong> — Upload leaf photos for AI diagnosis</p><p style="margin:4px 0;font-size:13px;color:#c9d1d9;">📈 <strong>Live Marketplace</strong> — Razorpay Escrow protection</p></div>${btn("Go to Dashboard →", "https://agrisynapse.vercel.app/app")}`),
  });
}

export async function sendLoginEmail(opts: { to: string; name: string }) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return sendEmail({
    to: opts.to,
    subject: `✅ New sign-in to Agrisynapse`,
    html: base(`<h1 style="margin:0 0 8px;font-size:22px;color:#f0f6fc;font-weight:700;">New sign-in detected</h1><p style="margin:0 0 20px;font-size:14px;color:#8b949e;line-height:1.6;">Hi <strong style="color:#c9d1d9;">${opts.name}</strong>, a new sign-in was detected on your account.</p><div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:18px 20px;margin:0 0 20px;"><table width="100%" cellpadding="0" cellspacing="4"><tr><td style="font-size:12px;color:#6e7681;width:90px;">Account</td><td style="font-size:13px;color:#c9d1d9;">${opts.to}</td></tr><tr><td style="font-size:12px;color:#6e7681;">Time</td><td style="font-size:13px;color:#c9d1d9;">${time} IST</td></tr><tr><td style="font-size:12px;color:#6e7681;">Platform</td><td style="font-size:13px;color:#c9d1d9;">Agrisynapse Web</td></tr></table></div><p style="margin:0;font-size:13px;color:#8b949e;">Not you? Please change your password immediately.</p>${btn("Go to Dashboard →", "https://agrisynapse.vercel.app/app")}`),
  });
}

export async function sendOrderConfirmationEmail(opts: {
  to: string; buyerName: string; crop: string; farmer: string;
  quantity: string; totalAmount: number; paymentId: string; deliveryAddress: string;
}) {
  const amt = opts.totalAmount.toLocaleString("en-IN");
  return sendEmail({
    to: opts.to,
    subject: `📦 Order Confirmed — ${opts.crop} (Razorpay Escrow)`,
    html: base(`<h1 style="margin:0 0 8px;font-size:22px;color:#f0f6fc;font-weight:700;">Order Confirmed! 🎉</h1><p style="margin:0 0 20px;font-size:14px;color:#8b949e;line-height:1.6;">Hi <strong style="color:#c9d1d9;">${opts.buyerName}</strong>, your Razorpay Escrow payment has been received.</p><div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:18px 20px;margin:0 0 16px;"><p style="margin:0 0 10px;font-size:12px;color:#34d399;text-transform:uppercase;letter-spacing:0.5px;">Order Details</p><table width="100%" cellpadding="0" cellspacing="6"><tr><td style="font-size:12px;color:#6e7681;width:100px;">Produce</td><td style="font-size:13px;color:#c9d1d9;">${opts.crop}</td></tr><tr><td style="font-size:12px;color:#6e7681;">Farmer</td><td style="font-size:13px;color:#c9d1d9;">${opts.farmer}</td></tr><tr><td style="font-size:12px;color:#6e7681;">Quantity</td><td style="font-size:13px;color:#c9d1d9;">${opts.quantity}</td></tr><tr><td style="font-size:12px;color:#6e7681;">Amount</td><td style="font-size:13px;color:#c9d1d9;font-weight:600;">₹${amt}</td></tr><tr><td style="font-size:12px;color:#6e7681;">Payment ID</td><td style="font-size:12px;color:#6e7681;font-family:monospace;">${opts.paymentId}</td></tr><tr><td style="font-size:12px;color:#6e7681;">Delivery</td><td style="font-size:13px;color:#c9d1d9;">${opts.deliveryAddress}</td></tr></table></div><div style="background:#022c22;border:1px solid #064e3b;border-radius:10px;padding:14px 18px;"><p style="margin:0;font-size:13px;color:#34d399;line-height:1.6;">🔒 <strong>Escrow Protection Active</strong> — ₹${amt} is held safely and released to ${opts.farmer} only after delivery confirmation.</p></div>${btn("Track Order →", "https://agrisynapse.vercel.app/app/marketplace")}`),
  });
}
