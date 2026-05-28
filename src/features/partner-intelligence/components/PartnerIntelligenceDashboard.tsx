import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PartnerProfile } from '../lib/partnerIntelligenceEngine';
import { Briefcase, Package, Receipt, Activity, MessageSquare, ShieldCheck } from 'lucide-react';

interface PartnerIntelligenceDashboardProps {
  partners: PartnerProfile[];
}

export const PartnerIntelligenceDashboard: React.FC<PartnerIntelligenceDashboardProps> = ({ partners }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {partners.map((partner) => (
        <GlassPanel key={partner.id} className="p-6 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-white">{partner.name}</h3>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Verified Partner</p>
            </div>
            <Badge
              variant="outline"
              className={
                partner.healthStatus === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                partner.healthStatus === 'Strong' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                partner.healthStatus === 'Attention Needed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }
            >
              {partner.healthStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Active Shipments" value={partner.activeShipments} icon={<Package className="w-4 h-4 text-blue-400" />} />
            <StatItem label="Active Deals" value={partner.activeDeals} icon={<Briefcase className="w-4 h-4 text-purple-400" />} />
            <StatItem label="Pending Settlements" value={partner.pendingSettlements} icon={<Receipt className="w-4 h-4 text-emerald-400" />} />
            <StatItem label="Comm. Readiness" value={`${partner.communicationReadiness}%`} icon={<MessageSquare className="w-4 h-4 text-amber-400" />} />
          </div>

          <div className="space-y-4 pt-2">
            <ProgressMetric label="Performance Score" value={partner.performanceScore} icon={<Activity className="w-3.5 h-3.5" />} />
            <ProgressMetric label="Responsibility Score" value={partner.responsibilityScore} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};

const StatItem = ({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) => (
  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
    <div className="p-1.5 rounded-lg bg-white/5">{icon}</div>
    <div>
      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tighter">{label}</p>
      <p className="text-sm font-black text-slate-200">{value}</p>
    </div>
  </div>
);

const ProgressMetric = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-white font-bold">{value}%</span>
    </div>
    <Progress value={value} className="h-1" />
  </div>
);
