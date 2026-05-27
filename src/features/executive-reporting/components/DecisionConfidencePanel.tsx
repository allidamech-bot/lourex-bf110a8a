import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";

export const DecisionConfidencePanel: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Decision Confidence</CardTitle></CardHeader>
    <CardContent>
      <Progress value={92} className="mb-2" />
      <p className="text-xs text-slate-400">High visibility across all metrics.</p>
    </CardContent>
  </Card>
);
