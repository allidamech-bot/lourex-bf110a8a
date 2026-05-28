import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CriticalAction } from '../lib/executiveWorkspaceEngine';
import { AlertCircle, ArrowRight, ShieldAlert, Wallet, MessageSquare, ListTodo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CriticalActionQueueProps {
  actions: CriticalAction[];
}

export const CriticalActionQueue: React.FC<CriticalActionQueueProps> = ({ actions }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <ListTodo className="w-5 h-5 text-rose-400" />
        <h3 className="text-lg font-bold text-white">Critical Executive Queue</h3>
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 italic text-sm">
            All critical action paths are clear.
          </div>
        ) : (
          actions.map((action) => (
            <div key={action.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col md:flex-row md:items-center gap-4 group hover:border-rose-500/20 transition-all">
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 group-hover:border-rose-500/20">
                {action.type === 'workflow' ? <ShieldAlert className="w-4 h-4 text-rose-400" /> :
                 action.type === 'finance' ? <Wallet className="w-4 h-4 text-emerald-400" /> :
                 action.type === 'escalation' ? <AlertCircle className="w-4 h-4 text-amber-400" /> :
                 <MessageSquare className="w-4 h-4 text-blue-400" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">{action.title}</h4>
                  <Badge className={`${
                    action.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    action.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  } text-[9px] uppercase font-black px-1.5 h-4`}>
                    {action.priority}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{action.description}</p>
              </div>

              <button className="flex items-center gap-2 bg-white/5 text-[10px] text-slate-300 font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                Resolve
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
