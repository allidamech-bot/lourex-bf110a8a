import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const jsonResponse = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    await Promise.all([
      supabase.from("profiles").delete().eq("id", user.id),
      supabase.from("user_roles").delete().eq("user_id", user.id),
      supabase.from("legal_consents").delete().eq("user_id", user.id),
      supabase.from("kyc_documents").delete().eq("user_id", user.id),
      supabase.from("organization_staff").delete().eq("owner_id", user.id),
      supabase.from("organization_staff").delete().eq("email", user.email || ""),
    ]);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return jsonResponse(req, { success: true });
  } catch (error) {
    console.error("delete-account error:", error instanceof Error ? error.name : "UnknownError");
    return jsonResponse(req, { error: "Unable to delete account" }, 500);
  }
});
