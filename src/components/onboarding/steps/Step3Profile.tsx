import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BusinessProfile {
  business_type: string;
  categories: string[];
  description: string;
  year_established: number | null;
  employee_count: string;
}

interface Props {
  onComplete: (data: BusinessProfile) => void;
  onBack: () => void;
  initial?: Partial<BusinessProfile>;
  loading?: boolean;
}

const BUSINESS_TYPES = ["Manufacturer", "Trading Company", "Distributor", "Wholesaler", "Service Provider"];

const CATEGORIES = [
  "Food & Beverage", "Textiles & Apparel", "Construction Materials", "Electronics",
  "Cosmetics & Personal Care", "Furniture", "Plastics & Packaging", "Chemicals",
  "Machinery", "Automotive Parts", "Home Goods", "Agricultural Products",
];

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export const Step3Profile = ({ onComplete, onBack, initial, loading }: Props) => {
  const [businessType, setBusinessType] = useState(initial?.business_type ?? "");
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? []);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [year, setYear] = useState<string>(initial?.year_established ? String(initial.year_established) : "");
  const [employees, setEmployees] = useState(initial?.employee_count ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleCat = (c: string) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!businessType) e.businessType = "Select your business type";
    if (categories.length === 0) e.categories = "Select at least one category";
    if (description.trim().length < 80) e.description = `At least 80 characters (${description.trim().length}/80)`;
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onComplete({
      business_type: businessType,
      categories,
      description: description.trim(),
      year_established: year ? parseInt(year, 10) : null,
      employee_count: employees,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold">Tell us about your business</h2>
        <p className="text-sm text-muted-foreground">Buyers use this to find and evaluate your company.</p>
      </div>

      <div className="space-y-2">
        <Label>Business type *</Label>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.map((bt) => (
            <button
              type="button"
              key={bt}
              onClick={() => setBusinessType(bt)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm border transition-all",
                businessType === bt
                  ? "bg-primary/15 border-primary text-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {bt}
            </button>
          ))}
        </div>
        {errors.businessType && <p className="text-xs text-destructive">{errors.businessType}</p>}
      </div>

      <div className="space-y-2">
        <Label>Product categories * <span className="text-muted-foreground font-normal">({categories.length} selected)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const sel = categories.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleCat(c)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs sm:text-sm border transition-all flex items-center gap-2 text-start",
                  sel
                    ? "bg-primary/15 border-primary text-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {sel && <Check className="w-3 h-3 text-primary shrink-0" />}
                <span className="truncate">{c}</span>
              </button>
            );
          })}
        </div>
        {errors.categories && <p className="text-xs text-destructive">{errors.categories}</p>}
      </div>

      <div className="space-y-2">
        <Label>Company description *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you produce, your specialties, certifications, export markets..."
          rows={5}
          className="resize-none"
        />
        <div className="flex justify-between text-xs">
          <span className={errors.description ? "text-destructive" : "text-muted-foreground"}>
            {errors.description ?? "Min 80 characters"}
          </span>
          <span className="text-muted-foreground">{description.trim().length}/500</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Year established</Label>
          <Input type="number" min="1900" max={new Date().getFullYear()} value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2010" />
        </div>
        <div className="space-y-2">
          <Label>Employees</Label>
          <div className="flex gap-1 flex-wrap">
            {EMPLOYEE_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setEmployees(r)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs border transition-all",
                  employees === r
                    ? "bg-primary/15 border-primary text-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 me-2" /> Back
        </Button>
        <Button type="submit" variant="gold" className="flex-1 h-11" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    </form>
  );
};
