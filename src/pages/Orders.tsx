import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, FileText, Check, Clock, Package, Truck,
  ShieldCheck, CircleDot, ArrowRight, Factory, MapPin,
  ChevronDown, ChevronUp, MessageCircle, Copy, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  quantity: number;
  total_amount: number;
  currency: string | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  balance_amount: number | null;
  balance_paid: boolean | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
  product_id: string | null;
  factory_id: string | null;
}

interface ProductInfo {
  id: string;
  name: string;
  image_url: string | null;
  price_per_unit: number | null;
  currency: string | null;
  moq: string | null;
}

interface FactoryInfo {
  id: string;
  name: string;
  location: string;
  is_verified: boolean;
}

const ORDER_STAGES = [
  { key: "pending", label: { en: "Pending", ar: "قيد الانتظار" }, icon: Clock },
  { key: "confirmed", label: { en: "Confirmed", ar: "مؤكد" }, icon: Check },
  { key: "production_started", label: { en: "In Production", ar: "في الإنتاج" }, icon: Package },
  { key: "shipped", label: { en: "Shipped", ar: "تم الشحن" }, icon: Truck },
  { key: "delivered", label: { en: "Delivered", ar: "تم التسليم" }, icon: Check },
  { key: "completed", label: { en: "Completed", ar: "مكتمل" }, icon: ShieldCheck },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-500",
  production_started: "bg-purple-500/20 text-purple-500",
  production_finished: "bg-indigo-500/20 text-indigo-500",
  quality_check: "bg-orange-500/20 text-orange-500",
  shipped: "bg-cyan-500/20 text-cyan-500",
  customs: "bg-orange-500/20 text-orange-500",
  delivered: "bg-emerald-500/20 text-emerald-500",
  completed: "bg-emerald-500/20 text-emerald-500",
  cancelled: "bg-destructive/20 text-destructive",
};

const FILTER_TABS = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "pending", en: "Pending", ar: "قيد الانتظار" },
  { key: "confirmed", en: "Confirmed", ar: "مؤكد" },
  { key: "shipped", en: "Shipped", ar: "تم الشحن" },
  { key: "completed", en: "Completed", ar: "مكتمل" },
  { key: "cancelled", en: "Cancelled", ar: "ملغي" },
];

