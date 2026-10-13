import { createClient } from "@supabase/supabase-js";

type VercelLikeRequest = {
  method?: string;
  headers: {
    origin?: string;
    authorization?: string;
  };
  body?: unknown;
};

type VercelLikeResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(payload: unknown): void;
    end(): void;
  };
};

type PurchaseRequestEmailPayload = {
  requestId?: string;
  requestNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCountry?: string;
  customerCity?: string;
  productName?: string;
  productDescription?: string;
  quantity?: number;
  destination?: string;
  preferredShippingMethod?: string;
  technicalSpecs?: string;
  deliveryNotes?: string;
  attachmentCount?: number;
  dashboardUrl?: string;
};

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://www.lou-rex.com",
  "https://lou-rex.com",
  ...(process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

const setCorsHeaders = (req: VercelLikeRequest, res: VercelLikeResponse) => {
  const origin = req.headers.origin;
  const fallbackOrigin = [...allowedOrigins][0] || "https://lou-rex.com";
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : fallbackOrigin;

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
};

const text = (value: unknown, fallback = "-") => {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const escapeHtml = (value: unknown) =>
  text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const row = (label: string, value: unknown) => `
  <tr>
    <td style="padding:10px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;width:190px;vertical-align:top;">${label}</td>
    <td style="padding:10px 12px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;vertical-align:top;white-space:pre-wrap;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>
`;

const buildEmailHtml = (payload: PurchaseRequestEmailPayload) => {
  const requestNumber = escapeHtml(payload.requestNumber || "New request");
  const dashboardUrl = text(payload.dashboardUrl, "");

  return `
<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,Tahoma,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px rgba(15,23,42,0.08);">
      <div style="background:#0f172a;padding:24px;color:#ffffff;">
        <div style="font-size:13px;color:#93c5fd;font-weight:700;letter-spacing:.04em;">LOUREX</div>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.4;">طلب شراء جديد وصل من العميل</h1>
        <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">رقم الطلب: <strong>${requestNumber}</strong></p>
      </div>

      <div style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;direction:rtl;text-align:right;">
          ${row("رقم الطلب", payload.requestNumber)}
          ${row("اسم العميل", payload.customerName)}
          ${row("إيميل العميل", payload.customerEmail)}
          ${row("هاتف العميل", payload.customerPhone)}
          ${row("الدولة / المدينة", `${text(payload.customerCountry)} / ${text(payload.customerCity)}`)}
          ${row("المنتج", payload.productName)}
          ${row("الوصف", payload.productDescription)}
          ${row("الكمية", payload.quantity)}
          ${row("الوجهة", payload.destination)}
          ${row("الشحن المفضل", payload.preferredShippingMethod)}
          ${row("المواصفات الفنية", payload.technicalSpecs)}
          ${row("ملاحظات التسليم", payload.deliveryNotes)}
          ${row("عدد المرفقات", payload.attachmentCount ?? 0)}
        </table>

        ${dashboardUrl ? `<div style="margin-top:22px;text-align:center;"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;font-size:14px;">فتح الطلب داخل Lourex</a></div>` : ""}

        <p style="margin:22px 0 0;color:#64748b;font-size:12px;line-height:1.8;text-align:center;">
          هذه رسالة تلقائية من نظام Lourex عند إرسال طلب شراء جديد.
        </p>
      </div>
    </div>
  </body>
</html>`;
};

const buildPlainText = (payload: PurchaseRequestEmailPayload) => [
  "طلب شراء جديد في Lourex",
  `رقم الطلب: ${text(payload.requestNumber)}`,
  `العميل: ${text(payload.customerName)}`,
  `إيميل العميل: ${text(payload.customerEmail)}`,
  `الهاتف: ${text(payload.customerPhone)}`,
  `الدولة/المدينة: ${text(payload.customerCountry)} / ${text(payload.customerCity)}`,
  `المنتج: ${text(payload.productName)}`,
  `الوصف: ${text(payload.productDescription)}`,
  `الكمية: ${text(payload.quantity)}`,
  `الوجهة: ${text(payload.destination)}`,
  `الشحن المفضل: ${text(payload.preferredShippingMethod)}`,
  `المواصفات: ${text(payload.technicalSpecs)}`,
  `المرفقات: ${text(payload.attachmentCount ?? 0)}`,
  payload.dashboardUrl ? `رابط الطلب: ${payload.dashboardUrl}` : "",
].filter(Boolean).join("\n");

const EXPECTED_PROJECT_HOST = "gxmqchznfolerliorpkz.supabase.co";
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTIFICATION_WINDOW_MS = 60 * 60 * 1000;

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Do not trust client-supplied request details or any unsigned email payload.
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec((req.headers.authorization || "").trim());
  if (!match) return res.status(401).json({ error: "Authentication required" });

  let requestId: unknown;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    requestId = body && typeof body === "object" ? (body as { requestId?: unknown }).requestId : undefined;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    return res.status(400).json({ error: "A valid requestId is required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    return res.status(503).json({ error: "Supabase is not configured" });
  }
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.hostname !== EXPECTED_PROJECT_HOST) {
      return res.status(503).json({ error: "Unexpected Supabase project" });
    }
  } catch {
    return res.status(503).json({ error: "Invalid Supabase configuration" });
  }

  const accessToken = match[1];
  const db = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  try {
    // Server-validated user identity and caller-scoped RLS; never use service_role here.
    const { data: authData, error: authError } = await db.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const { data: saved, error: lookupError } = await db
      .from("purchase_requests")
      .select("id, request_number, created_at, status, full_name, email, phone, country, city, product_name, product_description, quantity, destination, preferred_shipping_method, technical_specs, delivery_notes, image_urls")
      .eq("id", requestId)
      .maybeSingle();
    if (lookupError) return res.status(503).json({ error: "Cannot verify request" });
    if (!saved) return res.status(404).json({ error: "Request not found or inaccessible" });

    // Only send the initial notification near creation, never for historical records.
    const createdAt = Date.parse(saved.created_at);
    const age = Date.now() - createdAt;
    if (saved.status !== "intake_submitted" || !Number.isFinite(age) || age < -60_000 || age > NOTIFICATION_WINDOW_MS) {
      return res.status(409).json({ error: "Request is outside the notification window" });
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) return res.status(503).json({ error: "Email provider is not configured" });

    const payload: PurchaseRequestEmailPayload = {
      requestId: saved.id,
      requestNumber: saved.request_number,
      customerName: saved.full_name,
      customerEmail: saved.email,
      customerPhone: saved.phone,
      customerCountry: saved.country,
      customerCity: saved.city,
      productName: saved.product_name,
      productDescription: saved.product_description,
      quantity: saved.quantity,
      destination: saved.destination,
      preferredShippingMethod: saved.preferred_shipping_method,
      technicalSpecs: saved.technical_specs,
      deliveryNotes: saved.delivery_notes,
      attachmentCount: Array.isArray(saved.image_urls) ? saved.image_urls.length : 0,
      dashboardUrl: `https://www.lou-rex.com/dashboard/requests?request=${encodeURIComponent(saved.id)}`,
    };
    const notifyTo = process.env.LOUREX_REQUEST_NOTIFY_TO?.trim() || "alidamish@lou-rex.com";
    const from = process.env.LOUREX_EMAIL_FROM?.trim() || "Lourex <onboarding@resend.dev>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lourex-request-created/${saved.id}`,
      },
      body: JSON.stringify({
        from,
        to: [notifyTo],
        subject: `طلب شراء جديد في Lourex - ${text(saved.request_number, "New request")}`,
        html: buildEmailHtml(payload),
        text: buildPlainText(payload),
      }),
    });

    if (!response.ok) return res.status(502).json({ error: "Email delivery failed" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: "Request notification unavailable" });
  }
}
