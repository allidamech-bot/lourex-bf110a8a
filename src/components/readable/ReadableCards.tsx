import { HelpCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ArabicSafeText = ({
  as: Component = "span",
  children,
  className,
}: {
  as?: "span" | "p" | "h2" | "h3" | "div";
  children: ReactNode;
  className?: string;
}) => (
  <Component className={cn("whitespace-normal break-words leading-relaxed tracking-normal [word-break:normal]", className)}>
    {children}
  </Component>
);

export const ValueDisplay = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("max-w-full whitespace-normal break-words font-semibold leading-relaxed tracking-normal [overflow-wrap:anywhere]", className)}>
    {children}
  </div>
);

export const ResponsiveInfoGrid = ({
  children,
  className,
  min = "minmax(min(100%,10rem),1fr)",
}: {
  children: ReactNode;
  className?: string;
  min?: string;
}) => (
  <div className={cn("grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2", className)} style={{ gridTemplateColumns: `repeat(auto-fit, ${min})` }}>
    {children}
  </div>
);

export const ReadableMetricCard = ({
  label,
  value,
  helper,
  icon: Icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) => (
  <div className={cn("min-w-[10rem] rounded-2xl border border-amber-200/10 bg-stone-50/5 p-4 text-start backdrop-blur-xl shadow-2xl shadow-black/25", className)}>
    <div className="flex items-start gap-3">
      {Icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-200">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <ArabicSafeText as="p" className="text-xs font-medium text-stone-400">
          {label}
        </ArabicSafeText>
        <ValueDisplay className="mt-2 text-2xl text-stone-100">{value}</ValueDisplay>
        {helper ? (
          <ArabicSafeText as="p" className="mt-1 text-xs text-stone-500">
            {helper}
          </ArabicSafeText>
        ) : null}
      </div>
    </div>
  </div>
);

export const ReadableInfoCard = ({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) => (
  <div className={cn("min-w-[10rem] rounded-2xl border border-amber-200/10 bg-stone-50/5 p-4 text-start backdrop-blur-xl shadow-2xl shadow-black/25", className)}>
    <ArabicSafeText as="p" className="text-xs font-medium text-stone-400">
      {label}
    </ArabicSafeText>
    <ValueDisplay className="mt-2 text-base text-stone-100">{value}</ValueDisplay>
  </div>
);

export const SectionHelpBox = ({
  title,
  body,
  example,
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  example?: ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-2xl border border-amber-200/15 bg-amber-500/10 p-4 text-start backdrop-blur-xl", className)}>
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-200">
        <HelpCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <ArabicSafeText as="h3" className="text-sm font-semibold text-amber-200">
          {title}
        </ArabicSafeText>
        <ArabicSafeText as="p" className="mt-1 text-sm text-stone-300">
          {body}
        </ArabicSafeText>
        {example ? (
          <ArabicSafeText as="p" className="mt-2 rounded-xl bg-stone-950/40 p-3 text-xs text-stone-300">
            {example}
          </ArabicSafeText>
        ) : null}
      </div>
    </div>
  </div>
);
