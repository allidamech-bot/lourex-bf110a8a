import React from "react";
import { XCircle } from "lucide-react";

export const ProductionErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-[1.25rem]">
    <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
    <p className="text-sm text-rose-200">{message}</p>
  </div>
);
