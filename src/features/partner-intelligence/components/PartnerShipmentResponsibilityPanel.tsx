import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PartnerShipmentInsight } from '../lib/partnerIntelligenceEngine';
import { Truck, Clock, AlertTriangle, UserCheck, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface PartnerShipmentResponsibilityPanelProps {
  insights: PartnerShipmentInsight[];
}

export const PartnerShipmentResponsibilityPanel: React.FC<PartnerShipmentResponsibilityPanelProps> = ({ insights }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <UserCheck className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Shipment Responsibility Matrix</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div key={insight.shipmentId} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-100">{insight.dealNumber}</p>
                  <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-slate-400">{insight.currentStage}</Badge>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{insight.shipmentId.substring(0, 12)}</p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className={`text-xs font-bold ${insight.deliveryRisk === 'High' ? 'text-rose-400' : insight.deliveryRisk === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {insight.deliveryRisk} Risk
                </p>
                <p className="text-[9px] uppercase text-slate-500 tracking-tighter">Delivery Status</p>
              </div>

              <div className="w-px h-8 bg-white/10" />

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3 h-3 ${insight.staleUpdates ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <span className="text-[10px] uppercase text-slate-400">{insight.staleUpdates ? 'Updates Stale' : 'Updates Current'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400">
                  <ArrowUpRight className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">{insight.nextAction}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {insights.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-sm">No shipments currently linked to this partner.</div>
        )}
      </div>
    </GlassPanel>
  );
};
