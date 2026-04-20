import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Pencil, Trash2, Eye, EyeOff, BadgeCheck,
  Upload, ImagePlus, X, ShieldAlert, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "Textiles & Fabrics", "Food & Beverages", "Electronics", "Steel & Metals",
  "Plastics & Packaging", "Chemicals", "Industrial Equipment", "Building Materials",
  "Auto Parts", "Health & Beauty", "Biscuits", "Confectionery", "General Trading", "Other",
];

const CURRENCIES = ["USD", "SAR", "TRY", "EUR"];

interface ProductForm {
  name: string;
  category: string;
  description: string;
  moq: string;
  price_per_unit: string;
  currency: string;
  stock_capacity: string;
  lead_time: string;
  shipping_origin: string;
  dimensions: string;
  weight_per_unit: string;
  units_per_carton: string;
}

const emptyForm: ProductForm = {
  name: "", category: "", description: "", moq: "", price_per_unit: "",
  currency: "USD", stock_capacity: "", lead_time: "", shipping_origin: "",
  dimensions: "", weight_per_unit: "", units_per_carton: "",
};

const SellerDashboard = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [factory, setFactory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const [{ data: prof }, { data: fac }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("factories").select("*").eq("owner_user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      setProfile(prof);
      setFactory(fac);

      const isAdmin = roles?.some(r => r.role === "admin");
      const vs = prof?.verification_status;
      setIsVerified(isAdmin || vs === "verified" || vs === "approved");

      // Load products owned by this user via factory
      if (fac) {
        const { data: p } = await supabase
          .from("products")
          .select("*")
          .eq("factory_id", fac.id)
          .order("created_at", { ascending: false });
        setProducts(p || []);
      }

      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error(lang === "ar" ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields (name, category)");
      return;
    }
    if (!user) return;
    setSaving(true);

    try {
      let imageUrl = "";
      if (imageFile) {
        const filePath = `${user.id}/${Date.now()}_${imageFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("product-images").upload(filePath, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const productData: Record<string, any> = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price_per_unit: form.price_per_unit ? parseFloat(form.price_per_unit) : null,
        currency: form.currency,
        moq: form.moq || null,
        stock_capacity: form.stock_capacity || null,
        lead_time: form.lead_time || null,
        shipping_origin: form.shipping_origin || null,
        dimensions: form.dimensions || null,
        weight_per_unit: form.weight_per_unit ? parseFloat(form.weight_per_unit) : null,
        units_per_carton: form.units_per_carton ? parseInt(form.units_per_carton) : null,
        seller_id: user.id,
      };

      if (imageUrl) productData.image_url = imageUrl;
      if (factory) productData.factory_id = factory.id;

      if (editingId) {
        const { error } = await supabase.from("products").update({
          name: productData.name as string,
          description: productData.description as string,
          category: productData.category as string,
          price_per_unit: productData.price_per_unit as number | null,
          currency: productData.currency as string,
          moq: productData.moq as string | null,
          dimensions: productData.dimensions as string | null,
          weight_per_unit: productData.weight_per_unit as number | null,
          units_per_carton: productData.units_per_carton as number | null,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        }).eq("id", editingId);
        if (error) throw error;
        toast.success(lang === "ar" ? "تم تحديث المنتج" : "Product updated");
      } else {
        if (!factory?.id) {
          toast.error(lang === "ar" ? "لا يوجد مصنع مرتبط بحسابك" : "No factory linked to your account. Please apply as a factory first.");
          setSaving(false);
          return;
        }
        const { error } = await supabase.from("products").insert({
          name: productData.name as string,
          description: (productData.description as string) || "",
          category: productData.category as string,
          price_per_unit: productData.price_per_unit as number | null,
          currency: productData.currency as string,
          moq: productData.moq as string | null,
          dimensions: productData.dimensions as string | null,
          weight_per_unit: productData.weight_per_unit as number | null,
          units_per_carton: productData.units_per_carton as number | null,
          image_url: imageUrl || null,
          factory_id: factory.id,
          seller_id: user.id,
          is_active: true,
        });
        if (error) throw error;
        toast.success(lang === "ar" ? "تمت إضافة المنتج" : "Product added successfully");
      }

      resetForm();
      // Reload products
      let reloadData: any[] = [];
      if (factory) {
        const { data } = await supabase.from("products").select("*").eq("factory_id", factory.id).order("created_at", { ascending: false });
        reloadData = data || [];
      }
      setProducts(reloadData);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      category: product.category || "",
      description: product.description || "",
      moq: product.moq || "",
      price_per_unit: product.price_per_unit?.toString() || "",
      currency: product.currency || "USD",
      stock_capacity: product.stock_capacity || "",
      lead_time: product.lead_time || "",
      shipping_origin: product.shipping_origin || "",
      dimensions: product.dimensions || "",
      weight_per_unit: product.weight_per_unit?.toString() || "",
      units_per_carton: product.units_per_carton?.toString() || "",
    });
    if (product.image_url) setImagePreview(product.image_url);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(lang === "ar" ? "تم الحذف" : "Product deleted");
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
      toast.success(!current ? "Product activated" : "Product deactivated");
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const filteredProducts = statusFilter === "all"
    ? products
    : products.filter(p => p.status === statusFilter);

  const statusColor: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    pending: "bg-yellow-500/20 text-yellow-500",
    approved: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-destructive/20 text-destructive",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-4 px-4 pt-32 text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground" />
          <h1 className="font-serif text-2xl font-bold">
            {lang === "ar" ? "التحقق مطلوب" : "Verification Required"}
          </h1>
          <p className="text-muted-foreground max-w-md">
            {lang === "ar"
              ? "يجب التحقق من حسابك قبل إدارة المنتجات. يرجى رفع مستندات التحقق."
              : "Your account must be verified before you can manage products. Please upload your verification documents."}
          </p>
          <Button variant="gold" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 me-2" />
            {lang === "ar" ? "لوحة التحكم" : "Go to Dashboard"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-serif text-3xl font-bold">
                {lang === "ar" ? "إدارة المنتجات" : "Product Management"}
              </h1>
              {isVerified && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <BadgeCheck className="w-3.5 h-3.5 me-1" />
                  {lang === "ar" ? "مورّد موثق" : "Verified Seller"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {lang === "ar" ? "أضف وعدّل واحذف منتجاتك" : "Add, edit, and manage your product catalog"}
            </p>
          </motion.div>

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex gap-2">
              {["all", "approved", "pending", "draft", "rejected"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s === "all" ? (lang === "ar" ? "الكل" : "All") : s.charAt(0).toUpperCase() + s.slice(1)}
                  {s === "all" && ` (${products.length})`}
                </button>
              ))}
            </div>
            <Button variant="gold" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 me-1" />
              {lang === "ar" ? "إضافة منتج" : "Add Product"}
            </Button>
          </div>

          {/* Add/Edit Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg font-semibold">
                      {editingId
                        ? (lang === "ar" ? "تعديل المنتج" : "Edit Product")
                        : (lang === "ar" ? "إضافة منتج جديد" : "Add New Product")}
                    </h2>
                    <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{lang === "ar" ? "اسم المنتج *" : "Product Name *"}</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Cotton Fabric" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "الفئة *" : "Category *"}</Label>
                      <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue placeholder={lang === "ar" ? "اختر الفئة" : "Select category"} /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>{lang === "ar" ? "الوصف" : "Description"}</Label>
                      <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "السعر" : "Price per Unit"}</Label>
                      <Input type="number" value={form.price_per_unit} onChange={e => setForm({ ...form, price_per_unit: e.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "العملة" : "Currency"}</Label>
                      <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "الحد الأدنى للطلب" : "MOQ"}</Label>
                      <Input value={form.moq} onChange={e => setForm({ ...form, moq: e.target.value })} placeholder="e.g. 100 units" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "السعة / المخزون" : "Stock / Capacity"}</Label>
                      <Input value={form.stock_capacity} onChange={e => setForm({ ...form, stock_capacity: e.target.value })} placeholder="e.g. 10,000 units/month" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "وقت التسليم" : "Lead Time"}</Label>
                      <Input value={form.lead_time} onChange={e => setForm({ ...form, lead_time: e.target.value })} placeholder="e.g. 7-14 days" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "بلد الشحن" : "Shipping Origin"}</Label>
                      <Input value={form.shipping_origin} onChange={e => setForm({ ...form, shipping_origin: e.target.value })} placeholder="e.g. Istanbul, Turkey" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "الوزن (كجم)" : "Weight per Unit (kg)"}</Label>
                      <Input type="number" value={form.weight_per_unit} onChange={e => setForm({ ...form, weight_per_unit: e.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                      <Label>{lang === "ar" ? "الأبعاد" : "Dimensions"}</Label>
                      <Input value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} placeholder="e.g. 30x20x15 cm" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="gold" onClick={handleSubmit} disabled={saving} className="flex-1">
                      {saving
                        ? (lang === "ar" ? "جارٍ الحفظ..." : "Saving...")
                        : editingId
                          ? (lang === "ar" ? "تحديث" : "Update Product")
                          : (lang === "ar" ? "إضافة المنتج" : "Add Product")}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products list */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {lang === "ar" ? "لا توجد منتجات بعد" : "No products yet. Add your first product to get started."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border/30 rounded-xl overflow-hidden"
                >
                  <div className="h-36 bg-secondary/50 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{product.name}</h3>
                      <Badge className={`text-[10px] shrink-0 ${statusColor[product.status] || statusColor.approved}`}>
                        {product.status || "approved"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {product.price_per_unit && (
                        <span className="text-primary font-bold">{product.currency || "USD"} {product.price_per_unit}</span>
                      )}
                      {product.moq && <span>MOQ: {product.moq}</span>}
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleEdit(product)}>
                        <Pencil className="w-3 h-3 me-1" /> {lang === "ar" ? "تعديل" : "Edit"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => toggleActive(product.id, product.is_active)}
                      >
                        {product.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-3 h-3" />
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
