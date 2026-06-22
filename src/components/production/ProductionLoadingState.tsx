import React from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const ProductionLoadingState: React.FC<{ label?: string }> = ({ label }) => {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 p-4">
      <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
      <p className="text-sm text-slate-400">{label ?? t("productionFallbacks.loadingData")}</p>
    </div>
  );
};
