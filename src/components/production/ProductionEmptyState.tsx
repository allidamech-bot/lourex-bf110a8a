import React from "react";
import { AlertCircle } from "lucide-react";

export const ProductionEmptyState: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center border-dashed border-2 border-slate-800 rounded-[1.25rem]">
    <AlertCircle className="w-8 h-8 text-slate-600 mb-3" />
    <h4 className="font-semibold text-slate-300">{title}</h4>
    <p className="text-sm text-slate-500 mt-1">{description}</p>
  </div>
);
