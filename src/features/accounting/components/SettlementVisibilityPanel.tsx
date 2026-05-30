import { Scale } from "lucide-react";
import { ReadableInfoCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
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
      <SectionHelpBox
        className="mt-4"
        title={t("partnerSettlements.pro.helpTitle")}
        body={t("partnerSettlements.pro.helpBody")}
        example={t("partnerSettlements.pro.helpExample")}
      />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
        {[
          { label: t("partnerSettlements.pro.totalDue"), value: formatMoney(summary.totalDue) },
          { label: t("partnerSettlements.pro.paidTotal"), value: formatMoney(summary.paidTotal) },
          { label: t("partnerSettlements.pro.pendingCount"), value: summary.pendingCount },
          { label: t("partnerSettlements.pro.approvedUnpaidCount"), value: summary.approvedUnpaidCount },
        ].map((item) => (
          <ReadableInfoCard key={item.label} label={item.label} value={item.value} className="bg-background/35" />
        ))}
      </ResponsiveInfoGrid>
    </div>
  );
}
