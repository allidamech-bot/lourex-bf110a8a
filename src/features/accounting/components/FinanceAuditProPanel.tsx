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
  under_review: "border-amber-200/25 bg-amber-500/10 text-amber-100",
  pending_correction: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  financial_risk: "border-red-500/25 bg-red-500/10 text-red-100",
  inconsistent: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  missing_reference: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  awaiting_approval: "border-amber-200/25 bg-amber-500/10 text-amber-200",
  customer_balance_attention: "border-amber-500/25 bg-amber-500/10 text-amber-100",
};

export function FinanceAuditProPanel({ analysis, t, locale }: FinanceAuditProPanelProps) {
  return (
    <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <p className="font-bold text-stone-100 uppercase tracking-tight text-sm">{t("accounting.pro.title")}</p>
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-400 font-medium">{t("accounting.pro.description")}</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${toneByState[analysis.state]}`}>
          {t(`accounting.pro.states.${analysis.state}`)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("accounting.pro.auditScore")}</p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{analysis.score.toLocaleString(locale)}%</p>
        </div>
        <div className="rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("accounting.pro.pendingCorrections")}</p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{analysis.pendingEditRequests.toLocaleString(locale)}</p>
        </div>
        <div className="rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("accounting.pro.duplicates")}</p>
          <p className="mt-1 text-2xl font-bold text-stone-100">{analysis.duplicateGroups.length.toLocaleString(locale)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-3">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-500" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-100">{t("accounting.pro.riskFlags")}</p>
        </div>
        {analysis.riskFlags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.riskFlags.map((flag) => (
              <span key={flag} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                {t(`accounting.pro.risks.${flag}`)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-500 font-medium">{t("accounting.pro.noRisks")}</p>
        )}
      </div>
    </div>
  );
}
