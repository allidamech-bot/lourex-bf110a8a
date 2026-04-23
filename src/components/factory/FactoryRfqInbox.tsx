import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, Inbox } from "lucide-react";

interface Props {
  factoryId: string;
}

type RfqRow = Tables<"rfqs">;
type QuoteRow = Tables<"quotes">;

const getString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const getNumber = (value: unknown, fallback = 0) => (typeof value === "number" ? value : fallback);

const FactoryRfqInbox = ({ factoryId }: Props) => {
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [myQuotes, setMyQuotes] = useState<Record<string, QuoteRow>>({});
  const [loading, setLoading] = useState(true);
  const [activeRfq, setActiveRfq] = useState<string | null>(null);
  const [form, setForm] = useState({ price_per_unit: "", moq: "1", lead_time: "", currency: "USD", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rfqRows } = await supabase
      .from("rfqs")
      .select("*")
      .in("status", ["open", "pending", "quoted"])
      .order("created_at", { ascending: false });
    setRfqs(rfqRows || []);

    const { data: quoteRows } = await supabase.from("quotes").select("*").eq("factory_id", factoryId);
    const mappedQuotes = (quoteRows || []).reduce<Record<string, QuoteRow>>((accumulator, row) => {
      accumulator[row.rfq_id] = row;
      return accumulator;
    }, {});
    setMyQuotes(mappedQuotes);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [factoryId]);

  const openQuoteForm = (rfqId: string) => {
    const existing = myQuotes[rfqId];
    setForm({
      price_per_unit: existing ? String(existing.price_per_unit) : "",
      moq: existing ? String(existing.moq) : "1",
      lead_time: existing ? getString(existing.lead_time) : "",
      currency: existing ? getString(existing.currency, "USD") : "USD",
      notes: existing ? getString(existing.notes) : "",
    });
    setActiveRfq(rfqId);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeRfq) return;
    if (!form.price_per_unit) {
      toast.error("Price per unit is required");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("submit_quote", {
      p_rfq_id: activeRfq,
      p_factory_id: factoryId,
      p_price_per_unit: parseFloat(form.price_per_unit),
      p_moq: parseInt(form.moq, 10) || 1,
      p_lead_time: form.lead_time,
      p_currency: form.currency,
      p_notes: form.notes,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Quote submitted");
    setActiveRfq(null);
    await load();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold">
        <Inbox className="h-5 w-5 text-primary" /> RFQ Inbox ({rfqs.length})
      </h2>

      {rfqs.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          No open RFQs match your factory right now.
        </div>
      ) : (
        <div className="space-y-3">
          {rfqs.map((rfq) => {
            const myQuote = myQuotes[rfq.id];

            return (
              <div key={rfq.id} className="glass-card rounded-xl p-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">
                      {getString(rfq.title) || getString(rfq.product_name) || getString(rfq.rfq_number)}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getString(rfq.rfq_number)} • Qty {getNumber(rfq.quantity)} • {getString(rfq.category, "Any")} • {getString(rfq.visibility)}
                    </p>
                  </div>

                  {myQuote ? (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        myQuote.status === "accepted"
                          ? "bg-primary text-primary-foreground"
                          : myQuote.status === "rejected"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                      }`}
                    >
                      Quote {getString(myQuote.status)}
                    </span>
                  ) : null}
                </div>

                {getString(rfq.notes) ? (
                  <p className="mb-3 text-sm text-muted-foreground">{getString(rfq.notes)}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => openQuoteForm(rfq.id)}
                    disabled={getString(rfq.status) === "converted" || myQuote?.status === "accepted" || myQuote?.status === "rejected"}
                  >
                    <Send className="me-2 h-4 w-4" />
                    {myQuote ? "Update quote" : "Submit quote"}
                  </Button>
                </div>

                {activeRfq === rfq.id ? (
                  <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/30 p-4">
                    <div>
                      <Label className="text-xs">Price / unit *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.price_per_unit}
                        onChange={(event) => setForm({ ...form, price_per_unit: event.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Currency</Label>
                      <select
                        className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm"
                        value={form.currency}
                        onChange={(event) => setForm({ ...form, currency: event.target.value })}
                      >
                        <option>USD</option>
                        <option>EUR</option>
                        <option>SAR</option>
                        <option>TRY</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">MOQ</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.moq}
                        onChange={(event) => setForm({ ...form, moq: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Lead time</Label>
                      <Input
                        value={form.lead_time}
                        onChange={(event) => setForm({ ...form, lead_time: event.target.value })}
                        placeholder="e.g. 4 weeks"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Button variant="gold" size="sm" type="submit" disabled={submitting}>
                        {submitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
                        Send quote
                      </Button>
                      <Button variant="ghost" size="sm" type="button" onClick={() => setActiveRfq(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FactoryRfqInbox;
