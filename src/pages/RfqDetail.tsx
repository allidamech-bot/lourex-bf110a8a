import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { scoreQuotes, pickBestQuote, type ScoringQuote } from "@/lib/quoteScoring";
import BestMatchCard from "@/components/rfq/BestMatchCard";

const RfqDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [factories, setFactories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: r } = await supabase.from("rfqs").select("*").eq("id", id).maybeSingle();
    setRfq(r);
    const { data: q } = await supabase.from("quotes" as any).select("*").eq("rfq_id", id).order("price_per_unit");
    setQuotes((q as any[]) || []);
    const factoryIds = Array.from(new Set(((q as any[]) || []).map((x) => x.factory_id)));
    if (factoryIds.length) {
      const { data: f } = await supabase.from("factories").select("id,name,location,is_verified,reliability_score").in("id", factoryIds);
      const map: Record<string, any> = {};
      (f || []).forEach((row) => { map[row.id] = row; });
      setFactories(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const accept = async (quoteId: string) => {
    setAccepting(quoteId);
    const { data, error } = await supabase.rpc("accept_quote" as any, { p_quote_id: quoteId });
    setAccepting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Quote accepted — order created");
    navigate(`/orders/${data}`);
  };

  // Scoring (memoized — pure derivation from current state)
  const { scoreById, best } = useMemo(() => {
    if (!rfq || quotes.length === 0) return { scoreById: {}, best: null as any };
    const scoringQuotes: ScoringQuote[] = quotes.map((q) => ({
      id: q.id,
      factory_id: q.factory_id,
      price_per_unit: q.price_per_unit,
      total_price: q.total_price,
      currency: q.currency,
      moq: q.moq,
      lead_time: q.lead_time,
      status: q.status,
      created_at: q.created_at,
    }));
    const scores = scoreQuotes(scoringQuotes, factories, {
      quantity: rfq.quantity ?? 1,
      created_at: rfq.created_at,
    });
    const map: Record<string, typeof scores[number]> = {};
    scores.forEach((s) => { map[s.quote_id] = s; });
    return { scoreById: map, best: pickBestQuote(scores, scoringQuotes) };
  }, [rfq, quotes, factories]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto p-8 pt-24"><Loader2 className="animate-spin" /></div></div>;
  if (!rfq) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto p-8 pt-24">RFQ not found.</div></div>;

  const rfqLocked = rfq.status === "converted";
  const bestQuote = best ? quotes.find((q) => q.id === best.quote_id) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <button onClick={() => navigate("/rfqs")} className="text-sm text-muted-foreground hover:text-foreground mb-4">← Back to RFQs</button>

        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="font-serif text-2xl font-bold">{rfq.title || rfq.product_name || rfq.rfq_number}</h1>
              <p className="text-sm text-muted-foreground mt-1">{rfq.rfq_number}</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-primary/15 text-primary">{rfq.status}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
            <div><p className="text-muted-foreground text-xs">Category</p><p>{rfq.category || "Any"}</p></div>
            <div><p className="text-muted-foreground text-xs">Quantity</p><p>{rfq.quantity}</p></div>
            <div><p className="text-muted-foreground text-xs">Budget</p><p>{rfq.budget_min || "—"} – {rfq.budget_max || "—"} {rfq.currency}</p></div>
            <div><p className="text-muted-foreground text-xs">Target country</p><p>{rfq.target_country || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Timeline</p><p>{rfq.timeline || "—"}</p></div>
            <div><p className="text-muted-foreground text-xs">Visibility</p><p>{rfq.visibility}</p></div>
          </div>
          {rfq.notes && <p className="mt-4 text-sm border-t border-border pt-4">{rfq.notes}</p>}
        </div>

        {/* Best Match recommendation */}
        {best && bestQuote && !rfqLocked && (
          <BestMatchCard
            factoryName={factories[bestQuote.factory_id]?.name || "Supplier"}
            quoteId={bestQuote.id}
            score={best}
            totalPrice={bestQuote.total_price}
            currency={bestQuote.currency}
            leadTime={bestQuote.lead_time}
            onAccept={accept}
            accepting={accepting === bestQuote.id}
            disabled={bestQuote.status !== "pending"}
          />
        )}

        <h2 className="font-serif text-xl font-semibold mb-4">All quotes ({quotes.length})</h2>
        {quotes.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            No quotes received yet. Suppliers will respond shortly.
          </div>
        ) : (
          <div className="space-y-3">
            {[...quotes]
              .sort((a, b) => (scoreById[b.id]?.final_score ?? 0) - (scoreById[a.id]?.final_score ?? 0))
              .map((q) => {
                const f = factories[q.factory_id];
                const isAccepted = q.status === "accepted";
                const isBest = best?.quote_id === q.id;
                const s = scoreById[q.id];
                return (
                  <div
                    key={q.id}
                    className={`glass-card rounded-xl p-5 transition ${
                      isBest ? "ring-2 ring-primary/50" : ""
                    } ${isAccepted ? "border-primary" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{f?.name || "Supplier"}</h3>
                          {isBest && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold">
                              <Sparkles className="w-3 h-3" /> Best Match
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{f?.location} {f?.is_verified && "• Verified"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          isAccepted ? "bg-primary text-primary-foreground" :
                          q.status === "rejected" ? "bg-muted text-muted-foreground" : "bg-secondary"
                        }`}>{q.status}</span>
                        {s && (
                          <span className="text-xs font-semibold text-primary">
                            Score {s.final_score}/100
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div><p className="text-muted-foreground text-xs">Price/unit</p><p className="font-semibold">{q.price_per_unit} {q.currency}</p></div>
                      <div><p className="text-muted-foreground text-xs">Total</p><p className="font-semibold">{q.total_price} {q.currency}</p></div>
                      <div><p className="text-muted-foreground text-xs">MOQ</p><p>{q.moq}</p></div>
                      <div><p className="text-muted-foreground text-xs">Lead time</p><p>{q.lead_time || "—"}</p></div>
                    </div>
                    {q.notes && <p className="text-sm text-muted-foreground border-t border-border pt-3 mb-3">{q.notes}</p>}
                    {!rfqLocked && q.status === "pending" && (
                      <Button variant="gold" size="sm" onClick={() => accept(q.id)} disabled={accepting === q.id}>
                        {accepting === q.id ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Check className="w-4 h-4 me-2" />}
                        Accept This Offer
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RfqDetail;
