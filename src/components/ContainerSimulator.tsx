import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Box, Layers, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CONTAINERS: Record<string, { length: number; width: number; height: number; label: string }> = {
  "20ft": { length: 590, width: 235, height: 239, label: "20ft Standard" },
  "40ft": { length: 1203, width: 235, height: 239, label: "40ft Standard" },
  "40hc": { length: 1203, width: 235, height: 269, label: "40ft High Cube" },
};

interface BoxResult {
  lengthwise: number;
  widthwise: number;
  stackable: number;
  total: number;
}

function calculateFit(
  boxL: number, boxW: number, boxH: number,
  contL: number, contW: number, contH: number
): BoxResult {
  const lengthwise = Math.floor(contL / boxL);
  const widthwise = Math.floor(contW / boxW);
  const stackable = Math.floor(contH / boxH);
  return { lengthwise, widthwise, stackable, total: lengthwise * widthwise * stackable };
}

export const ContainerSimulator = () => {
  const { t } = useI18n();
  const [boxL, setBoxL] = useState("");
  const [boxW, setBoxW] = useState("");
  const [boxH, setBoxH] = useState("");
  const [container, setContainer] = useState<"20ft" | "40ft" | "40hc">("40ft");
  const [result, setResult] = useState<BoxResult | null>(null);

  const handleCalculate = () => {
    const l = parseFloat(boxL) || 0;
    const w = parseFloat(boxW) || 0;
    const h = parseFloat(boxH) || 0;
    if (l <= 0 || w <= 0 || h <= 0) return;
    const c = CONTAINERS[container];
    setResult(calculateFit(l, w, h, c.length, c.width, c.height));
  };

  const c = CONTAINERS[container];
  const utilization = result
    ? ((result.total * parseFloat(boxL) * parseFloat(boxW) * parseFloat(boxH)) /
        (c.length * c.width * c.height) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Box className="w-5 h-5 text-gold" />
        <h2 className="font-serif text-xl font-semibold">{t("sim.title")}</h2>
      </div>

      {/* Container selection */}
      <div className="flex gap-2">
        {(Object.keys(CONTAINERS) as Array<keyof typeof CONTAINERS>).map((key) => (
          <button
            key={key}
            onClick={() => { setContainer(key as "20ft" | "40ft" | "40hc"); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              container === key
                ? "bg-gold text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {CONTAINERS[key].label}
          </button>
        ))}
      </div>

      {/* Box dimensions */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("sim.boxLength")}</label>
          <Input type="number" placeholder="60" value={boxL} onChange={(e) => setBoxL(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("sim.boxWidth")}</label>
          <Input type="number" placeholder="40" value={boxW} onChange={(e) => setBoxW(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("sim.boxHeight")}</label>
          <Input type="number" placeholder="30" value={boxH} onChange={(e) => setBoxH(e.target.value)} className="bg-secondary border-border" />
        </div>
      </div>

      <Button variant="gold" className="w-full" onClick={handleCalculate}>
        <Layers className="w-4 h-4 me-2" /> {t("sim.calculate")}
      </Button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">{t("sim.totalBoxes")}</p>
              <p className="font-serif text-3xl font-bold text-gold">{result.total}</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">{t("sim.utilization")}</p>
              <p className="font-serif text-3xl font-bold text-gold">{utilization}%</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">{t("sim.lengthwise")}</span>
              <p className="font-bold text-foreground">{result.lengthwise}</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">{t("sim.widthwise")}</span>
              <p className="font-bold text-foreground">{result.widthwise}</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground">{t("sim.stacked")}</span>
              <p className="font-bold text-foreground">{result.stackable}</p>
            </div>
          </div>

          {/* 2D Diagram - Top-down view */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> {t("sim.topView")}
            </p>
            <div className="relative bg-secondary/20 rounded-xl border-2 border-dashed border-gold/30 overflow-hidden" style={{ aspectRatio: `${c.length}/${c.width}` }}>
              <svg viewBox={`0 0 ${c.length} ${c.width}`} className="w-full h-full">
                {/* Container outline */}
                <rect x="0" y="0" width={c.length} height={c.width} fill="none" stroke="hsl(var(--gold))" strokeWidth="3" strokeDasharray="8 4" opacity="0.4" />
                {/* Boxes */}
                {Array.from({ length: result.lengthwise }).map((_, i) =>
                  Array.from({ length: result.widthwise }).map((_, j) => (
                    <rect
                      key={`${i}-${j}`}
                      x={i * parseFloat(boxL) + 2}
                      y={j * parseFloat(boxW) + 2}
                      width={parseFloat(boxL) - 4}
                      height={parseFloat(boxW) - 4}
                      rx="2"
                      fill="hsl(var(--gold))"
                      opacity={0.6 + (((i + j) % 3) * 0.13)}
                      stroke="hsl(var(--gold))"
                      strokeWidth="1"
                    />
                  ))
                )}
              </svg>
              {/* Labels */}
              <div className="absolute bottom-1 left-2 text-[10px] text-gold/70 font-medium">{c.length}cm × {c.width}cm</div>
            </div>
          </div>

          {/* Side view */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("sim.sideView")}</p>
            <div className="relative bg-secondary/20 rounded-xl border-2 border-dashed border-gold/30 overflow-hidden" style={{ aspectRatio: `${c.length}/${c.height}` }}>
              <svg viewBox={`0 0 ${c.length} ${c.height}`} className="w-full h-full">
                <rect x="0" y="0" width={c.length} height={c.height} fill="none" stroke="hsl(var(--gold))" strokeWidth="3" strokeDasharray="8 4" opacity="0.4" />
                {Array.from({ length: result.lengthwise }).map((_, i) =>
                  Array.from({ length: result.stackable }).map((_, j) => (
                    <rect
                      key={`s-${i}-${j}`}
                      x={i * parseFloat(boxL) + 2}
                      y={c.height - (j + 1) * parseFloat(boxH) + 2}
                      width={parseFloat(boxL) - 4}
                      height={parseFloat(boxH) - 4}
                      rx="2"
                      fill="hsl(var(--gold))"
                      opacity={0.5 + (j * 0.15)}
                      stroke="hsl(var(--gold))"
                      strokeWidth="1"
                    />
                  ))
                )}
              </svg>
              <div className="absolute bottom-1 left-2 text-[10px] text-gold/70 font-medium">{c.length}cm × {c.height}cm</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
