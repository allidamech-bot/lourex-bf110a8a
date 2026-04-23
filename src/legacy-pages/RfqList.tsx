import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/15 text-primary",
  pending: "bg-secondary text-secondary-foreground",
  quoted: "bg-accent/20 text-foreground",
  converted: "bg-primary text-primary-foreground",
  closed: "bg-muted text-muted-foreground",
};

const RfqList = () => {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await supabase.from("rfqs").select("*").eq("requester_id", user.id).order("created_at", { ascending: false });
      setRfqs(data || []);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">My RFQs</h1>
            <p className="text-muted-foreground">Track your sourcing requests and supplier quotes.</p>
          </div>
          <Button variant="gold" onClick={() => navigate("/rfq/new")}>
            <Plus className="w-4 h-4 me-2" /> New RFQ
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : rfqs.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">You haven't created any RFQs yet.</p>
            <Button variant="gold" onClick={() => navigate("/rfq/new")}>Create your first RFQ</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {rfqs.map((r) => (
              <Link to={`/rfqs/${r.id}`} key={r.id} className="glass-card rounded-xl p-5 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{r.title || r.product_name || r.rfq_number}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.rfq_number} • Qty {r.quantity} • {r.category || "Any category"} • {r.visibility}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status] || "bg-secondary"}`}>
                    {r.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RfqList;
