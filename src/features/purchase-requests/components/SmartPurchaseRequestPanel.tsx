import { AlertTriangle, CheckCircle2, ClipboardList, PackageSearch, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Lang } from "@/lib/i18n";
import type { PurchaseRequest } from "@/types/lourex";
import {
  analyzeSmartPurchaseRequest,
  buildRequestTimeline,
  buildSupplierBriefDraft,
  getNextSmartStatus,
  type MissingInformationKey,
  type SmartRequestSignal,
} from "@/features/purchase-requests/lib/smartRequest";

type SmartPurchaseRequestPanelProps = {
  request: PurchaseRequest;
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onRequestClarification?: () => void;
  onMarkReady?: () => void;
  clarificationDraft?: string;
  onClarificationDraftChange?: (value: string) => void;
  clarificationBusy?: boolean;
  disabled?: boolean;
  showCustomerReply?: boolean;
  customerReply?: string;
  onCustomerReplyChange?: (value: string) => void;
  onSubmitCustomerReply?: () => void;
  customerReplyBusy?: boolean;
  showInternalSections?: boolean;
};

const signalClasses: Record<SmartRequestSignal, string> = {
  low: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  medium: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  high: "border-rose-400/25 bg-rose-500/10 text-rose-100",
};

export const SmartPurchaseRequestPanel = ({
  request,
  lang,
  t,
  onRequestClarification,
  onMarkReady,
  clarificationDraft = "",
  onClarificationDraftChange,
  clarificationBusy = false,
  disabled = false,
  showCustomerReply = false,
  customerReply = "",
  onCustomerReplyChange,
  onSubmitCustomerReply,
  customerReplyBusy = false,
  showInternalSections = true,
}: SmartPurchaseRequestPanelProps) => {
  const analysis = analyzeSmartPurchaseRequest(request);
  const timeline = buildRequestTimeline(request);
  const recommendedStatus = getNextSmartStatus(analysis);
  const supplierBrief = buildSupplierBriefDraft(request, lang);
  const signalLabel = (signal: SmartRequestSignal) => t(`requests.smart.signals.${signal}`);
  const missingLabel = (key: MissingInformationKey) => t(`requests.smart.missing.${key}`);

  return (
    <div className="space-y-4 rounded-[1.35rem] border border-primary/20 bg-[#080808] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">{t("requests.smart.title")}</p>
            <p className="mt-1 break-words text-xs leading-6 text-muted-foreground">{t("requests.smart.description")}</p>
          </div>
        </div>
        <span className="max-w-full self-start rounded-full border border-primary/20 px-2.5 py-1 text-[11px] text-muted-foreground">
          {t(`requests.smart.workflow.${analysis.workflowStatus}`)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("requests.smart.readinessScore"), value: `${analysis.readinessScore}/100` },
          { label: t("requests.smart.completenessScore"), value: `${analysis.completenessScore}/100` },
          { label: t("requests.smart.clarificationCount"), value: String(analysis.estimatedClarificationCount) },
          { label: t("requests.smart.recommendedNext"), value: t(`statuses.${recommendedStatus}`) },
        ].map((item) => (
          <div key={item.label} className="rounded-[1rem] border border-primary/15 bg-secondary/15 p-3">
            <p className="break-words text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-[1rem] border p-3 ${signalClasses[analysis.sourcingDifficulty]}`}>
          <p className="text-xs font-semibold">{t("requests.smart.sourcingDifficulty")}</p>
          <p className="mt-1 text-sm">{signalLabel(analysis.sourcingDifficulty)}</p>
        </div>
        <div className={`rounded-[1rem] border p-3 ${signalClasses[analysis.complianceRisk]}`}>
          <p className="text-xs font-semibold">{t("requests.smart.complianceRisk")}</p>
          <p className="mt-1 text-sm">{signalLabel(analysis.complianceRisk)}</p>
        </div>
      </div>

      <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("requests.smart.missingTitle")}</p>
        </div>
        {analysis.missingInformation.length ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {analysis.missingInformation.map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{missingLabel(key)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("requests.smart.noMissing")}</p>
        )}
      </div>

      <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("requests.smart.timelineTitle")}</p>
        </div>
        <div className="mt-4 space-y-3">
          {timeline.map((event) => (
            <div key={event.key} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${event.active ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary/20 text-muted-foreground"}`}>
                {event.active ? <CheckCircle2 className="h-3 w-3" /> : null}
              </span>
              <div className="min-w-0">
                <p className={event.active ? "text-foreground" : "text-muted-foreground"}>{t(event.labelKey)}</p>
                {event.timestamp ? <p className="mt-0.5 text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString(lang === "ar" ? "ar" : "en")}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInternalSections ? (
        <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{t("requests.smart.supplierBriefTitle")}</p>
          </div>
          <pre className="mt-3 max-h-[18rem] whitespace-pre-wrap break-words font-sans text-sm leading-7 text-muted-foreground">
            {supplierBrief}
          </pre>
        </div>
      ) : null}

      {onRequestClarification || onMarkReady ? (
        <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
          <p className="text-sm font-semibold">{t("requests.smart.clarificationWorkflow")}</p>
          {onRequestClarification ? (
            <Textarea
              rows={4}
              value={clarificationDraft}
              onChange={(event) => onClarificationDraftChange?.(event.target.value)}
              className="mt-3"
              placeholder={t("requests.smart.clarificationPlaceholder")}
              disabled={clarificationBusy || disabled}
            />
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {onRequestClarification ? (
              <Button type="button" variant="outline" disabled={clarificationBusy || disabled || !clarificationDraft.trim()} onClick={onRequestClarification}>
                {clarificationBusy ? t("common.saving") : t("requests.smart.requestClarification")}
              </Button>
            ) : null}
            {onMarkReady ? (
              <Button type="button" variant="gold" disabled={disabled} onClick={onMarkReady}>
                {t("requests.smart.markReadyForSourcing")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showCustomerReply ? (
        <div className="rounded-[1rem] border border-primary/20 bg-primary/8 p-4">
          <p className="text-sm font-semibold">{t("requests.smart.customerReplyTitle")}</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{t("requests.smart.customerReplyDescription")}</p>
          <Textarea
            rows={4}
            value={customerReply}
            onChange={(event) => onCustomerReplyChange?.(event.target.value)}
            className="mt-3"
            placeholder={t("requests.smart.customerReplyPlaceholder")}
            disabled={customerReplyBusy}
          />
          <Button type="button" className="mt-3" variant="gold" disabled={customerReplyBusy || !customerReply.trim()} onClick={onSubmitCustomerReply}>
            {customerReplyBusy ? t("common.saving") : t("requests.smart.submitCustomerReply")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
