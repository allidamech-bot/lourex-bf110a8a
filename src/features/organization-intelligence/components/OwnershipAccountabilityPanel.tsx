import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { OwnershipAccountability } from '../lib/organizationIntelligenceEngine';
import { ShieldCheck, User, Clock, AlertTriangle, Bell } from 'lucide-react';

interface OwnershipAccountabilityPanelProps {
  accountability: OwnershipAccountability[];
}

export const OwnershipAccountabilityPanel: React.FC<OwnershipAccountabilityPanelProps> = ({ accountability }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Ownership & Accountability</h3>
      </div>

      <div className="space-y-4">
        {accountability.map((acc, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white">{acc.ownerName}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Operational Accountable</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xl font-black text-slate-200">{acc.unresolvedResponsibilities}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Unresolved</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-xl font-black text-amber-500">{acc.staleActions}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Stale (7d+)</p>
                </div>
              </div>

              <div className="flex-1 max-w-xs">
                {acc.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {acc.alerts.map((alert, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-rose-400 bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {alert}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
                    <Bell className="w-3 h-3 shrink-0" />
                    Accountability Healthy
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
