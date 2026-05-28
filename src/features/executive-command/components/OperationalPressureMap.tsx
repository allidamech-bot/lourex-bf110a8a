import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { OperationalPressure } from '../lib/executiveWorkspaceEngine';
import { Layers, Thermometer, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface OperationalPressureMapProps {
  pressures: OperationalPressure[];
}

export const OperationalPressureMap: React.FC<OperationalPressureMapProps> = ({ pressures }) => {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Thermometer className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">Systemic Pressure Map</h3>
      </div>

      <div className="space-y-6">
        {pressures.map((p, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  {p.zone}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">{p.description}</p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                  p.status === 'Overloaded' ? 'bg-rose-500 text-white' :
                  p.status === 'High' ? 'bg-amber-500 text-black' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase font-bold">
                <span className="text-slate-600">Saturation Level</span>
                <span className={p.pressureLevel > 70 ? 'text-rose-400' : 'text-slate-200'}>{p.pressureLevel}%</span>
              </div>
              <Progress
                value={p.pressureLevel}
                className="h-1 bg-white/5"
                indicatorClassName={p.pressureLevel > 70 ? 'bg-rose-500' : p.pressureLevel > 40 ? 'bg-amber-500' : 'bg-blue-500'}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed italic">
          "Pressure mapping is derived from real-time queue saturation and execution latency."
        </p>
      </div>
    </GlassPanel>
  );
};
