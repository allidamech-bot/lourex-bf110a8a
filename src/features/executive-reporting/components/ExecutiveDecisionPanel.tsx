import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const ExecutiveDecisionPanel: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Needs Decision Now</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm text-slate-400 italic">Analysis in progress. No critical bottlenecks detected.</p>
    </CardContent>
  </Card>
);
