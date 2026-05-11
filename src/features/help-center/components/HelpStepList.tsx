import type { HelpTopic } from "@/features/help-center/types/helpTypes";

export function HelpStepList({ topic }: { topic: HelpTopic }) {
  if (!topic.steps?.length) return null;

  return (
    <ol className="mt-3 space-y-2">
      {topic.steps.map((step, index) => (
        <li key={`${topic.id}-${step.title}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-xs font-semibold text-sky-100">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-100">{step.title}</span>
            <span className="mt-1 block whitespace-normal text-sm leading-6 text-slate-400">{step.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
