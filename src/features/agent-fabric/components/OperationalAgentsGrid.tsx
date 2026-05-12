import { Network } from "lucide-react";
import { ArabicSafeText, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import type { AgentFabricLanguage, FabricAgent } from "@/features/agent-fabric/types/agentFabricTypes";

export function OperationalAgentsGrid({
  agents,
  language,
}: {
  agents: FabricAgent[];
  language: AgentFabricLanguage;
}) {
  const isArabic = language === "ar";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
          <Network className="h-4 w-4" />
        </div>
        <div>
          <p className={`whitespace-normal break-words text-[11px] font-semibold text-cyan-200 ${isArabic ? "tracking-normal" : "uppercase tracking-[0.2em]"}`}>
            {isArabic ? "وكلاء تشغيليون" : "Operational Agents"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {isArabic ? "سجل الوكلاء المتخصصين" : "Specialized agent registry"}
          </h3>
        </div>
      </div>
      <SectionHelpBox
        className="mt-4"
        title={isArabic ? "كيف أستخدم الوكلاء التشغيليين؟" : "How do I use operational agents?"}
        body={
          isArabic
            ? "كل وكيل مسؤول عن مجال محدد مثل الشحن أو التصعيد أو المتابعة المالية، ويقترح إجراءات قابلة للمراجعة."
            : "Each agent owns a focused area such as shipment, escalation, or finance supervision and produces reviewable recommendations."
        }
        example={
          isArabic
            ? "إذا ظهر وكيل التصعيد بحمولة عالية، راجع المهام الموزعة عليه قبل إضافة تفويض جديد."
            : "If the escalation agent has high workload, review its assigned tasks before adding a new delegation."
        }
      />
      <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 13rem), 1fr)">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <ArabicSafeText as="p" className="text-sm font-semibold text-slate-100">
              {agent.label}
            </ArabicSafeText>
            <ArabicSafeText as="p" className="mt-1 text-[11px] text-slate-500">
              {agent.type}
            </ArabicSafeText>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.capabilities.slice(0, 3).map((capability) => (
                <span key={capability} className="max-w-full rounded-full border border-white/10 px-2 py-1 text-[10px] leading-5 text-slate-300 [overflow-wrap:anywhere]">
                  {capability}
                </span>
              ))}
            </div>
          </div>
        ))}
      </ResponsiveInfoGrid>
    </div>
  );
}
