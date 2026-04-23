import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  Handshake, Plus, Clock, CheckCircle2, XCircle, MessageSquare,
  ArrowRight, DollarSign, Globe, FileText, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type DealStatus = "draft" | "rfq_sent" | "quoted" | "negotiation" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";

interface Deal {
  id: string;
  deal_number: string;
  status: DealStatus;
  total_value: number;
  currency: string;
  origin_country: string;
  destination_country: string;
  notes: string;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground", icon: FileText, label: "Draft" },
  rfq_sent: { color: "bg-blue-500/10 text-blue-400", icon: Send, label: "RFQ Sent" },
  quoted: { color: "bg-amber-500/10 text-amber-400", icon: DollarSign, label: "Quoted" },
  negotiation: { color: "bg-purple-500/10 text-purple-400", icon: MessageSquare, label: "Negotiation" },
  accepted: { color: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2, label: "Accepted" },
  rejected: { color: "bg-red-500/10 text-red-400", icon: XCircle, label: "Rejected" },
  in_progress: { color: "bg-primary/10 text-primary", icon: ArrowRight, label: "In Progress" },
  completed: { color: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2, label: "Completed" },
  cancelled: { color: "bg-muted text-muted-foreground", icon: XCircle, label: "Cancelled" },
};

const Deals = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState("active");

  // Check if navigated from marketplace with product data
  const productFromMarketplace = location.state?.product;
  const factoryFromMarketplace = location.state?.factory;

  useEffect(() => {
    if (productFromMarketplace) setShowNew(true);
  }, [productFromMarketplace]);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      navigate("/auth");
      return;
    }
    // Deals are loaded via RLS - user sees their own deals
    const { data } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    setDeals((data as Deal[]) || []);
    setLoading(false);
  };

  const activeDeals = deals.filter((d) => !["completed", "cancelled", "rejected"].includes(d.status));
  const closedDeals = deals.filter((d) => ["completed", "cancelled", "rejected"].includes(d.status));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
                <Handshake className="w-8 h-8 text-primary" />
                Deal <span className="text-gradient-gold">Center</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your trade deals, RFQs, and negotiations</p>
            </div>
            <Button variant="gold" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 me-1" /> New Deal
            </Button>
          </div>

          {/* New Deal Form */}
          {showNew && (
            <NewDealForm
              product={productFromMarketplace}
              factory={factoryFromMarketplace}
              onClose={() => setShowNew(false)}
              onCreated={() => { setShowNew(false); loadDeals(); }}
            />
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-card border border-border/50 mb-6">
              <TabsTrigger value="active">Active ({activeDeals.length})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({closedDeals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <DealList deals={activeDeals} loading={loading} />
            </TabsContent>
            <TabsContent value="closed">
              <DealList deals={closedDeals} loading={loading} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

const DealList = ({ deals, loading }: { deals: Deal[]; loading: boolean }) => {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (deals.length === 0) {
    return (
      <div className="text-center py-16">
        <Handshake className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
        <p className="text-muted-foreground">No deals yet. Start by requesting a quote from the marketplace.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {deals.map((deal, i) => {
        const config = statusConfig[deal.status] || statusConfig.draft;
        const Icon = config.icon;
        return (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border/30 rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{deal.deal_number}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {deal.origin_country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{deal.origin_country} → {deal.destination_country}</span>}
                    <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-end">
                <Badge className={`${config.color} border-0 text-[10px]`}>{config.label}</Badge>
                {deal.total_value > 0 && (
                  <p className="text-sm font-bold text-primary mt-1">${deal.total_value.toLocaleString()}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const NewDealForm = ({
  product,
  factory,
  onClose,
  onCreated,
}: {
  product?: any;
  factory?: any;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    destination: "",
    quantity: product?.moq || "100",
    notes: product ? `Product: ${product.name}\nSupplier: ${factory?.name || ""}` : "",
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("Please login first");
      setSubmitting(false);
      return;
    }

    const dealNumber = `DEAL-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("deals").insert({
      deal_number: dealNumber,
      client_id: user.user.id,
      factory_id: factory?.id || null,
      supplier_id: factory?.owner_user_id || null,
      status: "draft",
      destination_country: form.destination,
      origin_country: factory?.location || "Turkey",
      notes: form.notes,
      total_value: 0,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Deal created successfully!");
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="bg-card border border-primary/20 rounded-xl p-6 mb-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> New Trade Deal
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg">
          <XCircle className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {product && (
        <div className="bg-secondary/50 rounded-lg p-3 text-sm">
          <p className="font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            From: {factory?.name} • {product.price_per_unit ? `$${product.price_per_unit}/unit` : "Price on request"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Destination Country</label>
          <Input
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            placeholder="e.g. Saudi Arabia"
            className="bg-secondary border-border/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
          <Input
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            placeholder="Units"
            className="bg-secondary border-border/50"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Deal details, requirements..."
          className="bg-secondary border-border/50"
          rows={3}
        />
      </div>

      <Button variant="gold" onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? "Creating..." : "Create Deal & Send RFQ"}
      </Button>
    </motion.div>
  );
};

export default Deals;