const Orders = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [factories, setFactories] = useState<Record<string, FactoryInfo>>({});
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      const ordersList = (ordersData as OrderRow[]) || [];
      setOrders(ordersList);

      // Load related product & factory info
      const productIds = [...new Set(ordersList.map(o => o.product_id).filter(Boolean))] as string[];
      const factoryIds = [...new Set(ordersList.map(o => o.factory_id).filter(Boolean))] as string[];

      const [{ data: prodData }, { data: factData }] = await Promise.all([
        productIds.length > 0
          ? supabase.from("products").select("id, name, image_url, price_per_unit, currency, moq").in("id", productIds)
          : { data: [] },
        factoryIds.length > 0
          ? supabase.from("factories").select("id, name, location, is_verified").in("id", factoryIds)
          : { data: [] },
      ]);

      const pMap: Record<string, ProductInfo> = {};
      (prodData || []).forEach(p => { pMap[p.id] = p; });
      setProducts(pMap);

      const fMap: Record<string, FactoryInfo> = {};
      (factData || []).forEach(f => { fMap[f.id] = f; });
      setFactories(fMap);

      setLoading(false);
    };
    init();
  }, [navigate]);

  const filtered = filterStatus === "all"
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const copyOrderId = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber);
    toast.success(lang === "ar" ? "تم نسخ رقم الطلب" : "Order ID copied");
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <Breadcrumbs />

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              {lang === "ar" ? "طلباتي" : "My"}{" "}
              <span className="text-gradient-gold">{lang === "ar" ? "" : "Orders"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "ar" ? `${orders.length} طلب` : `${orders.length} order(s)`}
            </p>
          </motion.div>

          {/* Status Filter Tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  filterStatus === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {lang === "ar" ? tab.ar : tab.en}
                {tab.key !== "all" && (
                  <span className="ml-1 opacity-60">
                    ({orders.filter(o => o.status === tab.key).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-12 text-center"
            >
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {filterStatus === "all"
                  ? (lang === "ar" ? "لا توجد طلبات بعد" : "No orders yet")
                  : (lang === "ar" ? "لا توجد طلبات بهذه الحالة" : "No orders with this status")}
              </p>
              <Button variant="gold" asChild>
                <Link to="/marketplace">
                  {lang === "ar" ? "تصفح المنتجات" : "Browse Products"} <ArrowRight className="w-4 h-4 ms-2" />
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filtered.map((order, i) => {
                const product = order.product_id ? products[order.product_id] : null;
                const factory = order.factory_id ? factories[order.factory_id] : null;
                const isExpanded = expandedOrder === order.id;
                const currentStageIdx = ORDER_STAGES.findIndex(s => s.key === order.status);

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
                  >
                    {/* Order Header */}
                    <button
                      className="w-full p-4 flex items-center justify-between text-start"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {product?.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-primary">{order.order_number}</span>
                            <button
                              onClick={e => { e.stopPropagation(); copyOrderId(order.order_number); }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {product && <span className="truncate max-w-[120px]">{product.name}</span>}
                            <span>•</span>
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className={`text-[10px] ${STATUS_COLORS[order.status] || "bg-secondary"}`}>
                          {ORDER_STAGES.find(s => s.key === order.status)?.label[lang === "ar" ? "ar" : "en"] || order.status}
                        </Badge>
                        <span className="font-semibold text-sm">
                          {(order.currency || "USD")} {order.total_amount.toLocaleString()}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/50 p-5 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Timeline */}
                              <div>
                                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                  {lang === "ar" ? "حالة الطلب" : "Order Status"}
                                </h4>
                                <div className="space-y-0">
                                  {ORDER_STAGES.map((stage, si) => {
                                    const isCompleted = si <= currentStageIdx;
                                    const isCurrent = si === currentStageIdx;
                                    const Icon = stage.icon;
                                    return (
                                      <div key={stage.key} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                            isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                                            : isCompleted ? "bg-primary/20 text-primary"
                                            : "bg-secondary text-muted-foreground"
                                          }`}>
                                            {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : isCurrent ? <CircleDot className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                          </div>
                                          {si < ORDER_STAGES.length - 1 && (
                                            <div className={`w-0.5 h-6 ${si < currentStageIdx ? "bg-primary/40" : "bg-border"}`} />
                                          )}
                                        </div>
                                        <div className={`pt-0.5 pb-3 text-sm ${isCurrent ? "text-primary font-semibold" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                                          {stage.label[lang === "ar" ? "ar" : "en"]}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Order Details */}
                              <div className="space-y-4">
                                {/* Product Info */}
                                {product && (
                                  <div>
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                      {lang === "ar" ? "المنتج" : "Product"}
                                    </h4>
                                    <Link to={`/product/${product.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                                      <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                        {product.image_url ? (
                                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : <Package className="w-4 h-4 text-muted-foreground/40" />}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {(product.price_per_unit ?? 0).toLocaleString()} {product.currency || "USD"} / {lang === "ar" ? "وحدة" : "unit"}
                                        </p>
                                      </div>
                                    </Link>
                                  </div>
                                )}

                                {/* Supplier Info */}
                                {factory && (
                                  <div>
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                      {lang === "ar" ? "المورد" : "Supplier"}
                                    </h4>
                                    <Link to={`/supplier/${factory.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Factory className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{factory.name}</p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <MapPin className="w-2.5 h-2.5" /> {factory.location}
                                        </p>
                                      </div>
                                      {factory.is_verified && (
                                        <ShieldCheck className="w-4 h-4 text-primary" />
                                      )}
                                    </Link>
                                    <Button
                                      variant="outline" size="sm" className="w-full mt-2 text-xs"
                                      onClick={() => navigate(`/supplier/${factory.id}`)}
                                    >
                                      <MessageCircle className="w-3 h-3 me-1" />
                                      {lang === "ar" ? "تواصل مع المورد" : "Contact Supplier"}
                                    </Button>
                                  </div>
                                )}

                                {/* Order Stats */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-lg bg-secondary/30 text-center">
                                    <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "الكمية" : "Quantity"}</p>
                                    <p className="font-bold text-lg">{order.quantity}</p>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-secondary/30 text-center">
                                    <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "الإجمالي" : "Total"}</p>
                                    <p className="font-bold text-lg text-primary">{order.total_amount.toLocaleString()}</p>
                                  </div>
                                </div>

                                {/* Payment Status */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 text-sm">
                                    <span className="text-muted-foreground">{lang === "ar" ? "الدفعة المقدمة" : "Deposit (30%)"}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{(order.deposit_amount ?? 0).toLocaleString()}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${order.deposit_paid ? "bg-emerald-500/20 text-emerald-500" : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"}`}>
                                        {order.deposit_paid ? (lang === "ar" ? "مدفوع" : "Paid") : (lang === "ar" ? "غير مدفوع" : "Unpaid")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 text-sm">
                                    <span className="text-muted-foreground">{lang === "ar" ? "المتبقي" : "Balance (70%)"}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{(order.balance_amount ?? 0).toLocaleString()}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${order.balance_paid ? "bg-emerald-500/20 text-emerald-500" : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"}`}>
                                        {order.balance_paid ? (lang === "ar" ? "مدفوع" : "Paid") : (lang === "ar" ? "غير مدفوع" : "Unpaid")}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Notes */}
                                {order.notes && (
                                  <div>
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                      {lang === "ar" ? "ملاحظات" : "Notes"}
                                    </h4>
                                    <p className="text-xs text-muted-foreground whitespace-pre-line bg-secondary/20 rounded-lg p-2">
                                      {order.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Timestamps */}
                                <div className="text-[10px] text-muted-foreground space-y-0.5">
                                  <p>{lang === "ar" ? "تم الإنشاء:" : "Created:"} {new Date(order.created_at).toLocaleString()}</p>
                                  <p>{lang === "ar" ? "آخر تحديث:" : "Last Updated:"} {new Date(order.updated_at).toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
