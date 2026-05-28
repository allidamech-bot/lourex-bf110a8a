import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExecutiveWorkspaceState } from '../lib/executiveWorkspaceEngine';
import {
  LayoutDashboard,
  Target,
  Zap,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface ExecutiveCommandWorkspaceProps {
  state: ExecutiveWorkspaceState;
}

export const ExecutiveCommandWorkspace: React.FC<ExecutiveCommandWorkspaceProps> = ({ state }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassPanel className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Business Stability</p>
              <h3 className="text-xl font-bold text-white">{state.stability.score}%</h3>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              state.stability.state === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400' :
              state.stability.state === 'Stable' ? 'bg-blue-500/10 text-blue-400' :
              'bg-amber-500/10 text-amber-400'
            }
          >
            {state.stability.state}
          </Badge>
        </GlassPanel>

        <GlassPanel className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Momentum Score</p>
              <h3 className="text-xl font-bold text-white">{state.momentum.score}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
            <ArrowUpRight className="w-3 h-3" />
            {state.momentum.trend}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Operational Resilience</p>
              <h3 className="text-xl font-bold text-white">{state.stability.operationalResilience}%</h3>
            </div>
          </div>
          <Progress value={state.stability.operationalResilience} className="h-1" indicatorClassName="bg-amber-500" />
        </GlassPanel>

        <GlassPanel className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Finance Resilience</p>
              <h3 className="text-xl font-bold text-white">{state.stability.financeResilience}%</h3>
            </div>
          </div>
          <Progress value={state.stability.financeResilience} className="h-1" indicatorClassName="bg-emerald-500" />
        </GlassPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {state.focusAreas.map((area) => (
          <GlassPanel key={area.id} className="p-6 border-white/5 hover:border-blue-500/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">{area.title}</h4>
              <div className={
                area.trend === 'up' ? 'text-emerald-400' :
                area.trend === 'down' ? 'text-rose-400' :
                'text-slate-500'
              }>
                {area.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> :
                 area.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> :
                 <Minus className="w-4 h-4" />}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black text-white">{area.metric}</p>
                <p className={`text-[10px] font-bold mt-1 uppercase ${
                  area.status === 'Excellent' ? 'text-emerald-500' :
                  area.status === 'Stable' ? 'text-blue-500' :
                  'text-amber-500'
                }`}>{area.status}</p>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/5 animate-pulse" />
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
};
