import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PartnerPerformanceDetails } from '../lib/partnerIntelligenceEngine';
import { Activity, Star, Zap, FileText, Timer, HeartPulse } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PartnerPerformanceScorecardProps {
  details: PartnerPerformanceDetails;
  partnerName: string;
}

export const PartnerPerformanceScorecard: React.FC<PartnerPerformanceScorecardProps> = ({ details, partnerName }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{partnerName} Performance Scorecard</h3>
            <p className="text-xs text-slate-500">Multidimensional efficiency audit</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          details.overallHealth === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400' :
          details.overallHealth === 'Strong' ? 'bg-blue-500/10 text-blue-400' :
          'bg-amber-500/10 text-amber-400'
        }`}>
          {details.overallHealth} Health
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <ScoreItem label="Responsiveness" value={details.responsiveness} icon={<Timer className="w-3.5 h-3.5" />} />
        <ScoreItem label="Settlement Readiness" value={details.settlementReadiness} icon={<Zap className="w-3.5 h-3.5" />} />
        <ScoreItem label="Shipment Execution" value={details.shipmentExecution} icon={<Activity className="w-3.5 h-3.5" />} />
        <ScoreItem label="Document Completeness" value={details.documentCompleteness} icon={<FileText className="w-3.5 h-3.5" />} />
      </div>

      <div className="mt-10 pt-6 border-t border-white/5">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Bottleneck Drag Rate</p>
            <p className={`text-2xl font-black mt-1 ${details.bottleneckRate > 20 ? 'text-rose-500' : 'text-slate-200'}`}>
              {details.bottleneckRate}%
            </p>
          </div>
          <div className="text-right">
            <HeartPulse className={`w-8 h-8 ${details.overallHealth === 'Excellent' ? 'text-emerald-500' : 'text-blue-500'} opacity-20`} />
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

const ScoreItem = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-2 text-slate-400 font-medium">
        {icon}
        {label}
      </div>
      <span className="text-white font-bold">{value}%</span>
    </div>
    <Progress value={value} className="h-1" />
  </div>
);
