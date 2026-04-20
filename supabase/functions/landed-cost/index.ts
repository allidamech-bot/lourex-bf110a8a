import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Container specs
const CONTAINERS = {
  "20ft": { maxCBM: 33, maxWeight: 21770, teuCost: 1 },
  "40ft": { maxCBM: 67, maxWeight: 26500, teuCost: 1.8 },
  "40hc": { maxCBM: 76, maxWeight: 26500, teuCost: 1.9 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

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

    // Fetch dynamic config from site_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase.from("site_settings").select("key, value");
    const cfg: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => { cfg[s.key] = s.value; });

    // Dynamic port fees
    const PORT_FEES: Record<string, number> = {
      jeddah: parseFloat(cfg["port_fee_jeddah"] || "450"),
      dammam: parseFloat(cfg["port_fee_dammam"] || "480"),
      riyadh_dry: parseFloat(cfg["port_fee_riyadh_dry"] || "650"),
      istanbul: parseFloat(cfg["port_fee_istanbul"] || "350"),
      mersin: parseFloat(cfg["port_fee_mersin"] || "320"),
      default: 400,
    };

    // Dynamic customs duty
    const CUSTOMS_DUTY: Record<string, number> = {
      food: parseFloat(cfg["customs_duty_food"] || "0.05"),
      cosmetics: parseFloat(cfg["customs_duty_cosmetics"] || "0.065"),
      chemicals: parseFloat(cfg["customs_duty_chemicals"] || "0.055"),
      textiles: parseFloat(cfg["customs_duty_textiles"] || "0.12"),
      building: parseFloat(cfg["customs_duty_building"] || "0.05"),
      packaging: parseFloat(cfg["customs_duty_packaging"] || "0.05"),
      electronics: parseFloat(cfg["customs_duty_electronics"] || "0.05"),
      default: 0.05,
    };

    const freight_rate_per_cbm = parseFloat(cfg["freight_rate_cbm"] || "45");
    const freight_rate_per_teu = parseFloat(cfg["freight_rate_teu"] || "1800");
    const vat_rate = parseFloat(cfg["vat_ksa"] || "0.15");

    // FX rates for reference
    const fx_rates = {
      USD_SAR: parseFloat(cfg["fx_usd_sar"] || "3.75"),
      USD_TRY: parseFloat(cfg["fx_usd_try"] || "34.50"),
      USD_EUR: parseFloat(cfg["fx_usd_eur"] || "0.92"),
      USD_SYP: parseFloat(cfg["fx_usd_syp"] || "13000"),
    };

    // Calculate CBM
    const cbm_per_unit = (length_cm * width_cm * height_cm) / 1_000_000;
    const total_cbm = cbm_per_unit * total_units;
    const total_weight_kg = weight_per_unit_kg * total_units;
    const goods_value = unit_price_usd * total_units;

    // Customs duty
    const duty_rate = CUSTOMS_DUTY[hs_category] ?? CUSTOMS_DUTY["default"];
    const customs_duty = goods_value * duty_rate;

    // Port fees
    const port_fees = PORT_FEES[destination_port] ?? PORT_FEES["default"];

    // Insurance
    const insurance = goods_value * insurance_rate;

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
      fx_rates,
      cost_per_unit: Math.round((grand_total / total_units) * 100) / 100,
      currency: "USD",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Invalid input" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
