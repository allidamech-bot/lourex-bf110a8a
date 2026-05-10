import { BadgeCheck } from "lucide-react";
import type { ApprovalRequest, ApprovalStatus, ExecutionLanguage } from "@/features/execution-runtime/types/executionTypes";

const labels = {
  en: { title: "Approval workflow", empty: "No approval requests are pending." },
  ar: { title: "مسار الموافقات", empty: "لا توجد طلبات موافقة معلقة." },
} as const;

const statusLabels: Record<ExecutionLanguage, Record<ApprovalStatus, string>> = {
  en: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
  ar: { pending: "قيد الانتظار", approved: "موافق عليه", rejected: "مرفوض" },
};

const reviewerLabels: Record<ExecutionLanguage, Record<ApprovalRequest["reviewerRole"], string>> = {
  en: {
    operations_lead: "Operations lead",
    finance_lead: "Finance lead",
    executive: "Executive",
  },
  ar: {
    operations_lead: "قائد العمليات",
    finance_lead: "قائد المالية",
    executive: "الإدارة التنفيذية",
  },
};

const approvalReason = (approval: ApprovalRequest, language: ExecutionLanguage) =>
  language === "ar"
    ? `مطلوب اعتماد تشغيلي من ${reviewerLabels.ar[approval.reviewerRole]} قبل تنفيذ الإجراء.`
    : approval.reason;

export function ApprovalWorkflowBoard({ approvals, language }: { approvals: ApprovalRequest[]; language: ExecutionLanguage }) {
  const t = labels[language];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <BadgeCheck className="h-5 w-5 text-amber-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {approvals.slice(0, 7).map((approval) => (
          <div key={approval.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{reviewerLabels[language][approval.reviewerRole]}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{approvalReason(approval, language)}</p>
              </div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-100">{statusLabels[language][approval.status]}</span>
            </div>
          </div>
        ))}
        {approvals.length === 0 ? <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p> : null}
      </div>
    </div>
  );
}
