import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ExecutiveMomentum } from '../lib/executiveWorkspaceEngine';
import { Zap, TrendingUp, TrendingDown, Minus, Info, BarChart3, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ExecutiveMomentumTrackerProps {
  momentum: ExecutiveMomentum;
}

export const ExecutiveMomentumTracker: React.FC<ExecutiveMomentumTrackerProps> = ({ momentum }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Executive Momentum</h3>
            <p className="text-xs text-slate-500">Cross-system execution velocity</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${
            momentum.trend === 'Accelerating' ? 'text-emerald-500' :
            momentum.trend === 'Stable' ? 'text-blue-500' :
            'text-rose-500'
          }`}>
            {momentum.score}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {momentum.trend === 'Accelerating' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> :
             momentum.trend === 'Slowing' ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> :
             <Minus className="w-3.5 h-3.5 text-slate-500" />}
            <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest">{momentum.trend}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-tighter">Execution Velocity</span>
            <span className="text-white font-bold">{momentum.velocity}</span>
          </div>
          <Progress value={Math.min(100, momentum.velocity * 10)} className="h-1 bg-white/5" indicatorClassName="bg-purple-500" />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-tighter">Operational Drag</span>
            <span className="text-rose-400 font-bold">{momentum.drag}%</span>
          </div>
          <Progress value={momentum.drag} className="h-1 bg-white/5" indicatorClassName="bg-rose-500" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Momentum Indicators</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {momentum.momentumIndicators.map((indicator, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2">
              <Clock className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-slate-400 font-medium">{indicator}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
};
