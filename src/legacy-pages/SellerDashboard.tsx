import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BadgeCheck, Eye, EyeOff, ImagePlus, Package, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getCurrentUser } from "@/domain/auth/session";
import {
  deleteSellerProduct,
  fetchSellerDashboard,
  saveSellerProduct,
  toggleSellerProductActive,
  uploadSellerProductImage,
  type SellerDashboardData,
  type SellerProduct,
} from "@/domain/seller/service";

const CATEGORIES = [
  "Textiles & Fabrics",
  "Food & Beverages",
  "Electronics",
  "Steel & Metals",
  "Plastics & Packaging",
  "Chemicals",
  "Industrial Equipment",
  "Building Materials",
  "Auto Parts",
  "Health & Beauty",
  "Biscuits",
  "Confectionery",
  "General Trading",
  "Other",
];

const CURRENCIES = ["USD", "SAR", "TRY", "EUR"];

interface ProductForm {
  name: string;
  category: string;
  description: string;
  moq: string;
  pricePerUnit: string;
  currency: string;
  stockCapacity: string;
  leadTime: string;
  shippingOrigin: string;
  dimensions: string;
  weightPerUnit: string;
  unitsPerCarton: string;
}

const emptyForm: ProductForm = {
  name: "",
  category: "",
  description: "",
  moq: "",
  pricePerUnit: "",
  currency: "USD",
  stockCapacity: "",
  leadTime: "",
  shippingOrigin: "",
  dimensions: "",
  weightPerUnit: "",
  unitsPerCarton: "",
};

