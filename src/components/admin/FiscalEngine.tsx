import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DollarSign, RefreshCw, Save, Percent, Calculator } from "lucide-react";

const CURRENCIES = ["USD", "SAR", "TRY", "EUR", "SYP"] as const;

interface FXRate {
  key: string;
  value: string;
}

export const FiscalEngine = () => {
  const { t } = useI18n();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [taxFields, setTaxFields] = useState({
    vat_rate: "15",
    customs_rate: "5",
    service_fee_rate: "3",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("*");
    const settings = (data || []) as { key: string; value: string; id: string }[];

    const rateMap: Record<string, string> = {};
    const taxMap: Record<string, string> = {};

    settings.forEach((s) => {
      if (s.key.startsWith("fx_")) rateMap[s.key] = s.value;
      if (s.key.startsWith("tax_")) taxMap[s.key] = s.value;
    });

    setRates(rateMap);
    setTaxFields({
      vat_rate: taxMap["tax_vat_rate"] || "15",
      customs_rate: taxMap["tax_customs_rate"] || "5",
      service_fee_rate: taxMap["tax_service_fee_rate"] || "3",
    });
    setLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    // Upsert: try update first, then insert
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase.from("site_settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("site_settings").insert({ key, value });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises: Promise<void>[] = [];

      // Save FX rates
      Object.entries(rates).forEach(([key, value]) => {
        promises.push(saveSetting(key, value));
      });

      // Save tax rates
      promises.push(saveSetting("tax_vat_rate", taxFields.vat_rate));
      promises.push(saveSetting("tax_customs_rate", taxFields.customs_rate));
      promises.push(saveSetting("tax_service_fee_rate", taxFields.service_fee_rate));

      await Promise.all(promises);
      toast.success(t("fiscal.saved"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl font-semibold">{t("fiscal.title")}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchSettings} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4 me-2" /> {t("admin.refresh")}
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            onClick={handleSaveAll}
            disabled={saving}
          >
            <Save className="w-4 h-4 me-2" /> {saving ? "..." : t("fiscal.saveAll")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tax Rates */}
        <BentoCard>
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("fiscal.taxRates")}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("fiscal.vat")}</label>
              <div className="relative">
                <Input
                  type="number"
                  value={taxFields.vat_rate}
                  onChange={(e) => setTaxFields({ ...taxFields, vat_rate: e.target.value })}
                  className="bg-secondary border-border pe-8"
                  min="0"
                  max="100"
                  step="0.5"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("fiscal.customs")}</label>
              <div className="relative">
                <Input
                  type="number"
                  value={taxFields.customs_rate}
                  onChange={(e) => setTaxFields({ ...taxFields, customs_rate: e.target.value })}
                  className="bg-secondary border-border pe-8"
                  min="0"
                  max="100"
                  step="0.5"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("fiscal.serviceFee")}</label>
              <div className="relative">
                <Input
                  type="number"
                  value={taxFields.service_fee_rate}
                  onChange={(e) => setTaxFields({ ...taxFields, service_fee_rate: e.target.value })}
                  className="bg-secondary border-border pe-8"
                  min="0"
                  max="100"
                  step="0.5"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* FX Rates */}
        <BentoCard>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("fiscal.fxRates")}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t("fiscal.fxDesc")}</p>
          <div className="space-y-3">
            {CURRENCIES.filter((c) => c !== "USD").map((currency) => {
              const key = `fx_usd_${currency.toLowerCase()}`;
              return (
                <div key={currency} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">1 USD →</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={rates[key] || ""}
                    onChange={(e) => setRates({ ...rates, [key]: e.target.value })}
                    className="bg-secondary border-border flex-1"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-sm font-semibold text-primary w-10">{currency}</span>
                </div>
              );
            })}
          </div>
        </BentoCard>

        {/* Escrow Split Info */}
        <BentoCard span="2">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("fiscal.escrow")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <p className="text-3xl font-serif font-bold text-emerald-500">30%</p>
              <p className="text-xs text-muted-foreground mt-1">{t("fiscal.deposit")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("fiscal.depositDesc")}</p>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-3xl font-serif font-bold text-primary">70%</p>
              <p className="text-xs text-muted-foreground mt-1">{t("fiscal.balance")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("fiscal.balanceDesc")}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">{t("fiscal.escrowNote")}</p>
        </BentoCard>
      </div>
    </div>
  );
};
