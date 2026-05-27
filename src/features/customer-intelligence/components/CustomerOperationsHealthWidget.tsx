import { Activity, AlertTriangle, CheckCircle2, Clock, Route } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import BentoCard from "@/components/BentoCard";

interface CustomerOperationsHealthWidgetProps {
  activeShipmentsCount: number;
  openRequestsCount: number;
  delayedCount: number;
  lastUpdateDate?: string;
  nextAction?: string;
  nextActionAr?: string;
}

export const CustomerOperationsHealthWidget = ({
  activeShipmentsCount,
  openRequestsCount,
  delayedCount,
  lastUpdateDate,
  nextAction,
  nextActionAr,
}: CustomerOperationsHealthWidgetProps) => {
  const { lang, locale } = useI18n();

  return (
    <BentoCard className="space-y-6 border-amber-200/10 bg-stone-900/50 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-500" />
          <h3 className="font-serif text-xl font-bold text-stone-100">
            {lang === "ar" ? "جاهزية العمليات" : "Operations Health"}
          </h3>
        </div>
        {delayedCount > 0 ? (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-[10px] font-bold text-rose-300 uppercase tracking-widest">
            <AlertTriangle className="h-3 w-3" />
            {lang === "ar" ? "تنبيه" : "Attention"}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
            <CheckCircle2 className="h-3 w-3" />
            {lang === "ar" ? "مستقر" : "Healthy"}
          </span>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "شحنات نشطة" : "Active Shipments"}</p>
          <p className="text-2xl font-bold text-stone-100">{activeShipmentsCount}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "طلبات مفتوحة" : "Open Requests"}</p>
          <p className="text-2xl font-bold text-stone-100">{openRequestsCount}</p>
        </div>
        <div className="rounded-2xl bg-stone-950/40 p-4 border border-stone-800/50 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">{lang === "ar" ? "تأخيرات محتملة" : "Risk Items"}</p>
          <p className={`text-2xl font-bold ${delayedCount > 0 ? "text-rose-400" : "text-stone-300"}`}>{delayedCount}</p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 p-4">
          <Route className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest mb-1">
              {lang === "ar" ? "الإجراء التالي الموصى به" : "Next Recommended Action"}
            </p>
            <p className="text-sm leading-6 text-stone-300 font-medium">
              {lang === "ar" ? (nextActionAr || "تابع آخر التحديثات في قائمة الإشعارات.") : (nextAction || "Follow the latest updates in your notification list.")}
            </p>
          </div>
        </div>

        {lastUpdateDate && (
          <div className="flex items-center gap-2 text-[10px] text-stone-600 uppercase tracking-widest font-bold px-1">
            <Clock className="h-3 w-3" />
            <span>{lang === "ar" ? "آخر تحديث: " : "Last Update: "} {new Date(lastUpdateDate).toLocaleString(locale)}</span>
          </div>
        )}
      </div>
    </BentoCard>
  );
};
