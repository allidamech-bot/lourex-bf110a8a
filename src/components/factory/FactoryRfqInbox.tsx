import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, Inbox } from "lucide-react";

interface Props { factoryId: string; }

const FactoryRfqInbox = ({ factoryId }: Props) => {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [myQuotes, setMyQuotes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeRfq, setActiveRfq] = useState<string | null>(null);
  const [form, setForm] = useState({ price_per_unit: "", moq: "1", lead_time: "", currency: "USD", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    // RLS will filter to invited + broadcast-eligible RFQs
    const { data: r } = await supabase.from("rfqs").select("*").in("status", ["open", "pending", "quoted"]).order("created_at", { ascending: false });
    setRfqs(r || []);
    const { data: q } = await supabase.from("quotes" as any).select("*").eq("factory_id", factoryId);
    const map: Record<string, any> = {};
    ((q as any[]) || []).forEach((row) => { map[row.rfq_id] = row; });
    setMyQuotes(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [factoryId]);

  const openQuoteForm = (rfqId: string) => {
    const existing = myQuotes[rfqId];
    setForm({
      price_per_unit: existing?.price_per_unit?.toString() || "",
      moq: existing?.moq?.toString() || "1",
      lead_time: existing?.lead_time || "",
      currency: existing?.currency || "USD",
      notes: existing?.notes || "",
    });
    setActiveRfq(rfqId);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRfq) return;
    if (!form.price_per_unit) { toast.error("Price per unit is required"); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_quote" as any, {
      p_rfq_id: activeRfq,
      p_factory_id: factoryId,
      p_price_per_unit: parseFloat(form.price_per_unit),
      p_moq: parseInt(form.moq, 10) || 1,
      p_lead_time: form.lead_time,
      p_currency: form.currency,
      p_notes: form.notes,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Quote submitted");
    setActiveRfq(null);
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

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
          {rfqs.map((r) => {
            const myQuote = myQuotes[r.id];
            return (
              <div key={r.id} className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{r.title || r.product_name || r.rfq_number}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.rfq_number} • Qty {r.quantity} • {r.category || "Any"} • {r.visibility}
                    </p>
                  </div>
                  {myQuote && (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      myQuote.status === "accepted" ? "bg-primary text-primary-foreground" :
                      myQuote.status === "rejected" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                    }`}>Quote {myQuote.status}</span>
                  )}
                </div>
                {r.notes && <p className="text-sm text-muted-foreground mb-3">{r.notes}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="gold" size="sm" onClick={() => openQuoteForm(r.id)}
                    disabled={r.status === "converted" || myQuote?.status === "accepted" || myQuote?.status === "rejected"}>
                    <Send className="w-4 h-4 me-2" />
                    {myQuote ? "Update quote" : "Submit quote"}
                  </Button>
                </div>

                {activeRfq === r.id && (
                  <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-secondary/30 p-4">
                    <div>
                      <Label className="text-xs">Price / unit *</Label>
                      <Input type="number" step="0.01" value={form.price_per_unit}
                        onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} required />
                    </div>
                    <div>
                      <Label className="text-xs">Currency</Label>
                      <select className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm"
                        value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                        <option>USD</option><option>EUR</option><option>SAR</option><option>TRY</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">MOQ</Label>
                      <Input type="number" min={1} value={form.moq}
                        onChange={(e) => setForm({ ...form, moq: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Lead time</Label>
                      <Input value={form.lead_time} onChange={(e) => setForm({ ...form, lead_time: e.target.value })}
                        placeholder="e.g. 4 weeks" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Button variant="gold" size="sm" type="submit" disabled={submitting}>
                        {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
                        Send quote
                      </Button>
                      <Button variant="ghost" size="sm" type="button" onClick={() => setActiveRfq(null)}>Cancel</Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FactoryRfqInbox;
