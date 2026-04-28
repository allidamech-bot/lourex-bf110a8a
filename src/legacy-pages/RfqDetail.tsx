import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import BestMatchCard from "@/components/rfq/BestMatchCard";
import { acceptQuote, fetchRfqDetail, type RfqDetailData } from "@/domain/rfq/service";
import { useI18n } from "@/lib/i18n";
import { pickBestQuote, scoreQuotes, type ScoringQuote } from "@/lib/quoteScoring";

const RfqDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [detail, setDetail] = useState<RfqDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await fetchRfqDetail(id);
      if (result.error || !result.data) {
        toast.error(result.error?.message || t("rfq.notFound"));
        setDetail(null);
      } else {
        setDetail(result.data);
      }
      setLoading(false);
    };

    void load();
  }, [id, t]);

  const accept = async (quoteId: string) => {
    setAccepting(quoteId);
    const result = await acceptQuote(quoteId);
    setAccepting(null);

    if (result.error || !result.data) {
      toast.error(result.error?.message || t("rfq.acceptFailed"));
      return;
    }

    toast.success(t("rfq.accepted"));
    navigate(`/orders/${result.data}`);
  };

  const { scoreById, best } = useMemo(() => {
    if (!detail || detail.quotes.length === 0) {
      return {
        scoreById: {} as Record<string, ReturnType<typeof scoreQuotes>[number]>,
        best: null as ReturnType<typeof pickBestQuote>,
      };
    }

    const scoringQuotes: ScoringQuote[] = detail.quotes.map((quote) => ({
      id: quote.id,
      factory_id: quote.factoryId,
      price_per_unit: quote.pricePerUnit,
      total_price: quote.totalPrice,
      currency: quote.currency,
      moq: quote.moq,
      lead_time: quote.leadTime ?? "",
      status: quote.status,
      created_at: quote.createdAt,
    }));

    const scores = scoreQuotes(scoringQuotes, Object.fromEntries(
      Object.entries(detail.factories).map(([factoryId, factory]) => [
        factoryId,
        {
          id: factory.id,
          name: factory.name,
          location: factory.location,
          is_verified: factory.isVerified,
          reliability_score: factory.reliabilityScore,
        },
      ]),
    ), {
      quantity: detail.rfq.quantity ?? 1,
      created_at: detail.rfq.createdAt,
    });

    const map: Record<string, ReturnType<typeof scoreQuotes>[number]> = {};
    scores.forEach((score) => {
      map[score.quote_id] = score;
    });

    return {
      scoreById: map,
      best: pickBestQuote(scores, scoringQuotes),
    };
  }, [detail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-8 pt-24">
          <Loader2 className="animate-spin" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-8 pt-24">{t("rfq.notFound")}</div>
      </div>
    );
  }

  const { rfq, quotes, factories } = detail;
  const rfqLocked = rfq.status === "converted";
  const bestQuote = best ? quotes.find((quote) => quote.id === best.quote_id) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pb-16 pt-24">
        <button onClick={() => navigate("/rfqs")} className="mb-4 text-sm text-muted-foreground hover:text-foreground">
          ← {t("rfq.backToList")}
        </button>

        <div className="glass-card mb-6 rounded-xl p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-bold">{rfq.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{rfq.rfqNumber}</p>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">{t(`statuses.${rfq.status}`)}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">{t("rfq.labels.category")}</p><p>{rfq.category || t("common.all")}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("rfq.labels.quantity")}</p><p>{rfq.quantity}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("rfq.labels.budget")}</p><p>{rfq.budgetMin || "—"} - {rfq.budgetMax || "—"} {rfq.currency}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("rfq.labels.targetCountry")}</p><p>{rfq.targetCountry || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("rfq.labels.timeline")}</p><p>{rfq.timeline || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("rfq.labels.visibility")}</p><p>{rfq.visibility}</p></div>
          </div>
          {rfq.notes ? <p className="mt-4 border-t border-border pt-4 text-sm">{rfq.notes}</p> : null}
        </div>

        {best && bestQuote && !rfqLocked ? (
          <BestMatchCard
            factoryName={factories[bestQuote.factoryId]?.name || t("rfq.supplierFallback")}
            quoteId={bestQuote.id}
            score={best}
            totalPrice={bestQuote.totalPrice}
            currency={bestQuote.currency}
            leadTime={bestQuote.leadTime ?? ""}
            onAccept={accept}
            accepting={accepting === bestQuote.id}
            disabled={bestQuote.status !== "pending"}
          />
        ) : null}

        <h2 className="mb-4 font-serif text-xl font-semibold">{t("rfq.allQuotes", { count: quotes.length })}</h2>
        {quotes.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            {t("rfq.noQuotes")}
          </div>
        ) : (
          <div className="space-y-3">
            {[...quotes]
              .sort((left, right) => (scoreById[right.id]?.final_score ?? 0) - (scoreById[left.id]?.final_score ?? 0))
              .map((quote) => {
                const factory = factories[quote.factoryId];
                const isAccepted = quote.status === "accepted";
                const isBest = best?.quote_id === quote.id;
                const score = scoreById[quote.id];

                return (
                  <div
                    key={quote.id}
                    className={`glass-card rounded-xl p-5 transition ${
                      isBest ? "ring-2 ring-primary/50" : ""
                    } ${isAccepted ? "border-primary" : ""}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{factory?.name || t("rfq.supplierFallback")}</h3>
                          {isBest ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              <Sparkles className="h-3 w-3" /> {t("rfq.bestMatch")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {factory?.location} {factory?.isVerified ? "• Verified" : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          isAccepted ? "bg-primary text-primary-foreground" :
                          quote.status === "rejected" ? "bg-muted text-muted-foreground" : "bg-secondary"
                        }`}>{t(`statuses.${quote.status}`)}</span>
                        {score ? (
                          <span className="text-xs font-semibold text-primary">
                            Score {score.final_score}/100
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mb-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div><p className="text-xs text-muted-foreground">{t("rfq.labels.pricePerUnit")}</p><p className="font-semibold">{quote.pricePerUnit} {quote.currency}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t("rfq.labels.total")}</p><p className="font-semibold">{quote.totalPrice} {quote.currency}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t("rfq.labels.moq")}</p><p>{quote.moq}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t("rfq.labels.leadTime")}</p><p>{quote.leadTime || "—"}</p></div>
                    </div>
                    {quote.notes ? <p className="mb-3 border-t border-border pt-3 text-sm text-muted-foreground">{quote.notes}</p> : null}
                    {!rfqLocked && quote.status === "pending" ? (
                      <Button variant="gold" size="sm" onClick={() => void accept(quote.id)} disabled={accepting === quote.id}>
                        {accepting === quote.id ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
                        {t("rfq.acceptOffer")}
                      </Button>
                    ) : null}
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
