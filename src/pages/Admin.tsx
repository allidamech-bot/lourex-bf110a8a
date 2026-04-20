import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BentoCard from "@/components/BentoCard";
import QuickActionFab from "@/components/QuickActionFab";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Plus, Trash2, RefreshCw, Shield, Settings, MessageSquare, ShoppingBag, ShieldCheck, History, BarChart3, Package, Truck, DollarSign, Eye, FileEdit, Building2, Users, Archive, UserCog, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KYCPanel } from "@/components/admin/KYCPanel";
import { OrderManagement } from "@/components/admin/OrderManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { FiscalEngine } from "@/components/admin/FiscalEngine";
import { GhostMonitor } from "@/components/admin/GhostMonitor";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { MapboxTokenSetting } from "@/components/admin/MapboxTokenSetting";
import { FactoryApplications } from "@/components/admin/FactoryApplications";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { TeamManagement } from "@/components/admin/TeamManagement";
import { AccountSettings } from "@/components/admin/AccountSettings";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";

interface Shipment {
  id: string;
  tracking_id: string;
  status: string;
  client_name: string;
  destination: string;
  pallets: number;
  weight: number;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  inquiry_type: string;
  factory_name: string;
  created_at: string;
}

interface SiteSetting {
  id: string;
  key: string;
  value: string;
}

const STATUSES = ["factory", "warehouse", "shipping", "customs", "delivered"];

type TabKey = "overview" | "statistics" | "shipments" | "orders" | "inquiries" | "applications" | "archive" | "team" | "kyc" | "audit" | "fiscal" | "ghost" | "content" | "settings" | "account";

