import type { HelpTopic } from "@/features/help-center/types/helpTypes";

export function HelpStepList({ topic }: { topic: HelpTopic }) {
  if (!topic.steps?.length) return null;

  return (
    <ol className="mt-3 space-y-2">
      {topic.steps.map((step, index) => (
        <li key={`${topic.id}-${step.title}`} className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">{step.title}</span>
            <span className="mt-1 block whitespace-normal text-sm leading-6 text-muted-foreground">{step.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
