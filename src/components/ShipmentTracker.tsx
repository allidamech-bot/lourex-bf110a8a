import { forwardRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Factory, Warehouse, Ship, FileCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

interface Shipment {
  tracking_id: string;
  status: string;
  destination: string;
  pallets: number;
  weight: number;
}

const SEARCH_TIMEOUT_MS = 8000;

const ShipmentTracker = forwardRef<HTMLElement>((_props, _ref) => {
  const { t } = useI18n();
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<Shipment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const stages = [
    { key: "factory", label: t("stage.factory"), icon: Factory },
    { key: "warehouse", label: t("stage.warehouse"), icon: Warehouse },
    { key: "shipping", label: t("stage.shipping"), icon: Ship },
    { key: "customs", label: t("stage.customs"), icon: FileCheck },
    { key: "delivered", label: t("stage.delivered"), icon: CheckCircle2 },
  ];

  const statusToStage: Record<string, number> = {
    factory: 0, warehouse: 1, shipping: 2, customs: 3, delivered: 4,
  };

  const handleSearch = useCallback(async () => {
    const id = trackingId.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    setError("");
    setResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const { data, error: dbError } = await supabase
        .rpc("lookup_shipment_by_tracking" as any, { p_tracking_id: id })
        .abortSignal(controller.signal)
        .maybeSingle();

      if (dbError) {
        setError(t("track.error"));
      } else if (!data) {
        setError(t("track.notFound"));
      } else {
        setResult(data as Shipment);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(t("track.error"));
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [trackingId, t]);

  const currentStage = result ? statusToStage[result.status] ?? -1 : -1;

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            {t("track.title")} <span className="text-gradient-gold">{t("track.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("track.subtitle")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("track.placeholder")}
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full h-12 ps-12 pe-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all"
              />
            </div>
            <Button variant="gold" className="h-12 px-6" onClick={handleSearch} disabled={loading}>
              {loading ? t("track.searching") : t("track.button")}
            </Button>
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground mt-3 text-center">
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Skeleton loader while searching */}
        {loading && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="glass-card rounded-xl p-6">
              <div className="flex flex-wrap gap-6 justify-between">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-xl p-8">
              <div className="flex items-center justify-between">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-3 w-14 hidden sm:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass-card rounded-xl p-6 mb-8">
                <div className="flex flex-wrap gap-6 justify-between">
                  {[
                    { label: t("track.trackingId"), value: result.tracking_id, cls: "font-serif text-lg font-semibold text-gold" },
                    { label: t("track.destination"), value: result.destination },
                    { label: t("track.pallets"), value: result.pallets },
                    { label: t("track.weight"), value: `${result.weight} kg` },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className={item.cls || "font-medium"}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-8 md:mx-12" />
                  <div
                    className="absolute top-5 left-0 h-0.5 bg-gradient-gold mx-8 md:mx-12 transition-all duration-700"
                    style={{
                      width: `${(currentStage / (stages.length - 1)) * 100}%`,
                      maxWidth: "calc(100% - 4rem)",
                    }}
                  />
                  {stages.map((stage, i) => {
                    const isCompleted = i <= currentStage;
                    const isCurrent = i === currentStage;
                    return (
                      <div key={stage.key} className="relative z-10 flex flex-col items-center gap-2">
                        <motion.div
                          initial={false}
                          animate={{
                            scale: isCurrent ? 1.2 : 1,
                            backgroundColor: isCompleted ? "hsl(40 52% 58%)" : "hsl(0 0% 10%)",
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? "border-gold" : "border-border"}`}
                        >
                          <stage.icon className={`w-4 h-4 ${isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        </motion.div>
                        <span className={`text-xs font-medium text-center hidden sm:block ${isCompleted ? "text-gold" : "text-muted-foreground"}`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="sm:hidden mt-4 text-center">
                  <p className="text-sm text-gold font-medium">
                    {stages[currentStage]?.label}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
});
ShipmentTracker.displayName = "ShipmentTracker";

export default ShipmentTracker;
