import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOCAL_DEV_ORIGIN = "http://localhost:5173";
const DEFAULT_PRODUCTION_ORIGINS = ["https://www.lou-rex.com", "https://lou-rex.com"];
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4_000;

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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type LourexAiRole = "owner" | "turkish_partner" | "saudi_partner" | "operations_employee" | "customer" | "guest";

const ALL_AUTHENTICATED_ROLES: LourexAiRole[] = [
  "owner",
  "turkish_partner",
  "saudi_partner",
  "operations_employee",
  "customer",
];
const MANAGEMENT_AI_ROLES: LourexAiRole[] = ["owner", "operations_employee"];
const INTERNAL_AI_ROLES: LourexAiRole[] = ["owner", "operations_employee", "turkish_partner", "saudi_partner"];
const FINANCE_AI_ROLES: LourexAiRole[] = ["owner", "operations_employee"];
const PURCHASE_REQUEST_REVIEW_ROLES: LourexAiRole[] = ["owner", "operations_employee"];

const isKnownRole = (role: unknown): role is LourexAiRole =>
  typeof role === "string" &&
  ["owner", "turkish_partner", "saudi_partner", "operations_employee", "customer", "guest"].includes(role);

const normalizeAiRole = (role: unknown): LourexAiRole => (isKnownRole(role) ? role : "customer");

const roleContext: Record<LourexAiRole, string> = {
  owner:
    "The current user is the OWNER of LOUREX. Provide high-level operational summaries, risk indicators, report drafts, and review checklists. Do not claim to approve, reject, delete, lock, unlock, or update records.",
  turkish_partner:
    "The current user is a TURKISH PARTNER/SUPPLIER. Help with production explanations, shipment preparation, document guidance, and supplier-facing drafts. Do not make commitments or update operational records.",
  saudi_partner:
    "The current user is a SAUDI PARTNER/IMPORTER. Help explain landed-cost estimates, import steps, customs documentation, and destination-side logistics. Do not promise final prices or delivery dates.",
  operations_employee:
    "The current user is an OPERATIONS EMPLOYEE. Help with prioritization, summaries, clarification questions, customer-safe drafts, and workflow explanations. Do not perform stage updates, approvals, accounting edits, or data changes.",
  customer:
    "The current user is a CUSTOMER. Help them understand sourcing requests, request statuses, shipment stages, and next steps. Keep the tone premium and clear.",
  guest:
    "The user is not logged in. Explain LOUREX services and provide general guidance only. Do not expose internal-only details or imply access to private records.",
};

const pageContextGuide: Record<string, string> = {
  public_home: "General public LOUREX context. Explain process and help users choose a next step.",
  public_request: "Purchase request page. Help users improve sourcing request clarity and completeness.",
  public_tracking: "Public tracking page. Explain tracking stages, logistics terms, and possible delay causes.",
  customer_portal: "Customer portal. Summarize next steps and explain what the customer may need to provide.",
  customer_requests: "Customer request status page. Explain statuses and draft clarification messages.",
  customer_tracking: "Customer tracking page. Explain shipment stage meaning and draft update requests.",
  dashboard_home: "Internal dashboard overview. Draft operational priorities and risk review checklists.",
  dashboard_deals:
    "Internal deals command center. Summarize deal state, responsibility, shipment risk, finance risk, and safe next actions.",
  dashboard_purchase_requests:
    "Internal purchase requests page. Summarize request information and draft customer or supplier communication.",
  dashboard_tracking: "Internal tracking page. Explain delay risks and draft customer-safe shipment updates.",
  dashboard_accounting:
    "Internal accounting page. Explain financial entries and draft statement notes, without changing locked accounting data.",
  dashboard_reports: "Reports page. Draft executive summaries and report highlights.",
  unknown: "Unknown page. Ask a focused clarifying question and provide general LOUREX operations guidance.",
};

