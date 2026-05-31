import React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type SidebarBadgeSeverity = "info" | "warning" | "critical";

export interface SidebarNavBadgeProps {
  count?: number | null;
  severity?: SidebarBadgeSeverity | null;
  label?: string; // Optional accessible label
  pulse?: boolean;
}

export const SidebarNavBadge: React.FC<SidebarNavBadgeProps> = ({
  count,
  severity,
  label,
  pulse = false,
}) => {
  const { lang } = useI18n();
  const isRtl = lang === "ar";

  const hasCount = count !== undefined && count !== null && count > 0;
  const showDotOnly = !hasCount && severity;

  if (!hasCount && !showDotOnly) {
    return null;
  }

  const displayCount = hasCount && count > 99 ? "99+" : count;

  // Colors based on existing matte black/gold luxury theme
  const getSeverityClasses = (sev?: SidebarBadgeSeverity | null) => {
    switch (sev) {
      case "critical":
        return "bg-red-500/20 border-red-500/30 text-red-300";
      case "warning":
        return "bg-orange-500/20 border-orange-500/30 text-orange-300";
      case "info":
      default:
        return "bg-amber-500/20 border-amber-500/30 text-amber-300";
    }
  };

  const getDotSeverityClasses = (sev?: SidebarBadgeSeverity | null) => {
    switch (sev) {
      case "critical":
        return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
      case "warning":
        return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]";
      case "info":
      default:
        return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
    }
  };

  const shouldPulse = pulse || severity === "critical";

  if (showDotOnly) {
    return (
      <span
        aria-label={label || "Alert indicator"}
        className={cn(
          "relative flex h-2 w-2 shrink-0 rounded-full",
          isRtl ? "mr-auto" : "ml-auto",
          getDotSeverityClasses(severity)
        )}
      >
        {shouldPulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              getDotSeverityClasses(severity)
            )}
          />
        )}
      </span>
    );
  }

  return (
    <span
      aria-label={label || `${count} alerts`}
      className={cn(
        "relative flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold tracking-tight shadow-sm transition-all",
        isRtl ? "mr-auto" : "ml-auto",
        getSeverityClasses(severity)
      )}
    >
      {shouldPulse && (
        <span
          className={cn(
            "absolute -inset-0.5 -z-10 animate-pulse rounded-full opacity-50",
            getSeverityClasses(severity)
          )}
        />
      )}
      {displayCount}
    </span>
  );
};