const Admin = () => {
  const { t } = useI18n();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const initialSubTab = (searchParams.get("sub") as "logistics" | "security" | "general") || "security";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [orderCount, setOrderCount] = useState(0);
  const [factoryCount, setFactoryCount] = useState(0);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tracking_id: "",
    status: "factory",
    client_name: "",
    destination: "",
    pallets: 0,
    weight: 0,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      await Promise.all([fetchShipments(), fetchInquiries(), fetchSettings(), fetchCounts()]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchCounts = async () => {
    const [orders, factories] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("factories").select("id", { count: "exact", head: true }),
    ]);
    setOrderCount(orders.count || 0);
    setFactoryCount(factories.count || 0);
  };

  const fetchShipments = async () => {
    const { data } = await supabase
      .from("shipments")
      .select("id, tracking_id, status, client_name, destination, pallets, weight")
      .order("created_at", { ascending: false });
    setShipments((data as Shipment[]) || []);
  };

  const fetchInquiries = async () => {
    const { data } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    setInquiries((data as Inquiry[]) || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*");
    setSettings((data as SiteSetting[]) || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("shipments").insert({
      tracking_id: form.tracking_id.toUpperCase(),
      status: form.status,
      client_name: form.client_name,
      destination: form.destination,
      pallets: form.pallets,
      weight: form.weight,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Shipment added");
      setForm({ tracking_id: "", status: "factory", client_name: "", destination: "", pallets: 0, weight: 0 });
      setShowForm(false);
      await fetchShipments();
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("shipments").update({ status: newStatus }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status updated"); await fetchShipments(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("shipments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Shipment deleted"); await fetchShipments(); }
  };

  const handleSettingUpdate = async (id: string, value: string) => {
    const { error } = await supabase.from("site_settings").update({ value }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Setting updated"); await fetchSettings(); }
  };

  const handleDeleteInquiry = async (id: string) => {
    const { error } = await supabase.from("inquiries").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Inquiry deleted"); await fetchInquiries(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center gap-4 text-center px-4">
          <Shield className="w-16 h-16 text-muted-foreground" />
          <h1 className="font-serif text-2xl font-bold">{t("admin.accessDenied")}</h1>
          <p className="text-muted-foreground max-w-md">{t("admin.accessDeniedMsg")}</p>
          <Button variant="gold-outline" onClick={() => navigate("/dashboard")}>
            {t("nav.dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    factory: "bg-blue-500/20 text-blue-500",
    warehouse: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    shipping: "bg-purple-500/20 text-purple-500",
    customs: "bg-orange-500/20 text-orange-500",
    delivered: "bg-emerald-500/20 text-emerald-500",
  };

  const tabs: { key: TabKey; label: string; icon: any; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "statistics", label: "Statistics", icon: PieChart },
    { key: "shipments", label: t("admin.shipments"), icon: Truck },
    { key: "orders", label: t("admin.orders"), icon: ShoppingBag },
    { key: "inquiries", label: t("admin.inquiries"), icon: MessageSquare, badge: inquiries.length },
    { key: "applications", label: t("apps.title"), icon: Building2 },
    { key: "archive", label: "Archive", icon: Archive },
    { key: "team", label: "Team", icon: Users },
    { key: "kyc", label: t("admin.kyc"), icon: ShieldCheck },
    { key: "audit", label: t("admin.auditLogs"), icon: History },
    { key: "fiscal", label: t("fiscal.title"), icon: DollarSign },
    { key: "ghost", label: t("ghost.title"), icon: Eye },
    { key: "content", label: t("admin.contentEditor"), icon: FileEdit },
    { key: "settings", label: t("admin.settings"), icon: Settings },
    { key: "account", label: "Account", icon: UserCog },
  ];

  const totalWeight = shipments.reduce((s, sh) => s + sh.weight, 0);
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              {t("admin.title")} <span className="text-gradient-gold">{t("admin.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground mt-1">{t("admin.subtitle")}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="bg-primary-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab — Bento Grid */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <BentoCard delay={0}>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("admin.shipments")}</span>
                </div>
                <p className="font-serif text-2xl md:text-3xl font-bold">{shipments.length}</p>
              </BentoCard>
              <BentoCard delay={0.08}>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("admin.orders")}</span>
                </div>
                <p className="font-serif text-2xl md:text-3xl font-bold">{orderCount}</p>
              </BentoCard>
              <BentoCard delay={0.16}>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("hero.factories")}</span>
                </div>
                <p className="font-serif text-2xl md:text-3xl font-bold">{factoryCount}</p>
              </BentoCard>
              <BentoCard delay={0.24}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("admin.inquiries")}</span>
                </div>
                <p className="font-serif text-2xl md:text-3xl font-bold">{inquiries.length}</p>
              </BentoCard>

              {/* Delivery rate card — wide */}
              <BentoCard span="2" delay={0.3}>
                <h3 className="text-sm font-medium mb-3">Delivery Rate</h3>
                <div className="flex items-end gap-3">
                  <p className="font-serif text-3xl font-bold text-primary">
                    {shipments.length > 0 ? `${Math.round((deliveredCount / shipments.length) * 100)}%` : "—"}
                  </p>
                  <span className="text-xs text-muted-foreground mb-1">{deliveredCount} / {shipments.length} completed</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: shipments.length > 0 ? `${(deliveredCount / shipments.length) * 100}%` : "0%" }} />
                </div>
              </BentoCard>

              {/* Total weight */}
              <BentoCard span="2" delay={0.35}>
                <h3 className="text-sm font-medium mb-3">{t("dash.totalWeight")}</h3>
                <p className="font-serif text-3xl font-bold">{totalWeight.toLocaleString()} <span className="text-lg text-muted-foreground">kg</span></p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {Object.entries(shipments.reduce<Record<string, number>>((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {})).map(([status, count]) => (
                    <span key={status} className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor[status] || "bg-secondary"}`}>
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </BentoCard>
            </div>
          )}

          {/* Shipments Tab */}
          {activeTab === "shipments" && (
            <>
              <div className="flex justify-end mb-4 gap-3">
                <Button variant="ghost" onClick={fetchShipments} className="text-muted-foreground">
                  <RefreshCw className="w-4 h-4 me-2" /> {t("admin.refresh")}
                </Button>
                <Button variant="gold" onClick={() => setShowForm(!showForm)}>
                  <Plus className="w-4 h-4 me-2" /> {t("admin.addShipment")}
                </Button>
              </div>

              {showForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleAdd}
                  className="rounded-xl border border-border bg-card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <Input placeholder="Tracking ID (e.g. LRX-2024-004)" value={form.tracking_id} onChange={(e) => setForm({ ...form, tracking_id: e.target.value })} className="bg-secondary border-border" required />
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
                    {STATUSES.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
                  </select>
                  <Input placeholder="Client Name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="bg-secondary border-border" required />
                  <Input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="bg-secondary border-border" required />
                  <Input type="number" placeholder="Pallets" value={form.pallets || ""} onChange={(e) => setForm({ ...form, pallets: Number(e.target.value) })} className="bg-secondary border-border" />
                  <Input type="number" placeholder="Weight (kg)" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} className="bg-secondary border-border" />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Button variant="gold" type="submit" className="w-full sm:w-auto">{t("admin.createShipment")}</Button>
                  </div>
                </motion.form>
              )}

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-start p-4 font-medium">{t("track.trackingId")}</th>
                        <th className="text-start p-4 font-medium">{t("track.client")}</th>
                        <th className="text-start p-4 font-medium hidden sm:table-cell">{t("track.destination")}</th>
                        <th className="text-start p-4 font-medium">{t("orders.status")}</th>
                        <th className="text-start p-4 font-medium hidden md:table-cell">{t("track.pallets")}</th>
                        <th className="text-start p-4 font-medium hidden md:table-cell">{t("track.weight")}</th>
                        <th className="text-end p-4 font-medium">{t("admin.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((s) => (
                        <tr key={s.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                          <td className="p-4 font-medium text-primary">{s.tracking_id}</td>
                          <td className="p-4">{s.client_name}</td>
                          <td className="p-4 hidden sm:table-cell text-muted-foreground">{s.destination}</td>
                          <td className="p-4">
                            <select value={s.status} onChange={(e) => handleStatusUpdate(s.id, e.target.value)} className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColor[s.status] || "bg-secondary"}`}>
                              {STATUSES.map((st) => (<option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>))}
                            </select>
                          </td>
                          <td className="p-4 hidden md:table-cell">{s.pallets}</td>
                          <td className="p-4 hidden md:table-cell">{s.weight} kg</td>
                          <td className="p-4 text-end">
                            <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "orders" && <OrderManagement />}

          {activeTab === "inquiries" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-start p-4 font-medium">{t("inquiry.name")}</th>
                      <th className="text-start p-4 font-medium">{t("inquiry.email")}</th>
                      <th className="text-start p-4 font-medium hidden sm:table-cell">{t("admin.type")}</th>
                      <th className="text-start p-4 font-medium hidden lg:table-cell">{t("inquiry.message")}</th>
                      <th className="text-start p-4 font-medium hidden md:table-cell">{t("admin.date")}</th>
                      <th className="text-end p-4 font-medium">{t("admin.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map((inq) => (
                      <tr key={inq.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 font-medium">{inq.name}</td>
                        <td className="p-4 text-primary">{inq.email}</td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground capitalize">{inq.inquiry_type.replace("_", " ")}</span>
                        </td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">{inq.message || "—"}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">{new Date(inq.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-end">
                          <button onClick={() => handleDeleteInquiry(inq.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inquiries.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.noInquiries")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "applications" && <FactoryApplications filter="active" />}
          {activeTab === "archive" && <FactoryApplications filter="archived" />}
          {activeTab === "team" && <TeamManagement />}
          {activeTab === "kyc" && <KYCPanel />}
          {activeTab === "audit" && <AuditLogs />}
          {activeTab === "fiscal" && <FiscalEngine />}
          {activeTab === "ghost" && <GhostMonitor />}
          {activeTab === "content" && <ContentEditor />}

          {activeTab === "statistics" && <AdminAnalytics />}

          {activeTab === "settings" && <AdminSettings settings={settings} onSettingUpdate={handleSettingUpdate} defaultSubTab={initialSubTab} />}

          {activeTab === "account" && <AccountSettings />}
        </div>
      </main>
      <QuickActionFab />
    </div>
  );
};

export default Admin;
