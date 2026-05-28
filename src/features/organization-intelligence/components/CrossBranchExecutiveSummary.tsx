import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ExecutiveSummary } from '../lib/organizationIntelligenceEngine';
import { Award, AlertOctagon, BarChart, Lightbulb, TrendingUp, Users } from 'lucide-react';

interface CrossBranchExecutiveSummaryProps {
  summary: ExecutiveSummary;
}

export const CrossBranchExecutiveSummary: React.FC<CrossBranchExecutiveSummaryProps> = ({ summary }) => {
  return (
    <GlassPanel className="p-8 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 border-blue-500/20">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <BarChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cross-Branch Executive Summary</h2>
              <p className="text-sm text-slate-400">Consolidated organization intelligence</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SummaryMetric
              label="Best Performing Branch"
              value={summary.bestPerformingBranch}
              icon={<Award className="w-5 h-5 text-emerald-400" />}
              subValue="Highest efficiency"
            />
            <SummaryMetric
              label="Branch Needing Attention"
              value={summary.branchNeedingAttention}
              icon={<AlertOctagon className="w-5 h-5 text-rose-400" />}
              subValue="Support required"
            />
            <SummaryMetric
              label="Total Branch Workload"
              value={`${summary.totalWorkload} Operations`}
              icon={<Users className="w-5 h-5 text-blue-400" />}
              subValue="Current capacity usage"
            />
          </div>
        </div>

        <div className="lg:w-1/3 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">Executive Recommendations</span>
          </div>
          <div className="space-y-3">
            {summary.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="mt-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-sm text-slate-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

const SummaryMetric = ({ label, value, icon, subValue }: { label: string; value: string; icon: React.ReactNode; subValue: string }) => (
  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
    <div className="p-2 w-fit rounded-lg bg-white/5">
      {icon}
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-600 italic mt-1">{subValue}</p>
    </div>
  </div>
);
