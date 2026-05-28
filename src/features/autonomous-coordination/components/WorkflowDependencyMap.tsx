import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { WorkflowDependency } from '../lib/autonomousCoordinationEngine';
import { GitMerge, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkflowDependencyMapProps {
  dependencies: WorkflowDependency[];
}

export const WorkflowDependencyMap: React.FC<WorkflowDependencyMapProps> = ({ dependencies }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitMerge className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Workflow Dependency Map</h3>
      </div>

      <div className="space-y-4">
        {dependencies.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm italic">
            No active cross-entity dependencies tracked.
          </div>
        ) : (
          dependencies.map((dep, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-2 flex-1">
                <div className="text-[10px] font-mono text-slate-500 bg-black/20 px-2 py-1 rounded">
                  {dep.sourceId.substring(0, 8)}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <div className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/10">
                  {dep.targetId.substring(0, 8)}
                </div>
              </div>

              <div className="flex-1 text-xs text-slate-400">
                {dep.description}
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={
                    dep.status === 'Met' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    dep.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }
                >
                  <div className="flex items-center gap-1.5">
                    {dep.status === 'Met' ? <CheckCircle2 className="w-3 h-3" /> :
                     dep.status === 'Pending' ? <Clock className="w-3 h-3" /> :
                     <AlertTriangle className="w-3 h-3" />}
                    {dep.status}
                  </div>
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
