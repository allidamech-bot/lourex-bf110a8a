import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TimelineNodeProps {
  title: string;
  subtitle?: string;
  time?: string;
  status?: string;
  icon?: ReactNode;
  type?: "request" | "deal" | "shipment";
  isLast?: boolean;
}

const TimelineNode: React.FC<TimelineNodeProps> = ({ 
  title, 
  subtitle, 
  time, 
  status, 
  icon,
  type = "request",
  isLast = false
}) => {
  // Color logic based on type and status
  const getStatusColor = () => {
    if (type === "request") {
      if (status === "under_review") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      if (status === "ready") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
    if (type === "deal") {
      if (status === "active") return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      if (status === "completed") return "bg-green-500/20 text-green-400 border-green-500/30";
    }
    if (type === "shipment") {
      if (status === "active") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      if (status === "delivered") return "bg-green-500/20 text-green-400 border-green-500/30";
    }
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative flex gap-4 pb-8"
    >
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[19px] top-[40px] h-[calc(100%-20px)] w-[2px] bg-gradient-to-b from-blue-500/30 to-transparent" />
      )}

      {/* Icon Circle */}
      <div className={cn(
        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.1)]",
        type === "request" && "text-yellow-400",
        type === "deal" && "text-cyan-400",
        type === "shipment" && "text-blue-400"
      )}>
        {icon}
      </div>

      {/* Content Card */}
      <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white">{title}</h4>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {time && <span className="text-[10px] font-medium text-slate-500 uppercase">{time}</span>}
        </div>
        
        {status && (
          <div className="mt-3 flex">
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              getStatusColor()
            )}>
              {status}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TimelineNode;
