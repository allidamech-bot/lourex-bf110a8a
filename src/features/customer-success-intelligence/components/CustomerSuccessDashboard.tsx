import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/progress';
import { CustomerProfile } from '../lib/customerSuccessEngine';
import { UserCircle, Heart, ShieldAlert, BarChart3, Receipt, Star } from 'lucide-react';

interface CustomerSuccessDashboardProps {
  profiles: CustomerProfile[];
}

export const CustomerSuccessDashboard: React.FC<CustomerSuccessDashboardProps> = ({ profiles }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {profiles.map((profile) => (
        <GlassPanel key={profile.id} className="p-6 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <UserCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-bold text-white">{profile.name}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{profile.email}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                profile.classification === 'VIP' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                profile.classification === 'Priority' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                profile.classification === 'At Risk' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }
            >
              <Star className="w-3 h-3 mr-1" />
              {profile.classification}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricBox label="Health Score" value={`${profile.healthScore}%`} icon={<Heart className="w-3.5 h-3.5 text-rose-400" />} />
            <MetricBox label="Retention Risk" value={`${profile.retentionRisk}%`} icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400" />} />
            <MetricBox label="Activity Score" value={profile.activeRequests + profile.activeShipments} icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />} />
            <MetricBox label="Consistency" value={`${profile.financialConsistency}%`} icon={<Receipt className="w-3.5 h-3.5 text-emerald-400" />} />
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold">
                <span>Operational Health</span>
                <span className="text-white">{profile.healthScore}%</span>
              </div>
              <Progress value={profile.healthScore} className="h-1" indicatorClassName="bg-blue-500" />
            </div>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};

const MetricBox = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
    <div className="flex items-center gap-2 mb-1.5">
      {icon}
      <span className="text-[9px] uppercase text-slate-500 font-black tracking-tighter">{label}</span>
    </div>
    <div className="text-sm font-bold text-slate-200">{value}</div>
  </div>
);
