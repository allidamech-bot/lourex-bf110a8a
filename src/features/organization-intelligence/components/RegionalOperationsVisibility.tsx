import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { RegionalSummary } from '../lib/organizationIntelligenceEngine';
import { Globe2, MapPin, Package, Target, AlertTriangle } from 'lucide-react';

interface RegionalOperationsVisibilityProps {
  regions: RegionalSummary[];
}

export const RegionalOperationsVisibility: React.FC<RegionalOperationsVisibilityProps> = ({ regions }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe2 className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-white">Regional Operations Visibility</h3>
      </div>

      <div className="space-y-6">
        {regions.map((reg, idx) => (
          <div key={idx} className="relative pl-6 border-l border-white/10 pb-6 last:pb-0">
            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />

            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-md font-bold text-slate-100 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {reg.region}
                </h4>
                <p className="text-xs text-slate-500">{reg.operationsCount} Active Operations in this region</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <Package className="w-3 h-3" /> Shipment Distribution
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(reg.shipmentDistribution).map(([stage, count]) => (
                    <div key={stage} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
                      {stage}: <span className="text-white font-bold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(reg.shipmentDistribution).length === 0 && (
                    <span className="text-[10px] text-slate-600 italic">No shipments tracked</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <Target className="w-3 h-3" /> Request Concentration
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-xl font-black text-white">{reg.requestConcentration}</div>
                  <div className="text-[10px] text-slate-500 mb-1">New Leads</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
                  <AlertTriangle className="w-3 h-3" /> Risk Concentration
                </div>
                <div className="flex items-end gap-2">
                  <div className={`text-xl font-black ${reg.requestConcentration > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {reg.requestConcentration > 10 ? 'Moderate' : 'Low'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
