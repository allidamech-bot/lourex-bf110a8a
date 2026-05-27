import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const ExecutiveAlertsCenter: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Executive Alerts</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm text-slate-400">All business systems operating within normal parameters.</p>
    </CardContent>
  </Card>
);
