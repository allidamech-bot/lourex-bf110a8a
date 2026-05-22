type VercelLikeRequest = {
  method?: string;
  headers: {
    origin?: string;
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

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
  }

  const payload = (typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}) as PurchaseRequestEmailPayload;
  const notifyTo = process.env.LOUREX_REQUEST_NOTIFY_TO?.trim() || "alidamish@lou-rex.com";
  const from = process.env.LOUREX_EMAIL_FROM?.trim() || "Lourex <onboarding@resend.dev>";
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
    return res.status(response.status).json({ error: "Resend request failed", details: result });
  }

  return res.status(200).json({ ok: true, result });
}
