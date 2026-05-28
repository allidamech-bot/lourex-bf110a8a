import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CrossSystemInsight } from '../lib/executiveWorkspaceEngine';
import { Lightbulb, Info, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface CrossSystemInsightsPanelProps {
  insights: CrossSystemInsight[];
}

export const CrossSystemInsightsPanel: React.FC<CrossSystemInsightsPanelProps> = ({ insights }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">Cross-System Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 italic text-sm">
            Current system patterns are within optimal ranges.
          </div>
        ) : (
          insights.map((insight) => (
            <div key={insight.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex gap-4 hover:border-blue-500/20 transition-all group">
              <div className={`p-2 rounded-lg h-fit ${
                insight.severity === 'high' ? 'bg-rose-500/10 text-rose-400' :
                insight.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {insight.type === 'operational' ? <Zap className="w-4 h-4" /> :
                 insight.type === 'financial' ? <ShieldCheck className="w-4 h-4" /> :
                 <Info className="w-4 h-4" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-200 leading-relaxed font-medium group-hover:text-white transition-colors">{insight.insight}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">{insight.type} correlation</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
