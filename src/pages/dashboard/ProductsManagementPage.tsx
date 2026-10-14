import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Archive, ArchiveRestore, ImagePlus, Loader2, PackagePlus, RefreshCw, Save, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { PRODUCT_MANAGEMENT_ROLES } from "@/features/auth/rbac";
import {
  archiveProduct,
  createCatalogProduct,
  createProductSlug,
  fetchCatalogProducts,
  filterProductList,
  listProductCategories,
  restoreProduct,
  toggleProductFeatured,
  updateCatalogProduct,
  type ProductCatalogAdminInput,
} from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const PRODUCT_MANAGEMENT_DRAFT_KEY = "lourex.productManagement.draft.v1";

const emptyForm: ProductCatalogAdminInput = {
  nameAr: "",
  nameEn: "",
  shortDescriptionAr: "",
  shortDescriptionEn: "",
  descriptionAr: "",
  descriptionEn: "",
  categoryId: "food-fmcg",
  originCountry: "",
  brand: "",
  moq: "",
  unit: "",
  packaging: "",
  weight: "",
  dimensions: "",
  material: "",
  technicalSpecs: "",
  priceNoteAr: "هذا المنتج للعرض كنموذج خدمة توريد. الطلب النهائي حسب المواصفات والكمية والوجهة.",
  priceNoteEn: "This product is displayed as a sourcing service example. Final requests depend on specifications, quantity, and destination.",
  status: "draft",
  isFeatured: false,
  imageUrl: "",
  imageAltAr: "",
  imageAltEn: "",
  tagsAr: [],
  tagsEn: [],
};

type ProductManagementDraft = {
  form: ProductCatalogAdminInput;
  tagsAr: string;
  tagsEn: string;
  selectedProductId: string | null;
};

const productCatalogStatuses: ProductCatalogAdminInput["status"][] = ["active", "draft", "archived"];

const isProductCatalogStatus = (value: unknown): value is ProductCatalogAdminInput["status"] =>
  productCatalogStatuses.includes(value as ProductCatalogAdminInput["status"]);

const toCsvTags = (tags?: string[]) => (tags || []).join(", ");
const fromCsvTags = (value: string) => value.split(",").map((tag) => tag.trim()).filter(Boolean);

const productToForm = (product: ProductCatalogItem): ProductCatalogAdminInput => ({
  slug: product.slug,
  nameAr: product.nameAr,
  nameEn: product.nameEn,
  shortDescriptionAr: product.shortDescriptionAr,
  shortDescriptionEn: product.shortDescriptionEn,
  descriptionAr: product.descriptionAr,
  descriptionEn: product.descriptionEn,
  categoryId: product.categoryId,
  originCountry: product.originCountry,
  brand: product.brand || "",
  moq: product.moq || "",
  unit: product.unit || "",
  packaging: product.packaging || "",
  weight: product.weight || "",
  dimensions: product.dimensions || "",
  material: product.material || "",
  technicalSpecs: product.technicalSpecs || "",
  priceNoteAr: product.priceNoteAr || emptyForm.priceNoteAr,
  priceNoteEn: product.priceNoteEn || emptyForm.priceNoteEn,
  status: product.status,
  isFeatured: product.isFeatured,
  imageUrl: product.images[0]?.url || "",
  imageAltAr: product.images[0]?.altAr || product.nameAr,
  imageAltEn: product.images[0]?.altEn || product.nameEn,
  tagsAr: product.tagsAr,
  tagsEn: product.tagsEn,
});

const normalizeDraftForm = (value: unknown): ProductCatalogAdminInput | null => {
  if (!value || typeof value !== "object") return null;

  const draftForm = { ...emptyForm, ...(value as Partial<ProductCatalogAdminInput>) };

  return {
    ...draftForm,
    status: isProductCatalogStatus(draftForm.status) ? draftForm.status : emptyForm.status,
    tagsAr: Array.isArray(draftForm.tagsAr) ? draftForm.tagsAr : [],
    tagsEn: Array.isArray(draftForm.tagsEn) ? draftForm.tagsEn : [],
  };
};

