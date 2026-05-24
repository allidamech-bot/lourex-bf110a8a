import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, PackagePlus, RefreshCw, Save, Search, Sparkles } from "lucide-react";
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
  createCatalogProduct,
  createProductSlug,
  fetchCatalogProducts,
  filterProductList,
  listProductCategories,
  updateCatalogProduct,
  type ProductCatalogAdminInput,
} from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";
import { supabase } from "@/integrations/supabase/client";

const emptyForm: ProductCatalogAdminInput = {
  nameAr: "",
  nameEn: "",
  shortDescriptionAr: "",
  shortDescriptionEn: "",
  descriptionAr: "",
  descriptionEn: "",
  categoryId: "food-fmcg",
  originCountry: "Turkey",
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
  status: "active",
  isFeatured: false,
  imageUrl: "",
  imageAltAr: "",
  imageAltEn: "",
  tagsAr: [],
  tagsEn: [],
};

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

export default function ProductsManagementPage() {
  const { profile } = useAuthSession();
  const canManage = Boolean(profile?.role && PRODUCT_MANAGEMENT_ROLES.includes(profile.role));
  const categories = listProductCategories();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductCatalogAdminInput>(emptyForm);
  const [tagsAr, setTagsAr] = useState("");
  const [tagsEn, setTagsEn] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const filteredProducts = useMemo(() => filterProductList({ products, query: search, categoryId: "all" }), [products, search]);

  const refresh = async () => {
    setLoading(true);
    try {
      const nextProducts = await fetchCatalogProducts({ includeInactive: true });
      setProducts(nextProducts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const resetForm = () => {
    setSelectedProductId(null);
    setForm(emptyForm);
    setTagsAr("");
    setTagsEn("");
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
      toast.error("Please upload an image file.");
      return;
    }

    setUploading(true);
    try {
      const slug = createProductSlug(form.slug || form.nameEn || form.nameAr || file.name);
      const publicUrl = await uploadProductImage(file, slug);
      updateField("imageUrl", publicUrl);
      toast.success("Product image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveProduct = async () => {
    if (!canManage) {
      toast.error("You do not have permission to manage products.");
      return;
    }

    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      toast.error("Arabic and English product names are required.");
      return;
    }

    setSaving(true);
    try {
      const payload: ProductCatalogAdminInput = {
        ...form,
        tagsAr: fromCsvTags(tagsAr),
        tagsEn: fromCsvTags(tagsEn),
      };

      if (selectedProduct) {
        await updateCatalogProduct(selectedProduct.id, payload);
        toast.success("Product updated.");
      } else {
        await createCatalogProduct(payload);
        toast.success("Product created.");
      }

      await refresh();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-[2rem] border border-destructive/20 bg-destructive/10 p-8 text-destructive">
        You do not have permission to manage product catalog items.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_-55px_rgba(0,0,0,0.75)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
              <Sparkles className="h-4 w-4" />
              Product catalog management
            </div>
            <h1 className="mt-4 font-serif text-3xl font-bold text-white">Products / المنتجات</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              Add products and images for the public catalog. Items are displayed as sourcing service examples, while customer requests remain free-form.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="gold" onClick={resetForm}>
              <PackagePlus className="h-4 w-4" />
              New product
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." className="pl-9" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">No products yet.</div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                    selectedProductId === product.id
                      ? "border-blue-400/40 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.025] hover:border-blue-400/25 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-900/80">
                    {product.images[0]?.url ? <img src={product.images[0].url} alt={product.nameEn} className="h-full w-full object-contain p-1" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{product.nameEn || product.nameAr}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{product.shortDescriptionEn || product.shortDescriptionAr}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{product.status}</Badge>
                      {product.isFeatured ? <Badge variant="secondary">Featured</Badge> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-white">{selectedProduct ? "Edit product" : "Create product"}</h2>
              <p className="mt-1 text-sm text-slate-400">Upload the image, write Arabic/English content, then publish it.</p>
            </div>
            <Button variant="gold" onClick={() => void saveProduct()} disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Product image</Label>
              <div className="grid gap-4 rounded-2xl border border-dashed border-white/15 bg-slate-950/30 p-4 md:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-slate-900/80">
                  {form.imageUrl ? <img src={form.imageUrl} alt={form.imageAltEn || form.nameEn} className="h-full w-full object-contain p-2" /> : <ImagePlus className="h-10 w-10 text-slate-500" />}
                </div>
                <div className="space-y-3">
                  <Input type="file" accept="image/*" onChange={(event) => void handleImageChange(event)} disabled={uploading} />
                  {uploading ? <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Uploading image...</p> : null}
                  <Input value={form.imageUrl || ""} onChange={(event) => updateField("imageUrl", event.target.value)} placeholder="Image URL" />
                </div>
              </div>
            </div>

            <div className="space-y-2"><Label>Arabic name</Label><Input value={form.nameAr} onChange={(event) => updateField("nameAr", event.target.value)} /></div>
            <div className="space-y-2"><Label>English name</Label><Input value={form.nameEn} onChange={(event) => updateField("nameEn", event.target.value)} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug || ""} onChange={(event) => updateField("slug", event.target.value)} placeholder="auto-generated if empty" /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(value) => updateField("categoryId", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.labelEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Arabic short description</Label><Textarea value={form.shortDescriptionAr} onChange={(event) => updateField("shortDescriptionAr", event.target.value)} /></div>
            <div className="space-y-2"><Label>English short description</Label><Textarea value={form.shortDescriptionEn} onChange={(event) => updateField("shortDescriptionEn", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Arabic description</Label><Textarea value={form.descriptionAr} onChange={(event) => updateField("descriptionAr", event.target.value)} className="min-h-28" /></div>
            <div className="space-y-2 md:col-span-2"><Label>English description</Label><Textarea value={form.descriptionEn} onChange={(event) => updateField("descriptionEn", event.target.value)} className="min-h-28" /></div>
            <div className="space-y-2"><Label>Origin country</Label><Input value={form.originCountry} onChange={(event) => updateField("originCountry", event.target.value)} /></div>
            <div className="space-y-2"><Label>Brand</Label><Input value={form.brand || ""} onChange={(event) => updateField("brand", event.target.value)} /></div>
            <div className="space-y-2"><Label>Unit</Label><Input value={form.unit || ""} onChange={(event) => updateField("unit", event.target.value)} /></div>
            <div className="space-y-2"><Label>Packaging</Label><Input value={form.packaging || ""} onChange={(event) => updateField("packaging", event.target.value)} /></div>
            <div className="space-y-2"><Label>Weight</Label><Input value={form.weight || ""} onChange={(event) => updateField("weight", event.target.value)} /></div>
            <div className="space-y-2"><Label>Dimensions</Label><Input value={form.dimensions || ""} onChange={(event) => updateField("dimensions", event.target.value)} /></div>
            <div className="space-y-2"><Label>Material</Label><Input value={form.material || ""} onChange={(event) => updateField("material", event.target.value)} /></div>
            <div className="space-y-2"><Label>MOQ / note</Label><Input value={form.moq || ""} onChange={(event) => updateField("moq", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Technical specs</Label><Textarea value={form.technicalSpecs || ""} onChange={(event) => updateField("technicalSpecs", event.target.value)} /></div>
            <div className="space-y-2"><Label>Arabic tags, comma separated</Label><Input value={tagsAr} onChange={(event) => setTagsAr(event.target.value)} /></div>
            <div className="space-y-2"><Label>English tags, comma separated</Label><Input value={tagsEn} onChange={(event) => setTagsEn(event.target.value)} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value: ProductCatalogAdminInput["status"]) => updateField("status", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div><Label>Featured product</Label><p className="mt-1 text-xs text-slate-400">Show first in the catalog.</p></div>
              <Switch checked={form.isFeatured} onCheckedChange={(value) => updateField("isFeatured", value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
