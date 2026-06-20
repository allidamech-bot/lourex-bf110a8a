import { forwardRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, FileCheck, Truck, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { shipmentStages } from "@/lib/shipmentStages";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

interface Shipment {
  tracking_id: string;
  status: string;
  destination: string;
  pallets: number;
  weight: number;
  cbm?: number;
  container_20ft?: number;
  container_40ft?: number;
}

const SEARCH_TIMEOUT_MS = 8000;

/** Maps every canonical stage code to its 0-based index */
const statusToStage: Record<string, number> = Object.fromEntries(
  shipmentStages.map((s, i) => [s.code, i])
);

const ShipmentTracker = forwardRef<HTMLElement>((_props, _ref) => {
  const { t, lang } = useI18n();
  const { profile } = useAuthSession();
  const userRole = profile?.role ? String(profile.role) : undefined;

  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<Shipment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        .rpc("lookup_shipment_by_tracking", { p_tracking_id: id })
        .abortSignal(controller.signal)
        .maybeSingle();

      if (dbError) {
        setError(t("tracking.tracker.error"));
      } else if (!data) {
        setError(t("tracking.tracker.notFound"));
      } else {
        setResult(data as Shipment);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(t("tracking.tracker.timeoutError"));
      } else {
        setError(t("tracking.tracker.error"));
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [trackingId, t]);

  const currentStage = result ? (statusToStage[result.status] ?? -1) : -1;

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
            {t("tracking.tracker.title")} <span className="text-gradient-gold">{t("tracking.tracker.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("tracking.tracker.subtitle")}</p>
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
                placeholder={t("tracking.tracker.placeholder")}
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full h-12 ps-12 pe-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all"
              />
            </div>
            <Button variant="gold" className="h-12 px-6" onClick={handleSearch} disabled={loading}>
              {loading ? t("tracking.tracker.searching") : t("tracking.tracker.button")}
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-xl p-8">
              <div className="flex items-center justify-between gap-1">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <Skeleton className="h-2 w-10 hidden md:block" />
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
              {/* Shipment Info Card */}
              <div className="glass-card rounded-xl p-6 mb-6">
                <div className="flex flex-wrap gap-6 justify-between">
                  {[
                    { label: t("tracking.tracker.trackingId"), value: result.tracking_id, cls: "font-serif text-lg font-semibold text-gold" },
                    { label: t("tracking.tracker.destination"), value: result.destination },
                    { label: t("tracking.tracker.pallets"), value: result.pallets },
                    { label: t("tracking.tracker.weight"), value: `${result.weight} kg` },
                    ...(result.cbm ? [{ label: "CBM", value: `${result.cbm} m³` }] : []),
                    ...(result.container_20ft ? [{ label: "20ft Container", value: result.container_20ft }] : []),
                    ...(result.container_40ft ? [{ label: "40ft Container", value: result.container_40ft }] : []),
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className={item.cls || "font-medium"}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Carrier Conditional Role Overlay */}
                {userRole === "carrier" && (
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between bg-black/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-semibold text-amber-400">Carrier Active Transit Session</span>
                    </div>
                    <Button variant="outline" size="sm" className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10">
                      Update Transit Checkpoint
                    </Button>
                  </div>
                )}

                {/* Supplier Conditional Role Overlay */}
                {userRole === "supplier" && currentStage < 3 && (
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between bg-black/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Factory className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-400">Supplier Origin Dashboard</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
                        Manufacturing
                      </Button>
                      <Button variant="outline" size="sm" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
                        Ready for Pickup
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 11-Stage Progress Stepper */}
              <div className="glass-card rounded-xl p-6">
                {/* Progress summary */}
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {t("tracking.tracker.pathLabel")}
                  </span>
                  <span className="text-sm font-semibold text-gold">
                    {lang === "ar" ? `المرحلة ${currentStage + 1} / ${shipmentStages.length}` : `Stage ${currentStage + 1} / ${shipmentStages.length}`}
                  </span>
                </div>

                {/* Stage dots — compact horizontal stepper */}
                <div className="relative">
                  {/* Progress track */}
                  <div className="absolute top-2.5 left-2 right-2 h-[2px] bg-border" />
                  <div
                    className="absolute top-2.5 left-2 h-[2px] bg-gradient-gold transition-all duration-700"
                    style={{
                      width: currentStage >= 0
                        ? `calc(${(currentStage / (shipmentStages.length - 1)) * 100}% * ((100% - 1rem) / 100%))`
                        : "0%",
                      maxWidth: "calc(100% - 1rem)",
                    }}
                  />

                  {/* Stage nodes */}
                  <div className="relative flex justify-between gap-0">
                    {shipmentStages.map((stage, i) => {
                      const isCompleted = i <= currentStage;
                      const isCurrent = i === currentStage;
                      const label = lang === "ar" ? stage.label : stage.labelEn;
                      return (
                        <div key={stage.code} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                          <motion.div
                            initial={false}
                            animate={{
                              scale: isCurrent ? 1.3 : 1,
                              backgroundColor: isCompleted ? "#D4AF37" : "hsl(0 0% 12%)",
                            }}
                            title={label}
                            className={`relative z-10 w-5 h-5 rounded-full border-2 transition-colors ${
                              isCompleted ? "border-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]" : "border-border"
                            }`}
                          >
                            {isCurrent && (
                              <span className="absolute inset-0 rounded-full bg-gold/30 animate-ping" />
                            )}
                          </motion.div>
                          <span
                            className={`text-[10px] leading-tight text-center line-clamp-2 hidden md:block px-0.5 ${
                              isCompleted ? "text-gold font-medium" : "text-muted-foreground"
                            }`}
                            dir={lang === "ar" ? "rtl" : "ltr"}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile: show current stage label */}
                <div className="md:hidden mt-4 text-center">
                  <p className="text-sm text-gold font-medium">
                    {lang === "ar"
                      ? shipmentStages[currentStage]?.label
                      : shipmentStages[currentStage]?.labelEn}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "ar"
                      ? shipmentStages[currentStage]?.description
                      : shipmentStages[currentStage]?.descriptionEn}
                  </p>
                </div>

                {/* Desktop: current stage description */}
                {currentStage >= 0 && (
                  <div className="hidden md:block mt-5 p-4 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {t("tracking.tracker.currentStageLabel")}
                    </p>
                    <p className="text-sm font-medium text-gold">
                      {lang === "ar" ? shipmentStages[currentStage]?.label : shipmentStages[currentStage]?.labelEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      {lang === "ar" ? shipmentStages[currentStage]?.description : shipmentStages[currentStage]?.descriptionEn}
                    </p>

                    {/* Stage 4: Customs Clearance Micro-Interactions */}
                    {currentStage === 3 && (
                      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-2">
                            {t("tracking.tracker.documentReadiness")}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-stone-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{t("tracking.tracker.commercialInvoice")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-stone-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{t("tracking.tracker.billOfLading")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-stone-400">
                            <div className="w-4 h-4 rounded-full border border-stone-600 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-stone-600 animate-pulse" />
                            </div>
                            <span>{t("tracking.tracker.tariffPaidStatus")}</span>
                          </div>
                        </div>

                        <div className="flex flex-col justify-end gap-2">
                          <Button variant="outline" size="sm" className="w-full border-amber-200/10 bg-black/40 hover:bg-gold/10 hover:text-gold text-stone-300 transition-colors">
                            <FileCheck className="w-4 h-4 me-2" />
                            {t("tracking.tracker.downloadCustomsManifest")}
                          </Button>

                          {/* Customs Broker Conditional Role Overlay */}
                          {userRole === "customs_broker" && (
                            <Button variant="gold" size="sm" className="w-full">
                              <CheckCircle2 className="w-4 h-4 me-2" />
                              Secure Upload
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
