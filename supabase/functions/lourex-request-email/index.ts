import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOCAL_DEV_ORIGIN = "http://localhost:5173";
const DEFAULT_PRODUCTION_ORIGINS = ["https://www.lou-rex.com", "https://lou-rex.com"];

const getAllowedOrigins = () =>
  new Set(
    [LOCAL_DEV_ORIGIN, ...DEFAULT_PRODUCTION_ORIGINS, ...(Deno.env.get("ALLOWED_ORIGIN") || "").split(",")]
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins();
  const configuredOrigin = [...allowedOrigins][0] || LOCAL_DEV_ORIGIN;
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : configuredOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const notifyTo = Deno.env.get("LOUREX_REQUEST_NOTIFY_TO")?.trim() || "allidamech@gmail.com";
  const from = Deno.env.get("LOUREX_EMAIL_FROM")?.trim() || "Lourex <onboarding@resend.dev>";

  try {
    const payload = (await req.json()) as PurchaseRequestEmailPayload;
    const requestNumber = text(payload.requestNumber, "New request");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [notifyTo],
        subject: `طلب شراء جديد في Lourex - ${requestNumber}`,
        html: buildEmailHtml(payload),
        text: buildPlainText(payload),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Resend request failed", details: result }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unable to send request email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
