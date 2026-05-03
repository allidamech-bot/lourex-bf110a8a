import React from "react";
import GlassPanel from "@/components/ui/GlassPanel";

interface FloatingMetricsProps {
  label: string;
  value: number | string;
}

const FloatingMetrics: React.FC<FloatingMetricsProps> = ({ label, value }) => {
  return (
    <GlassPanel className="flex flex-col items-center justify-center p-6 transition-transform hover:scale-105">
      <span className="text-3xl font-bold tracking-tight text-white md:text-4xl">
        {value}
      </span>
      <span className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </GlassPanel>
  );
};

export default FloatingMetrics;
