import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

const categoryOptions = {
  en: [
    { value: "all", label: "All categories" },
    { value: "textiles", label: "Textiles & fabrics" },
    { value: "food", label: "Food & beverages" },
    { value: "electronics", label: "Electronics" },
    { value: "metals", label: "Steel & metals" },
    { value: "packaging", label: "Plastics & packaging" },
    { value: "chemicals", label: "Chemicals" },
    { value: "industrial-equipment", label: "Industrial equipment" },
  ],
  ar: [
    { value: "all", label: "كل الفئات" },
    { value: "textiles", label: "المنسوجات والأقمشة" },
    { value: "food", label: "الأغذية والمشروبات" },
    { value: "electronics", label: "الإلكترونيات" },
    { value: "metals", label: "الحديد والمعادن" },
    { value: "packaging", label: "البلاستيك والتغليف" },
    { value: "chemicals", label: "الكيماويات" },
    { value: "industrial-equipment", label: "المعدات الصناعية" },
  ],
} as const;

const countryOptions = {
  en: [
    { value: "all", label: "All countries" },
    { value: "turkey", label: "Turkey" },
    { value: "saudi-arabia", label: "Saudi Arabia" },
    { value: "uae", label: "UAE" },
    { value: "china", label: "China" },
    { value: "syria", label: "Syria" },
    { value: "egypt", label: "Egypt" },
    { value: "india", label: "India" },
  ],
  ar: [
    { value: "all", label: "كل الدول" },
    { value: "turkey", label: "تركيا" },
    { value: "saudi-arabia", label: "السعودية" },
    { value: "uae", label: "الإمارات" },
    { value: "china", label: "الصين" },
    { value: "syria", label: "سوريا" },
    { value: "egypt", label: "مصر" },
    { value: "india", label: "الهند" },
  ],
} as const;

const HeroSearch = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");

  const categories = categoryOptions[lang];
  const countries = countryOptions[lang];

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (category !== "all") {
      params.set("category", category);
    }

    if (country !== "all") {
      params.set("country", country);
    }

    navigate(`/catalog?${params.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className="mt-10 rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              lang === "ar"
                ? "ابحث عن منتجات أو موردين أو فئات..."
                : "Search for products, suppliers, or categories..."
            }
            className="h-12 bg-background/50"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 w-full bg-background/50 sm:w-[180px]">
            <SelectValue placeholder={lang === "ar" ? "الفئة" : "Category"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-12 w-full bg-background/50 sm:w-[160px]">
            <SelectValue placeholder={lang === "ar" ? "الدولة" : "Country"} />
          </SelectTrigger>
          <SelectContent>
            {countries.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="gold" className="h-12 px-6" onClick={handleSearch}>
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
};

export default HeroSearch;
