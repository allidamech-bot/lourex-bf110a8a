import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface TimelineNodeProps {
  icon: LucideIcon;
  title: string;
  description: string;
  timestamp: string;
  status?: "default" | "active" | "success" | "warning";
  isLast?: boolean;
}

export const TimelineNode = ({ icon: Icon, title, description, timestamp, status = "default", isLast }: TimelineNodeProps) => {
  const statusColors = {
    default: "bg-white/5 border-white/10 text-slate-300",
    active: "bg-blue-500/15 border-blue-400/30 text-blue-200 ring-1 ring-blue-500/20",
    success: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
    warning: "bg-amber-500/15 border-amber-400/30 text-amber-200",
  };

  const lineColors = {
    default: "bg-white/10",
    active: "bg-blue-500/30",
    success: "bg-emerald-500/30",
    warning: "bg-amber-500/30",
  };

  return (
    <div className="relative flex w-full max-w-full min-w-0 gap-3 pb-6 last:pb-0 sm:gap-4">
      {!isLast && (
        <div className={cn("absolute left-[1.125rem] top-10 bottom-0 w-px", lineColors[status])} />
      )}
      
      <div className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", statusColors[status])}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h4 className="break-words text-sm font-semibold text-white">{title}</h4>
          <span className="shrink-0 break-words text-[10px] font-medium text-slate-500">{timestamp}</span>
        </div>
        <p className="mt-1 break-words text-xs leading-5 text-slate-400">{description}</p>
      </div>
    </div>
  );
};
