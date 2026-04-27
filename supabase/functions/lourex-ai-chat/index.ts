import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const roleContext: Record<string, string> = {
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
  dashboard_purchase_requests:
    "Internal purchase requests page. Summarize request information and draft customer or supplier communication.",
  dashboard_tracking: "Internal tracking page. Explain delay risks and draft customer-safe shipment updates.",
  dashboard_accounting:
    "Internal accounting page. Explain financial entries and draft statement notes, without changing locked accounting data.",
  dashboard_reports: "Reports page. Draft executive summaries and report highlights.",
  unknown: "Unknown page. Ask a focused clarifying question and provide general LOUREX operations guidance.",
};

const purchaseRequestAssistantModes: Record<string, string> = {
  purchase_request_summary:
    "Generate a short operational summary with product/category guess, customer need, current status, and recommended next action.",
  purchase_request_missing_info:
    "Identify missing or weak request details, clarification questions for the customer, and optional low/medium/high severity notes.",
  purchase_request_customer_reply:
    "Draft a professional customer-facing reply that asks for missing details without promising exact price, delivery date, approval, or completion.",
  purchase_request_supplier_brief:
    "Draft a structured supplier sourcing brief with product, specs, quantity, destination, packaging/certificate questions, and notes.",
  purchase_request_compliance_notes:
    "Draft advisory compliance notes only. Mention possible category-specific documents and final Lourex team review.",
};

const dashboardAssistantModes: Record<string, string> = {
  dashboard_daily_briefing:
    "Generate a concise internal daily operations briefing with executive summary, priorities, request review needs, conversion readiness, clarification follow-ups, shipment risks, financial review items, and suggested next actions.",
};

const normalizeMessages = (messages: unknown, message: unknown): ChatMessage[] => {
  if (Array.isArray(messages) && messages.length > 0) {
    return messages
      .filter((item): item is ChatMessage => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return (
          (record.role === "user" || record.role === "assistant" || record.role === "system") &&
          typeof record.content === "string"
        );
      })
      .map((item) => ({ role: item.role, content: item.content }));
  }

  return [{ role: "user", content: typeof message === "string" ? message : "" }];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestBody = await req.json();
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      message = "",
      messages,
      pageContext = "unknown",
      route = "unknown",
      locale = "en-US",
      userRole: clientUserRole,
      analysisMode,
      formDraft,
      requestContext,
      dashboardContext,
    } = requestBody;
    const safeMessages = Array.isArray(messages) ? messages : [];

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI provider is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    let userEmail: string | null = null;
    let userRole = typeof clientUserRole === "string" ? clientUserRole : "guest";
    let userName = "";
    let companyName = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        userEmail = user.email || null;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company_name, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          userName = profile.full_name || "";
          companyName = profile.company_name || "";
          userRole = profile.role || userRole || "guest";
        }
      }
    }

    const normalizedMessages = normalizeMessages(safeMessages, message);
    const normalizedContext = typeof pageContext === "string" ? pageContext : "unknown";
    const normalizedRoute = typeof route === "string" ? route : "unknown";
    const normalizedLocale = typeof locale === "string" ? locale : "en-US";
    const isPurchaseRequestAnalyzer = analysisMode === "purchase_request_analyzer";
    const normalizedAnalysisMode = typeof analysisMode === "string" ? analysisMode : "general_chat";
    const isPurchaseRequestAssistantMode = normalizedAnalysisMode in purchaseRequestAssistantModes;
    const isDashboardAssistantMode = normalizedAnalysisMode in dashboardAssistantModes;
    const analysisModeLabel = isPurchaseRequestAnalyzer
      ? "purchase_request_analyzer"
      : isPurchaseRequestAssistantMode
        ? normalizedAnalysisMode
        : isDashboardAssistantMode
          ? normalizedAnalysisMode
          : "general_chat";

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

    const dashboardAssistantPrompt = `You are LOUREX AI Daily Briefing assistant for the internal LOUREX dashboard home page.

Return concise markdown/plain text for the dashboard_daily_briefing mode.

Action mode:
- ${normalizedAnalysisMode}: ${dashboardAssistantModes[normalizedAnalysisMode] || "General dashboard briefing."}

Safe aggregated dashboard context:
${JSON.stringify(dashboardContext || {})}

Required sections:
- Executive summary
- Operational priorities
- Requests needing review
- Requests ready for conversion
- Requests awaiting clarification
- Shipment/tracking risks if available
- Financial review items if available
- Suggested next actions

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
            : isDashboardAssistantMode
              ? [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: dashboardAssistantPrompt },
                ]
              : [{ role: "system", content: systemPrompt }, ...normalizedMessages],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify(isPurchaseRequestAnalyzer ? { reply, analysis: reply } : { reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lourex-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
