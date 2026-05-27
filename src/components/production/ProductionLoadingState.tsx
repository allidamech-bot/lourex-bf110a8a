import React from "react";
import { Loader2 } from "lucide-react";

export const ProductionLoadingState: React.FC<{ label?: string }> = ({ label = "Loading data..." }) => (
  <div className="flex items-center gap-3 p-4">
    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
    <p className="text-sm text-slate-400">{label}</p>
  </div>
);
