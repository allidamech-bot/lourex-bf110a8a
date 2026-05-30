import React from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  eyebrow?: string;
}

export const DashboardSection = ({
  title,
  description,
  icon,
  children,
  className,
  headerAction,
  eyebrow
}: DashboardSectionProps) => {
  return (
    <section className={cn("space-y-6", className)}>
      {(title || description || eyebrow) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-2">
          <div className="space-y-1">
            {eyebrow && (
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-serif text-2xl font-bold text-stone-100 flex items-center gap-2">
                {icon && <span className="text-amber-500">{icon}</span>}
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-stone-500 font-medium max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex shrink-0 items-center gap-2 pb-1">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="w-full">
        {children}
      </div>
    </section>
  );
};
