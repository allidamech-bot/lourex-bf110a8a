import { Sparkles, TrendingDown, Clock, ShieldCheck, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuoteScore } from "@/lib/quoteScoring";

interface Props {
  factoryName: string;
  quoteId: string;
  score: QuoteScore;
  totalPrice: number | null;
  currency: string;
  leadTime: string | null;
  onAccept: (quoteId: string) => void;
  accepting: boolean;
  disabled?: boolean;
}

const BestMatchCard = ({
  factoryName,
  quoteId,
  score,
  totalPrice,
  currency,
  leadTime,
  onAccept,
  accepting,
  disabled,
}: Props) => {
  return (
    <div className="relative rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-6 mb-6 shadow-lg">
      <div className="absolute -top-3 left-6 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
        <Sparkles className="w-3.5 h-3.5" />
        Best Match
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommended supplier</p>
          <h3 className="font-serif text-2xl font-bold">{factoryName}</h3>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-primary">{score.final_score}</span>
            <span className="text-sm text-muted-foreground">/ 100 score</span>
          </div>
        </div>

        <div className="text-right">
          {totalPrice != null && (
            <>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-xl">{totalPrice.toLocaleString()} {currency}</p>
            </>
          )}
          {leadTime && <p className="text-xs text-muted-foreground mt-1">Lead time: {leadTime}</p>}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {score.recommendation_reason.map((reason, i) => {
          const Icon = [TrendingDown, Clock, ShieldCheck, Package, Zap][i % 5];
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{reason}</span>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-border">
        <ScoreBar label="Price" value={score.price_score} />
        <ScoreBar label="Reliability" value={score.reliability_score} />
        <ScoreBar label="Lead time" value={score.lead_time_score} />
        <ScoreBar label="Response" value={score.response_speed_score} />
        <ScoreBar label="MOQ" value={score.moq_score} />
      </div>

      {!disabled && (
        <Button
          variant="gold"
          className="w-full mt-4"
          onClick={() => onAccept(quoteId)}
          disabled={accepting}
        >
          {accepting ? "Accepting…" : "Accept Best Offer"}
        </Button>
      )}
    </div>
  );
};

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);

export default BestMatchCard;
