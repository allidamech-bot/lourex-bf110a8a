import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { HealthScore } from "../lib/executiveDecisionEngine";

interface Props {
  activeRequests: number;
  activeDeals: number;
  shipments: number;
  pendingSettlements: number;
  healthScore: HealthScore;
}

export const ExecutiveKPICenter: React.FC<Props> = ({ activeRequests, activeDeals, shipments, pendingSettlements, healthScore }) => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Executive KPI Center</CardTitle></CardHeader>
    <CardContent className="grid grid-cols-2 gap-4">
      {[
        { label: "Active Deals", value: activeDeals },
        { label: "Purchase Requests", value: activeRequests },
        { label: "Shipments", value: shipments },
        { label: "Pending Settlements", value: pendingSettlements },
        { label: "Business Health", value: healthScore },
      ].map(kpi => (
        <div key={kpi.label}>
          <p className="text-xs text-slate-400">{kpi.label}</p>
          <p className="text-xl font-bold">{kpi.value}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);
