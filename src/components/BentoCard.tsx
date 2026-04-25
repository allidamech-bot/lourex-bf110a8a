import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { forwardRef } from "react";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  span?: "1" | "2" | "full";
  onClick?: React.MouseEventHandler;
}

const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(({ children, className, delay = 0, span = "1", onClick }, ref) => {
  const spanClasses = {
    "1": "",
    "2": "md:col-span-2",
    full: "col-span-full",
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-[linear-gradient(180deg,hsla(var(--card)/0.94),hsla(var(--card)/0.84))] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.6)] backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_26px_55px_-30px_rgba(0,0,0,0.72)] transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/45 before:to-transparent before:content-['']",
        spanClasses[span],
        className,
        onClick && "cursor-pointer"
      )}
    >
      {children}
    </motion.div>
  );
});

BentoCard.displayName = "BentoCard";

export default BentoCard;
