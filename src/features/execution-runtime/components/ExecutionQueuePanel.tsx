import { ListOrdered } from "lucide-react";
import type {
  ExecutionAction,
  ExecutionLanguage,
  ExecutionPriority,
  ExecutionQueueItem,
  ExecutionStatus,
} from "@/features/execution-runtime/types/executionTypes";

const labels = {
  en: { title: "Execution queue", empty: "No execution actions queued." },
  ar: { title: "قائمة التنفيذ", empty: "لا توجد إجراءات تنفيذ في القائمة." },
} as const;

const actionLabels: Record<ExecutionLanguage, Record<ExecutionAction["type"], string>> = {
  en: {
    prepare_customer_update: "Prepare customer update",
    assign_internal_review: "Assign internal review",
    prepare_partner_escalation: "Prepare partner escalation",
    prepare_finance_review: "Prepare finance review",
    prepare_notification_dispatch: "Prepare notification dispatch",
    prepare_workflow_recovery: "Prepare workflow recovery",
    isolate_stale_execution: "Isolate stale execution",
  },
  ar: {
    prepare_customer_update: "تحضير تحديث للعميل",
    assign_internal_review: "تعيين مراجعة داخلية",
    prepare_partner_escalation: "تحضير تصعيد للشريك",
    prepare_finance_review: "تحضير مراجعة مالية",
    prepare_notification_dispatch: "تحضير إرسال تنبيه",
    prepare_workflow_recovery: "تحضير استعادة سير العمل",
    isolate_stale_execution: "عزل تنفيذ متقادم",
  },
};

const priorityLabels: Record<ExecutionLanguage, Record<ExecutionPriority, string>> = {
  en: { low: "Low", medium: "Medium", high: "High", critical: "Critical" },
  ar: { low: "منخفض", medium: "متوسط", high: "مرتفع", critical: "حرج" },
};

const statusLabels: Record<ExecutionLanguage, Record<ExecutionStatus, string>> = {
  en: {
    queued: "Queued",
    approval_required: "Approval required",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Executed",
    failed: "Failed",
    retry_ready: "Retry ready",
    stale_isolated: "Stale isolated",
  },
  ar: {
    queued: "في القائمة",
    approval_required: "يتطلب موافقة",
    approved: "موافق عليه",
    rejected: "مرفوض",
    executed: "تم التنفيذ",
    failed: "فشل",
    retry_ready: "جاهز لإعادة المحاولة",
    stale_isolated: "معزول للتقادم",
  },
};

export function ExecutionQueuePanel({ queue, language }: { queue: ExecutionQueueItem[]; language: ExecutionLanguage }) {
  const t = labels[language];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <ListOrdered className="h-5 w-5 text-indigo-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {queue.slice(0, 7).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{actionLabels[language][item.action.type]}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.action.detail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-100">{priorityLabels[language][item.action.priority]}</span>
                <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs text-slate-200">{statusLabels[language][item.status]}</span>
              </div>
            </div>
          </div>
        ))}
        {queue.length === 0 ? <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p> : null}
      </div>
    </div>
  );
}
