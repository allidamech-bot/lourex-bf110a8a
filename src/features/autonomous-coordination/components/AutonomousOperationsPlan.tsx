import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { OperationalPlan } from '../lib/autonomousCoordinationEngine';
import { Sparkles, Target, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface AutonomousOperationsPlanProps {
  plan: OperationalPlan;
}

export const AutonomousOperationsPlan: React.FC<AutonomousOperationsPlanProps> = ({ plan }) => {
  return (
    <GlassPanel className="p-8 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 border-blue-500/10">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{plan.title}</h2>
              <p className="text-sm text-slate-400">Autonomous Execution Strategy</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Target className="w-3.5 h-3.5" />
                  <span>Readiness Score</span>
                </div>
                <span className="text-white font-bold">{plan.readinessScore}%</span>
              </div>
              <Progress value={plan.readinessScore} className="h-2 bg-white/5" indicatorClassName="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Execution Confidence</span>
                </div>
                <span className={`font-bold ${plan.confidenceScore > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {plan.confidenceScore}%
                </span>
              </div>
              <Progress value={plan.confidenceScore} className="h-2 bg-white/5" indicatorClassName={plan.confidenceScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Priority Execution Sequence</span>
            </div>
            <div className="space-y-2">
              {plan.priorities.slice(0, 3).map((step) => (
                <div key={step.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] group hover:border-blue-500/20 transition-all">
                  <div className={`w-2 h-2 rounded-full ${step.priority === 'Urgent' ? 'bg-rose-500 animate-pulse' : step.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-200">{step.action}</p>
                    <p className="text-[10px] text-slate-500">{step.expectedImpact}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] opacity-60">{step.owner}</Badge>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:w-1/3 space-y-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Execution Blockers</span>
          </div>
          <div className="space-y-3">
            {plan.blockers.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                <p className="text-xs text-emerald-400">No critical path blockers detected.</p>
              </div>
            ) : (
              plan.blockers.slice(0, 4).map((blocker) => (
                <div key={blocker.id} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] uppercase">{blocker.severity}</Badge>
                    <span className="text-[9px] text-rose-400/60 font-mono">DRAG: {blocker.propagationRisk}%</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{blocker.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};
