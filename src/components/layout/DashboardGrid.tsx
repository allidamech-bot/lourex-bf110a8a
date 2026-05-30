import React from "react";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
  variant?: "balanced" | "kpi" | "main" | "wide-side";
}

export const DashboardGrid = ({
  children,
  className,
  variant = "main"
}: DashboardGridProps) => {
  if (variant === "kpi") {
    return (
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4",
        className
      )}>
        {children}
      </div>
    );
  }

  if (variant === "balanced") {
    return (
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-8",
        className
      )}>
        {children}
      </div>
    );
  }

  if (variant === "wide-side") {
    return (
      <div className={cn(
        "grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8",
        className
      )}>
        {children}
      </div>
    );
  }

  // Default main grid (2 columns on lg, 1 on mobile)
  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-2 gap-8",
      className
    )}>
      {children}
    </div>
  );
};
