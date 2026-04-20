import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  Briefcase, Users, DollarSign, TrendingUp, Handshake,
  Plus, ArrowUpRight, Building2, Globe, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import BentoCard from "@/components/BentoCard";

interface Deal {
  id: string;
  deal_number: string;
  status: string;
  total_value: number;
  currency: string;
  origin_country: string;
  destination_country: string;
  created_at: string;
}

const BrokerDashboard = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isBroker = roles?.some((r) => r.role === "broker");
      const isAdmin = roles?.some((r) => r.role === "admin");

      if (!isBroker && !isAdmin) {
        navigate("/dashboard");
        return;
      }

      const { data } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });

      setDeals((data as Deal[]) || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const activeDeals = deals.filter((d) => !["completed", "cancelled", "rejected"].includes(d.status));
  const completedDeals = deals.filter((d) => d.status === "completed");
  const totalRevenue = completedDeals.reduce((sum, d) => sum + (d.total_value || 0), 0);
  const estimatedCommission = totalRevenue * 0.05; // 5% commission model

  const stats = [
    { label: lang === "ar" ? "الصفقات النشطة" : "Active Deals", value: activeDeals.length, icon: Handshake, color: "text-primary" },
    { label: lang === "ar" ? "الصفقات المكتملة" : "Completed", value: completedDeals.length, icon: TrendingUp, color: "text-emerald-400" },
    { label: lang === "ar" ? "إجمالي الإيرادات" : "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: lang === "ar" ? "العمولات" : "Commission", value: `$${estimatedCommission.toLocaleString()}`, icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-primary" />
              {lang === "ar" ? "لوحة" : "Broker"}{" "}
              <span className="text-gradient-gold">{lang === "ar" ? "الوسيط" : "Command Center"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "ar" ? "إدارة العملاء والموردين وتتبع العمولات" : "Manage clients, suppliers, and track commissions"}
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <BentoCard className="text-center">
                  <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </BentoCard>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="deals">
            <TabsList className="bg-card border border-border/50 mb-6">
              <TabsTrigger value="deals">
                <Handshake className="w-4 h-4 me-1" /> Deals
              </TabsTrigger>
              <TabsTrigger value="clients">
                <Users className="w-4 h-4 me-1" /> Clients
              </TabsTrigger>
              <TabsTrigger value="suppliers">
                <Building2 className="w-4 h-4 me-1" /> Suppliers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deals">
              <div className="flex justify-end mb-4">
                <Button variant="gold" size="sm" onClick={() => navigate("/deals/new")}>
                  <Plus className="w-4 h-4 me-1" /> Create Deal
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : deals.length === 0 ? (
                <div className="text-center py-16">
                  <Handshake className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground">No deals yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deals.map((deal, i) => (
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-card border border-border/30 rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer"
                      onClick={() => navigate("/deals")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{deal.deal_number}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {deal.origin_country && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {deal.origin_country} → {deal.destination_country}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-end">
                          <Badge variant="outline" className="text-[10px]">{deal.status}</Badge>
                          {deal.total_value > 0 && (
                            <p className="text-sm font-bold text-primary mt-1">
                              ${deal.total_value.toLocaleString()}
                              <span className="text-[10px] text-muted-foreground ms-1">
                                (${(deal.total_value * 0.05).toLocaleString()} comm.)
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="clients">
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground">
                  {lang === "ar"
                    ? "يتم عرض العملاء تلقائياً من الصفقات المرتبطة"
                    : "Clients are auto-populated from your linked deals"}
                </p>
                <Button variant="gold" size="sm" className="mt-4" onClick={() => navigate("/marketplace")}>
                  <ArrowUpRight className="w-4 h-4 me-1" /> Find Suppliers
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="suppliers">
              <div className="text-center py-16">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground">
                  {lang === "ar"
                    ? "تصفح السوق للعثور على موردين معتمدين"
                    : "Browse the marketplace to connect with verified suppliers"}
                </p>
                <Button variant="gold" size="sm" className="mt-4" onClick={() => navigate("/marketplace")}>
                  <ArrowUpRight className="w-4 h-4 me-1" /> Browse Marketplace
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default BrokerDashboard;
