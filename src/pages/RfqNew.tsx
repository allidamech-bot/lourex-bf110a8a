import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

const CATEGORIES = [
  "Textiles & Fabrics", "Food & Beverages", "Steel & Metals", "Packaging & Paper",
  "Chemicals & Plastics", "Furniture & Home", "Electronics", "Industrial Equipment",
  "Construction Materials", "Other",
];

const RfqNew = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectFactory = params.get("factory");

  const [factories, setFactories] = useState<{ id: string; name: string; category: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "", quantity: "1", target_country: "",
    budget_min: "", budget_max: "", currency: "USD", timeline: "", notes: "",
    visibility: "targeted" as "targeted" | "broadcast",
  });
  const [invited, setInvited] = useState<Set<string>>(new Set(preselectFactory ? [preselectFactory] : []));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await supabase.from("factories").select("id,name,category").eq("is_verified", true).order("name");
      setFactories(data || []);
    })();
  }, [navigate]);

  const toggleFactory = (id: string) => {
    setInvited((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.quantity) {
      toast.error("Title and quantity are required");
      return;
    }
    if (form.visibility === "targeted" && invited.size === 0) {
      toast.error("Select at least one supplier or switch to Broadcast");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_rfq", {
      p_title: form.title.trim(),
      p_category: form.category || "",
      p_quantity: parseInt(form.quantity, 10),
      p_target_country: form.target_country,
      p_budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
      p_budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
      p_currency: form.currency,
      p_timeline: form.timeline,
      p_notes: form.notes,
      p_visibility: form.visibility,
      p_invited_factory_ids: form.visibility === "targeted" ? Array.from(invited) : [],
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("RFQ created");
    navigate(`/rfqs/${data}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold mb-2">Create RFQ</h1>
        <p className="text-muted-foreground mb-8">Request quotes from verified suppliers.</p>

        <form onSubmit={submit} className="space-y-5 glass-card rounded-xl p-6">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 5,000 cotton t-shirts for retail" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Any</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" min={1} value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Budget min</Label>
              <Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
            </div>
            <div>
              <Label>Budget max</Label>
              <Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
            </div>
            <div>
              <Label>Currency</Label>
              <select className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm"
                value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option>USD</option><option>EUR</option><option>SAR</option><option>TRY</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target country</Label>
              <Input value={form.target_country} onChange={(e) => setForm({ ...form, target_country: e.target.value })} />
            </div>
            <div>
              <Label>Timeline</Label>
              <Input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                placeholder="e.g. 4 weeks" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea className="w-full min-h-[80px] rounded-md border border-border bg-secondary px-3 py-2 text-sm"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div>
            <Label>Visibility</Label>
            <div className="flex gap-2 mt-2">
              {(["targeted", "broadcast"] as const).map((v) => (
                <button type="button" key={v} onClick={() => setForm({ ...form, visibility: v })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    form.visibility === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                  {v === "targeted" ? "Pick suppliers" : "Broadcast to category"}
                </button>
              ))}
            </div>
          </div>

          {form.visibility === "targeted" && (
            <div>
              <Label>Invite suppliers ({invited.size} selected)</Label>
              <div className="mt-2 max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                {factories.length === 0 && <p className="text-sm text-muted-foreground p-2">No verified suppliers available.</p>}
                {factories.map((f) => (
                  <label key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-secondary/40 cursor-pointer">
                    <input type="checkbox" checked={invited.has(f.id)} onChange={() => toggleFactory(f.id)} />
                    <span className="flex-1 text-sm">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{f.category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button variant="gold" type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
            Submit RFQ
          </Button>
        </form>
      </main>
    </div>
  );
};

export default RfqNew;