const readProductManagementDraft = (): ProductManagementDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = window.localStorage.getItem(PRODUCT_MANAGEMENT_DRAFT_KEY);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<ProductManagementDraft>;
    const restoredForm = normalizeDraftForm(parsed.form);
    if (!restoredForm) return null;

    return {
      form: restoredForm,
      tagsAr: typeof parsed.tagsAr === "string" ? parsed.tagsAr : toCsvTags(restoredForm.tagsAr),
      tagsEn: typeof parsed.tagsEn === "string" ? parsed.tagsEn : toCsvTags(restoredForm.tagsEn),
      selectedProductId: typeof parsed.selectedProductId === "string" ? parsed.selectedProductId : null,
    };
  } catch {
    return null;
  }
};

const hasProductManagementDraftContent = (draft: ProductManagementDraft) => {
  const draftForm = { ...draft.form, tagsAr: [], tagsEn: [] };
  const baselineForm = { ...emptyForm, tagsAr: [], tagsEn: [] };

  return Boolean(
    draft.selectedProductId ||
      draft.tagsAr.trim() ||
      draft.tagsEn.trim() ||
      JSON.stringify(draftForm) !== JSON.stringify(baselineForm),
  );
};

const writeProductManagementDraft = (draft: ProductManagementDraft) => {
  if (typeof window === "undefined") return;

  if (!hasProductManagementDraftContent(draft)) {
    window.localStorage.removeItem(PRODUCT_MANAGEMENT_DRAFT_KEY);
    return;
  }

  window.localStorage.setItem(PRODUCT_MANAGEMENT_DRAFT_KEY, JSON.stringify(draft));
};

const clearProductManagementDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PRODUCT_MANAGEMENT_DRAFT_KEY);
};

