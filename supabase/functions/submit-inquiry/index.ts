import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LOCAL_DEV_ORIGIN = "http://localhost:5173";

const getAllowedOrigins = () =>
  new Set(
    [LOCAL_DEV_ORIGIN, ...(Deno.env.get("ALLOWED_ORIGIN") || "").split(",")]
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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const InquirySchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional().default(""),
  company: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10).max(2000),
  inquiry_type: z.string().trim().regex(/^[a-z0-9_-]{1,50}$/i).optional().default("general"),
  factory_name: z.string().trim().max(200).optional().default(""),
});

// Simple in-memory rate limiter (per isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const parsed = InquirySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("inquiries").insert(parsed.data);

    if (error) {
      console.error("submit-inquiry insert error");
      return new Response(
        JSON.stringify({ error: "Failed to submit inquiry." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-inquiry unexpected error:", err instanceof Error ? err.name : "UnknownError");
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
