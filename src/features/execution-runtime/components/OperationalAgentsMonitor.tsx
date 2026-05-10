import { Bot } from "lucide-react";
import type { ExecutionAction, ExecutionAgentType, ExecutionLanguage, OperationalAgent } from "@/features/execution-runtime/types/executionTypes";

const labels = {
  en: { title: "Operational agents" },
  ar: { title: "الوكلاء التشغيليون" },
} as const;

const agentLabels: Record<ExecutionLanguage, Record<ExecutionAgentType, string>> = {
  en: {
    shipment_coordination: "Shipment coordination agent",
    escalation_handling: "Escalation handling agent",
    workflow_recovery: "Workflow recovery agent",
    notification_dispatch_preparation: "Notification dispatch preparation agent",
    finance_review_recommendation: "Finance review recommendation agent",
    operational_anomaly_handling: "Operational anomaly handling agent",
  },
  ar: {
    shipment_coordination: "وكيل تنسيق الشحنات",
    escalation_handling: "وكيل معالجة التصعيد",
    workflow_recovery: "وكيل استعادة سير العمل",
    notification_dispatch_preparation: "وكيل تحضير إرسال التنبيهات",
    finance_review_recommendation: "وكيل توصيات المراجعة المالية",
    operational_anomaly_handling: "وكيل معالجة الحالات التشغيلية غير المعتادة",
  },
};

const actionLabels: Record<ExecutionLanguage, Record<ExecutionAction["type"], string>> = {
  en: {
    prepare_customer_update: "customer update",
    assign_internal_review: "internal review",
    prepare_partner_escalation: "partner escalation",
    prepare_finance_review: "finance review",
    prepare_notification_dispatch: "notification dispatch",
    prepare_workflow_recovery: "workflow recovery",
    isolate_stale_execution: "stale execution isolation",
  },
  ar: {
    prepare_customer_update: "تحديث العميل",
    assign_internal_review: "مراجعة داخلية",
    prepare_partner_escalation: "تصعيد الشريك",
    prepare_finance_review: "مراجعة مالية",
    prepare_notification_dispatch: "إرسال تنبيه",
    prepare_workflow_recovery: "استعادة سير العمل",
    isolate_stale_execution: "عزل تنفيذ متقادم",
  },
};

const badgeLabels = {
  en: { approval: "approval", guarded: "guarded" },
  ar: { approval: "يتطلب موافقة", guarded: "محكوم" },
} as const;

export function OperationalAgentsMonitor({ agents, language }: { agents: OperationalAgent[]; language: ExecutionLanguage }) {
  const t = labels[language];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Bot className="h-5 w-5 text-emerald-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">{agentLabels[language][agent.type]}</p>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                {agent.approvalRequired ? badgeLabels[language].approval : badgeLabels[language].guarded}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {agent.supportedActions.map((action) => actionLabels[language][action]).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
