import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CustomerSuccessInsight } from '../lib/customerSuccessEngine';
import { Lightbulb, CheckCircle2, TrendingUp, ShieldCheck, Zap } from 'lucide-react';

interface CustomerSuccessInsightsProps {
  insights: CustomerSuccessInsight[];
}

export const CustomerSuccessInsights: React.FC<CustomerSuccessInsightsProps> = ({ insights }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">Strategic Success Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 italic text-sm">
            Insufficient data for strategic satisfaction modeling.
          </div>
        ) : (
          insights.map((insight) => (
            <div key={insight.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex gap-4">
              <div className={`p-2 rounded-lg h-fit ${
                insight.severity === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                insight.severity === 'warning' ? 'bg-rose-500/10 text-rose-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {insight.type === 'satisfaction' ? <CheckCircle2 className="w-4 h-4" /> :
                 insight.type === 'pattern' ? <TrendingUp className="w-4 h-4" /> :
                 insight.type === 'financial' ? <ShieldCheck className="w-4 h-4" /> :
                 <Zap className="w-4 h-4" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100">{insight.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
