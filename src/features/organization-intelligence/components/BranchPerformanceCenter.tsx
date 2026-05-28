import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BranchProfile } from '../lib/organizationIntelligenceEngine';
import { TrendingUp, Package, FileText, DollarSign, Activity } from 'lucide-react';

interface BranchPerformanceCenterProps {
  branches: BranchProfile[];
}

export const BranchPerformanceCenter: React.FC<BranchPerformanceCenterProps> = ({ branches }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {branches.map((branch) => (
        <GlassPanel key={branch.id} className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-white">{branch.name}</h3>
              <p className="text-sm text-blue-400/80">{branch.region}</p>
            </div>
            <Badge
              variant="outline"
              className={
                branch.healthStatus === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                branch.healthStatus === 'Strong' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                branch.healthStatus === 'Attention Needed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }
            >
              {branch.healthStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Active Requests</p>
                <p className="text-sm font-semibold text-slate-200">{branch.activeRequests}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Active Shipments</p>
                <p className="text-sm font-semibold text-slate-200">{branch.activeShipments}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Completed</p>
                <p className="text-sm font-semibold text-slate-200">{branch.completedOperations}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Pending Finance</p>
                <p className="text-sm font-semibold text-slate-200">{branch.pendingFinanceItems}</p>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-slate-400">Performance Score</span>
              </div>
              <span className="text-xs font-bold text-white">{branch.performanceScore}%</span>
            </div>
            <Progress value={branch.performanceScore} className="h-1.5" />
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};
