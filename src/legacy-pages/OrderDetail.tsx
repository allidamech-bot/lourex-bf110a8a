import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Loader2, MessageSquare } from "lucide-react";

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setMe(user.id);
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(o);
    const { data: ev } = await supabase.from("order_events" as any).select("*").eq("order_id", id).order("created_at", { ascending: false });
    setEvents((ev as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const confirmDelivery = async () => {
    setConfirming(true);
    const { error } = await supabase.rpc("confirm_delivery" as any, { p_order_id: id, p_message: "" });
    setConfirming(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Delivery confirmed");
    load();
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto p-8 pt-24"><Loader2 className="animate-spin" /></div></div>;
  if (!order) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto p-8 pt-24">Order not found.</div></div>;

  const isBuyer = me === order.buyer_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <button onClick={() => navigate("/orders")} className="text-sm text-muted-foreground hover:text-foreground mb-4">← Back to orders</button>

        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-serif text-2xl font-bold">{order.order_number}</h1>
              <p className="text-sm text-muted-foreground mt-1">Total: {order.total_amount} {order.currency} • Qty {order.quantity}</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-primary/15 text-primary">{order.status}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/messages/${order.id}`)}>
              <MessageSquare className="w-4 h-4 me-2" /> Messages
            </Button>
            {isBuyer && order.status === "delivered" && (
              <Button variant="gold" size="sm" onClick={confirmDelivery} disabled={confirming}>
                {confirming ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Check className="w-4 h-4 me-2" />}
                Confirm delivery
              </Button>
            )}
          </div>
        </div>

        <h2 className="font-serif text-xl font-semibold mb-4">Timeline</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.id} className="glass-card rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-sm">{e.event_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                </div>
                {e.message && <p className="text-sm text-muted-foreground mt-1">{e.message}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderDetail;
