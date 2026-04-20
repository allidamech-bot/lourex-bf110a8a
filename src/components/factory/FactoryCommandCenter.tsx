import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContainerSimulator } from "@/components/ContainerSimulator";
import { TeamManagement } from "@/components/admin/TeamManagement";
import { SharedAccountPanel } from "@/components/account/SharedAccountPanel";
import { FactoryAnalytics } from "@/components/factory/FactoryAnalytics";
import { FactoryAccessGate } from "@/components/factory/FactoryAccessGate";
import { SupplierProductsManager } from "@/components/factory/SupplierProductsManager";
import FactoryRfqInbox from "@/components/factory/FactoryRfqInbox";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Package, Upload, Camera, MessageSquare, ShoppingBag, BarChart3, Users, UserCog, Inbox } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type FactoryTab = "overview" | "rfqs" | "analytics" | "team" | "account";

export const FactoryCommandCenter = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [factory, setFactory] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FactoryTab>("overview");
  const [showMediaUpload, setShowMediaUpload] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");

  const tabs = [
    { key: "overview" as const, label: "Operations", icon: Package },
    { key: "rfqs" as const, label: "RFQ Inbox", icon: Inbox },
    { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { key: "team" as const, label: "Team", icon: Users },
    { key: "account" as const, label: "Account", icon: UserCog },
  ];

  const loadData = async (currentUser: User) => {
    const { data: ownedFactory } = await supabase.from("factories").select("*").eq("owner_user_id", currentUser.id).maybeSingle();
    let resolvedFactory = ownedFactory;

    if (!resolvedFactory) {
      const { data: staffRow } = await supabase
        .from("organization_staff")
        .select("owner_id")
        .eq("email", currentUser.email || "")
        .eq("status", "active")
        .maybeSingle();

      if (staffRow?.owner_id) {
        const { data: teamFactory } = await supabase.from("factories").select("*").eq("owner_user_id", staffRow.owner_id).maybeSingle();
        resolvedFactory = teamFactory;
      }
    }

    setFactory(resolvedFactory);

    if (resolvedFactory) {
      const [{ data: o }, { data: p }, { count }] = await Promise.all([
        supabase.from("orders").select("*").eq("factory_id", resolvedFactory.id).order("created_at", { ascending: false }),
        supabase.from("products").select("*").eq("factory_id", resolvedFactory.id).order("created_at", { ascending: false }),
        supabase.from("organization_staff").select("id", { count: "exact", head: true }).eq("owner_id", resolvedFactory.owner_user_id).eq("status", "active"),
      ]);
      setOrders(o || []);
      setProducts(p || []);
      setStaffCount(count || 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      await loadData(user);
    };
    init();
  }, [navigate]);

  const handleUploadMedia = async (orderId: string) => {
    if (!mediaFile || !user) return;
    const filePath = `${orderId}/${Date.now()}_${mediaFile.name}`;
    const { error: uploadErr } = await supabase.storage.from("inspection-media").upload(filePath, mediaFile);
    if (uploadErr) {
      toast.error(uploadErr.message);
      return;
    }

    const { data: urlData } = supabase.storage.from("inspection-media").getPublicUrl(filePath);
    const { error } = await supabase.from("inspection_media" as any).insert({
      order_id: orderId,
      uploaded_by: user.id,
      file_url: urlData?.publicUrl || filePath,
      file_name: mediaFile.name,
      media_type: mediaFile.type.startsWith("video") ? "video" : "image",
      caption: mediaCaption,
    });

    if (error) toast.error(error.message);
    else {
      toast.success(t("factory.mediaUploaded"));
      setShowMediaUpload(null);
      setMediaFile(null);
      setMediaCaption("");
    }
  };

  const statusColor: Record<string, string> = useMemo(() => ({
    pending: "bg-secondary text-secondary-foreground",
    confirmed: "bg-primary/15 text-primary",
    production_started: "bg-accent/20 text-foreground",
    production_finished: "bg-primary/20 text-primary",
    quality_check: "bg-secondary text-primary",
    shipped: "bg-primary text-primary-foreground",
    delivered: "bg-primary/20 text-primary",
  }), []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!factory) {
    return <FactoryAccessGate />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl font-bold md:text-4xl">
              {factory.name} <span className="text-gradient-gold">Command Center</span>
            </h1>
            <p className="mt-1 text-muted-foreground">Operations, analytics, and team management for your supplier account.</p>
          </motion.div>

          <div className="mb-6 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "rfqs" && <FactoryRfqInbox factoryId={factory.id} />}
          {activeTab === "analytics" && <FactoryAnalytics orders={orders} products={products} staffCount={staffCount} />}
          {activeTab === "team" && <TeamManagement />}
          {activeTab === "account" && <SharedAccountPanel title="Factory Account" companyTitle="Factory Profile" deleteRedirectTo="/" />}

          {activeTab === "overview" && (
            <>
              <SupplierProductsManager
                factoryId={factory.id}
                userId={user!.id}
                products={products as any}
                onChanged={() => loadData(user as User)}
              />

              <section className="mb-12">
                <h2 className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {t("factory.activeOrders")} ({orders.length})
                </h2>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif font-semibold">{order.order_number}</h3>
                          <p className="text-xs text-muted-foreground">{order.quantity} units • {order.weight_kg} kg</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[order.status] || "bg-secondary"}`}>{t(`status.${order.status}`) || order.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${order.id}`)} className="text-primary">
                          View timeline
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowMediaUpload(showMediaUpload === order.id ? null : order.id)} className="text-primary">
                          <Camera className="me-1 h-4 w-4" /> {t("factory.uploadInspection")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/messages/${order.id}`)} className="text-muted-foreground">
                          <MessageSquare className="me-1 h-4 w-4" /> {t("factory.messages")}
                        </Button>
                        {["pending","confirmed","in_production","quality_check","shipped"].includes(order.status) && (
                          <select
                            className="h-8 rounded-md border border-border bg-secondary px-2 text-xs"
                            value=""
                            onChange={async (e) => {
                              if (!e.target.value) return;
                              const { error } = await supabase.rpc("update_order_status" as any, { p_order_id: order.id, p_status: e.target.value, p_message: "" });
                              if (error) toast.error(error.message);
                              else { toast.success("Status updated"); await loadData(user as User); }
                            }}
                          >
                            <option value="">Advance status…</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in_production">In production</option>
                            <option value="quality_check">Quality check</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        )}
                      </div>

                      {showMediaUpload === order.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3 rounded-lg bg-secondary/30 p-4">
                          <input type="file" accept="image/*,video/*" onChange={(e) => setMediaFile(e.target.files?.[0] || null)} className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary" />
                          <Input placeholder={t("factory.caption")} value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="border-border bg-secondary" />
                          <Button variant="gold" size="sm" onClick={() => handleUploadMedia(order.id)} disabled={!mediaFile}>
                            <Upload className="me-1 h-4 w-4" /> {t("factory.upload")}
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>

              <section className="mb-12">
                <div className="glass-card rounded-xl p-6">
                  <ContainerSimulator />
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <WhatsAppButton />
    </div>
  );
};
