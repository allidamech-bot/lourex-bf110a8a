import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { OperationalMomentum } from '../lib/autonomousCoordinationEngine';
import { Activity, TrendingUp, TrendingDown, Minus, Zap, ShieldAlert, BarChart3, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface OperationalMomentumPanelProps {
  momentum: OperationalMomentum;
}

export const OperationalMomentumPanel: React.FC<OperationalMomentumPanelProps> = ({ momentum }) => {
  return (
    <GlassPanel className="p-6 overflow-hidden relative">
      <div className="absolute top-[-20px] right-[-20px] opacity-5">
        <Activity className="w-40 h-40 text-blue-500" />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Operational Momentum</h3>
            <p className="text-xs text-slate-500">Real-time throughput velocity</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${
            momentum.state === 'Strong' ? 'text-emerald-500' :
            momentum.state === 'Stable' ? 'text-blue-500' :
            momentum.state === 'Slowing' ? 'text-amber-500' :
            'text-rose-500'
          }`}>
            {momentum.state}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {momentum.completionTrend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> :
             momentum.completionTrend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> :
             <Minus className="w-3.5 h-3.5 text-slate-400" />}
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Velocity Trend</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Throughput Quality</span>
            </div>
            <span className="text-white font-bold">{momentum.throughputQuality}%</span>
          </div>
          <Progress value={momentum.throughputQuality} className="h-1.5 bg-white/5" indicatorClassName="bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Risk Drag Coefficient</span>
            </div>
            <span className="text-rose-400 font-bold">{momentum.riskDrag}%</span>
          </div>
          <Progress value={momentum.riskDrag} className="h-1.5 bg-white/5" indicatorClassName="bg-rose-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MomentumMetric label="Momentum Score" value={momentum.score} icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />} />
        <MomentumMetric label="Stalled Work" value={momentum.stalledCount} icon={<Clock className="w-3.5 h-3.5 text-amber-400" />} />
        <MomentumMetric label="Efficiency" value={Math.round(momentum.score * 0.9)} icon={<Activity className="w-3.5 h-3.5 text-emerald-400" />} />
      </div>
    </GlassPanel>
  );
};

const MomentumMetric = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center space-y-2">
    <div className="flex justify-center">{icon}</div>
    <div className="text-xl font-bold text-white">{value}</div>
    <div className="text-[9px] uppercase tracking-tighter text-slate-500 font-black">{label}</div>
  </div>
);
