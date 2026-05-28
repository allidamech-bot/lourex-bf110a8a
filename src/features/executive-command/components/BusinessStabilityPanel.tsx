import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { BusinessStability } from '../lib/executiveWorkspaceEngine';
import { ShieldCheck, HeartPulse, Activity, UserCircle, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BusinessStabilityPanelProps {
  stability: BusinessStability;
}

export const BusinessStabilityPanel: React.FC<BusinessStabilityPanelProps> = ({ stability }) => {
  return (
    <GlassPanel className="p-6 relative overflow-hidden">
      <div className="absolute top-[-40px] right-[-40px] opacity-[0.03]">
        <ShieldCheck className="w-60 h-60 text-white" />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Stability & Resilience Index</h3>
            <p className="text-xs text-slate-500">Structural integrity assessment</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${
            stability.state === 'Excellent' ? 'text-emerald-500' :
            stability.state === 'Stable' ? 'text-blue-500' :
            'text-amber-500'
          }`}>{stability.score}%</p>
          <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">{stability.state}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        <ResilienceItem label="Operational Resilience" value={stability.operationalResilience} icon={<Activity className="w-3.5 h-3.5" />} />
        <ResilienceItem label="Financial Resilience" value={stability.financeResilience} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
        <ResilienceItem label="Execution Confidence" value={stability.executionConfidence} icon={<Target className="w-3.5 h-3.5" />} />
        <ResilienceItem label="Org. Health" value={stability.organizationalHealth} icon={<UserCircle className="w-3.5 h-3.5" />} />
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <Activity className="w-3 h-3 text-emerald-400" />
          Stability Gradient: Optimized
        </div>
        <button className="text-[10px] text-white font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-all uppercase tracking-tighter">
          Audit Full System
        </button>
      </div>
    </GlassPanel>
  );
};

const ResilienceItem = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-2 text-slate-400 font-medium uppercase tracking-tighter">
        {icon}
        {label}
      </div>
      <span className="text-white font-bold">{value}%</span>
    </div>
    <Progress value={value} className="h-1 bg-white/5" indicatorClassName="bg-blue-500" />
  </div>
);
