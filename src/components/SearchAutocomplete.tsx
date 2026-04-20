import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, Factory, TrendingUp, ArrowRight } from "lucide-react";

interface Suggestion {
  type: "product" | "factory" | "category";
  id: string;
  label: string;
  sublabel?: string;
  image?: string | null;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchAutocomplete = ({ value, onChange, placeholder, className }: SearchAutocompleteProps) => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trending, setTrending] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Load trending categories on mount
  useEffect(() => {
    const loadTrending = async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .eq("is_active", true)
        .limit(100);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]).filter(Boolean);
        setTrending(sorted);
      }
    };
    loadTrending();
  }, []);

  // Search suggestions
  useEffect(() => {
    if (!value || value.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const term = `%${value}%`;
      const [{ data: products }, { data: factories }] = await Promise.all([
        supabase.from("products").select("id, name, category, image_url").eq("is_active", true).ilike("name", term).limit(5),
        supabase.from("factories").select("id, name, location, logo_url").ilike("name", term).limit(3),
      ]);
      const results: Suggestion[] = [];
      products?.forEach(p => results.push({
        type: "product", id: p.id, label: p.name, sublabel: p.category, image: p.image_url,
      }));
      factories?.forEach(f => results.push({
        type: "factory", id: f.id, label: f.name, sublabel: f.location, image: f.logo_url,
      }));
      setSuggestions(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (s: Suggestion) => {
    setShowSuggestions(false);
    if (s.type === "product") navigate(`/product/${s.id}`);
    else if (s.type === "factory") navigate(`/supplier/${s.id}`);
    else {
      onChange(s.label);
    }
  };

  const showPanel = showSuggestions && (suggestions.length > 0 || (value.length < 2 && trending.length > 0));

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder || (lang === "ar" ? "ابحث عن منتجات أو موردين..." : "Search products, suppliers...")}
        className="ps-10 bg-card border-border/50"
      />
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {/* Trending when no search */}
            {value.length < 2 && trending.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {lang === "ar" ? "الأكثر رواجاً" : "Trending Categories"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trending.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { onChange(cat); setShowSuggestions(false); }}
                      className="px-3 py-1 rounded-full bg-secondary text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search results */}
            {suggestions.length > 0 && (
              <div className="divide-y divide-border">
                {suggestions.map(s => (
                  <button
                    key={`${s.type}-${s.id}`}
                    onClick={() => handleSelect(s)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-start"
                  >
                    <div className="w-8 h-8 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {s.image ? (
                        <img src={s.image} alt="" className="w-full h-full object-cover" />
                      ) : s.type === "product" ? (
                        <Package className="w-3.5 h-3.5 text-muted-foreground/40" />
                      ) : (
                        <Factory className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.label}</p>
                      {s.sublabel && <p className="text-[10px] text-muted-foreground">{s.sublabel}</p>}
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
                      {s.type === "product" ? (lang === "ar" ? "منتج" : "Product") : (lang === "ar" ? "مورد" : "Supplier")}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* View all results */}
            {value.length >= 2 && (
              <button
                onClick={() => { setShowSuggestions(false); }}
                className="w-full p-2.5 text-xs text-primary hover:bg-secondary/50 flex items-center justify-center gap-1 transition-colors"
              >
                {lang === "ar" ? "عرض كل النتائج" : "View all results"}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchAutocomplete;
