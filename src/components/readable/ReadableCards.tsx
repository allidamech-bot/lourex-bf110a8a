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
  <div className={cn("min-w-[10rem] rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-start", className)}>
    <div className="flex items-start gap-3">
      {Icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <ArabicSafeText as="p" className="text-xs font-medium text-muted-foreground">
          {label}
        </ArabicSafeText>
        <ValueDisplay className="mt-2 text-2xl text-white">{value}</ValueDisplay>
        {helper ? (
          <ArabicSafeText as="p" className="mt-1 text-xs text-slate-400">
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
  <div className={cn("min-w-[10rem] rounded-2xl border border-border/50 bg-secondary/15 p-4 text-start", className)}>
    <ArabicSafeText as="p" className="text-xs font-medium text-muted-foreground">
      {label}
    </ArabicSafeText>
    <ValueDisplay className="mt-2 text-base text-foreground">{value}</ValueDisplay>
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
  <div className={cn("rounded-2xl border border-sky-300/20 bg-sky-400/10 p-4 text-start", className)}>
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-100">
        <HelpCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <ArabicSafeText as="h3" className="text-sm font-semibold text-sky-100">
          {title}
        </ArabicSafeText>
        <ArabicSafeText as="p" className="mt-1 text-sm text-slate-300">
          {body}
        </ArabicSafeText>
        {example ? (
          <ArabicSafeText as="p" className="mt-2 rounded-xl bg-slate-950/30 p-3 text-xs text-slate-300">
            {example}
          </ArabicSafeText>
        ) : null}
      </div>
    </div>
  </div>
);
