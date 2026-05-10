import { BellRing } from "lucide-react";
import type { NotificationQueueItem, RuntimeLanguage } from "@/features/runtime-infra/types/runtimeTypes";

const labels = {
  en: { title: "Notification delivery center", empty: "No notification deliveries queued." },
  ar: { title: "مركز تسليم الإشعارات", empty: "لا توجد إشعارات في قائمة التسليم." },
} as const;

export function NotificationDeliveryCenter({
  queue,
  language,
}: {
  queue: NotificationQueueItem[];
  language: RuntimeLanguage;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <BellRing className="h-5 w-5 text-emerald-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {queue.slice(0, 7).map((item) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{item.route.audience}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.event?.title || item.route.reason}</p>
                <p className="mt-2 text-xs text-slate-500">{item.channels.join(", ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">{item.status}</span>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-100">{item.priority}</span>
              </div>
            </div>
          </div>
        ))}
        {queue.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
