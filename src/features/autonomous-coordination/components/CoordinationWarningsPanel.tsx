import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { CoordinationWarning } from '../lib/autonomousCoordinationEngine';
import { AlertOctagon, TriangleAlert, Info, Hammer, Ban } from 'lucide-react';

interface CoordinationWarningsPanelProps {
  warnings: CoordinationWarning[];
}

export const CoordinationWarningsPanel: React.FC<CoordinationWarningsPanelProps> = ({ warnings }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertOctagon className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-white">Coordination Warnings</h3>
      </div>

      <div className="space-y-3">
        {warnings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 opacity-60">
            <Info className="w-8 h-8 mb-2" />
            <p className="text-sm">No coordination anomalies detected.</p>
          </div>
        ) : (
          warnings.map((warning) => (
            <div key={warning.id} className="flex gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 h-fit">
                {warning.type === 'conflict' ? <Hammer className="w-4 h-4" /> :
                 warning.type === 'overload' ? <Ban className="w-4 h-4" /> :
                 <TriangleAlert className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">{warning.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{warning.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
};
