import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { useI18n } from "@/lib/i18n";

export const OwnerCommandCenter: React.FC = () => {
  const { t } = useI18n();
  return (
    <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
      <CardHeader><CardTitle>Owner Command Center</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm">{t("commandCenter.strategicMomentum")}</p>
      </CardContent>
    </Card>
  );
};
