import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { TeamWorkload } from '../lib/organizationIntelligenceEngine';
import { Users, AlertCircle, CheckCircle2, ArrowRightLeft, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface TeamWorkloadDistributionProps {
  workloads: TeamWorkload[];
}

export const TeamWorkloadDistribution: React.FC<TeamWorkloadDistributionProps> = ({ workloads }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white">Team Workload Distribution</h3>
      </div>

      <div className="space-y-4">
        {workloads.map((w, idx) => (
          <div key={idx} className="flex flex-col p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/10">
                  {w.ownerName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-100">{w.ownerName}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Operator / Partner</p>
                </div>
              </div>
              {w.isOverloaded ? (
                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 gap-1">
                  <AlertCircle className="w-3 h-3" /> Overloaded
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Optimal
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase mb-0.5">Assigned Workload</p>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm font-bold text-white">{w.assignedWorkload} Active Deals</span>
                </div>
              </div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase mb-0.5">Pending Actions</p>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-bold text-white">{w.pendingActions} Items</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400 mt-0.5" />
              <span>
                <strong className="text-blue-300">Recommendation:</strong> {w.recommendedRedistribution}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
