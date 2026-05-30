import { ShieldAlert, Truck } from "lucide-react";
import { formatMoney } from "@/lib/currency";
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
    <div className="rounded-2xl border border-amber-200/10 bg-stone-900/50 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-amber-500" />
          <h3 className="font-serif text-xl font-semibold text-stone-100">{t.title}</h3>
        </div>
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">
          {t.bottleneck}: {timeline.bottleneckStage || t.noBottleneck}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {topRisks.length ? topRisks.map((risk) => (
          <div key={risk.shipmentId} className="rounded-xl border border-amber-200/10 bg-stone-950/40 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-bold text-stone-100 uppercase tracking-tight">{risk.trackingId}</p>
                <p className="mt-1 break-words text-xs text-stone-500 font-medium">{risk.customerName}</p>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                {risk.severity}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t.riskScore}: <span className="text-stone-200">{risk.riskScore}%</span></p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t.exposure}: <span className="text-stone-200">{formatMoney(risk.financialExposure)}</span></p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t.delay}: <span className="text-stone-200">{Math.round(risk.delayProbability * 100)}%</span></p>
            </div>
            {risk.reasons.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {risk.reasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-stone-900 border border-stone-800 px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    {reason.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )) : (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-amber-200/10 bg-stone-950/20 p-4 text-sm text-stone-500 font-medium text-center">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            {t.noRisks}
          </div>
        )}
      </div>
    </div>
  );
}