const purchaseRequestAssistantModes: Record<string, string> = {
  purchase_request_analysis:
    "Analyze readiness score, missing fields, customer questions, supplier brief needs, and risk notes for the selected purchase request.",
  purchase_request_summary:
    "Generate a short operational summary with product/category guess, customer need, current status, and recommended next action.",
  missing_information_checklist:
    "Identify missing or weak request details and produce a checklist of customer clarification questions.",
  purchase_request_missing_info:
    "Identify missing or weak request details, clarification questions for the customer, and optional low/medium/high severity notes.",
  customer_reply_draft:
    "Draft a professional customer-facing reply asking for missing details without promises or approvals.",
  purchase_request_customer_reply:
    "Draft a professional customer-facing reply that asks for missing details without promising exact price, delivery date, approval, or completion.",
  supplier_brief:
    "Draft a structured supplier sourcing brief with product, specs, quantity, destination, packaging/certificate questions, and notes.",
  purchase_request_supplier_brief:
    "Draft a structured supplier sourcing brief with product, specs, quantity, destination, packaging/certificate questions, and notes.",
  purchase_request_compliance_notes:
    "Draft advisory compliance notes only. Mention possible category-specific documents and final Lourex team review.",
  purchase_request_risk_review:
    "Review RFQ risks such as regulatory exposure, incomplete sourcing information, unclear shipping method, high sourcing complexity, import restrictions, and customer-safe next steps. Advisory only; do not approve or update records.",
};

const operationalAssistantModes: Record<string, string> = {
  dashboard_daily_briefing:
    "Generate a concise internal daily operations briefing with executive summary, priorities, request review needs, conversion readiness, clarification follow-ups, shipment risks, financial review items, and suggested next actions.",
  shipment_risk_review:
    "Review shipment risk indicators such as stale activity, missing customer-visible notes, delayed stages, and draft a customer-safe update message.",
  shipment_briefing:
    "Generate a concise internal shipment briefing covering current stage, health signal, stale-stage risk, document checklist needs, customer communication recommendation, and next best internal action.",
  shipment_customer_update_draft:
    "Draft a concise customer-safe shipment update based only on confirmed stage/context. Do not imply that the message was sent or that a stage was updated.",
  shipment_document_review:
    "Review shipment document checklist signals, missing or recommended documents, customs exposure, and operational follow-up needs. Advisory only.",
  finance_audit_review:
    "Review financial entries for suspicious or incomplete records, missing deal/customer references, weak notes, and locked-entry review risks.",
  customer_balance_review:
    "Summarize customer balance situations, missing references, multi-currency caveats, pending corrections, and customer-safe statement notes.",
  settlement_review:
    "Review partner settlement visibility, pending or disputed settlement risks, unpaid approved settlements, and internal follow-up needs.",
  accounting_risk_briefing:
    "Generate an internal accounting risk briefing covering immutable-entry status, audit traceability gaps, duplicate-like risks, large balances, and review-only next actions.",
  deal_briefing:
    "Generate a concise internal deal briefing covering current deal state, responsibility, shipment state, finance signal, customer communication recommendation, and next internal action.",
  deal_risk_review:
    "Review operational deal risks such as missing shipment, stale tracking, missing partner assignment, finance gaps, customer waiting signals, and blocked progress. Advisory only.",
};

const operationalModeRoles: Record<string, LourexAiRole[]> = {
  dashboard_daily_briefing: MANAGEMENT_AI_ROLES,
  shipment_risk_review: INTERNAL_AI_ROLES,
  shipment_briefing: INTERNAL_AI_ROLES,
  shipment_customer_update_draft: INTERNAL_AI_ROLES,
  shipment_document_review: INTERNAL_AI_ROLES,
  finance_audit_review: FINANCE_AI_ROLES,
  customer_balance_review: FINANCE_AI_ROLES,
  settlement_review: FINANCE_AI_ROLES,
  accounting_risk_briefing: FINANCE_AI_ROLES,
  deal_briefing: INTERNAL_AI_ROLES,
  deal_risk_review: INTERNAL_AI_ROLES,
};

