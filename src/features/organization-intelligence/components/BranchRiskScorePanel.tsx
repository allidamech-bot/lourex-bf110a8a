import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { BranchRiskScore } from '../lib/organizationIntelligenceEngine';
import { AlertTriangle, ShieldAlert, Zap, UserCheck, BarChart3, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BranchRiskScorePanelProps {
  risks: BranchRiskScore[];
}

export const BranchRiskScorePanel: React.FC<BranchRiskScorePanelProps> = ({ risks }) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {risks.map((risk) => (
        <GlassPanel key={risk.branchId} className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${risk.overallRisk > 50 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{risk.branchName} Risk Analysis</h3>
              <p className="text-xs text-slate-500">Multidimensional risk assessment</p>
            </div>
            <div className="ml-auto text-right">
              <span className={`text-2xl font-black ${risk.overallRisk > 70 ? 'text-rose-500' : risk.overallRisk > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {risk.overallRisk}%
              </span>
              <p className="text-[10px] uppercase text-slate-600 font-bold">Overall Risk</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <RiskItem label="Operational Risk" value={risk.operationalRisk} icon={<Zap className="w-3.5 h-3.5" />} />
            <RiskItem label="Finance Risk" value={risk.financeRisk} icon={<BarChart3 className="w-3.5 h-3.5" />} />
            <RiskItem label="Shipment Risk" value={risk.shipmentRisk} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
            <RiskItem label="Follow-up Risk" value={risk.customerFollowUpRisk} icon={<UserCheck className="w-3.5 h-3.5" />} />
          </div>

          <Alert className="bg-blue-500/5 border-blue-500/20">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertTitle className="text-xs font-bold text-blue-400">Recommended Mitigation</AlertTitle>
            <AlertDescription className="text-sm text-slate-300">
              {risk.recommendedMitigation}
            </AlertDescription>
          </Alert>
        </GlassPanel>
      ))}
    </div>
  );
};

const RiskItem = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className={value > 70 ? 'text-rose-400 font-bold' : value > 40 ? 'text-amber-400' : 'text-slate-200'}>
        {value}%
      </span>
    </div>
    <Progress
      value={value}
      className="h-1"
      indicatorClassName={value > 70 ? 'bg-rose-500' : value > 40 ? 'bg-amber-500' : 'bg-blue-500'}
    />
  </div>
);
