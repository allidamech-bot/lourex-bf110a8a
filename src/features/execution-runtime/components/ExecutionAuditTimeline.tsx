import { History } from "lucide-react";
import type { ExecutionAuditRecord, ExecutionLanguage } from "@/features/execution-runtime/types/executionTypes";

const labels = {
  en: { title: "Execution audit timeline", empty: "No execution audit history yet." },
  ar: { title: "سجل تدقيق التنفيذ", empty: "لا يوجد سجل تدقيق تنفيذ بعد." },
} as const;

const eventLabels: Record<ExecutionLanguage, Record<string, string>> = {
  en: {
    queued: "Queued",
    approval_requested: "Approval requested",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Executed",
    failed: "Failed",
  },
  ar: {
    queued: "أضيف إلى القائمة",
    approval_requested: "تم طلب الموافقة",
    approved: "تمت الموافقة",
    rejected: "تم الرفض",
    executed: "تم التنفيذ",
    failed: "فشل التنفيذ",
  },
};

const auditMessage = (item: ExecutionAuditRecord, language: ExecutionLanguage) => {
  if (language === "en") return item.message;
  if (item.event === "queued") return "تم تسجيل الإجراء في قائمة تنفيذ محكومة وقابلة للتدقيق.";
  if (item.event === "approval_requested") return "تم إيقاف التنفيذ حتى يراجعه المسؤول المختص.";
  if (item.event === "executed") return "تم تحضير التنفيذ المحكوم دون تطبيق تغيير غير قابل للعكس.";
  if (item.event === "failed") return "تم منع التنفيذ بسبب حارس الأمان أو غياب الموافقة.";
  if (item.event === "approved") return "تم اعتماد طلب التنفيذ.";
  if (item.event === "rejected") return "تم رفض طلب التنفيذ.";
  return item.message;
};

export function ExecutionAuditTimeline({ audit, language, locale }: { audit: ExecutionAuditRecord[]; language: ExecutionLanguage; locale: string }) {
  const t = labels[language];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {audit.slice(0, 8).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="break-words font-semibold text-white">{eventLabels[language][item.event] || item.event}</p>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{new Date(item.occurredAt).toLocaleString(locale)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{auditMessage(item, language)}</p>
          </div>
        ))}
        {audit.length === 0 ? <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p> : null}
      </div>
    </div>
  );
}
