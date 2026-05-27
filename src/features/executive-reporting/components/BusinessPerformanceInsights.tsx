import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const BusinessPerformanceInsights: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Business Performance Insights</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm">Operations stable. Customer activity showing growth.</p>
    </CardContent>
  </Card>
);
