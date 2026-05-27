import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { RiskLevel } from "../lib/financeRiskEngine";

interface Props {
  riskScore: {
    customer: RiskLevel;
    partner: RiskLevel;
    payment: RiskLevel;
    overall: RiskLevel;
  };
}

export const FinanceRiskScorePanel: React.FC<Props> = ({ riskScore }) => {
  return (
    <Card className="bg-slate-950 border-slate-800 text-white">
      <CardHeader>
        <CardTitle>Financial Risk Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-400">Overall Risk</p>
          <p className="text-2xl font-bold">{riskScore.overall}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Customer Balance</p>
          <p className="text-lg">{riskScore.customer}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Partner Settlement</p>
          <p className="text-lg">{riskScore.partner}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Payment Proof</p>
          <p className="text-lg">{riskScore.payment}</p>
        </div>
      </CardContent>
    </Card>
  );
};
