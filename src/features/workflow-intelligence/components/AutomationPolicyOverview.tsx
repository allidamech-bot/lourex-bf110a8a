import { SlidersHorizontal } from "lucide-react";
import type { AutomationPolicyConfig, WorkflowLanguage } from "@/features/workflow-intelligence/types/workflowTypes";

const labels = {
  en: {
    title: "Automation policy overview",
    subtitle: "Deterministic thresholds used for advisory workflow routing.",
    shipmentInactivityDays: "Shipment inactivity",
    delayedShipmentDays: "Delayed shipment",
    missingUpdateDays: "Missing update",
    disputeEscalationDays: "Dispute escalation",
    settlementDelayDays: "Settlement delay",
    paymentRiskAmount: "Payment risk amount",
    repeatedIssueThreshold: "Repeated issues",
    criticalExposureAmount: "Critical exposure",
    days: "days",
  },
  ar: {
    title: "سياسات الأتمتة",
    subtitle: "حدود تشغيلية حتمية تستخدم للتوجيه والتصعيد الإرشادي.",
    shipmentInactivityDays: "خمول الشحنة",
    delayedShipmentDays: "تأخر الشحنة",
    missingUpdateDays: "غياب التحديث",
    disputeEscalationDays: "تصعيد النزاع",
    settlementDelayDays: "تأخر التسوية",
    paymentRiskAmount: "حد مخاطر الدفع",
    repeatedIssueThreshold: "تكرار المشكلات",
    criticalExposureAmount: "انكشاف حرج",
    days: "أيام",
  },
} as const;

export function AutomationPolicyOverview({
  policies,
  language,
  locale,
}: {
  policies: AutomationPolicyConfig;
  language: WorkflowLanguage;
  locale: string;
}) {
  const t = labels[language];
  const rows = [
    { key: "shipmentInactivityDays", value: `${policies.shipmentInactivityDays.toLocaleString(locale)} ${t.days}` },
    { key: "delayedShipmentDays", value: `${policies.delayedShipmentDays.toLocaleString(locale)} ${t.days}` },
    { key: "missingUpdateDays", value: `${policies.missingUpdateDays.toLocaleString(locale)} ${t.days}` },
    { key: "disputeEscalationDays", value: `${policies.disputeEscalationDays.toLocaleString(locale)} ${t.days}` },
    { key: "settlementDelayDays", value: `${policies.settlementDelayDays.toLocaleString(locale)} ${t.days}` },
    { key: "paymentRiskAmount", value: policies.paymentRiskAmount.toLocaleString(locale) },
    { key: "repeatedIssueThreshold", value: policies.repeatedIssueThreshold.toLocaleString(locale) },
    { key: "criticalExposureAmount", value: policies.criticalExposureAmount.toLocaleString(locale) },
  ] as const;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start gap-3">
        <SlidersHorizontal className="mt-1 h-5 w-5 text-slate-200" />
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{t.subtitle}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2.5">
            <span className="text-xs text-slate-400">{t[row.key]}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-100">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
