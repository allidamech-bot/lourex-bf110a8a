import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
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
import { BarChart3, Camera, Inbox, MessageSquare, Package, ShoppingBag, Upload, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/domain/auth/session";
import {
  advanceFactoryOrderStatus,
  fetchFactoryCommandCenter,
  type FactoryCommandCenterData,
  type FactoryCommandCenterOrder,
  type FactoryCommandCenterProduct,
  uploadInspectionMedia,
} from "@/domain/factory/service";
import { type SellerProduct } from "@/domain/seller/service";

type FactoryTab = "overview" | "rfqs" | "analytics" | "team" | "account";

export const FactoryCommandCenter = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<FactoryCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FactoryTab>("overview");
  const [showMediaUpload, setShowMediaUpload] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");

  const tabs = [
    { key: "overview" as const, label: t("factory.tabs.overview"), icon: Package },
    { key: "rfqs" as const, label: t("factory.tabs.rfqs"), icon: Inbox },
    { key: "analytics" as const, label: t("factory.tabs.analytics"), icon: BarChart3 },
    { key: "team" as const, label: t("factory.tabs.team"), icon: Users },
    { key: "account" as const, label: t("factory.tabs.account"), icon: UserCog },
  ];

  const loadData = async (currentUser: User) => {
    setLoading(true);

    const result = await fetchFactoryCommandCenter(currentUser.id, currentUser.email ?? null);
    if (result.error || !result.data) {
      toast.error(result.error?.message || t("factory.commandCenterDescription"));
      setLoading(false);
      return;
    }

    setDashboard(result.data);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const userResult = await getCurrentUser();
      if (userResult.error) {
        navigate("/auth");
        return;
      }

      if (!userResult.data) {
        navigate("/auth");
        return;
      }

      setUser(userResult.data);
      await loadData(userResult.data);
    };

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleUploadMedia = async (orderId: string) => {
    if (!mediaFile || !user) {
      return;
    }

    const result = await uploadInspectionMedia({
      order_id: orderId,
      uploaded_by: user.id,
      file_name: mediaFile.name,
      media_type: mediaFile.type.startsWith("video") ? "video" : "image",
      caption: mediaCaption || null,
      file: mediaFile,
    });

    if (result.error) {
      toast.error(result.error.message || t("factory.mediaUploadFailed"));
      return;
    }

    toast.success(t("factory.mediaUploaded"));
    setShowMediaUpload(null);
    setMediaFile(null);
    setMediaCaption("");
  };

  const statusColor: Record<string, string> = useMemo(
    () => ({
      pending: "bg-secondary text-secondary-foreground",
      confirmed: "bg-primary/15 text-primary",
      production_started: "bg-accent/20 text-foreground",
      in_production: "bg-accent/20 text-foreground",
      quality_check: "bg-secondary text-primary",
      shipped: "bg-primary text-primary-foreground",
      delivered: "bg-primary/20 text-primary",
    }),
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!dashboard?.factory) {
    return <FactoryAccessGate />;
  }

  const updateProductState = (savedProduct?: SellerProduct, deletedProductId?: string) => {
    if (!savedProduct && !deletedProductId) {
      return;
    }

    setDashboard((current) => {
      if (!current) {
        return current;
      }

      if (deletedProductId) {
        return {
          ...current,
          products: current.products.filter((product) => product.id !== deletedProductId),
        };
      }

      if (!savedProduct) {
        return current;
      }

      // Map SellerProduct back to FactoryCommandCenterProduct
      const mappedProduct: FactoryCommandCenterProduct = {
        id: savedProduct.id,
        name: savedProduct.name,
        category: savedProduct.category,
        pricePerUnit: savedProduct.pricePerUnit,
        imageUrl: savedProduct.imageUrl,
        isActive: savedProduct.isActive,
      };

      const index = current.products.findIndex((item) => item.id === mappedProduct.id);
      if (index === -1) {
        return {
          ...current,
          products: [mappedProduct, ...current.products],
        };
      }

      const nextProducts = [...current.products];
      nextProducts[index] = mappedProduct;
      return {
        ...current,
        products: nextProducts,
      };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl font-bold md:text-4xl">
              {dashboard.factory.name} <span className="text-gradient-gold">{t("factory.commandCenterTitle")}</span>
            </h1>
            <p className="mt-1 text-muted-foreground">{t("factory.commandCenterDescription")}</p>
          </motion.div>

          <div className="scrollbar-none mb-6 flex gap-1.5 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {activeTab === "rfqs" ? <FactoryRfqInbox factoryId={dashboard.factory.id} /> : null}
          {activeTab === "analytics" ? (
            <FactoryAnalytics
              orders={dashboard.orders}
              products={dashboard.products}
              staffCount={dashboard.staffCount}
              readyShipments={dashboard.analytics.readyShipments}
              monthlyActivity={dashboard.analytics.monthlyActivity}
              statusBreakdown={dashboard.analytics.statusBreakdown}
            />
          ) : null}
          {activeTab === "team" ? <TeamManagement /> : null}
          {activeTab === "account" ? (
            <SharedAccountPanel title={t("factory.factoryAccount")} companyTitle={t("factory.factoryProfile")} deleteRedirectTo="/" />
          ) : null}

          {activeTab === "overview" ? (
            <>
              {user ? (
                <SupplierProductsManager
                  factoryId={dashboard.factory.id}
                  userId={user.id}
                  products={dashboard.products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    description: "",
                    moq: "1",
                    pricePerUnit: p.pricePerUnit,
                    currency: "USD",
                    stockCapacity: "",
                    leadTime: "",
                    shippingOrigin: "",
                    dimensions: "",
                    weightPerUnit: null,
                    unitsPerCarton: null,
                    imageUrl: p.imageUrl,
                    isActive: p.isActive,
                    status: "approved",
                    createdAt: new Date().toISOString(),
                  }))}
                  onChanged={(savedProduct, deletedProductId) => {
                    updateProductState(savedProduct, deletedProductId);
                  }}
                />
              ) : null}

              <section className="mb-12">
                <h2 className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {t("factory.activeOrders")} ({dashboard.orders.length})
                </h2>
                <div className="space-y-4">
                  {dashboard.orders.map((order) => (
                    <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif font-semibold">{order.orderNumber}</h3>
                          <p className="text-xs text-muted-foreground">{order.quantity} units • {order.weightKg} kg</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[order.status] || "bg-secondary"}`}>
                          {t(`statuses.${order.status}`)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${order.id}`)} className="text-primary">
                          {t("factory.viewTimeline")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMediaUpload(showMediaUpload === order.id ? null : order.id)}
                          className="text-primary"
                        >
                          <Camera className="me-1 h-4 w-4" /> {t("factory.uploadInspection")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/messages/${order.id}`)} className="text-muted-foreground">
                          <MessageSquare className="me-1 h-4 w-4" /> {t("factory.messages")}
                        </Button>
                        {["pending", "confirmed", "in_production", "quality_check", "shipped"].includes(order.status) ? (
                          <select
                            className="h-8 rounded-md border border-border bg-secondary px-2 text-xs"
                            value=""
                            onChange={async (event) => {
                              const nextStatus = event.target.value;
                              if (!nextStatus || !user) {
                                return;
                              }

                              const result = await advanceFactoryOrderStatus(order.id, nextStatus);
                              if (result.error) {
                                toast.error(result.error.message);
                                return;
                              }

                              toast.success(t("factory.statusUpdated"));
                              await loadData(user);
                            }}
                          >
                            <option value="">{t("factory.advanceStatusPlaceholder")}</option>
                            <option value="confirmed">{t("statuses.confirmed")}</option>
                            <option value="in_production">{t("statuses.in_production")}</option>
                            <option value="quality_check">{t("statuses.quality_check")}</option>
                            <option value="shipped">{t("statuses.shipped")}</option>
                            <option value="delivered">{t("statuses.delivered")}</option>
                          </select>
                        ) : null}
                      </div>

                      {showMediaUpload === order.id ? (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3 rounded-lg bg-secondary/30 p-4">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
                          />
                          <Input
                            placeholder={t("factory.caption")}
                            value={mediaCaption}
                            onChange={(event) => setMediaCaption(event.target.value)}
                            className="border-border bg-secondary"
                          />
                          <Button variant="gold" size="sm" onClick={() => void handleUploadMedia(order.id)} disabled={!mediaFile}>
                            <Upload className="me-1 h-4 w-4" /> {t("factory.upload")}
                          </Button>
                        </motion.div>
                      ) : null}
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
          ) : null}
        </div>
      </main>
      <WhatsAppButton />
    </div>
  );
};
