import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ShoppingBag, RefreshCw, Link2, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";


interface Order {
  id: string;
  order_number: string;
  status: string;
  buyer_id: string;
  factory_id: string | null;
  total_amount: number;
  currency: string;
  deposit_paid: boolean;
  balance_paid: boolean;
  payment_status: string;
  weight_kg: number;
  total_pallets: number;
  shipping_tracking_id: string;
  created_at: string;
}

interface FactoryOption {
  id: string;
  name: string;
}

const ORDER_STATUSES = [
  "pending", "confirmed", "production_started", "production_finished",
  "quality_check", "shipped", "customs", "delivered"
];

export const OrderManagement = () => {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: o }, { data: f }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("factories").select("id, name").order("name"),
    ]);
    setOrders((o as Order[]) || []);
    setFactories((f as FactoryOption[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusUpdate = async (id: string, status: string, depositPaid: boolean) => {
    if (["shipped", "customs", "delivered"].includes(status) && !depositPaid) {
      toast.error(t("admin.depositRequired"));
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("admin.statusUpdated"));
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        table_name: "orders",
        record_id: id,
        action: "status_change",
        new_values: { status, method: "otp_verified", timestamp: new Date().toISOString() },
        changed_by: user?.id,
      });
      await fetchData();
    }
  };

  // Status change handler
  

  const handleLinkFactory = async (orderId: string, factoryId: string) => {
    const { error } = await supabase.from("orders").update({ factory_id: factoryId || null }).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success(t("admin.factoryLinked")); await fetchData(); }
  };

  const handlePaymentToggle = async (id: string, field: "deposit_paid" | "balance_paid", value: boolean) => {
    const updateData = field === "deposit_paid" ? { deposit_paid: value } : { balance_paid: value };
    const { error } = await supabase.from("orders").update(updateData).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("admin.paymentUpdated")); await fetchData(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Order deleted"); await fetchData(); }
  };

  const statusColor: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    confirmed: "bg-blue-500/20 text-blue-400",
    production_started: "bg-yellow-500/20 text-yellow-400",
    production_finished: "bg-purple-500/20 text-purple-400",
    quality_check: "bg-orange-500/20 text-orange-400",
    shipped: "bg-cyan-500/20 text-cyan-400",
    customs: "bg-orange-500/20 text-orange-400",
    delivered: "bg-emerald-500/20 text-emerald-400",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-gold" />
          <h2 className="font-serif text-xl font-semibold">{t("admin.orders")}</h2>
        </div>
        <Button variant="ghost" onClick={fetchData} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 me-2" /> {t("admin.refresh")}
        </Button>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("admin.noOrders")}</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-serif font-semibold text-gold">{order.order_number}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()} • {order.currency} {order.total_amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.deposit_paid)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColor[order.status] || "bg-secondary"}`}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{t(`status.${s}`)}</option>
                    ))}
                  </select>
                  <button onClick={() => handleDelete(order.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {/* Link factory */}
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <select
                    value={order.factory_id || ""}
                    onChange={(e) => handleLinkFactory(order.id, e.target.value)}
                    className="flex-1 h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground"
                  >
                    <option value="">{t("admin.selectFactory")}</option>
                    {factories.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Deposit toggle */}
                <button
                  onClick={() => handlePaymentToggle(order.id, "deposit_paid", !order.deposit_paid)}
                  className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    order.deposit_paid ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {t("orders.deposit")}: {order.deposit_paid ? "✓" : "✗"}
                </button>

                {/* Balance toggle */}
                <button
                  onClick={() => handlePaymentToggle(order.id, "balance_paid", !order.balance_paid)}
                  className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors w-full ${
                    order.balance_paid ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {t("orders.balance")}: {order.balance_paid ? "✓" : "✗"}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{order.weight_kg}kg</span>
                <span>{order.total_pallets} {t("orders.pallets")}</span>
                {order.shipping_tracking_id && <span className="text-gold">🔗 {order.shipping_tracking_id}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
