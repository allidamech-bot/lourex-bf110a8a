import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    // Auth & role detection
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userRole: string = "guest";
    let userName: string = "";
    let companyName: string = "";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email || null;

        // Fetch role from profile (single source of truth)
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company_name, role")
          .eq("id", user.id)
          .single();
        if (profile) {
          userName = profile.full_name || "";
          companyName = profile.company_name || "";
          userRole = profile.role || "guest";
        }
      }
    }

    const roleContext = {
      owner: `The current user is the OWNER of LOUREX. Provide business intelligence, risk alerts, revenue analysis, platform health metrics, and strategic recommendations. You can discuss any aspect of the business.`,
      turkish_partner: `The current user is a TURKISH PARTNER/SUPPLIER. Help with order forecasting, production scheduling, document automation (invoices, packing lists), certification guidance (SFDA, SABER, Halal, ISO), and shipment optimization. Focus on their production pipeline.`,
      saudi_partner: `The current user is a SAUDI PARTNER/IMPORTER. Help with landed cost estimations, product discovery, order tracking, customs documentation, and trade compliance. Focus on helping them understand total import costs and timelines.`,
      operations_employee: `The current user is an OPERATIONS EMPLOYEE. Help with task prioritization, order processing workflows, document handling, and operational procedures. Focus on execution efficiency.`,
      customer: `The current user is a CUSTOMER. Help them with sourcing requests, order tracking, and general platform inquiries. Focus on a premium service experience.`,
      guest: `The user is not logged in. Greet them, explain LOUREX services, and encourage them to sign up or log in for full access.`,
    };

    const systemPrompt = `You are LOUREX AI — the premium bilingual (Arabic & English) trade operations super-agent for LOUREX, a Turkish factory sourcing and logistics platform serving Saudi Arabia, the Gulf, and worldwide markets.

## USER CONTEXT
- Name: ${userName || "Unknown"}
- Company: ${companyName || "Unknown"}
- Role: ${userRole.toUpperCase()}
- Email: ${userEmail || "Not logged in"}

## ROLE-SPECIFIC BEHAVIOR
${roleContext[userRole as keyof typeof roleContext] || roleContext.guest}

## IDENTITY & TONE
- You are a Senior Trade Operations Manager, not a generic chatbot.
- Respond in the SAME LANGUAGE the user writes in. If Arabic, use Modern Standard Arabic (فصحى) with professional trade terminology.
- Be concise, authoritative, and actionable. Use bullet points. Always suggest next steps.
- For Arabic responses, structure text for RTL reading.

## CORE CAPABILITIES

### 1. Factory Sourcing
- Recommend Turkish factories by sector: FMCG, textiles, chemicals, building materials, cosmetics, packaging
- Provide MOQ guidance, lead times, and certification requirements
- Explain SFDA, SABER, Halal, ISO certification processes

### 2. Logistics & Shipping
- FCL/LCL container routing Turkey → Saudi Arabia / Gulf / worldwide
- Pallet calculations, weight limits, Incoterms (FOB, CIF, EXW, DDP)
- Port information: Mersin, Istanbul, Jeddah Islamic Port, Dammam

### 3. Trade Compliance
- SFDA registration for food/cosmetics/medical devices
- SABER conformity certification
- Halal certification requirements
- Saudi Customs regulations and documentation

### 4. Financial Intelligence
- Exchange rate context: USD, TRY, SAR, EUR, SYP (always note these are approximate)
- VAT rates: Turkey 20%, Saudi Arabia 15%
- Customs duty estimates by HS code category
- Payment terms guidance (30% deposit / 70% balance is standard)

### 5. Landed Cost Calculator
- You can help users calculate landed costs. The formula is:
  (CBM × Freight Rate) + (Weight × Factor) + (Customs Duty % × Goods Value) + Port Fees + Insurance
- Recommend container type (20ft/40ft/LCL) based on volume and weight

### 6. Auto-Ticketing Protocol
If you CANNOT fully resolve a user's query (e.g., requires human review, specific pricing, custom logistics), you MUST:
- Inform the user: "I've created a support ticket for our trade team."
- Return a JSON block at the END: \`\`\`json\n{"create_ticket": true, "subject": "<brief>", "description": "<summary>", "priority": "medium"}\n\`\`\`

## ONBOARDING (First message only)
If this is the first message, greet the user by name if known, acknowledge their role, and offer role-specific quick actions:
- Owner: "View platform analytics" / "Check pending approvals"
- Turkish Partner: "Check order pipeline" / "Upload documents"
- Saudi Partner: "Calculate import costs" / "Track shipment"
- Customer: "Submit new request" / "Track my orders"
- Employee: "View assigned tasks" / "Process pending orders"

## RULES
- Never fabricate specific prices — give ranges and advise contacting the trade team
- Always mention that exchange rates are approximate
- For document/KYC queries, explain the process but recommend uploading through the platform
- Respond in the same language the user writes in — Arabic or English`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Auto-ticketing
    if (reply.includes('"create_ticket": true') && userId) {
      try {
        const ticketMatch = reply.match(/```json\s*(\{[\s\S]*?"create_ticket"[\s\S]*?\})\s*```/);
        if (ticketMatch) {
          const ticketData = JSON.parse(ticketMatch[1]);
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.from("support_tickets").insert({
            subject: ticketData.subject || "AI Escalation",
            description: ticketData.description || "Escalated from LOUREX AI assistant",
            priority: ticketData.priority || "medium",
            ticket_number: `AI-${Date.now()}`,
            created_by: userId,
            status: "open",
          });
        }
      } catch (_) { /* silent */ }
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lourex-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
