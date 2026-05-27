import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

interface Props {
  receivables: number;
  payables: number;
}

export const ExecutiveFinanceBriefing: React.FC<Props> = ({ receivables, payables }) => {
  return (
    <Card className="bg-slate-950 border-slate-800 text-white">
      <CardHeader>
        <CardTitle>Executive Finance Briefing</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-400">Receivables</p>
          <p className="text-xl font-mono">${receivables.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Payables</p>
          <p className="text-xl font-mono">${payables.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};
