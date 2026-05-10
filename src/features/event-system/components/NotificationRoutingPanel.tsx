import { Send } from "lucide-react";
import type { EventLanguage, NotificationRoute } from "@/features/event-system/types/eventTypes";

const labels = {
  en: {
    title: "Notification routing",
    empty: "No notification routes are recommended.",
    recommendation: "Recommendation only",
  },
  ar: {
    title: "توجيه الإشعارات",
    empty: "لا توجد مسارات إشعار مقترحة.",
    recommendation: "توصية فقط",
  },
} as const;

export function NotificationRoutingPanel({
  routes,
  language,
}: {
  routes: NotificationRoute[];
  language: EventLanguage;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Send className="h-5 w-5 text-cyan-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {routes.slice(0, 8).map((route) => (
          <div key={route.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{route.audience}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{route.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{route.priority}</span>
                {route.recommendationOnly ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">{t.recommendation}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {routes.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
