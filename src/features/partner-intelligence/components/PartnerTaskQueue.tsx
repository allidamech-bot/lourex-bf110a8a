import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PartnerTask } from '../lib/partnerIntelligenceEngine';
import { ListChecks, AlertCircle, ArrowRight, Clock, Hammer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PartnerTaskQueueProps {
  tasks: PartnerTask[];
}

export const PartnerTaskQueue: React.FC<PartnerTaskQueueProps> = ({ tasks }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <ListChecks className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white">Partner Action Queue</h3>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-slate-500 italic text-sm">
            Current partner action queue is clear.
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all group">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-100">{task.title}</h4>
                  <Badge className={`${
                    task.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    task.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  } text-[9px] uppercase font-black px-1.5 h-4`}>
                    {task.priority}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{task.reason}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recommended Action</span>
                  <span className="text-xs text-blue-400 font-medium">{task.recommendedAction}</span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-all cursor-pointer">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
