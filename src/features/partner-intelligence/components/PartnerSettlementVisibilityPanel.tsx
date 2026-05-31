import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PartnerSettlementInsight } from '../lib/partnerIntelligenceEngine';
import { Wallet, Info, AlertOctagon, TrendingUp, DollarSign } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';

interface PartnerSettlementVisibilityPanelProps {
  insight: PartnerSettlementInsight;
}

export const PartnerSettlementVisibilityPanel: React.FC<PartnerSettlementVisibilityPanelProps> = ({ insight }) => {
  const { t } = useI18n();
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-white">Partner Settlement Exposure</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ExposureMetric
          label="Pending Review"
          value={`$${insight.pendingAmount.toLocaleString()}`}
          icon={<Info className="w-4 h-4 text-blue-400" />}
        />
        <ExposureMetric
          label="Approved Unpaid"
          value={`$${insight.approvedUnpaidAmount.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
        />
        <ExposureMetric
          label="Settlement Pressure"
          value={`$${insight.settlementPressure.toLocaleString()}`}
          icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
        />
      </div>

      {insight.disputedCount > 0 && (
        <Alert className="bg-rose-500/5 border-rose-500/20 mb-6">
          <AlertOctagon className="h-4 w-4 text-rose-400" />
          <AlertTitle className="text-xs font-bold text-rose-400">{insight.disputedCount} Disputed Settlements</AlertTitle>
          <AlertDescription className="text-sm text-slate-300">
            Action required to resolve conflicts and release funds.
          </AlertDescription>
        </Alert>
      )}

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
        <div className="mt-0.5"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
        <div>
          <p className="text-[10px] uppercase text-blue-400 font-black tracking-widest">{t("commandCenter.strategicMitigation")}</p>
          <p className="text-sm text-slate-300 mt-1">{insight.mitigation}</p>
        </div>
      </div>
    </GlassPanel>
  );
};

const ExposureMetric = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-tighter">{label}</span>
    </div>
    <div className="text-xl font-bold text-white">{value}</div>
  </div>
);