const uploadProductImage = async (file: File, slug: string) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `catalog/${slug || createProductSlug(file.name)}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
};

const handleDuplicateSlugError = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null;
  const message = error.message.toLowerCase();
  if (message.includes("duplicate") || message.includes("unique") || message.includes("slug")) {
    return "A product with this slug already exists. Please use a different slug.";
  }
  return null;
};

export default function ProductsManagementPage() {
   const { t } = useI18n();
  const { profile } = useAuthSession();
  const canManage = Boolean(profile?.role && PRODUCT_MANAGEMENT_ROLES.includes(profile.role));
  const categories = listProductCategories();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductCatalogAdminInput>(emptyForm);
  const [tagsAr, setTagsAr] = useState("");
  const [tagsEn, setTagsEn] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "non-featured">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  const filteredProducts = useMemo(
    () => filterProductList({ products, query: search, statusFilter, featuredFilter, categoryId: "all" }),
    [products, search, statusFilter, featuredFilter],
  );
  const draftHasContent = useMemo(
    () => hasProductManagementDraftContent({ form, tagsAr, tagsEn, selectedProductId }),
    [form, tagsAr, tagsEn, selectedProductId],
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const nextProducts = await fetchCatalogProducts({ includeInactive: true });
      setProducts(nextProducts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("productManagement.toasts.failedToLoadProducts"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const draft = readProductManagementDraft();
    if (draft) {
      setSelectedProductId(draft.selectedProductId);
      setForm(draft.form);
      setTagsAr(draft.tagsAr);
      setTagsEn(draft.tagsEn);
      toast.info(t("productManagement.toasts.draftRestored"));
    }
    setHasHydratedDraft(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!hasHydratedDraft) return;

    writeProductManagementDraft({
      form,
      tagsAr,
      tagsEn,
      selectedProductId,
    });
  }, [form, hasHydratedDraft, selectedProductId, tagsAr, tagsEn]);

  const resetForm = () => {
    clearProductManagementDraft();
    setSelectedProductId(null);
    setForm(emptyForm);
    setTagsAr("");
    setTagsEn("");
  };

  const clearDraft = () => {
    resetForm();
    toast.success(t("productManagement.toasts.draftCleared"));
  };

  const selectProduct = (product: ProductCatalogItem) => {
    setSelectedProductId(product.id);
    const nextForm = productToForm(product);
    setForm(nextForm);
    setTagsAr(toCsvTags(nextForm.tagsAr));
    setTagsEn(toCsvTags(nextForm.tagsEn));
  };

  const updateField = <K extends keyof ProductCatalogAdminInput>(field: K, value: ProductCatalogAdminInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("productManagement.toasts.uploadImageFile"));
      return;
    }

    setUploading(true);
    try {
      const slug = createProductSlug(form.slug || form.nameEn || form.nameAr || file.name);
      const publicUrl = await uploadProductImage(file, slug);
      updateField("imageUrl", publicUrl);
      toast.success(t("productManagement.toasts.imageUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("productManagement.toasts.imageUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const saveProduct = async () => {
    if (!canManage) {
      toast.error(t("productManagement.toasts.noPermission"));
      return;
    }

    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      toast.error(t("productManagement.toasts.namesRequired"));
      return;
    }

    setSaving(true);
    try {
      const payload: ProductCatalogAdminInput = {
        ...form,
        tagsAr: fromCsvTags(tagsAr),
        tagsEn: fromCsvTags(tagsEn),
      };

      if (selectedProductId) {
        await updateCatalogProduct(selectedProductId, payload);
        toast.success(t("productManagement.toasts.productUpdated"));
      } else {
        await createCatalogProduct(payload);
        toast.success(t("productManagement.toasts.productCreated"));
      }

      clearProductManagementDraft();
      await refresh();
      resetForm();
    } catch (error) {
      const duplicateMessage = handleDuplicateSlugError(error);
      if (duplicateMessage) {
        toast.error(duplicateMessage);
      } else {
        toast.error(error instanceof Error ? error.message : t("productManagement.toasts.failedToSaveProduct"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (productId: string) => {
    if (!canManage) return;

    try {
      await archiveProduct(productId);
      toast.success(t("productManagement.toasts.productArchived"));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("productManagement.toasts.failedToArchiveProduct"));
    }
  };

  const handleRestore = async (productId: string) => {
    if (!canManage) return;

    try {
      await restoreProduct(productId);
      toast.success(t("productManagement.toasts.productRestored"));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("productManagement.toasts.failedToRestoreProduct"));
    }
  };

  const handleToggleFeatured = async (productId: string, currentFeatured: boolean) => {
    if (!canManage) return;

    try {
      await toggleProductFeatured(productId, !currentFeatured);
      toast.success(currentFeatured ? t("productManagement.toasts.removedFromFeatured") : t("productManagement.toasts.markedAsFeatured"));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("productManagement.toasts.failedToUpdateFeatured"));
    }
  };

if (!canManage) {
     return (
       <div className="rounded-[2rem] border border-destructive/20 bg-destructive/10 p-8 text-destructive">
         {t("productManagement.noPermissionAlert")}
       </div>
     );
   }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-primary/20 bg-card p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
<Sparkles className="h-4 w-4" />
               {t("productManagement.eyebrow")}
             </div>
             <h1 className="mt-4 font-serif text-3xl font-bold text-foreground">{t("productManagement.title")}</h1>
             <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
               {t("productManagement.description")}
             </p>
          </div>
          <div className="flex flex-wrap gap-2">
<Button variant="outline" onClick={() => void refresh()} disabled={loading} className="border-primary/20 bg-card text-foreground hover:bg-stone-50/10">
               <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : "text-primary"}`} />
               {t("common.refresh")}
             </Button>
             <Button variant="gold" onClick={resetForm} className="bg-primary font-bold text-primary-foreground shadow-2xl hover:brightness-110">
               <PackagePlus className="h-4 w-4" />
               {t("productManagement.newProduct")}
             </Button>
             {draftHasContent ? (
               <Button variant="outline" onClick={clearDraft} disabled={saving || uploading} className="border-primary/20 bg-card text-foreground hover:bg-stone-50/10">
                 <Trash2 className="h-4 w-4 text-primary" />
                 {t("productManagement.clearDraft")}
               </Button>
             ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
<Select value={statusFilter} onValueChange={(value: "all" | "active" | "draft" | "archived") => setStatusFilter(value)}>
           <SelectTrigger className="w-36 bg-background/75 border-primary/20 text-foreground">
             <SelectValue placeholder={t("productManagement.statusFilter")} />
           </SelectTrigger>
           <SelectContent className="bg-card border-primary/20">
             <SelectItem value="all" className="cursor-pointer">{t("productManagement.allStatuses")}</SelectItem>
             <SelectItem value="active" className="cursor-pointer">{t("common.active")}</SelectItem>
             <SelectItem value="draft" className="cursor-pointer">{t("statuses.draft")}</SelectItem>
             <SelectItem value="archived" className="cursor-pointer">{t("statuses.archived")}</SelectItem>
           </SelectContent>
         </Select>
         <Select value={featuredFilter} onValueChange={(value: "all" | "featured" | "non-featured") => setFeaturedFilter(value)}>
           <SelectTrigger className="w-36 bg-background/75 border-primary/20 text-foreground">
             <SelectValue placeholder={t("productManagement.featuredFilter")} />
           </SelectTrigger>
           <SelectContent className="bg-card border-primary/20">
             <SelectItem value="all" className="cursor-pointer">{t("productManagement.allProducts")}</SelectItem>
             <SelectItem value="featured" className="cursor-pointer">{t("productManagement.featuredOnly")}</SelectItem>
             <SelectItem value="non-featured" className="cursor-pointer">{t("productManagement.nonFeatured")}</SelectItem>
           </SelectContent>
         </Select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[2rem] border border-primary/20 bg-card p-5 shadow-2xl backdrop-blur-xl">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("productManagement.searchPlaceholder")} className="pl-9 bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" />
          </div>

{loading ? (
             <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-background/75 p-5 text-sm text-muted-foreground">
               <Loader2 className="h-4 w-4 animate-spin text-primary" />
               {t("productManagement.loading")}
             </div>
           ) : filteredProducts.length === 0 ? (
             <div className="rounded-2xl border border-dashed border-primary/20 bg-background/75 p-6 text-sm text-muted-foreground">{t("productManagement.emptyFiltered")}</div>
           ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                    selectedProductId === product.id
                      ? "border-primary/20 bg-primary-soft shadow-[0_12px_40px_-12px_rgba(251,191,36,0.25)]"
                      : "border-primary/20 bg-background/75 hover:border-primary/20 hover:bg-card"
                  }`}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-background/75">
                    {product.images[0]?.url ? <img src={product.images[0].url} alt={product.nameEn} className="h-full w-full object-contain p-1" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{product.nameEn || product.nameAr}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{product.shortDescriptionEn || product.shortDescriptionAr}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="border-primary/20 text-muted-foreground">{product.status}</Badge>
                      {product.isFeatured ? <Badge className="bg-primary-soft text-primary border-primary/20">{t("productManagement.featuredBadge")}</Badge> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {product.status !== "archived" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleArchive(product.id);
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRestore(product.id);
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-300"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleFeatured(product.id, product.isFeatured);
                      }}
                      className={`h-8 w-8 p-0 ${product.isFeatured ? "text-primary" : "text-muted-foreground"} hover:text-primary`}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-primary/20 bg-card p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
<h2 className="font-serif text-2xl font-semibold text-foreground">{selectedProductId ? t("seller.editProduct") : t("productManagement.createProduct")}</h2>
               <p className="mt-1 text-sm text-muted-foreground">{t("productManagement.formDescription")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
{draftHasContent ? (
                 <Button variant="outline" onClick={clearDraft} disabled={saving || uploading} className="border-primary/20 bg-card text-foreground hover:bg-stone-50/10">
                   <Trash2 className="h-4 w-4 text-primary" />
                   {t("productManagement.clearDraft")}
                 </Button>
               ) : null}
               <Button variant="gold" onClick={() => void saveProduct()} disabled={saving || uploading} className="bg-primary font-bold text-primary-foreground shadow-2xl hover:brightness-110">
                 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                 {t("common.save")}
               </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-foreground">{t("productManagement.labels.productImage")}</Label>
              <div className="grid gap-4 rounded-2xl border border-dashed border-primary/20 bg-background/75 p-4 md:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-background/75">
                  {form.imageUrl ? <img src={form.imageUrl} alt={form.imageAltEn || form.nameEn} className="h-full w-full object-contain p-2" /> : <ImagePlus className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="space-y-3">
                  <Input type="file" accept="image/*" onChange={(event) => void handleImageChange(event)} disabled={uploading} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" />
{uploading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> {t("productManagement.uploadingImage")}</p> : null}
                   <Input value={form.imageUrl || ""} onChange={(event) => updateField("imageUrl", event.target.value)} placeholder={t("productManagement.placeholders.imageUrl")} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" />
                </div>
              </div>
            </div>

              <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.arabicName")}</Label><Input value={form.nameAr} onChange={(event) => updateField("nameAr", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.englishName")}</Label><Input value={form.nameEn} onChange={(event) => updateField("nameEn", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.slug")}</Label><Input value={form.slug || ""} onChange={(event) => updateField("slug", event.target.value)} placeholder={t("productManagement.placeholders.slugAuto")} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2">
               <Label className="text-foreground">{t("productManagement.labels.category")}</Label>
               <Select value={form.categoryId} onValueChange={(value) => updateField("categoryId", value)}>
                 <SelectTrigger className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25"><SelectValue /></SelectTrigger>
                 <SelectContent className="bg-card border-primary/20 text-foreground">{categories.map((category) => <SelectItem key={category.id} value={category.id} className="focus:bg-secondary focus:text-foreground cursor-pointer">{category.labelEn}</SelectItem>)}</SelectContent>
               </Select>
             </div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.arabicShortDesc")}</Label><Textarea value={form.shortDescriptionAr} onChange={(event) => updateField("shortDescriptionAr", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.englishShortDesc")}</Label><Textarea value={form.shortDescriptionEn} onChange={(event) => updateField("shortDescriptionEn", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2 md:col-span-2"><Label className="text-foreground">{t("productManagement.labels.arabicDesc")}</Label><Textarea value={form.descriptionAr} onChange={(event) => updateField("descriptionAr", event.target.value)} className="min-h-28 bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2 md:col-span-2"><Label className="text-foreground">{t("productManagement.labels.englishDesc")}</Label><Textarea value={form.descriptionEn} onChange={(event) => updateField("descriptionEn", event.target.value)} className="min-h-28 bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.originCountry")}</Label><Input value={form.originCountry} onChange={(event) => updateField("originCountry", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.brand")}</Label><Input value={form.brand || ""} onChange={(event) => updateField("brand", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.unit")}</Label><Input value={form.unit || ""} onChange={(event) => updateField("unit", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.packaging")}</Label><Input value={form.packaging || ""} onChange={(event) => updateField("packaging", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.weight")}</Label><Input value={form.weight || ""} onChange={(event) => updateField("weight", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.dimensions")}</Label><Input value={form.dimensions || ""} onChange={(event) => updateField("dimensions", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.material")}</Label><Input value={form.material || ""} onChange={(event) => updateField("material", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.moqNote")}</Label><Input value={form.moq || ""} onChange={(event) => updateField("moq", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2 md:col-span-2"><Label className="text-foreground">{t("productManagement.labels.technicalSpecs")}</Label><Textarea value={form.technicalSpecs || ""} onChange={(event) => updateField("technicalSpecs", event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.arabicTags")}</Label><Input value={tagsAr} onChange={(event) => setTagsAr(event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2"><Label className="text-foreground">{t("productManagement.labels.englishTags")}</Label><Input value={tagsEn} onChange={(event) => setTagsEn(event.target.value)} className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25" /></div>
             <div className="space-y-2">
               <Label className="text-foreground">{t("productManagement.labels.status")}</Label>
              <Select value={form.status} onValueChange={(value: ProductCatalogAdminInput["status"]) => updateField("status", value)}>
                <SelectTrigger className="bg-background/75 border-primary/20 text-foreground focus:ring-primary/25"><SelectValue /></SelectTrigger>
<SelectContent className="bg-card border-primary/20 text-foreground">
                   <SelectItem value="active" className="focus:bg-secondary focus:text-foreground cursor-pointer">{t("common.active")}</SelectItem>
                   <SelectItem value="draft" className="focus:bg-secondary focus:text-foreground cursor-pointer">{t("statuses.draft")}</SelectItem>
                   <SelectItem value="archived" className="focus:bg-secondary focus:text-foreground cursor-pointer">{t("statuses.archived")}</SelectItem>
                 </SelectContent>
              </Select>
            </div>
<div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-background/75 p-4">
                <div><Label className="text-foreground">{t("productManagement.labels.featuredProduct")}</Label><p className="mt-1 text-xs text-muted-foreground">{t("productManagement.showFirstInCatalog")}</p></div>
                <Switch checked={form.isFeatured} onCheckedChange={(value) => updateField("isFeatured", value)} />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}