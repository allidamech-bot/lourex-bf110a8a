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
  delayed: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  blocked: "border-rose-500/30 bg-rose-500/15 text-rose-100",
  missing_documents: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  customer_waiting: "border-blue-500/25 bg-blue-500/10 text-blue-100",
  customs_risk: "border-orange-500/25 bg-orange-500/10 text-orange-100",
  delivery_risk: "border-orange-500/25 bg-orange-500/10 text-orange-100",
  unknown: "border-slate-500/25 bg-slate-500/10 text-slate-100",
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
    <div className={`rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4 ${directionClass}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-primary" />
            <p className="break-words text-sm font-semibold">{getLabel(t, "title")}</p>
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {internal ? getLabel(t, "internalDescription") : getLabel(t, "customerDescription")}
          </p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1 text-xs font-semibold ${healthTone[visibleHealth]}`}>
          {getLabel(t, `health.${visibleHealth}`)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
          <p className="text-xs text-muted-foreground">{getLabel(t, "healthScore")}</p>
          <p className="mt-1 text-2xl font-bold">{analysis.healthScore.toLocaleString(locale)}%</p>
        </div>
        <div className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
          <p className="text-xs text-muted-foreground">{getLabel(t, "staleDays")}</p>
          <p className="mt-1 text-2xl font-bold">{analysis.staleDays.toLocaleString(locale)}</p>
        </div>
        <div className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
          <p className="text-xs text-muted-foreground">{getLabel(t, "nextStep")}</p>
          <p className="mt-1 break-words text-sm font-semibold">
            {getLabel(t, `nextSteps.${customerView.nextStepKey}`)}
          </p>
        </div>
      </div>

      {internal ? (
        <>
          <div className="mt-4 rounded-[1rem] border border-border/50 bg-background/35 p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-semibold">{getLabel(t, "riskFlags")}</p>
            </div>
            {analysis.riskFlags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.riskFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                  >
                    {getLabel(t, `risks.${flag}`)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{getLabel(t, "noRisks")}</p>
            )}
          </div>

          <div className="mt-4 rounded-[1rem] border border-border/50 bg-background/35 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{getLabel(t, "documentChecklist")}</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {analysis.checklist.map((item) => (
                <div key={item.key} className="rounded-[0.85rem] border border-border/50 bg-secondary/10 p-3">
                  <p className="break-words text-sm font-medium">{getLabel(t, `documents.${item.key}`)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getLabel(t, `documentStatus.${item.status}`)} · {getLabel(t, `importance.${item.importance}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {onRunAi ? (
            <div className="mt-4 rounded-[1rem] border border-primary/15 bg-primary/8 p-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{getLabel(t, "aiTitle")}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{getLabel(t, "aiDescription")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["shipment_briefing", "shipment_customer_update_draft", "shipment_document_review"] as const).map(
                    (mode) => (
                      <Button key={mode} type="button" variant="outline" size="sm" disabled={aiLoading} onClick={() => onRunAi(mode)}>
                        {aiLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Sparkles className="me-2 h-4 w-4" />}
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
                  {aiOutputTitle ? <p className="mb-2 text-xs font-semibold text-muted-foreground">{aiOutputTitle}</p> : null}
                  <pre className="max-h-[22rem] whitespace-pre-wrap break-words rounded-[0.85rem] border border-primary/15 bg-background/40 p-4 font-sans text-sm leading-7">
                    {aiOutput}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-[1rem] border border-primary/15 bg-primary/10 p-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{getLabel(t, "customerSafeNextStep")}</p>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {getLabel(t, `nextStepDescriptions.${customerView.nextStepKey}`)}
          </p>
        </div>
      )}
    </div>
  );
}
