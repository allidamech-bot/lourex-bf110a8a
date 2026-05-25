import { ClipboardCheck, FileText, Loader2, ShieldAlert, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationalShipment } from "@/lib/operationsDomain";
import type { Lang } from "@/lib/i18n";
import {
  analyzeShipmentIntelligence,
  buildCustomerSafeShipmentView,
  type ShipmentHealthState,
  type ShipmentIntelligenceAnalysis,
} from "@/features/shipments/lib/shipmentIntelligence";

type ShipmentAiMode = "shipment_briefing" | "shipment_customer_update_draft" | "shipment_document_review";

type ShipmentIntelligencePanelProps = {
  shipment: OperationalShipment;
  lang: Lang;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  internal?: boolean;
  analysis?: ShipmentIntelligenceAnalysis;
  aiOutput?: string;
  aiOutputTitle?: string;
  aiLoading?: boolean;
  aiUsedFallback?: boolean;
  onRunAi?: (mode: ShipmentAiMode) => void;
};

const healthTone: Record<ShipmentHealthState, string> = {
  on_track: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  needs_update: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  delayed: "border-red-500/25 bg-red-500/10 text-red-100",
  blocked: "border-red-500/30 bg-red-500/15 text-red-100",
  missing_documents: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  customer_waiting: "border-amber-200/25 bg-amber-500/5 text-amber-200",
  customs_risk: "border-red-500/25 bg-red-500/10 text-red-100",
  delivery_risk: "border-red-500/25 bg-red-500/10 text-red-100",
  unknown: "border-stone-700 bg-stone-800 text-stone-400",
};

const getLabel = (t: ShipmentIntelligencePanelProps["t"], key: string) => t(`tracking.intelligence.${key}`);

export function ShipmentIntelligencePanel({
  shipment,
  lang,
  locale,
  t,
  internal = false,
  analysis: providedAnalysis,
  aiOutput,
  aiOutputTitle,
  aiLoading = false,
  aiUsedFallback = false,
  onRunAi,
}: ShipmentIntelligencePanelProps) {
  const analysis = providedAnalysis || analyzeShipmentIntelligence(shipment);
  const customerView = buildCustomerSafeShipmentView(shipment, analysis);
  const visibleHealth = internal ? analysis.healthState : customerView.healthState;
  const directionClass = lang === "ar" ? "text-right" : "text-left";

  return (
    <div className={`rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4 shadow-sm backdrop-blur-xl ${directionClass}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="break-words text-sm font-bold text-stone-100 uppercase tracking-tight">{getLabel(t, "title")}</p>
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-stone-500 font-medium">
            {internal ? getLabel(t, "internalDescription") : getLabel(t, "customerDescription")}
          </p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${healthTone[visibleHealth]}`}>
          {getLabel(t, `health.${visibleHealth}`)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{getLabel(t, "healthScore")}</p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{analysis.healthScore.toLocaleString(locale)}%</p>
        </div>
        <div className="rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{getLabel(t, "staleDays")}</p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{analysis.staleDays.toLocaleString(locale)}</p>
        </div>
        <div className="rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{getLabel(t, "nextStep")}</p>
          <p className="mt-1 break-words text-sm font-bold text-stone-200">
            {getLabel(t, `nextSteps.${customerView.nextStepKey}`)}
          </p>
        </div>
      </div>

      {internal ? (
        <>
          <div className="mt-4 rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-100">{getLabel(t, "riskFlags")}</p>
            </div>
            {analysis.riskFlags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.riskFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest"
                  >
                    {getLabel(t, `risks.${flag}`)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-600 font-medium">{getLabel(t, "noRisks")}</p>
            )}
          </div>

          <div className="mt-4 rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-100">{getLabel(t, "documentChecklist")}</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {analysis.checklist.map((item) => (
                <div key={item.key} className="rounded-[0.85rem] border border-amber-200/5 bg-stone-900/50 p-3">
                  <p className="break-words text-sm font-bold text-stone-200">{getLabel(t, `documents.${item.key}`)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                    {getLabel(t, `documentStatus.${item.status}`)} · {getLabel(t, `importance.${item.importance}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {onRunAi ? (
            <div className="mt-4 rounded-[1rem] border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">{getLabel(t, "aiTitle")}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone-500 font-medium">{getLabel(t, "aiDescription")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["shipment_briefing", "shipment_customer_update_draft", "shipment_document_review"] as const).map(
                    (mode) => (
                      <Button key={mode} type="button" variant="outline" size="sm" disabled={aiLoading} onClick={() => onRunAi(mode)} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                        {aiLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin text-amber-500" /> : <Sparkles className="me-2 h-4 w-4 text-amber-500" />}
                        {getLabel(t, `aiActions.${mode}`)}
                      </Button>
                    ),
                  )}
                </div>
              </div>
              {aiUsedFallback ? (
                <div className="mt-3 rounded-[0.85rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
                  {getLabel(t, "aiFallback")}
                </div>
              ) : null}
              {aiOutput ? (
                <div className="mt-3">
                  {aiOutputTitle ? <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">{aiOutputTitle}</p> : null}
                  <pre className="max-h-[22rem] whitespace-pre-wrap break-words rounded-[0.85rem] border border-amber-200/10 bg-stone-950/40 p-4 font-sans text-sm leading-7 text-stone-300 shadow-inner">
                    {aiOutput}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-[1rem] border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">{getLabel(t, "customerSafeNextStep")}</p>
          </div>
          <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">
            {getLabel(t, `nextStepDescriptions.${customerView.nextStepKey}`)}
          </p>
        </div>
      )}
    </div>
  );
}
