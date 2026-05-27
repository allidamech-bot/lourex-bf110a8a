import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";

interface Props {
  score: number;
  missingProofCount: number;
}

export const AuditReadinessPanel: React.FC<Props> = ({ score, missingProofCount }) => {
  return (
    <Card className="bg-slate-950 border-slate-800 text-white">
      <CardHeader>
        <CardTitle>Audit Readiness</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Readiness Score</span>
              <span>{score}%</span>
            </div>
            <Progress value={score} />
          </div>
          <p className="text-sm text-slate-400">Missing Proof Items: {missingProofCount}</p>
        </div>
      </CardContent>
    </Card>
  );
};
