import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factoryId: string;
  userId: string;
  onSuccess?: () => void;
}

const categories = [
  "Textiles & Fabrics", "Food & Beverages", "Electronics", "Steel & Metals",
  "Plastics & Packaging", "Chemicals", "Industrial Equipment", "Building Materials",
  "Auto Parts", "Health & Beauty", "General Trading", "Other",
];

const AddProductModal = ({ open, onOpenChange, factoryId, userId, onSuccess }: AddProductModalProps) => {
  const { lang } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [moq, setMoq] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !category) {
      toast.error(lang === "ar" ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        const filePath = `${userId}/${Date.now()}_${imageFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(filePath, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("products").insert({
        factory_id: factoryId,
        seller_id: userId,
        name: name.trim(),
        description: description.trim(),
        category,
        price_per_unit: price ? parseFloat(price) : null,
        moq: moq || null,
        image_url: imageUrl || null,
      });
      if (error) throw error;

      toast.success(lang === "ar" ? "تمت إضافة المنتج" : "Product added successfully");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setCategory(""); setPrice(""); setMoq("");
    setImageFile(null); setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{lang === "ar" ? "إضافة منتج جديد" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <Label>{lang === "ar" ? "صورة المنتج" : "Product Image"}</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            {imagePreview ? (
              <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">{lang === "ar" ? "اختر صورة" : "Select Image"}</span>
              </button>
            )}
          </div>

          <div>
            <Label>{lang === "ar" ? "اسم المنتج *" : "Product Name *"}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Cotton Fabric" />
          </div>

          <div>
            <Label>{lang === "ar" ? "الوصف" : "Description"}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>{lang === "ar" ? "الفئة *" : "Category *"}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر الفئة" : "Select category"} /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{lang === "ar" ? "السعر (USD)" : "Price (USD)"}</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>{lang === "ar" ? "الحد الأدنى للطلب" : "MOQ"}</Label>
              <Input value={moq} onChange={e => setMoq(e.target.value)} placeholder="e.g. 100 units" />
            </div>
          </div>

          <Button variant="gold" className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving
              ? lang === "ar" ? "جارٍ الحفظ..." : "Saving..."
              : lang === "ar" ? "إضافة المنتج" : "Add Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;
