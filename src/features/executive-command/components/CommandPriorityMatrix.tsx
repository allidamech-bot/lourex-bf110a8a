import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CommandPriority } from '../lib/executiveWorkspaceEngine';
import { Target, Clock, Eye, Sliders } from 'lucide-react';

interface CommandPriorityMatrixProps {
  priorities: CommandPriority[];
}

export const CommandPriorityMatrix: React.FC<CommandPriorityMatrixProps> = ({ priorities }) => {
  const now = priorities.filter(p => p.category === 'NOW');
  const next = priorities.filter(p => p.category === 'NEXT');
  const monitor = priorities.filter(p => p.category === 'MONITOR');
  const low = priorities.filter(p => p.category === 'LOW PRIORITY');

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-8">
        <Target className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Command Priority Matrix</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MatrixZone label="NOW" icon={<Clock className="w-3.5 h-3.5 text-rose-400" />} items={now} color="rose" />
        <MatrixZone label="NEXT" icon={<Target className="w-3.5 h-3.5 text-amber-400" />} items={next} color="amber" />
        <MatrixZone label="MONITOR" icon={<Eye className="w-3.5 h-3.5 text-blue-400" />} items={monitor} color="blue" />
        <MatrixZone label="STRATEGIC" icon={<Sliders className="w-3.5 h-3.5 text-emerald-400" />} items={low} color="emerald" />
      </div>
    </GlassPanel>
  );
};

const MatrixZone = ({ label, icon, items, color }: { label: string; icon: React.ReactNode; items: CommandPriority[]; color: string }) => (
  <div className={`p-4 rounded-2xl bg-${color}-500/5 border border-${color}-500/10 min-h-[160px] flex flex-col`}>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <span className={`text-[10px] font-black uppercase tracking-widest text-${color}-400`}>{label}</span>
    </div>

    <div className="space-y-2 flex-1">
      {items.length === 0 ? (
        <p className="text-[10px] text-slate-600 italic">No items identified.</p>
      ) : (
        items.map(item => (
          <div key={item.id} className="p-2 rounded-lg bg-black/40 border border-white/5">
            <p className="text-xs text-slate-200 font-bold">{item.title}</p>
            <p className="text-[9px] text-slate-500 uppercase mt-0.5">{item.pressureType}</p>
          </div>
        ))
      )}
    </div>
  </div>
);
