import { FileWarning, ShieldCheck } from "lucide-react";
import type { FinancialRiskAnalysis } from "@/features/accounting/lib/financeAuditPro";

type FinanceAuditProPanelProps = {
  analysis: FinancialRiskAnalysis;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
};

const toneByState: Record<FinancialRiskAnalysis["state"], string> = {
  healthy: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  locked: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  under_review: "border-blue-500/25 bg-blue-500/10 text-blue-100",
  pending_correction: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  financial_risk: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  inconsistent: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  missing_reference: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  awaiting_approval: "border-blue-500/25 bg-blue-500/10 text-blue-100",
  customer_balance_attention: "border-amber-500/25 bg-amber-500/10 text-amber-100",
};

export function FinanceAuditProPanel({ analysis, t, locale }: FinanceAuditProPanelProps) {
  return (
    <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="font-semibold">{t("accounting.pro.title")}</p>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("accounting.pro.description")}</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1 text-xs font-semibold ${toneByState[analysis.state]}`}>
          {t(`accounting.pro.states.${analysis.state}`)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
          <p className="text-xs text-muted-foreground">{t("accounting.pro.auditScore")}</p>
          <p className="mt-1 text-2xl font-bold">{analysis.score.toLocaleString(locale)}%</p>
        </div>
        <div className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
          <p className="text-xs text-muted-foreground">{t("accounting.pro.pendingCorrections")}</p>
          <p className="mt-1 text-2xl font-bold">{analysis.pendingEditRequests.toLocaleString(locale)}</p>
        </div>
        <div className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
          <p className="text-xs text-muted-foreground">{t("accounting.pro.duplicates")}</p>
          <p className="mt-1 text-2xl font-bold">{analysis.duplicateGroups.length.toLocaleString(locale)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1rem] border border-border/50 bg-background/35 p-3">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-300" />
          <p className="text-sm font-semibold">{t("accounting.pro.riskFlags")}</p>
        </div>
        {analysis.riskFlags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.riskFlags.map((flag) => (
              <span key={flag} className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                {t(`accounting.pro.risks.${flag}`)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("accounting.pro.noRisks")}</p>
        )}
      </div>
    </div>
  );
}
