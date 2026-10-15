import { useState } from "react";
import { Check, Image as ImageIcon, Loader2, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProductCatalogAdminInput } from "@/features/products/services/productCatalogService";
import {
  applyProductStudioSuggestion,
  canAnalyzeProductImage,
  generateProductStudioSuggestion,
  type ProductStudioSuggestion,
} from "@/features/products/services/aiProductStudioService";

type Props = {
  form: ProductCatalogAdminInput;
  language: "ar" | "en" | string;
  disabled?: boolean;
  onApply: (next: ProductCatalogAdminInput) => void;
  onApplyTags: (ar: string[], en: string[]) => void;
};

export function AIProductStudio({ form, language, disabled = false, onApply, onApplyTags }: Props) {
  const ar = language === "ar";
  const [notes, setNotes] = useState("");
  const [suggestion, setSuggestion] = useState<ProductStudioSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const hasImage = canAnalyzeProductImage(form.imageUrl || "");
  const otherImage = Boolean(form.imageUrl?.trim()) && !hasImage;

  const generate = async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError("");
    setSuggestion(null);
    setApplied(false);
    try {
      const result = await generateProductStudioSuggestion(form, notes);
      setSuggestion(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate product draft");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!suggestion || disabled) return;
    onApply(applyProductStudioSuggestion(form, suggestion));
    onApplyTags(suggestion.tagsAr, suggestion.tagsEn);
    setApplied(true);
    setSuggestion(null);
  };

  return (
    <section data-testid="ai-product-studio" className="overflow-hidden rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-background p-4 shadow-lg sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" /> LOUREX AI · Product Studio
          </div>
          <h3 className="mt-2 text-xl font-semibold text-foreground">
            {ar ? "تجهيز منتجك بالذكاء الاصطناعي" : "Generate bilingual product copy"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {ar
              ? "ارفع صورة المنتج في الحقل أدناه وأضف ما تعرفه عنه. سيقترح النظام أسماء وأوصافًا وتصنيفًا وكلمات مفتاحية للمراجعة قبل الحفظ."
              : "Upload your product photo using the image field below and add known details. Review suggested names, copy, category and tags before saving."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1.5 text-xs text-primary">
          <ShieldCheck className="h-4 w-4" />
          {ar ? "مراجعة بشرية قبل النشر" : "Human review required"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-background/70">
          {hasImage ? (
            <img src={form.imageUrl} alt="" className="h-full w-full object-contain p-2" />
          ) : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
        </div>
        <div className="min-w-0 space-y-3">
          <label htmlFor="product-studio-notes" className="block text-sm font-semibold text-foreground">
            {ar ? "معلومات أو ملاحظات موثوقة عن المنتج" : "Verified product details / notes"}
          </label>
          <Textarea
            id="product-studio-notes"
            value={notes}
            onChange={event => setNotes(event.target.value)}
            maxLength={2400}
            rows={3}
            disabled={disabled || busy}
            placeholder={ar ? "مثال: بسكويت محشو بالشوكولا، عبوة 24 قطعة، منشأ تركيا مثبت على الملصق..." : "Example: chocolate-filled biscuits, 24-pack, Turkey origin verified on packaging..."}
            className="min-h-24 border-primary/20 bg-background/80 text-foreground"
          />
          {otherImage ? (
            <p className="text-xs text-amber-300">
              {ar ? "للتحليل البصري ارفع الصورة عبر حقل صورة المنتج في الصفحة. روابط الصور الخارجية لا تُرسل إلى AI." : "For visual analysis, upload the image through the product image field. External URLs are not sent to AI."}
            </p>
          ) : !hasImage ? (
            <p className="text-xs text-muted-foreground">
              {ar ? "بدون صورة سيعتمد AI على الاسم والمعلومات المكتوبة فقط." : "Without an uploaded photo, AI relies only on your written information."}
            </p>
          ) : (
            <p className="text-xs text-primary">{ar ? "الصورة المرفوعة جاهزة للتحليل البصري." : "Uploaded photo ready for visual analysis."}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-lg text-xs leading-5 text-muted-foreground">
              {ar ? "لن نخترع حد الطلب الأدنى أو السعر أو المنشأ أو شهادات المنتج، ولن ننشره تلقائيًا." : "MOQ, pricing, origin and certifications are never invented; nothing is auto-published."}
            </p>
            <Button type="button" onClick={() => void generate()} disabled={disabled || busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {busy ? (ar ? "جارٍ إعداد المسودة..." : "Generating draft...") : (ar ? "إنشاء المسودة بالذكاء الاصطناعي" : "Generate AI draft")}
            </Button>
          </div>
          {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          {applied ? <p role="status" className="text-sm text-primary">{ar ? "تم نقل الاقتراح إلى نموذج المنتج. راجع الحقول واضغط حفظ بنفسك." : "Suggestion applied to editor. Review every field, then save manually."}</p> : null}
        </div>
      </div>

      {suggestion ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-primary/30 bg-background/70 p-4" data-testid="product-studio-review">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-semibold text-primary">{ar ? "معاينة المحتوى المقترح — لم يُحفظ بعد" : "Review suggestion — not saved"}</h4>
            <Button type="button" onClick={apply} disabled={disabled} className="gap-2">
              <Check className="h-4 w-4" /> {ar ? "تطبيق الاقتراح على النموذج" : "Apply suggestion to editor"}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div dir="rtl" className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">العربية</p>
              <h5 className="font-bold text-foreground">{suggestion.nameAr}</h5>
              <p className="text-sm text-muted-foreground">{suggestion.shortDescriptionAr}</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{suggestion.descriptionAr}</p>
            </div>
            <div dir="ltr" className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">English</p>
              <h5 className="font-bold text-foreground">{suggestion.nameEn}</h5>
              <p className="text-sm text-muted-foreground">{suggestion.shortDescriptionEn}</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{suggestion.descriptionEn}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {ar ? "التصنيف والكلمات المفتاحية المقترحة تُطبّق فقط عند الضغط على الزر. MOQ والمنشأ وباقي البيانات التجارية تبقى كما أدخلتها." : "Category and suggested tags apply only on approval. Commercial fields remain unchanged."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
