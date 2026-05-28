import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CustomerProfile } from '../lib/customerSuccessEngine';
import { Target, Star, Crown, ShieldAlert, Zap, Ghost } from 'lucide-react';

interface CustomerPriorityMatrixProps {
  profiles: CustomerProfile[];
}

export const CustomerPriorityMatrix: React.FC<CustomerPriorityMatrixProps> = ({ profiles }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Customer Priority Matrix</h3>
      </div>

      <div className="space-y-4">
        {profiles.map((p) => (
          <div key={p.id} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${
                p.classification === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                p.classification === 'Priority' ? 'bg-blue-500/20 text-blue-400' :
                p.classification === 'At Risk' ? 'bg-rose-500/20 text-rose-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {p.classification === 'VIP' ? <Crown className="w-5 h-5" /> :
                 p.classification === 'Priority' ? <Star className="w-5 h-5" /> :
                 p.classification === 'At Risk' ? <ShieldAlert className="w-5 h-5" /> :
                 p.classification === 'Dormant' ? <Ghost className="w-5 h-5" /> :
                 <Zap className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-slate-100">{p.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{p.classification} ACCOUNT</p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-sm font-bold text-slate-200">{p.totalDeals}</p>
                <p className="text-[9px] uppercase text-slate-600 font-bold">Closed Deals</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="max-w-[200px]">
                <p className="text-[10px] uppercase text-blue-400 font-black tracking-widest mb-1">Recommended Treatment</p>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  {p.classification === 'VIP' ? 'Assign senior operations manager for high-touch service.' :
                   p.classification === 'At Risk' ? 'Initiate recovery sequence and satisfaction survey.' :
                   'Maintain regular automated updates and support.'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
