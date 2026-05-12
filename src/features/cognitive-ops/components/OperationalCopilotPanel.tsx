import { Bot } from "lucide-react";
import type { CognitiveLanguage, CopilotRecommendation } from "@/features/cognitive-ops/types/cognitiveTypes";

export function OperationalCopilotPanel({
  copilots,
  language,
}: {
  copilots: CopilotRecommendation[];
  language: CognitiveLanguage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-violet-100">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <p className="whitespace-normal text-[11px] font-semibold text-violet-200">
            {language === "ar" ? "مساعدون تشغيليون" : "Operational Copilots"}
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-white">
            {language === "ar" ? "توصيات مفسرة" : "Explainable recommendations"}
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {copilots.slice(0, 6).map((copilot) => (
          <div key={copilot.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
            <p className="text-sm font-semibold text-slate-100">{copilot.title}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{copilot.message}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full border border-white/10 px-2.5 py-1">{copilot.role}</span>
              <span className="rounded-full border border-white/10 px-2.5 py-1">{Math.round(copilot.confidence * 100)}%</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-violet-200">{copilot.approvalNote}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
