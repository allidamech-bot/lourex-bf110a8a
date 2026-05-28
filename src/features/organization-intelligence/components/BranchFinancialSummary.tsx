import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { BranchFinancialSummary as FinancialSummaryType } from '../lib/organizationIntelligenceEngine';
import { Landmark, ArrowUpRight, ArrowDownRight, Activity, Wallet, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BranchFinancialSummaryProps {
  summaries: FinancialSummaryType[];
}

export const BranchFinancialSummary: React.FC<BranchFinancialSummaryProps> = ({ summaries }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {summaries.map((fin) => (
        <GlassPanel key={fin.branchId} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{fin.branchName} Financial Exposure</h3>
                <p className="text-xs text-slate-500">Real-time accounting liquidity</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400">Readiness: {fin.financeReadiness}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                Receivable Exposure
              </div>
              <p className="text-xl font-bold text-white">${fin.receivableExposure.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                Payable Exposure
              </div>
              <p className="text-xl font-bold text-white">${fin.payableExposure.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FinancialMetric
              label="Settlement Pressure"
              value={`$${fin.settlementPressure.toLocaleString()}`}
              icon={<Wallet className="w-3 h-3 text-amber-400" />}
              status={fin.settlementPressure > 10000 ? 'high' : 'low'}
            />
            <div className="col-span-2 space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider">
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  Proof Coverage
                </div>
                <span className="text-white font-bold">{fin.proofCoverage}%</span>
              </div>
              <Progress value={fin.proofCoverage} className="h-1 bg-white/5" indicatorClassName="bg-blue-500" />
            </div>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};

const FinancialMetric = ({ label, value, icon, status }: { label: string; value: string; icon: React.ReactNode; status: 'high' | 'low' }) => (
  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className={`text-sm font-bold ${status === 'high' ? 'text-amber-400' : 'text-slate-200'}`}>
      {value}
    </div>
  </div>
);
