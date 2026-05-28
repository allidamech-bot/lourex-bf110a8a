import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CustomerSuccessAlert } from '../lib/customerSuccessEngine';
import { AlertCircle, ShieldAlert, Zap, Clock, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomerRetentionAlertsProps {
  alerts: CustomerSuccessAlert[];
}

export const CustomerRetentionAlerts: React.FC<CustomerRetentionAlertsProps> = ({ alerts }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="w-5 h-5 text-rose-400" />
        <h3 className="text-lg font-bold text-white">Retention & Churn Risk Alerts</h3>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic text-sm">
            No critical retention risks detected.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 group transition-all hover:bg-rose-500/[0.08]">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">{alert.customerName}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{alert.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <Badge className={`${
                  alert.severity === 'CRITICAL' ? 'bg-rose-500 text-white font-black' :
                  alert.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' :
                  alert.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/20'
                } text-[9px] px-2 h-5 uppercase tracking-tighter`}>
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pl-12">{alert.description}</p>

              <div className="mt-4 pt-4 border-t border-rose-500/10 flex items-center justify-between pl-12">
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  Immediate Recovery Action Recommended
                </div>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
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
