import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, Loader2, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  deleteSellerProduct,
  saveSellerProduct,
  uploadSellerProductImage,
  type SellerProduct,
} from "@/domain/seller/service";

interface Props {
  factoryId: string;
  userId: string;
  products: SellerProduct[];
  onChanged: (savedProduct?: SellerProduct, deletedProductId?: string) => void;
}

interface FormState {
  name: string;
  category: string;
  description: string;
  price: string;
  moq: string;
  leadTime: string;
  isActive: boolean;
}

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
  "General Trading",
  "Other",
];

const emptyForm: FormState = {
  name: "",
  category: "",
  description: "",
  price: "",
  moq: "",
  leadTime: "",
  isActive: true,
};

export const SupplierProductsManager = ({ factoryId, userId, products, onChanged }: Props) => {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SellerProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      setEditing(null);
      setForm(emptyForm);
      setImageFile(null);
      setImagePreview(null);
    }
  }, [dialogOpen]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (product: SellerProduct) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.pricePerUnit?.toString() || "",
      moq: product.moq,
      leadTime: product.leadTime,
      isActive: product.isActive,
    });
    setImageFile(null);
    setImagePreview(product.imageUrl);
    setDialogOpen(true);
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
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

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error(t("seller.requiredFields"));
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editing?.imageUrl ?? null;

      if (imageFile) {
        const uploadResult = await uploadSellerProductImage(userId, imageFile);
        if (uploadResult.error || !uploadResult.data) {
          throw new Error(uploadResult.error?.message || t("seller.saveFailed"));
        }

        imageUrl = uploadResult.data;
      }

      const saveResult = await saveSellerProduct({
        id: editing?.id,
        userId,
        factoryId,
        name: form.name,
        category: form.category,
        description: form.description,
        moq: form.moq,
        pricePerUnit: form.price ? Number(form.price) : null,
        currency: editing?.currency || "USD",
        stockCapacity: editing?.stockCapacity || "",
        leadTime: form.leadTime,
        shippingOrigin: editing?.shippingOrigin || "",
        dimensions: editing?.dimensions || "",
        weightPerUnit: editing?.weightPerUnit ?? null,
        unitsPerCarton: editing?.unitsPerCarton ?? null,
        imageUrl,
      });

      if (saveResult.error || !saveResult.data) {
        throw new Error(saveResult.error?.message || t("seller.saveFailed"));
      }

      toast.success(editing ? t("seller.updated") : t("seller.added"));
      setDialogOpen(false);
      onChanged(saveResult.data);
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : t("seller.saveFailed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      return;
    }

    setDeleting(true);

    try {
      const result = await deleteSellerProduct(deleteId);
      if (result.error || !result.data) {
        throw new Error(result.error?.message || t("seller.saveFailed"));
      }

      toast.success(t("seller.deleted"));
      setDeleteId(null);
      onChanged(undefined, result.data);
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : t("seller.saveFailed");
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="mb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
          <Package className="h-5 w-5 text-primary" />
          {t("seller.title")} ({products.length})
        </h2>
        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus className="me-1 h-4 w-4" /> {t("seller.addProduct")}
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="mb-4 text-muted-foreground">{t("seller.noProducts")}</p>
          <Button variant="gold-outline" size="sm" onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" /> {t("seller.addFirstProduct")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card flex flex-col overflow-hidden rounded-xl"
              >
                <div className="relative h-40 bg-secondary/40">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge
                      variant={product.isActive ? "default" : "secondary"}
                      className={product.isActive ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400" : ""}
                    >
                      {product.isActive ? t("seller.active") : t("seller.draft")}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="mb-1 line-clamp-1 font-serif font-semibold">{product.name}</h3>
                  <p className="mb-2 text-xs text-muted-foreground">{product.category || "—"}</p>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">
                      {product.pricePerUnit ? `${product.currency} ${product.pricePerUnit}` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">MOQ: {product.moq || "—"}</span>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(product)}>
                      <Pencil className="me-1 h-3.5 w-3.5" /> {t("seller.edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteId(product.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? t("seller.editProduct") : t("seller.addNewProduct")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("seller.productImage")}</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {imagePreview ? (
                <div className="relative mt-2 overflow-hidden rounded-lg border border-border">
                  <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      if (previewUrlRef.current) {
                        URL.revokeObjectURL(previewUrlRef.current);
                        previewUrlRef.current = null;
                      }

                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-sm">{t("seller.selectImage")}</span>
                </button>
              )}
            </div>

            <div>
              <Label>{t("seller.productName")}</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Premium Cotton Fabric" />
            </div>

            <div>
              <Label>{t("seller.category")}</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("seller.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("seller.description")}</Label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("seller.pricePerUnit")} (USD)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>{t("seller.moq")}</Label>
                <Input value={form.moq} onChange={(event) => setForm({ ...form, moq: event.target.value })} placeholder="e.g. 100 units" />
              </div>
            </div>

            <div>
              <Label>{t("seller.leadTime")}</Label>
              <Input value={form.leadTime} onChange={(event) => setForm({ ...form, leadTime: event.target.value })} placeholder="e.g. 15-20 days" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <Label className="cursor-pointer">{t("seller.active")}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {form.isActive ? t("seller.visibleToBuyers") : t("seller.savedAsDraft")}
                </p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("seller.cancel")}
            </Button>
            <Button variant="gold" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {editing ? t("seller.updateProduct") : t("seller.addProduct")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("seller.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("seller.deleteConfirmation")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("seller.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {t("seller.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
