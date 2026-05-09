import { Scale } from "lucide-react";
import type { SettlementVisibilitySummary } from "@/features/accounting/lib/financeAuditPro";

type SettlementVisibilityPanelProps = {
  summary: SettlementVisibilitySummary;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatMoney: (amount: number) => string;
};

export function SettlementVisibilityPanel({ summary, t, formatMoney }: SettlementVisibilityPanelProps) {
  return (
    <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <p className="font-semibold">{t("partnerSettlements.pro.title")}</p>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("partnerSettlements.pro.description")}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {t(`partnerSettlements.pro.states.${summary.state}`)}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          { label: t("partnerSettlements.pro.totalDue"), value: `${formatMoney(summary.totalDue)} SAR` },
          { label: t("partnerSettlements.pro.paidTotal"), value: `${formatMoney(summary.paidTotal)} SAR` },
          { label: t("partnerSettlements.pro.pendingCount"), value: summary.pendingCount },
          { label: t("partnerSettlements.pro.approvedUnpaidCount"), value: summary.approvedUnpaidCount },
        ].map((item) => (
          <div key={item.label} className="rounded-[1rem] border border-border/50 bg-background/35 p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 break-words font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
