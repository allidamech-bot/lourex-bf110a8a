import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Building2, MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

type FactoryPreviewRow = {
  id: string;
  name: string;
  location: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  reliability_score: number | null;
};

type ProductFactoryRow = {
  factory_id: string | null;
};

type SupplierRow = FactoryPreviewRow & {
  product_count: number;
};

const SuppliersPreview = () => {
  const { lang } = useI18n();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSuppliers = async () => {
      setLoading(true);

      const { data: factories, error: factoriesError } = await supabase
        .from("factories")
        .select("id, name, location, category, description, logo_url, is_verified, reliability_score")
        .eq("is_verified", true)
        .order("reliability_score", { ascending: false })
        .limit(6)
        .returns<FactoryPreviewRow[]>();

      if (factoriesError || !isMounted) {
        setSuppliers([]);
        setLoading(false);
        return;
      }

      if (!factories || factories.length === 0) {
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const ids = factories.map((factory) => factory.id);

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("factory_id")
        .in("factory_id", ids)
        .returns<ProductFactoryRow[]>();

      if (productsError || !isMounted) {
        setSuppliers(
          factories.map((factory) => ({
            ...factory,
            product_count: 0,
          })),
        );
        setLoading(false);
        return;
      }

      const counts = new Map<string, number>();

      for (const product of products ?? []) {
        if (!product.factory_id) {
          continue;
        }

        counts.set(product.factory_id, (counts.get(product.factory_id) ?? 0) + 1);
      }

      setSuppliers(
        factories.map((factory) => ({
          ...factory,
          product_count: counts.get(factory.id) ?? 0,
        })),
      );
      setLoading(false);
    };

    void loadSuppliers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="bg-card/50 py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="mb-3 font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "موردون موثقون" : "Verified suppliers"}
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            {lang === "ar"
              ? "جميع الموردين الظاهرين هنا خضعوا للتحقق والمراجعة قبل عرضهم في المنصة."
              : "Every supplier shown here has been verified and approved by our team before appearing on the platform."}
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-56 rounded-2xl border border-border/50 bg-background/50 p-6 animate-pulse"
              />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-background/50 p-12 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {lang === "ar"
                ? "لا يوجد موردون موثقون متاحون للعرض حالياً."
                : "No verified suppliers are listed yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier, index) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="group flex flex-col rounded-2xl border border-border/50 bg-background/50 p-6 transition-all hover:border-primary/40"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-primary/10 font-serif text-lg font-bold text-primary">
                    {supplier.logo_url ? (
                      <img src={supplier.logo_url} alt={supplier.name} className="h-full w-full object-cover" />
                    ) : (
                      supplier.name.charAt(0)
                    )}
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {lang === "ar" ? "موثق" : "Verified"}
                  </span>
                </div>

                <h3 className="mb-1 font-serif text-lg font-bold transition-colors group-hover:text-primary">
                  {supplier.name}
                </h3>

                <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {supplier.location || (lang === "ar" ? "غير محدد" : "Not specified")}
                </div>

                {supplier.description ? (
                  <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {supplier.description}
                  </p>
                ) : null}

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {supplier.category ? (
                    <span className="rounded-full bg-secondary/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                      {supplier.category}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1 rounded-full bg-secondary/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    {supplier.product_count} {lang === "ar" ? "منتج" : "products"}
                  </span>
                </div>

                <Button variant="gold-outline" size="sm" className="mt-auto w-full text-xs" asChild>
                  <Link to={`/supplier/${supplier.id}`}>
                    {lang === "ar" ? "عرض المورد" : "View supplier"}
                    <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Button variant="gold-outline" size="lg" asChild>
            <Link to="/catalog">
              {lang === "ar" ? "استعرض جميع الموردين" : "Browse all suppliers"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SuppliersPreview;
