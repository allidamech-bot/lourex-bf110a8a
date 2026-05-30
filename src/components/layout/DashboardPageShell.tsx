import React from "react";
import { cn } from "@/lib/utils";

interface DashboardPageShellProps {
  children: React.ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
}

export const DashboardPageShell = ({ children, className, dir }: DashboardPageShellProps) => {
  return (
    <div
      className={cn("w-full max-w-full min-w-0 space-y-12 pb-24 lg:pb-12", className)}
      dir={dir}
    >
      {children}
    </div>
  );
};
