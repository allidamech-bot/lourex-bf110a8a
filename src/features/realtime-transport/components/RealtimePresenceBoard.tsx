import { Wifi } from "lucide-react";
import type { TransportHealth, TransportLanguage } from "@/features/realtime-transport/types/transportTypes";

const labels = {
  en: { title: "Realtime presence board", empty: "No live heartbeat records." },
  ar: { title: "لوحة الحضور المباشر", empty: "لا توجد سجلات نبض مباشرة." },
} as const;

export function RealtimePresenceBoard({
  health,
  language,
}: {
  health: TransportHealth;
  language: TransportLanguage;
}) {
  const t = labels[language];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Wifi className="h-5 w-5 text-emerald-200" />
        <h3 className="font-serif text-xl font-semibold text-white">{t.title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {health.heartbeat.map((item) => (
          <div key={item.sessionId} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-words font-semibold text-white">{item.sessionId}</p>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">{item.status}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{item.lastSeenAt}</p>
          </div>
        ))}
        {health.heartbeat.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">{t.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
