import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import InquiryModal from "@/components/InquiryModal";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Factory, Package, Star, ArrowRight, BadgeCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface FactoryRow {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  is_verified: boolean;
  reliability_score: number;
  logo_url: string;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  moq: string;
  factory_id: string;
  price_per_unit: number;
  currency: string;
  image_url: string;
}

const categoryEmoji: Record<string, string> = {
  Confectionery: "🍫",
  "FMCG & Hygiene": "🧴",
  "Fashion & Textiles": "👔",
  "Ceramics & Tiles": "🧱",
  "Dairy & Beverages": "🥛",
  "Furniture & Décor": "🪑",
};

const Catalog = () => {
  const { t } = useI18n();
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFactory, setSelectedFactory] = useState("");
  const [showInquiry, setShowInquiry] = useState(false);
  const [expandedFactory, setExpandedFactory] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      // Only verified suppliers may appear publicly.
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from("factories").select("*").eq("is_verified", true).order("name"),
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("status", "approved"),
      ]);
      setFactories((f as FactoryRow[]) || []);
      setProducts((p as ProductRow[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const categories = ["All", ...Array.from(new Set(factories.map((f) => f.category)))];
  const filtered = selectedCategory === "All" ? factories : factories.filter((f) => f.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              {t("catalog.title")} <span className="text-gradient-gold">{t("catalog.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              {t("catalog.subtitle")}
            </p>
          </motion.div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-gold text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat === "All" ? t("catalog.all") : cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">{t("catalog.noFactories")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((factory, i) => {
                const factoryProducts = products.filter((p) => p.factory_id === factory.id);
                const isExpanded = expandedFactory === factory.id;
                const emoji = categoryEmoji[factory.category] || "🏭";

                return (
                  <motion.div
                    key={factory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-xl overflow-hidden group hover:border-gold/30 transition-all duration-300"
                  >
                    <div className="bg-gradient-to-br from-secondary to-muted p-8 text-center relative">
                      <span className="text-5xl">{emoji}</span>
                      {factory.is_verified && (
                        <div className="absolute top-3 end-3 flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {t("catalog.verified")}
                        </div>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-serif text-xl font-semibold">{factory.name}</h3>
                          <p className="text-sm text-muted-foreground">{factory.category}</p>
                        </div>
                        {factory.reliability_score > 0 && (
                          <div className="flex items-center gap-1 text-gold">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm font-medium">{factory.reliability_score}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Factory className="w-4 h-4 shrink-0" />
                          {factory.location}
                        </div>
                        {factory.description && (
                          <p className="text-muted-foreground text-xs leading-relaxed">{factory.description}</p>
                        )}
                      </div>

                      {/* Products preview */}
                      {factoryProducts.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedFactory(isExpanded ? null : factory.id)}
                            className="flex items-center gap-2 text-xs text-gold hover:text-gold-light transition-colors w-full justify-between"
                          >
                            <span className="flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              {factoryProducts.length} {t("catalog.products")}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              className="mt-2 space-y-1.5"
                            >
                              {factoryProducts.map((p) => (
                                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 text-xs">
                                  <span>{p.name}</span>
                                  {p.moq && <span className="text-muted-foreground">{t("catalog.min")} {p.moq}</span>}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      )}

                      <Button
                        variant="gold-outline"
                        className="w-full group/btn"
                        onClick={() => { setSelectedFactory(factory.name); setShowInquiry(true); }}
                      >
                        {t("catalog.getQuote")}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1 rtl:rotate-180" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
      <InquiryModal
        open={showInquiry}
        onClose={() => setShowInquiry(false)}
        factoryName={selectedFactory}
        inquiryType="factory_quote"
      />
    </div>
  );
};

export default Catalog;
