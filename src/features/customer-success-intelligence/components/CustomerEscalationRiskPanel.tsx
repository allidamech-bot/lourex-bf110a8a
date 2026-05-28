import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ShieldAlert, AlertTriangle, MessageSquareOff, Clock, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CustomerEscalationRiskPanelProps {
  riskScore: number;
  customerName: string;
}

export const CustomerEscalationRiskPanel: React.FC<CustomerEscalationRiskPanelProps> = ({ riskScore, customerName }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{customerName} Escalation Risk</h3>
            <p className="text-xs text-slate-500 font-medium">Predictive dissatisfaction modeling</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${riskScore > 70 ? 'text-rose-500' : riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {riskScore}%
          </p>
          <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Aggregated Risk</p>
        </div>
      </div>

      <div className="space-y-6">
        <RiskIndicator label="Unresolved Blockers" value={Math.min(100, riskScore * 0.8)} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <RiskIndicator label="Communication Gaps" value={Math.min(100, riskScore * 0.5)} icon={<MessageSquareOff className="w-3.5 h-3.5" />} />

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Delay Sensitivity</p>
              <p className="text-xs font-bold text-slate-200">High Impact</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-[9px] uppercase text-slate-500 font-bold">Financial Friction</p>
              <p className="text-xs font-bold text-slate-200">Low Drag</p>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

const RiskIndicator = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-2 text-slate-400 font-medium">
        {icon}
        {label}
      </div>
      <span className="text-white font-bold">{Math.round(value)}%</span>
    </div>
    <Progress value={value} className="h-1" indicatorClassName={value > 70 ? 'bg-rose-500' : 'bg-amber-500'} />
  </div>
);
