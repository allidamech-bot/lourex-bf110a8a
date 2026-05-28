import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CustomerProfile } from '../lib/customerSuccessEngine';
import { Landmark, TrendingUp, RefreshCw, Zap, DollarSign } from 'lucide-react';

interface CustomerLifetimeValuePanelProps {
  profiles: CustomerProfile[];
}

export const CustomerLifetimeValuePanel: React.FC<CustomerLifetimeValuePanelProps> = ({ profiles }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {profiles.map((p) => (
        <GlassPanel key={p.id} className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{p.name} Financial Asset</h3>
                <p className="text-xs text-slate-500 font-medium">Customer Lifetime Value (LTV) Estimates</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white">${p.estimatedLTV.toLocaleString()}</p>
              <p className="text-[9px] uppercase text-emerald-400 font-bold tracking-widest">Calculated LTV</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <LTVMetric label="Repeat Activity" value={`${p.totalDeals} Deals`} icon={<RefreshCw className="w-3.5 h-3.5 text-blue-400" />} />
            <LTVMetric label="Consistency" value={`${p.financialConsistency}%`} icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} />
            <LTVMetric label="Growth Rate" value="+15%" icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />} />
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-black uppercase tracking-widest">
              <DollarSign className="w-3 h-3" />
              High Growth Opportunity Detected
            </div>
            <button className="text-[10px] text-white font-bold bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/30 transition-all uppercase">
              Expand Account
            </button>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};

const LTVMetric = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[9px] uppercase text-slate-500 font-bold tracking-tighter">{label}</span>
    </div>
    <div className="text-md font-bold text-slate-200">{value}</div>
  </div>
);
