import { RefreshCw } from "lucide-react";
import { ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { AgentFabricLanguage, CoordinationRecoveryState } from "@/features/agent-fabric/types/agentFabricTypes";

export function CoordinationRecoveryMonitor({
  recovery,
  language,
  locale,
}: {
  recovery: CoordinationRecoveryState;
  language: AgentFabricLanguage;
  locale: string;
}) {
  const isArabic = language === "ar";
  const cards = [
    [isArabic ? "تفويضات مستعادة" : "Restored", recovery.restoredDelegations.length],
    [isArabic ? "تفويضات معادة" : "Replayed", recovery.replayedDelegations.length],
    [isArabic ? "تنظيف قديم" : "Stale cleaned", recovery.staleCleaned.length],
    [isArabic ? "وكلاء" : "Agents", recovery.hydratedAgentIds.length],
  ] as const;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div>
          <p className={`whitespace-normal break-words text-[11px] font-semibold text-amber-200 ${isArabic ? "tracking-normal" : "uppercase tracking-[0.2em]"}`}>
            {isArabic ? "استرداد التنسيق" : "Coordination Recovery"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {isArabic ? "استعادة وترطيب الحالة" : "Replay recovery and hydration"}
          </h3>
        </div>
      </div>
      <SectionHelpBox
        className="mt-4"
        title={isArabic ? "متى أراجع الاسترداد؟" : "When should I review recovery?"}
        body={
          isArabic
            ? "يعرض هذا القسم ما تمت استعادته من التفويضات والتنسيق بعد إعادة التشغيل أو المزامنة."
            : "This panel shows which delegations and coordination state were restored after replay or hydration."
        }
        example={
          isArabic
            ? "إذا كانت التفويضات المعادة مرتفعة، راجع آخر عملية تنسيق قبل السماح بتفويضات جديدة."
            : "If replayed delegations are high, review the latest coordination run before allowing new delegation."
        }
      />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
        {cards.map(([label, value]) => (
          <ReadableMetricCard key={label} label={label} value={Number(value).toLocaleString(locale)} />
        ))}
      </ResponsiveInfoGrid>
      <p className="mt-3 whitespace-normal break-words text-[11px] text-slate-500">{new Date(recovery.recoveredAt).toLocaleString(locale)}</p>
    </div>
  );
}
