import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { FollowupRecommendation } from '../lib/customerSuccessEngine';
import { Send, Clock, UserCheck, MessageSquare, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface CustomerFollowupCenterProps {
  recommendations: FollowupRecommendation[];
}

export const CustomerFollowupCenter: React.FC<CustomerFollowupCenterProps> = ({ recommendations }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white">Engagement Follow-up Center</h3>
      </div>

      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            All customer engagements are current.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col md:flex-row md:items-center gap-4 group hover:border-blue-500/20 transition-all">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-100">{rec.action}</h4>
                  <Badge className={`${
                    rec.urgency === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    rec.urgency === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  } text-[9px] uppercase font-black px-1.5 h-4`}>
                    {rec.urgency} Urgency
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{rec.reason}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-tighter">
                  <UserCheck className="w-3 h-3" />
                  Target: {rec.customerId.substring(0, 8)}
                </div>
              </div>

              <button className="flex items-center gap-2 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-blue-500/10 hover:bg-blue-500/20 transition-all">
                Send Communication
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
