import { Users } from "lucide-react";
import type { CollaborationLanguage, OperationalPresence } from "@/features/realtime-collaboration/types/collaborationTypes";

const labels = {
  en: { title: "Operational presence", empty: "No active operator sessions." },
  ar: { title: "حضور الفريق التشغيلي", empty: "لا توجد جلسات تشغيل نشطة." },
} as const;

export function OperationalPresencePanel({
  presence,
  language,
  locale,
}: {
  presence: OperationalPresence[];
  language: CollaborationLanguage;
  locale: string;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-teal-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {presence.map((item) => (
          <div key={item.sessionId} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{item.operatorName}</p>
                <p className="mt-1 text-xs text-slate-400">{item.role} · {item.activity}</p>
                {item.activeEntityLabel ? <p className="mt-2 text-xs text-slate-500">{item.activeEntityLabel}</p> : null}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${item.stale ? "bg-amber-500/10 text-amber-100" : "bg-emerald-500/10 text-emerald-100"}`}>
                {item.heartbeatAgeSeconds.toLocaleString(locale)}s
              </span>
            </div>
          </div>
        ))}
      </div>
      {presence.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
      ) : null}
    </div>
  );
}
