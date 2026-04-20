import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Package, Plus, Pencil, Trash2, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_per_unit: number | null;
  moq: string | null;
  lead_time: string | null;
  image_url: string | null;
  is_active: boolean;
  status: string;
  factory_id: string;
  seller_id: string | null;
}

interface Props {
  factoryId: string;
  userId: string;
  products: Product[];
  onChanged: () => void;
}

const CATEGORIES = [
  "Textiles & Fabrics", "Food & Beverages", "Electronics", "Steel & Metals",
  "Plastics & Packaging", "Chemicals", "Industrial Equipment", "Building Materials",
  "Auto Parts", "Health & Beauty", "General Trading", "Other",
];

interface FormState {
  name: string;
  category: string;
  description: string;
  price: string;
  moq: string;
  lead_time: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "", category: "", description: "", price: "", moq: "", lead_time: "", is_active: true,
};

export const SupplierProductsManager = ({ factoryId, userId, products, onChanged }: Props) => {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const tt = (en: string, ar: string) => (isAr ? ar : en);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dialogOpen) {
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

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category || "",
      description: p.description || "",
      price: p.price_per_unit?.toString() || "",
      moq: p.moq || "",
      lead_time: p.lead_time || "",
      is_active: p.is_active,
    });
    setImageFile(null);
    setImagePreview(p.image_url || null);
    setDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(tt("Image must be under 5MB", "يجب أن تكون الصورة أقل من 5 ميجابايت"));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error(tt("Name and category are required", "الاسم والفئة مطلوبان"));
      return;
    }
    setSaving(true);
    try {
      let imageUrl = editing?.image_url || "";

      if (imageFile) {
        const path = `${userId}/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        price_per_unit: form.price ? parseFloat(form.price) : null,
        moq: form.moq.trim() || null,
        lead_time: form.lead_time.trim() || null,
        image_url: imageUrl || null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success(tt("Product updated", "تم تحديث المنتج"));
      } else {
        const { error } = await supabase.from("products").insert({
          ...payload,
          factory_id: factoryId,
          seller_id: userId,
        });
        if (error) throw error;
        toast.success(tt("Product added", "تمت إضافة المنتج"));
      }

      setDialogOpen(false);
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success(tt("Product deleted", "تم حذف المنتج"));
      setDeleteId(null);
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
          <Package className="h-5 w-5 text-primary" />
          {tt("My Products", "منتجاتي")} ({products.length})
        </h2>
        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus className="me-1 h-4 w-4" /> {tt("Add Product", "إضافة منتج")}
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            {tt("You haven't added any products yet.", "لم تقم بإضافة أي منتجات بعد.")}
          </p>
          <Button variant="gold-outline" size="sm" onClick={openCreate}>
            <Plus className="me-1 h-4 w-4" /> {tt("Add Your First Product", "أضف منتجك الأول")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {products.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-xl overflow-hidden flex flex-col"
              >
                <div className="relative h-40 bg-secondary/40">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={p.is_active ? "default" : "secondary"} className={p.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                      {p.is_active ? tt("Active", "نشط") : tt("Draft", "مسودة")}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-serif font-semibold mb-1 line-clamp-1">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{p.category || "—"}</p>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-semibold text-primary">
                      {p.price_per_unit ? `$${p.price_per_unit}` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      MOQ: {p.moq || "—"}
                    </span>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                      <Pencil className="me-1 h-3.5 w-3.5" /> {tt("Edit", "تعديل")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(p.id)}
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

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? tt("Edit Product", "تعديل المنتج") : tt("Add New Product", "إضافة منتج جديد")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{tt("Product Image", "صورة المنتج")}</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {imagePreview ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5 hover:bg-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm">{tt("Select Image", "اختر صورة")}</span>
                </button>
              )}
            </div>

            <div>
              <Label>{tt("Product Name *", "اسم المنتج *")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Cotton Fabric" />
            </div>

            <div>
              <Label>{tt("Category *", "الفئة *")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder={tt("Select category", "اختر الفئة")} /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{tt("Description", "الوصف")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{tt("Price (USD)", "السعر (USD)")}</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>{tt("MOQ", "الحد الأدنى للطلب")}</Label>
                <Input value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} placeholder="e.g. 100 units" />
              </div>
            </div>

            <div>
              <Label>{tt("Lead Time", "وقت التسليم")}</Label>
              <Input value={form.lead_time} onChange={(e) => setForm({ ...form, lead_time: e.target.value })} placeholder="e.g. 15-20 days" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <Label className="cursor-pointer">{tt("Status: Active", "الحالة: نشط")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {form.is_active
                    ? tt("Visible to buyers", "مرئي للمشترين")
                    : tt("Saved as draft", "محفوظ كمسودة")}
                </p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              {tt("Cancel", "إلغاء")}
            </Button>
            <Button variant="gold" onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {editing ? tt("Save Changes", "حفظ التغييرات") : tt("Add Product", "إضافة المنتج")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("Delete Product?", "حذف المنتج؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt(
                "This action cannot be undone. The product will be permanently removed from your catalog.",
                "لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنتج نهائيًا من الكتالوج الخاص بك."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tt("Cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {tt("Delete", "حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