const isAiModeAllowedForRole = (mode: string, role: LourexAiRole) => {
  if (mode === "general_chat") return ALL_AUTHENTICATED_ROLES.includes(role);
  if (mode === "purchase_request_analyzer") return ALL_AUTHENTICATED_ROLES.includes(role);
  if (mode in purchaseRequestAssistantModes) return PURCHASE_REQUEST_REVIEW_ROLES.includes(role);
  if (mode in operationalAssistantModes) return (operationalModeRoles[mode] || MANAGEMENT_AI_ROLES).includes(role);
  return false;
};

const jsonResponse = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

const normalizeMessages = (messages: unknown, message: unknown): ChatMessage[] => {
  if (Array.isArray(messages) && messages.length > 0) {
    return messages
      .slice(-MAX_MESSAGES)
      .filter((item): item is ChatMessage => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return (record.role === "user" || record.role === "assistant") && typeof record.content === "string";
      })
      .map((item) => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }))
      .filter((item) => item.content.trim().length > 0);
  }

  const content = typeof message === "string" ? message.slice(0, MAX_MESSAGE_LENGTH) : "";
  return content.trim() ? [{ role: "user", content }] : [];
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const requestBody = await req.json();
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return jsonResponse(req, { error: "Invalid request body" }, 400);
    }

    const {
      message = "",
      messages,
      pageContext = "unknown",
      route = "unknown",
      locale = "en-US",
      analysisMode,
      formDraft,
      requestContext,
      dashboardContext,
      shipmentContext,
      financeContext,
    } = requestBody;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse(req, { error: "AI provider is not configured" }, 503);
    }

    let userEmail: string | null = null;
    let userRole: LourexAiRole = "customer";
    let userName = "";
    let companyName = "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse(req, { error: "Authentication service is not configured" }, 503);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    userEmail = user.email || null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      userName = profile.full_name || "";
      companyName = profile.company_name || "";
      userRole = normalizeAiRole(profile.role);
    }

    const normalizedMessages = normalizeMessages(messages, message);
    if (!normalizedMessages.length && typeof analysisMode !== "string") {
      return jsonResponse(req, { error: "A non-empty message is required" }, 400);
    }

    const normalizedContext = typeof pageContext === "string" ? pageContext : "unknown";
    const normalizedRoute = typeof route === "string" ? route : "unknown";
    const normalizedLocale = typeof locale === "string" ? locale : "en-US";
    const isPurchaseRequestAnalyzer = analysisMode === "purchase_request_analyzer";
    const normalizedAnalysisMode = typeof analysisMode === "string" ? analysisMode : "general_chat";
    const isPurchaseRequestAssistantMode = normalizedAnalysisMode in purchaseRequestAssistantModes;
    const isOperationalAssistantMode = normalizedAnalysisMode in operationalAssistantModes;
    const analysisModeLabel = isPurchaseRequestAnalyzer
      ? "purchase_request_analyzer"
      : isPurchaseRequestAssistantMode
        ? normalizedAnalysisMode
        : isOperationalAssistantMode
          ? normalizedAnalysisMode
          : "general_chat";

    if (!isAiModeAllowedForRole(analysisModeLabel, userRole)) {
      console.warn("lourex-ai-chat forbidden mode", {
        role: userRole,
        analysisMode: analysisModeLabel,
        route: normalizedRoute,
      });
      return jsonResponse(req, { error: "AI mode is not allowed for this role" }, 403);
    }

    const systemPrompt = `You are LOUREX AI Copilot, a premium bilingual Arabic/English trade operations assistant for LOUREX.

You are not a generic chatbot. You support sourcing, tracking, operations, accounting explanations, and reports for a Turkish factory sourcing and logistics platform serving Saudi Arabia, the Gulf, and worldwide markets.

USER CONTEXT
- Name: ${userName || "Unknown"}
- Company: ${companyName || "Unknown"}
- Role: ${userRole.toUpperCase()}
- Email: ${userEmail || "Not logged in"}
- Locale: ${normalizedLocale}
- Current route: ${normalizedRoute}
- Page context: ${normalizedContext}
- Analysis mode: ${analysisModeLabel}
- Context guidance: ${pageContextGuide[normalizedContext] || pageContextGuide.unknown}

ROLE-SPECIFIC BEHAVIOR
${roleContext[userRole] || roleContext.guest}

PHASE 1 SCOPE
- Provide suggestions, summaries, drafts, explanations, checklists, and customer-safe wording only.
- Use the current page context to make the answer relevant.
- If the user asks you to change, delete, approve, reject, unlock, lock, submit, advance, or directly update operational data, refuse briefly and suggest the correct manual review path.
- Do not create database records, support tickets, purchase requests, shipments, accounting entries, or stage updates.
- Do not output action JSON, tool-call directives, SQL, or instructions that imply you performed a system action.
- Do not promise exact prices, exact availability, exact customs outcomes, or exact delivery dates.
- Label cost, logistics, FX, customs, and timing outputs as estimates requiring human review.
- Respect role and context. Do not reveal internal-only details to guests or customers.

CAPABILITIES
- Factory sourcing: request clarity, product specifications, MOQ guidance, certification questions, and supplier brief drafts.
- Tracking and logistics: explain stages, delay risks, Incoterms, port flow, and customer-safe updates.
- Compliance: explain SFDA, SABER, Halal, ISO, Saudi customs documents, and review notes.
- Accounting explanations: explain financial entries, balances, statement notes, locked-entry concepts, and review needs without editing data.
- Reports: draft executive summaries, customer activity summaries, operational performance notes, and highlights.
- Landed-cost guidance: explain estimate structure only. Use: (CBM x freight rate) + (weight x factor) + customs duty + port fees + insurance.

STYLE
- Respond in the same language the user writes in: Arabic or English.
- If Arabic, use Modern Standard Arabic with professional trade terminology.
- Be concise, structured, and actionable.
- Make clear when text is a draft, estimate, or recommendation.
- Suggest human LOUREX team review for operational decisions.`;

    const analyzerPrompt = `You are LOUREX AI Request Analyzer.

Analyze the current purchase request draft before submission. Return ONLY compact valid JSON with this exact shape:
{
  "readiness_score": number,
  "product_category": string,
  "missing_fields": string[],
  "compliance_flags": string[],
  "suggested_questions": string[],
  "summary_ar": string,
  "summary_en": string
}

Scoring guidance:
- 90-100: Excellent / جاهز جدا
- 70-89: Good / جيد
- 40-69: Needs details / يحتاج تفاصيل
- 0-39: Too vague / غير كاف

Analyze these quality factors:
- product name/title
- product description
- quantity
- destination country/city
- budget/target price if present
- product link if present
- uploaded images count
- packaging requirements if present
- specifications such as material, size, color, model, brand, grade
- intended market/use if present

Compliance flags are advisory only:
- Food may require SFDA/Halal/import documentation.
- Cosmetics may require ingredient list, label artwork, SFDA-related review.
- Chemicals may require MSDS/TDS and safety classification.
- Electronics may require conformity/electrical specs.
- Textiles may require material composition, sizes, colors, labels.
- Packaging may require dimensions, material, thickness, print specs.

Safety:
- Do not promise exact sourcing success, exact prices, or exact delivery dates.
- Mark compliance as advisory.
- Mention in summaries that Lourex team performs final review.

Purchase request draft:
${JSON.stringify(formDraft || {})}`;

    const purchaseRequestAssistantPrompt = `You are LOUREX AI Review Assistant for an internal dashboard purchase request detail page.

Return concise markdown/plain text for the selected action only.

Action mode:
- ${normalizedAnalysisMode}: ${purchaseRequestAssistantModes[normalizedAnalysisMode] || "General advisory review."}

Safe selected request context:
${JSON.stringify(requestContext || {})}

Rules:
- Output is advisory only and must require final human review by the Lourex team.
- Do not claim that a database record, status, note, deal, message, email, financial entry, or shipment stage was created, changed, approved, rejected, sent, or updated.
- Do not promise exact prices, exact availability, exact delivery dates, exact customs outcomes, or regulatory approval.
- For customer replies, use a professional draft tone and never say the request is approved unless the provided status explicitly says so.
- For compliance notes, mention possible documentation review, not legal certainty.
- Use the user's locale/language when clear: ${normalizedLocale}. If Arabic is appropriate, use clear Modern Standard Arabic.
- Keep the output compact and operational.`;

    const operationalAssistantPrompt = `You are LOUREX AI Brain v1, a read-only operational review assistant for internal LOUREX workflows.

Return concise markdown/plain text for the selected mode only.

Action mode:
- ${normalizedAnalysisMode}: ${operationalAssistantModes[normalizedAnalysisMode] || "General operational review."}

Safe context:
${JSON.stringify({
  dashboardContext: dashboardContext || null,
  shipmentContext: shipmentContext || null,
  financeContext: financeContext || null,
})}

Required behavior by mode:
- dashboard_daily_briefing: include executive summary, operational priorities, request review needs, shipment/tracking risks, financial review items, and suggested next actions.
- shipment_risk_review: include current shipment summary, stale/delay risks, missing customer-visible note concerns, internal follow-up checklist, and one customer-safe update draft.
- shipment_briefing: include current stage, health state, stale-stage signal, document checklist concerns, customer-safe communication recommendation, and next internal action.
- shipment_customer_update_draft: produce only a review-ready customer-safe draft plus a short internal note about what must be verified before sending.
- shipment_document_review: include required/recommended document gaps, customs-sensitive items, and review-only follow-up checklist.
- finance_audit_review: include incomplete entries, suspicious values or descriptions, missing deal/customer references, locked-entry correction concerns, and review-only recommendations.
- customer_balance_review: include balance summary, statement caveats, missing deal/customer references, multi-currency warnings, and customer-safe explanation notes.
- settlement_review: include partner settlement state, pending or disputed settlement risks, unpaid approved settlements, and internal follow-up needs.
- accounting_risk_briefing: include immutable accounting status, audit traceability gaps, duplicate-like risks, large or negative balances, and next internal review actions.
- deal_briefing: include deal state, responsibility, shipment/tracking state, finance signal, customer-safe communication recommendation, and next internal action.
- deal_risk_review: include operational risk flags, missing data, shipment risk, finance risk, blocked progress, and review-only recommendations.

Rules:
- Output is advisory only and final decisions remain with the Lourex team.
- Do not claim that a database record, ticket, request, status, deal, message, email, financial entry, lock, or shipment stage was created, changed, approved, rejected, sent, or updated.
- Do not promise exact prices, exact availability, delivery dates, customs outcomes, or operational outcomes.
- Use only the aggregated/safe context provided. Do not infer or expose private data beyond the context.
- Use the user's locale/language when clear: ${normalizedLocale}. If Arabic is appropriate, use clear Modern Standard Arabic.
- Keep the output compact and focused on today's operational priorities.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: isPurchaseRequestAnalyzer
          ? [
              { role: "system", content: systemPrompt },
              { role: "user", content: analyzerPrompt },
            ]
          : isPurchaseRequestAssistantMode
            ? [
                { role: "system", content: systemPrompt },
                { role: "user", content: purchaseRequestAssistantPrompt },
              ]
            : isOperationalAssistantMode
              ? [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: operationalAssistantPrompt },
                ]
              : [{ role: "system", content: systemPrompt }, ...normalizedMessages],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(req, { error: "Rate limited. Please try again shortly." }, 429);
      }

      if (response.status === 402) {
        return jsonResponse(req, { error: "AI credits exhausted." }, 402);
      }

      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return jsonResponse(req, isPurchaseRequestAnalyzer ? { reply, analysis: reply } : { reply });
  } catch (e) {
    console.error("lourex-ai-chat error:", e instanceof Error ? e.name : "UnknownError");
    return jsonResponse(req, { error: "Unable to process AI request" }, 500);
  }
});
