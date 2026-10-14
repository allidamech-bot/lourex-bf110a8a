import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { forwardRef } from "react";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  span?: "1" | "2" | "full";
  onClick?: React.MouseEventHandler;
}

const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(({ children, className, style, delay = 0, span = "1", onClick }, ref) => {
  const spanClasses = {
    "1": "",
    "2": "md:col-span-2",
    full: "col-span-full",
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "relative w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-border bg-card p-4 text-card-foreground shadow-soft transition-all duration-300 hover:border-gold/30 sm:p-5",
        spanClasses[span],
        className,
        onClick && "cursor-pointer"
      )}
      style={style}
    >
      {/* Subtle top-edge shimmer */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.3), transparent)" }}
      />
      {children}
    </motion.div>
  );
});

BentoCard.displayName = "BentoCard";

export default BentoCard;
