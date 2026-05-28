import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PartnerCommunicationInsight } from '../lib/partnerIntelligenceEngine';
import { MessageSquare, Calendar, CheckCircle2, ChevronRight, Hash, Send } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PartnerCommunicationCenterProps {
  insight: PartnerCommunicationInsight;
}

export const PartnerCommunicationCenter: React.FC<PartnerCommunicationCenterProps> = ({ insight }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Partner Communication Center</h3>
            <p className="text-xs text-slate-500">Engagement readiness and alignment</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-amber-500">{insight.readiness}%</div>
          <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Readiness Index</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest flex items-center gap-2">
            <Send className="w-3 h-3" />
            Follow-up Suggestions
          </p>
          <div className="space-y-2">
            {insight.followUpSuggestions.map((sug, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group cursor-pointer hover:border-amber-500/20 transition-all">
                <p className="text-xs text-slate-300">{sug}</p>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest flex items-center gap-2">
            <Hash className="w-3 h-3" />
            Suggested Message Topics
          </p>
          <div className="flex flex-wrap gap-2">
            {insight.suggestedTopics.map((topic, i) => (
              <div key={i} className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[10px] text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer">
                # {topic}
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-1">Update Summary</p>
            <p className="text-xs text-slate-300 leading-relaxed italic">"{insight.updateSummary}"</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-4 h-4 text-slate-600" />
          Recommended Check-in: <span className="text-slate-200 font-bold">{insight.nextCheckIn}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase text-emerald-400 font-black tracking-widest">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Alignment Stabilized
        </div>
      </div>
    </GlassPanel>
  );
};
