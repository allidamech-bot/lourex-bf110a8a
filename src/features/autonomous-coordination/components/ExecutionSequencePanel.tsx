import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ExecutionStep } from '../lib/autonomousCoordinationEngine';
import { ListChecks, ArrowRight, User, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExecutionSequencePanelProps {
  steps: ExecutionStep[];
}

export const ExecutionSequencePanel: React.FC<ExecutionSequencePanelProps> = ({ steps }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <ListChecks className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-white">Recommended Execution Sequence</h3>
      </div>

      <div className="space-y-3">
        {steps.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Current operational queue is clear.
          </div>
        ) : (
          steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05] hover:border-emerald-500/20 transition-all group">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-xs font-black text-slate-500 border border-white/5 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all">
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-100">{step.action}</p>
                    <Badge className={`${
                      step.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      step.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    } text-[9px] px-1.5 h-4 uppercase font-black tracking-tighter`}>
                      {step.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{step.expectedImpact}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">{step.owner}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[10px] font-mono text-slate-500">{step.targetId.substring(0, 8)}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
