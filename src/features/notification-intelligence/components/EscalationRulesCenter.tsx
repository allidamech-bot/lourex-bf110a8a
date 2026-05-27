import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const EscalationRulesCenter: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Escalation Rules</CardTitle></CardHeader>
    <CardContent className="text-sm">
      <p>Shipment Delay &gt; 48hrs: Critical Escalation</p>
      <p>Finance Proof Pending &gt; 72hrs: High Escalation</p>
    </CardContent>
  </Card>
);
