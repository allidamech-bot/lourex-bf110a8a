import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, FileText, Hash, Globe, Loader2, ArrowLeft } from "lucide-react";

export interface CompanyBasics {
  company_name: string;
  cr_number: string;
  tax_id: string;
  location: string;
  website: string;
}

interface Props {
  onComplete: (data: CompanyBasics) => void;
  onBack: () => void;
  initial?: Partial<CompanyBasics>;
  loading?: boolean;
}

export const Step2Company = ({ onComplete, onBack, initial, loading }: Props) => {
  const [form, setForm] = useState<CompanyBasics>({
    company_name: initial?.company_name ?? "",
    cr_number: initial?.cr_number ?? "",
    tax_id: initial?.tax_id ?? "",
    location: initial?.location ?? "",
    website: initial?.website ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.company_name.trim() || form.company_name.trim().length < 2) e.company_name = "Required";
    if (!form.cr_number.trim()) e.cr_number = "Required";
    if (!form.tax_id.trim()) e.tax_id = "Required";
    if (!form.location.trim()) e.location = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    onComplete(form);
  };

  const set = (k: keyof CompanyBasics, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold">Company basics</h2>
        <p className="text-sm text-muted-foreground">Official details we'll use to verify your business.</p>
      </div>

      <div className="space-y-2">
        <Label>Legal company name *</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className="ps-10" placeholder="Acme Manufacturing Ltd." />
        </div>
        {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Commercial Registration *</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input value={form.cr_number} onChange={(e) => set("cr_number", e.target.value)} className="ps-10" placeholder="CR-12345678" />
          </div>
          {errors.cr_number && <p className="text-xs text-destructive">{errors.cr_number}</p>}
        </div>
        <div className="space-y-2">
          <Label>Tax ID *</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input value={form.tax_id} onChange={(e) => set("tax_id", e.target.value)} className="ps-10" placeholder="TAX-9876543210" />
          </div>
          {errors.tax_id && <p className="text-xs text-destructive">{errors.tax_id}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location (City, Country) *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} className="ps-10" placeholder="Istanbul, Turkey" />
        </div>
        {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
      </div>

      <div className="space-y-2">
        <Label>Website (optional)</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input value={form.website} onChange={(e) => set("website", e.target.value)} className="ps-10" placeholder="https://yourcompany.com" />
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
