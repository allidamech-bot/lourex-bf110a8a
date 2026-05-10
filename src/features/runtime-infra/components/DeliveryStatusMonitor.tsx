import { Activity } from "lucide-react";
import type { NotificationDeliveryRecord, RuntimeLanguage } from "@/features/runtime-infra/types/runtimeTypes";

const labels = {
  en: { title: "Delivery status monitor", empty: "No delivery attempts recorded." },
  ar: { title: "مراقبة حالة التسليم", empty: "لا توجد محاولات تسليم مسجلة." },
} as const;

export function DeliveryStatusMonitor({
  history,
  language,
}: {
  history: NotificationDeliveryRecord[];
  language: RuntimeLanguage;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {history.slice(0, 7).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{item.channel}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.message}</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{item.status}</span>
            </div>
          </div>
        ))}
        {history.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
