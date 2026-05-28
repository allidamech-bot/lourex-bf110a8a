import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { NextBestAction } from '../lib/autonomousCoordinationEngine';
import { Star, ArrowRight, UserCircle, Target, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NextBestActionsPanelProps {
  actions: NextBestAction[];
}

export const NextBestActionsPanel: React.FC<NextBestActionsPanelProps> = ({ actions }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white">Next Best Actions</h3>
      </div>

      <div className="space-y-4">
        {actions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Operations are optimally aligned.</p>
          </div>
        ) : (
          actions.map((nba) => (
            <div key={nba.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${
                    nba.urgency === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    nba.urgency === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  } text-[10px] uppercase font-bold tracking-widest px-2 py-0.5`}>
                    {nba.urgency} Urgency
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-bold">
                  <UserCircle className="w-3 h-3" />
                  {nba.owner}
                </div>
              </div>

              <h4 className="text-md font-bold text-slate-100 mb-2">{nba.action}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{nba.reason}</p>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-black">
                  <Target className="w-3 h-3" />
                  {nba.expectedOutcome}
                </div>
                <button className="flex items-center gap-2 text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors">
                  Execute Action
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
