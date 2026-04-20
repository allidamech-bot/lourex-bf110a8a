import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Package, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface SupplierRow {
  id: string;
  name: string;
  location: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  is_verified: boolean;
  reliability_score: number | null;
  product_count: number;
}

const SuppliersPreview = () => {
  const { lang } = useI18n();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Only verified factories qualify for the public preview.
      const { data: factories } = await supabase
        .from("factories")
        .select("id, name, location, category, description, logo_url, is_verified, reliability_score")
        .eq("is_verified", true)
        .order("reliability_score", { ascending: false })
        .limit(6);

      if (!factories || factories.length === 0) {
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const ids = factories.map((f) => f.id);
      // Public-safe product count (RLS already filters to active+approved+verified).
      const { data: prods } = await supabase
        .from("products")
        .select("factory_id")
        .in("factory_id", ids);

      const counts: Record<string, number> = {};
      (prods || []).forEach((p: any) => {
        counts[p.factory_id] = (counts[p.factory_id] || 0) + 1;
      });

      setSuppliers(
        factories.map((f: any) => ({
          ...f,
          product_count: counts[f.id] || 0,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  const title =
    lang === "ar"
      ? "موردون موثقون"
      : lang === "tr"
      ? "Doğrulanmış Tedarikçiler"
      : "Verified Suppliers";
  const subtitle =
    lang === "ar"
      ? "كل مورد خضع للتحقق وموافقة الإدارة قبل الظهور هنا."
      : lang === "tr"
      ? "Burada listelenen her tedarikçi platform tarafından doğrulanmıştır."
      : "Every supplier shown here has been verified and approved by our team.";
  const viewAll =
    lang === "ar"
      ? "استعرض جميع الموردين"
      : lang === "tr"
      ? "Tüm Tedarikçileri Gör"
      : "Browse All Suppliers";
  const empty =
    lang === "ar"
      ? "لا يوجد موردون موثقون متاحون للعرض حاليًا."
      : "No verified suppliers are listed yet.";
  const productsLabel = lang === "ar" ? "منتج" : "products";

  return (
    <section className="py-24 bg-card/50">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-3">{title}</h2>
          <p className="text-muted-foreground max-w-2xl">{subtitle}</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-background/50 p-6 h-56 animate-pulse" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-background/50 p-12 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">{empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/50 bg-background/50 p-6 hover:border-primary/40 transition-all group flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-serif font-bold text-lg overflow-hidden">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      s.name.charAt(0)
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                  {s.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                  <MapPin className="w-3.5 h-3.5" /> {s.location || "—"}
                </div>

                {s.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{s.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {s.category && (
                    <span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded-full">
                      {s.category}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Package className="w-3 h-3" /> {s.product_count} {productsLabel}
                  </span>
                </div>

                <Button variant="gold-outline" size="sm" className="w-full mt-auto text-xs" asChild>
                  <Link to={`/supplier/${s.id}`}>
                    {lang === "ar" ? "عرض المورد" : "View Supplier"}
                    <ArrowRight className="w-3.5 h-3.5 ms-1.5" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button variant="gold-outline" size="lg" asChild>
            <Link to="/catalog">{viewAll}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SuppliersPreview;
