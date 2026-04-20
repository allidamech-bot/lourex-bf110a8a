import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";

const categories = [
  "All Categories", "Textiles & Fabrics", "Food & Beverages", "Electronics",
  "Steel & Metals", "Plastics & Packaging", "Chemicals", "Industrial Equipment",
];

const countries = [
  "All Countries", "Turkey", "Saudi Arabia", "UAE", "China", "Syria", "Egypt", "India",
];

const HeroSearch = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category && category !== "All Categories") params.set("category", category);
    if (country && country !== "All Countries") params.set("country", country);
    navigate(`/catalog?${params.toString()}`);
  };

  const placeholder = lang === "ar"
    ? "ابحث عن منتجات، موردين، أو فئات..."
    : lang === "tr"
      ? "Ürün, tedarikçi veya kategori ara..."
      : "Search for products, suppliers, or categories...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className="mt-10 p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-12 bg-background/50"
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 w-full sm:w-[180px] bg-background/50">
            <SelectValue placeholder={lang === "ar" ? "الفئة" : "Category"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-12 w-full sm:w-[160px] bg-background/50">
            <SelectValue placeholder={lang === "ar" ? "الدولة" : "Country"} />
          </SelectTrigger>
          <SelectContent>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="gold" className="h-12 px-6" onClick={handleSearch}>
          <Search className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
};

export default HeroSearch;