const parseNullableNumber = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const SellerDashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const loadDashboard = async (currentUser: User) => {
    setLoading(true);
    const result = await fetchSellerDashboard(currentUser.id);
    if (result.error || !result.data) {
      toast.error(result.error?.message || t("seller.saveFailed"));
      setDashboard(null);
    } else {
      setDashboard(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const userResult = await getCurrentUser();
      if (userResult.error || !userResult.data) {
        navigate("/auth");
        return;
      }

      setUser(userResult.data);
      await loadDashboard(userResult.data);
    };

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, t]);

  const resetForm = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setImageFile(file);
    setImagePreview(previewUrl);
    event.target.value = "";
  };

  const upsertProduct = (product: SellerProduct) => {
    setDashboard((current) => {
      if (!current) {
        return current;
      }

      const index = current.products.findIndex((item) => item.id === product.id);
      if (index === -1) {
        return {
          ...current,
          products: [product, ...current.products],
        };
      }

      const nextProducts = [...current.products];
      nextProducts[index] = product;
      return {
        ...current,
        products: nextProducts,
      };
    });
  };

  const removeProduct = (id: string) => {
    setDashboard((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((product) => product.id !== id),
          }
        : current,
    );
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error(t("seller.requiredFields"));
      return;
    }

    if (!user) {
      return;
    }

    if (!dashboard?.factory?.id) {
      toast.error(t("seller.noFactory"));
      return;
    }

    setSaving(true);

    try {
      let imageUrl = dashboard.products.find((product) => product.id === editingId)?.imageUrl ?? null;

      if (imageFile) {
        const uploadResult = await uploadSellerProductImage(user.id, imageFile);
        if (uploadResult.error || !uploadResult.data) {
          throw new Error(uploadResult.error?.message || t("seller.saveFailed"));
        }

        imageUrl = uploadResult.data;
      }

      const saveResult = await saveSellerProduct({
        id: editingId ?? undefined,
        userId: user.id,
        factoryId: dashboard.factory.id,
        name: form.name,
        category: form.category,
        description: form.description,
        moq: form.moq,
        pricePerUnit: parseNullableNumber(form.pricePerUnit),
        currency: form.currency,
        stockCapacity: form.stockCapacity,
        leadTime: form.leadTime,
        shippingOrigin: form.shippingOrigin,
        dimensions: form.dimensions,
        weightPerUnit: parseNullableNumber(form.weightPerUnit),
        unitsPerCarton: parseNullableNumber(form.unitsPerCarton),
        imageUrl,
      });

      if (saveResult.error || !saveResult.data) {
        throw new Error(saveResult.error?.message || t("seller.saveFailed"));
      }

      upsertProduct(saveResult.data);
      toast.success(editingId ? t("seller.updated") : t("seller.added"));
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : t("seller.saveFailed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: SellerProduct) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      moq: product.moq,
      pricePerUnit: product.pricePerUnit?.toString() || "",
      currency: product.currency || "USD",
      stockCapacity: product.stockCapacity,
      leadTime: product.leadTime,
      shippingOrigin: product.shippingOrigin,
      dimensions: product.dimensions,
      weightPerUnit: product.weightPerUnit?.toString() || "",
      unitsPerCarton: product.unitsPerCarton?.toString() || "",
    });
    setImageFile(null);
    setImagePreview(product.imageUrl || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("seller.deleteConfirmation"))) {
      return;
    }

    const result = await deleteSellerProduct(id);
    if (result.error || !result.data) {
      toast.error(result.error?.message || t("seller.saveFailed"));
      return;
    }

    removeProduct(result.data);
    toast.success(t("seller.deleted"));
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const result = await toggleSellerProductActive(id, current);
    if (result.error || !result.data) {
      toast.error(result.error?.message || t("seller.saveFailed"));
      return;
    }

    upsertProduct(result.data);
    toast.success(result.data.isActive ? t("seller.toggledOn") : t("seller.toggledOff"));
  };

  const products = dashboard?.products ?? [];
  const isVerified = dashboard?.isVerified ?? false;

  const filteredProducts =
    statusFilter === "all"
      ? products
      : products.filter((product) => product.status === statusFilter);

  const statusColor: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-destructive/20 text-destructive",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-4 px-4 pt-32 text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground" />
          <h1 className="font-serif text-2xl font-bold">{t("seller.verificationRequired")}</h1>
          <p className="max-w-md text-muted-foreground">{t("seller.verificationDescription")}</p>
          <Button variant="gold" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("seller.goToDashboard")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="mb-1 flex items-center gap-3">
              <h1 className="font-serif text-3xl font-bold">{t("seller.title")}</h1>
              <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                <BadgeCheck className="me-1 h-3.5 w-3.5" />
                {t("seller.verified")}
              </Badge>
            </div>
            <p className="text-muted-foreground">{t("seller.subtitle")}</p>
          </motion.div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["all", "approved", "pending", "draft", "rejected"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    statusFilter === status ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {status === "all" ? t("seller.filters.all") : t(`seller.filters.${status}`)}
                  {status === "all" ? ` (${products.length})` : ""}
                </button>
              ))}
            </div>
            <Button variant="gold" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="me-1 h-4 w-4" />
              {t("seller.addProduct")}
            </Button>
          </div>

          <AnimatePresence>
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <div className="space-y-4 rounded-xl border border-border/50 bg-card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg font-semibold">
                      {editingId ? t("seller.editProduct") : t("seller.addNewProduct")}
                    </h2>
                    <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div>
                    <Label>{t("seller.productImage")}</Label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    {imagePreview ? (
                      <div className="relative mt-2 overflow-hidden rounded-lg border border-border">
                        <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" />
                        <button
                          onClick={() => {
                            if (previewUrlRef.current) {
                              URL.revokeObjectURL(previewUrlRef.current);
                              previewUrlRef.current = null;
                            }

                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-background/80 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50"
                      >
                        <ImagePlus className="h-6 w-6" />
                        <span className="text-sm">{t("seller.selectImage")}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>{t("seller.productName")}</Label>
                      <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Premium Cotton Fabric" />
                    </div>
                    <div>
                      <Label>{t("seller.category")}</Label>
                      <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                        <SelectTrigger><SelectValue placeholder={t("seller.selectCategory")} /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>{t("seller.description")}</Label>
                      <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
                    </div>
                    <div>
                      <Label>{t("seller.pricePerUnit")}</Label>
                      <Input type="number" value={form.pricePerUnit} onChange={(event) => setForm({ ...form, pricePerUnit: event.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>{t("seller.currency")}</Label>
                      <Select value={form.currency} onValueChange={(value) => setForm({ ...form, currency: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("seller.moq")}</Label>
                      <Input value={form.moq} onChange={(event) => setForm({ ...form, moq: event.target.value })} placeholder="e.g. 100 units" />
                    </div>
                    <div>
                      <Label>{t("seller.stockCapacity")}</Label>
                      <Input value={form.stockCapacity} onChange={(event) => setForm({ ...form, stockCapacity: event.target.value })} placeholder="e.g. 10,000 units/month" />
                    </div>
                    <div>
                      <Label>{t("seller.leadTime")}</Label>
                      <Input value={form.leadTime} onChange={(event) => setForm({ ...form, leadTime: event.target.value })} placeholder="e.g. 7-14 days" />
                    </div>
                    <div>
                      <Label>{t("seller.shippingOrigin")}</Label>
                      <Input value={form.shippingOrigin} onChange={(event) => setForm({ ...form, shippingOrigin: event.target.value })} placeholder="e.g. Istanbul, Turkey" />
                    </div>
                    <div>
                      <Label>{t("seller.weightPerUnit")}</Label>
                      <Input type="number" value={form.weightPerUnit} onChange={(event) => setForm({ ...form, weightPerUnit: event.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>{t("seller.dimensions")}</Label>
                      <Input value={form.dimensions} onChange={(event) => setForm({ ...form, dimensions: event.target.value })} placeholder="e.g. 30x20x15 cm" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="gold" onClick={() => void handleSubmit()} disabled={saving} className="flex-1">
                      {saving ? t("seller.saving") : editingId ? t("seller.updateProduct") : t("seller.addProduct")}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      {t("seller.cancel")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">{t("seller.noProducts")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="overflow-hidden rounded-xl border border-border/30 bg-card"
                >
                  <div className="flex h-36 items-center justify-center bg-secondary/50">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{product.name}</h3>
                      <Badge className={`shrink-0 text-[10px] ${statusColor[product.status] || statusColor.approved}`}>
                        {t(`statuses.${product.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {product.pricePerUnit ? (
                        <span className="font-bold text-primary">{product.currency} {product.pricePerUnit}</span>
                      ) : null}
                      {product.moq ? <span>MOQ: {product.moq}</span> : null}
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleEdit(product)}>
                        <Pencil className="me-1 h-3 w-3" /> {t("seller.edit")}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => void handleToggleActive(product.id, product.isActive)}>
                        {product.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SellerDashboard;
