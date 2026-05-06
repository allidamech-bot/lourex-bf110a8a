import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const LOCAL_DEV_ORIGIN = "http://localhost:5173";
const MAX_DIMENSION_CM = 2_000;
const MAX_UNITS = 1_000_000;
const MAX_WEIGHT_KG = 100_000;
const MAX_UNIT_PRICE_USD = 10_000_000;

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

// Container specs
const CONTAINERS = {
  "20ft": { maxCBM: 33, maxWeight: 21770, teuCost: 1 },
  "40ft": { maxCBM: 67, maxWeight: 26500, teuCost: 1.8 },
  "40hc": { maxCBM: 76, maxWeight: 26500, teuCost: 1.9 },
};

const HS_CATEGORIES = new Set([
  "food",
  "cosmetics",
  "chemicals",
  "textiles",
  "building",
  "packaging",
  "electronics",
  "default",
]);

const DESTINATION_PORTS = new Set(["jeddah", "dammam", "riyadh_dry", "istanbul", "mersin", "default"]);

const jsonResponse = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

const parseFiniteNumber = (
  value: unknown,
  fallback: number,
  options: { min: number; max: number; integer?: boolean },
) => {
  const numericValue = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(numericValue)) return null;
  if (numericValue < options.min || numericValue > options.max) return null;
  if (options.integer && !Number.isInteger(numericValue)) return null;
  return numericValue;
};

