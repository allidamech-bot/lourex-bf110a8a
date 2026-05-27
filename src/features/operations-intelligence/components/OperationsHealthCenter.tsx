import { Activity, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";

interface OperationsHealthCenterProps {
  activeRequests: number;
  pendingOperations: number;
  inTransitCount: number;
  delayedCount: number;
  blockedWorkflows: number;
  completionScore: number;
}

export const OperationsHealthCenter = ({
  activeRequests,
  pendingOperations,
  inTransitCount,
  delayedCount,
  blockedWorkflows,
  completionScore,
}: OperationsHealthCenterProps) => {
  const { lang } = useI18n();

  const getStatus = () => {
    if (delayedCount > 2 || blockedWorkflows > 0) return "CRITICAL";
    if (delayedCount > 0) return "ATTENTION";
    return "HEALTHY";
  };

  const status = getStatus();

  return (
    <BentoCard className="space-y-6 border-amber-200/10 bg-stone-900/50 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-500" />
          <h3 className="font-serif text-xl font-bold text-stone-100">
            {lang === "ar" ? "مركز جاهزية العمليات" : "Operations Readiness Center"}
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
          status === "HEALTHY" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" :
          status === "ATTENTION" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" :
          "border-rose-500/20 bg-rose-500/10 text-rose-300"
        }`}>
          {status === "CRITICAL" && <ShieldAlert className="h-3 w-3" />}
          {status === "ATTENTION" && <AlertCircle className="h-3 w-3" />}
          {status === "HEALTHY" && <CheckCircle2 className="h-3 w-3" />}
          {lang === "ar"
            ? (status === "HEALTHY" ? "مستقر" : status === "ATTENTION" ? "يحتاج انتباه" : "حرج")
            : status}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "طلبات الشراء" : "Purchase Requests"}</p>
          <p className="text-2xl font-bold text-stone-100">{activeRequests}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "عمليات معلقة" : "Pending Ops"}</p>
          <p className="text-2xl font-bold text-stone-100">{pendingOperations}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "شحنات جارية" : "In Transit"}</p>
          <p className="text-2xl font-bold text-stone-100">{inTransitCount}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "شحنات متأخرة" : "Delayed"}</p>
          <p className={`text-2xl font-bold ${delayedCount > 0 ? "text-rose-400" : "text-stone-300"}`}>{delayedCount}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "مسارات معطلة" : "Blocked"}</p>
          <p className={`text-2xl font-bold ${blockedWorkflows > 0 ? "text-rose-500" : "text-stone-300"}`}>{blockedWorkflows}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "نقاط الانجاز" : "Score"}</p>
          <p className="text-2xl font-bold text-emerald-400">{completionScore}%</p>
        </div>
      </div>
    </BentoCard>
  );
};
