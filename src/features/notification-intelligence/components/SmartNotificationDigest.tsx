import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const SmartNotificationDigest: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Daily Notification Digest</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm">Everything is running smoothly today.</p>
    </CardContent>
  </Card>
);
