import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { OperationalBlocker } from '../lib/autonomousCoordinationEngine';
import { ShieldAlert, AlertCircle, TrendingUp, Zap, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BlockerPropagationCenterProps {
  blockers: OperationalBlocker[];
}

export const BlockerPropagationCenter: React.FC<BlockerPropagationCenterProps> = ({ blockers }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Blocker Propagation Analysis</h3>
          <p className="text-xs text-slate-500">Root cause and downstream impact simulation</p>
        </div>
      </div>

      <div className="space-y-6">
        {blockers.length === 0 ? (
          <Alert className="bg-emerald-500/5 border-emerald-500/20">
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
            <AlertTitle className="text-xs font-bold text-emerald-400">Clear Path</AlertTitle>
            <AlertDescription className="text-sm text-slate-300">
              No active operational blockers detected in the coordination layer.
            </AlertDescription>
          </Alert>
        ) : (
          blockers.map((blocker) => (
            <div key={blocker.id} className="relative pl-6 border-l border-white/10 space-y-3">
              <div className={`absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] ${blocker.severity === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />

              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{blocker.description}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    Root: {blocker.impactedEntityType} {blocker.impactedEntityId.substring(0, 8)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${blocker.severity === 'Critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                    {blocker.severity}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase">
                    <span>Propagation Risk</span>
                    <span className="text-rose-400">{blocker.propagationRisk}%</span>
                  </div>
                  <Progress value={blocker.propagationRisk} className="h-1 bg-white/5" indicatorClassName="bg-rose-500" />
                </div>
                <div className="flex items-end justify-end">
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/10">
                    <Zap className="w-3 h-3" />
                    Mitigate Source
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
