import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const NotificationCoverageInsights: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Coverage Insights</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm">Coverage Score: 98%</p>
    </CardContent>
  </Card>
);
