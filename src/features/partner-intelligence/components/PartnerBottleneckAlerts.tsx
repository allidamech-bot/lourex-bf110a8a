import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PartnerBottleneck } from '../lib/partnerIntelligenceEngine';
import { AlertCircle, ShieldAlert, Zap, Hammer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PartnerBottleneckAlertsProps {
  bottlenecks: PartnerBottleneck[];
}

export const PartnerBottleneckAlerts: React.FC<PartnerBottleneckAlertsProps> = ({ bottlenecks }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="w-5 h-5 text-rose-400" />
        <h3 className="text-lg font-bold text-white">Partner Bottleneck Alerts</h3>
      </div>

      <div className="space-y-4">
        {bottlenecks.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-20" />
            <p className="text-sm text-slate-500 italic">No operational bottlenecks detected for this partner.</p>
          </div>
        ) : (
          bottlenecks.map((bottleneck) => (
            <div key={bottleneck.id} className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 group">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-rose-200">{bottleneck.title}</h4>
                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] uppercase font-black px-1.5 h-4">
                  {bottleneck.severity} Severity
                </Badge>
              </div>
              <p className="text-xs text-rose-300/70 leading-relaxed mb-4">{bottleneck.description}</p>

              <div className="pt-4 border-t border-rose-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  <Hammer className="w-3 h-3" />
                  Recommended Mitigation: {bottleneck.mitigation}
                </div>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
