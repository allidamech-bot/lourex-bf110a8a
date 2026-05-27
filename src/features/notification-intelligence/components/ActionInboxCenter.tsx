import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export const ActionInboxCenter: React.FC = () => (
  <Card className="bg-slate-950 border-slate-800 text-white shadow-xl">
    <CardHeader><CardTitle>Action Inbox Center</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm text-slate-400">All tasks completed. No immediate actions required.</p>
    </CardContent>
  </Card>
);
