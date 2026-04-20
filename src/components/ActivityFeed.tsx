import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { TrendingUp, ShoppingBag, Package, Globe2, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import ProductImage from "@/components/ProductImage";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingProduct {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  price_per_unit: number | null;
  currency: string | null;
}

const ActivityFeed = () => {
  const { lang } = useI18n();
  const [trending, setTrending] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, category, image_url, price_per_unit, currency")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);
        if (data) setTrending(data);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    };
    load();

    const activities = [
      lang === "ar" ? "🇸🇦 مشتري من الرياض طلب منتجات تنظيف" : "🇸🇦 Buyer from Riyadh requested cleaning products",
      lang === "ar" ? "🇹🇷 مصنع جديد انضم من إسطنبول" : "🇹🇷 New factory joined from Istanbul",
      lang === "ar" ? "🇦🇪 تم شحن طلب إلى دبي" : "🇦🇪 Order shipped to Dubai",
      lang === "ar" ? "🇪🇬 عرض سعر جديد من مورد في القاهرة" : "🇪🇬 New quote received from Cairo supplier",
      lang === "ar" ? "🇸🇦 طلب جديد لمنتجات غذائية" : "🇸🇦 New order for food products",
      lang === "ar" ? "🇹🇷 تم التحقق من مصنع نسيج" : "🇹🇷 Textile factory verified",
    ];
    setRecentActivity(activities);
  }, [lang]);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            {lang === "ar" ? "المنصة" : "Platform"}{" "}
            <span className="text-gradient-gold">{lang === "ar" ? "نشطة" : "Activity"}</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {lang === "ar"
              ? "اكتشف المنتجات الرائجة وآخر الأنشطة على المنصة"
              : "Discover trending products and latest platform activity"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Trending Products */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {lang === "ar" ? "منتجات رائجة" : "Trending Products"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border/30 rounded-xl overflow-hidden">
                    <Skeleton className="h-28 w-full rounded-none" />
                    <div className="p-3 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : trending.length > 0 ? trending.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/product/${product.id}`}
                    className="block bg-card border border-border/30 rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
                  >
                    <div className="h-28 overflow-hidden">
                      <ProductImage
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full group-hover:scale-105 transition-transform"
                        iconSize="w-6 h-6"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{product.category}</span>
                        {product.price_per_unit != null && (
                          <span className="text-xs font-semibold text-primary">
                            {product.price_per_unit} {product.currency || "USD"}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )) : (
                <div className="col-span-full text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar" ? "المنتجات قادمة قريباً" : "Products coming soon"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {lang === "ar" ? "آخر الأنشطة" : "Recent Activity"}
            </h3>
            <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
              {recentActivity.map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />
                  <p className="text-muted-foreground text-xs leading-relaxed">{activity}</p>
                </motion.div>
              ))}
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Globe2 className="w-3 h-3" />
                  {lang === "ar" ? "نشاط توضيحي من جميع أنحاء العالم" : "Sample activity from around the world"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActivityFeed;
