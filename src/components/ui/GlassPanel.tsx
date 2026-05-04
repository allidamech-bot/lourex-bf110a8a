import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { forwardRef } from "react";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  borderLess?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ children, className, borderLess, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "glass-panel relative overflow-hidden",
          borderLess && "border-none",
          className
        )}
        {...props}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50"
          style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }}
        />
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
