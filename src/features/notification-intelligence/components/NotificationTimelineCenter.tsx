import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const NotificationTimelineCenter: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Notification Timeline</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm text-slate-400">Monitoring incoming alerts...</p>
    </CardContent>
  </Card>
);
