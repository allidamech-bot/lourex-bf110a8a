import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const WeeklyExecutiveSummary: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Weekly Executive Summary</CardTitle></CardHeader>
    <CardContent className="space-y-2 text-sm text-slate-300">
      <p><strong>Operations:</strong> Efficient throughput observed.</p>
      <p><strong>Finance:</strong> Liquidity metrics stable.</p>
      <p><strong>Customers:</strong> Engagement levels consistent.</p>
      <p><strong>Partners:</strong> Collaboration remains strong.</p>
    </CardContent>
  </Card>
);
