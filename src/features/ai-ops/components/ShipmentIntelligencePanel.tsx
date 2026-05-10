import { ShieldAlert, Truck } from "lucide-react";
import type { InsightLanguage, ShipmentRiskProfile, TimelineAnalyticsResult } from "@/features/ai-ops/types/aiOpsTypes";

const labels = {
  en: {
    title: "Shipment intelligence",
    bottleneck: "Bottleneck stage",
    noBottleneck: "No active bottleneck",
    riskScore: "Risk score",
    exposure: "Exposure",
    delay: "Delay probability",
    noRisks: "No shipment risks detected.",
  },
  ar: {
    title: "ذكاء الشحنات",
    bottleneck: "مرحلة الاختناق",
    noBottleneck: "لا توجد مرحلة اختناق نشطة",
    riskScore: "درجة المخاطر",
    exposure: "الانكشاف",
    delay: "احتمال التأخير",
    noRisks: "لا توجد مخاطر شحنات ظاهرة.",
  },
} as const;

export function ShipmentIntelligencePanel({
  risks,
  timeline,
  language,
  locale,
}: {
  risks: ShipmentRiskProfile[];
  timeline: TimelineAnalyticsResult;
  language: InsightLanguage;
  locale: string;
}) {
  const t = labels[language];
  const topRisks = risks.filter((risk) => risk.riskScore > 0).slice(0, 4);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-blue-200" />
          <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
        </div>
        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
          {t.bottleneck}: {timeline.bottleneckStage || t.noBottleneck}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {topRisks.length ? topRisks.map((risk) => (
          <div key={risk.shipmentId} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{risk.trackingId}</p>
                <p className="mt-1 break-words text-xs text-slate-400">{risk.customerName}</p>
              </div>
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                {risk.severity}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <p className="text-xs text-slate-400">{t.riskScore}: <span className="text-white">{risk.riskScore}%</span></p>
              <p className="text-xs text-slate-400">{t.exposure}: <span className="text-white">{risk.financialExposure.toLocaleString(locale)} SAR</span></p>
              <p className="text-xs text-slate-400">{t.delay}: <span className="text-white">{Math.round(risk.delayProbability * 100)}%</span></p>
            </div>
            {risk.reasons.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {risk.reasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                    {reason.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )) : (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">
            <ShieldAlert className="h-4 w-4 text-blue-200" />
            {t.noRisks}
          </div>
        )}
      </div>
    </div>
  );
}