const parseSettingNumber = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(req, { error: "Invalid request body" }, 400);
    }

    const {
      length_cm = 0,
      width_cm = 0,
      height_cm = 0,
      total_units = 1,
      weight_per_unit_kg = 0,
      unit_price_usd = 0,
      hs_category = "default",
      destination_port = "default",
      insurance_rate = 0.003,
    } = body;

    const parsedLength = parseFiniteNumber(length_cm, 0, { min: 0, max: MAX_DIMENSION_CM });
    const parsedWidth = parseFiniteNumber(width_cm, 0, { min: 0, max: MAX_DIMENSION_CM });
    const parsedHeight = parseFiniteNumber(height_cm, 0, { min: 0, max: MAX_DIMENSION_CM });
    const parsedUnits = parseFiniteNumber(total_units, 1, { min: 1, max: MAX_UNITS, integer: true });
    const parsedWeight = parseFiniteNumber(weight_per_unit_kg, 0, { min: 0, max: MAX_WEIGHT_KG });
    const parsedUnitPrice = parseFiniteNumber(unit_price_usd, 0, { min: 0, max: MAX_UNIT_PRICE_USD });
    const parsedInsuranceRate = parseFiniteNumber(insurance_rate, 0.003, { min: 0, max: 0.2 });
    const normalizedCategory = typeof hs_category === "string" ? hs_category.trim().toLowerCase() : "default";
    const normalizedPort = typeof destination_port === "string" ? destination_port.trim().toLowerCase() : "default";

    if (
      parsedLength === null ||
      parsedWidth === null ||
      parsedHeight === null ||
      parsedUnits === null ||
      parsedWeight === null ||
      parsedUnitPrice === null ||
      parsedInsuranceRate === null ||
      !HS_CATEGORIES.has(normalizedCategory) ||
      !DESTINATION_PORTS.has(normalizedPort)
    ) {
      return jsonResponse(req, { error: "Invalid landed cost input" }, 400);
    }

    // Fetch dynamic config from site_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse(req, { error: "Landed cost service is not configured" }, 503);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabase.from("site_settings").select("key, value");
    if (settingsError) {
      console.error("landed-cost settings error");
      return jsonResponse(req, { error: "Unable to calculate landed cost" }, 500);
    }

    const cfg: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { cfg[s.key] = s.value; });

    // Dynamic port fees
    const PORT_FEES: Record<string, number> = {
      jeddah: parseSettingNumber(cfg["port_fee_jeddah"], 450, 0, 100_000),
      dammam: parseSettingNumber(cfg["port_fee_dammam"], 480, 0, 100_000),
      riyadh_dry: parseSettingNumber(cfg["port_fee_riyadh_dry"], 650, 0, 100_000),
      istanbul: parseSettingNumber(cfg["port_fee_istanbul"], 350, 0, 100_000),
      mersin: parseSettingNumber(cfg["port_fee_mersin"], 320, 0, 100_000),
      default: 400,
    };

    // Dynamic customs duty
    const CUSTOMS_DUTY: Record<string, number> = {
      food: parseSettingNumber(cfg["customs_duty_food"], 0.05, 0, 1),
      cosmetics: parseSettingNumber(cfg["customs_duty_cosmetics"], 0.065, 0, 1),
      chemicals: parseSettingNumber(cfg["customs_duty_chemicals"], 0.055, 0, 1),
      textiles: parseSettingNumber(cfg["customs_duty_textiles"], 0.12, 0, 1),
      building: parseSettingNumber(cfg["customs_duty_building"], 0.05, 0, 1),
      packaging: parseSettingNumber(cfg["customs_duty_packaging"], 0.05, 0, 1),
      electronics: parseSettingNumber(cfg["customs_duty_electronics"], 0.05, 0, 1),
      default: 0.05,
    };

    const freight_rate_per_cbm = parseSettingNumber(cfg["freight_rate_cbm"], 45, 0, 100_000);
    const freight_rate_per_teu = parseSettingNumber(cfg["freight_rate_teu"], 1800, 0, 1_000_000);
    const vat_rate = parseSettingNumber(cfg["vat_ksa"], 0.15, 0, 1);

    // Calculate CBM
    const cbm_per_unit = (parsedLength * parsedWidth * parsedHeight) / 1_000_000;
    const total_cbm = cbm_per_unit * parsedUnits;
    const total_weight_kg = parsedWeight * parsedUnits;
    const goods_value = parsedUnitPrice * parsedUnits;

    // Customs duty
    const duty_rate = CUSTOMS_DUTY[normalizedCategory] ?? CUSTOMS_DUTY["default"];
    const customs_duty = goods_value * duty_rate;

    // Port fees
    const port_fees = PORT_FEES[normalizedPort] ?? PORT_FEES["default"];

    // Insurance
    const insurance = goods_value * parsedInsuranceRate;

    // Container recommendation
    let recommended_container = "LCL";
    let freight_cost = total_cbm * freight_rate_per_cbm;
    let containers_needed = 0;

    for (const [type, specs] of Object.entries(CONTAINERS)) {
      const needed = Math.ceil(Math.max(total_cbm / specs.maxCBM, total_weight_kg / specs.maxWeight));
      const fcl_cost = needed * specs.teuCost * freight_rate_per_teu;

      if (fcl_cost < freight_cost) {
        recommended_container = type;
        freight_cost = fcl_cost;
        containers_needed = needed;
      }
    }

    // Total landed cost
    const total_landed_cost = goods_value + freight_cost + customs_duty + port_fees + insurance;

    // VAT
    const vat = total_landed_cost * vat_rate;
    const grand_total = total_landed_cost + vat;

    const result = {
      breakdown: {
        goods_value: Math.round(goods_value * 100) / 100,
        freight_cost: Math.round(freight_cost * 100) / 100,
        customs_duty: Math.round(customs_duty * 100) / 100,
        customs_duty_rate: `${(duty_rate * 100).toFixed(1)}%`,
        port_fees,
        insurance: Math.round(insurance * 100) / 100,
        subtotal: Math.round(total_landed_cost * 100) / 100,
        vat_pct: `${(vat_rate * 100).toFixed(0)}%`,
        vat_amount: Math.round(vat * 100) / 100,
        grand_total: Math.round(grand_total * 100) / 100,
      },
      logistics: {
        total_cbm: Math.round(total_cbm * 1000) / 1000,
        total_weight_kg: Math.round(total_weight_kg * 100) / 100,
        recommended_container,
        containers_needed: containers_needed || "N/A (LCL)",
      },
      cost_per_unit: Math.round((grand_total / parsedUnits) * 100) / 100,
      currency: "USD",
    };

    return jsonResponse(req, result);
  } catch (e) {
    console.error("landed-cost error:", e instanceof Error ? e.name : "UnknownError");
    return jsonResponse(req, { error: "Invalid landed cost input" }, 400);
  }
});
