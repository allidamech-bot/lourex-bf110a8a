import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AiOrbProps {
  active?: boolean;
  className?: string;
}

const AiOrb: React.FC<AiOrbProps> = ({ active = false, className }) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <motion.div
        animate={
          active
            ? {
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
              }
            : {
                scale: 1,
                opacity: 0.3,
              }
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={cn(
          "h-16 w-16 rounded-full bg-blue-500 blur-xl",
          active ? "bg-blue-400" : "bg-slate-600"
        )}
      />
      <motion.div
        animate={
          active
            ? {
                rotate: 360,
              }
            : {}
        }
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className={cn(
          "absolute h-10 w-10 rounded-full border border-white/20 bg-gradient-to-tr from-blue-500/40 to-cyan-400/40 backdrop-blur-md",
          active ? "shadow-[0_0_20px_rgba(59,130,246,0.5)]" : ""
        )}
      />
    </div>
  );
};

export default AiOrb;
