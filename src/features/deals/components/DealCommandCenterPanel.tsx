import { AlertTriangle, CheckCircle2, ClipboardList, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OperationsDeal } from "@/domain/operations/types";
import type { Lang } from "@/lib/i18n";
import {
  analyzeDealHealth,
  type DealHealthState,
  type DealRiskFlag,
} from "@/features/deals/lib/dealCommand";

type DealCommandCenterPanelProps = {
  deal: OperationsDeal;
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  aiOutput?: string;
  aiOutputTitle?: string;
  aiLoading?: boolean;
  aiUsedFallback?: boolean;
  onRunAiBriefing?: () => void;
  onRunAiRiskReview?: () => void;
  onCopyAiOutput?: () => void;
};

const healthClasses: Record<DealHealthState, string> = {
  healthy: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  needs_attention: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  blocked: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  financial_risk: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  customer_waiting: "border-sky-400/25 bg-sky-500/10 text-sky-100",
  supplier_delay: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  shipment_risk: "border-orange-400/25 bg-orange-500/10 text-orange-100",
  missing_data: "border-slate-400/25 bg-slate-500/10 text-slate-100",
};

export const DealCommandCenterPanel = ({
  deal,
  lang,
  t,
  aiOutput,
  aiOutputTitle,
  aiLoading = false,
  aiUsedFallback = false,
  onRunAiBriefing,
  onRunAiRiskReview,
  onCopyAiOutput,
}: DealCommandCenterPanelProps) => {
  const analysis = analyzeDealHealth(deal);
  const healthLabel = t(`deals.command.health.${analysis.state}`);
  const riskLabel = (flag: DealRiskFlag) => t(`deals.command.risks.${flag}`);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.35rem] border border-primary/20 bg-[#080808] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <ClipboardList className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">{t("deals.command.title")}</p>
              <p className="mt-1 break-words text-xs leading-6 text-muted-foreground">{t("deals.command.description")}</p>
            </div>
          </div>
          <span className={`max-w-full self-start rounded-full border px-3 py-1 text-xs font-medium ${healthClasses[analysis.state]}`}>
            {healthLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1rem] border border-primary/15 bg-secondary/15 p-3">
            <p className="text-[11px] text-muted-foreground">{t("deals.command.healthScore")}</p>
            <p className="mt-1 text-sm font-semibold">{analysis.score}/100</p>
          </div>
          <div className="rounded-[1rem] border border-primary/15 bg-secondary/15 p-3">
            <p className="text-[11px] text-muted-foreground">{t("deals.command.riskCount")}</p>
            <p className="mt-1 text-sm font-semibold">{analysis.riskFlags.length}</p>
          </div>
          <div className="rounded-[1rem] border border-primary/15 bg-secondary/15 p-3">
            <p className="text-[11px] text-muted-foreground">{t("deals.command.lastShipmentUpdate")}</p>
            <p className="mt-1 break-words text-sm font-semibold">
              {analysis.lastShipmentUpdateAt
                ? new Date(analysis.lastShipmentUpdateAt).toLocaleString(lang === "ar" ? "ar" : "en")
                : t("common.notAvailable")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("deals.command.riskFlags")}</p>
        </div>
        {analysis.riskFlags.length ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {analysis.riskFlags.map((flag) => (
              <li key={flag} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{riskLabel(flag)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("deals.command.noRisks")}</p>
        )}
      </div>

      <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("deals.command.responsibility")}</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1rem] bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{t("deals.labels.turkishPartner")}</p>
            <p className="mt-1 break-words text-sm font-medium">{deal.turkishPartnerName || t("deals.unassigned")}</p>
          </div>
          <div className="rounded-[1rem] bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{t("deals.labels.saudiPartner")}</p>
            <p className="mt-1 break-words text-sm font-medium">{deal.saudiPartnerName || t("deals.unassigned")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("deals.command.timelineTitle")}</p>
        </div>
        <div className="mt-4 space-y-3">
          {analysis.timeline.map((event) => (
            <div key={event.key} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${event.active ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary/20 text-muted-foreground"}`}>
                {event.active ? <CheckCircle2 className="h-3 w-3" /> : null}
              </span>
              <div className="min-w-0">
                <p className={event.active ? "text-foreground" : "text-muted-foreground"}>{t(event.labelKey)}</p>
                {event.timestamp ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString(lang === "ar" ? "ar" : "en")}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-primary/25 bg-[#080808] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary">{t("deals.command.aiTitle")}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{t("deals.command.aiDescription")}</p>
            </div>
          </div>
          {aiOutput ? (
            <Button variant="outline" size="sm" onClick={onCopyAiOutput}>
              {t("requests.ai.copy")}
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={aiLoading} onClick={onRunAiBriefing}>
            <Sparkles className={`me-2 h-4 w-4 ${aiLoading ? "animate-pulse" : ""}`} />
            {t("deals.command.aiBriefing")}
          </Button>
          <Button type="button" variant="outline" disabled={aiLoading} onClick={onRunAiRiskReview}>
            <Sparkles className={`me-2 h-4 w-4 ${aiLoading ? "animate-pulse" : ""}`} />
            {t("deals.command.aiRiskReview")}
          </Button>
        </div>

        {aiUsedFallback ? (
          <div className="mt-4 rounded-[1rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
            {t("requests.ai.unavailable")}
          </div>
        ) : null}

        {aiOutput ? (
          <div className="mt-4 rounded-[1rem] border border-primary/20 bg-[#111111] p-4">
            <p className="mb-3 text-sm font-semibold text-primary">{aiOutputTitle}</p>
            <pre className="max-h-[22rem] whitespace-pre-wrap break-words font-sans text-sm leading-7 text-foreground">
              {aiOutput}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
};
