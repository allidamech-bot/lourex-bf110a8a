import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PurchaseRequestFormState = {
  fullName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  productName: string;
  productDescription: string;
  quantity: string;
  sizeDimensions: string;
  color: string;
  material: string;
  technicalSpecs: string;
  referenceLink: string;
  preferredShippingMethod: string;
  deliveryNotes: string;
};

const initialState: PurchaseRequestFormState = {
  fullName: "",
  phone: "",
  email: "",
  country: "",
  city: "",
  productName: "",
  productDescription: "",
  quantity: "",
  sizeDimensions: "",
  color: "",
  material: "",
  technicalSpecs: "",
  referenceLink: "",
  preferredShippingMethod: "",
  deliveryNotes: "",
};

export const PurchaseRequestForm = () => {
  const [form, setForm] = useState<PurchaseRequestFormState>(initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  const updateField = (field: keyof PurchaseRequestFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (selected.length === 0) {
      return;
    }
    setFiles((current) => [...current, ...selected].slice(0, 5));
  };

  const removeFile = (name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name));
  };

  const buildPayload = (imageUrls: string[]) =>
    [
      "LOUREX PURCHASE REQUEST",
      `Product: ${form.productName}`,
      `Description: ${form.productDescription}`,
      `Quantity: ${form.quantity}`,
      `Size/Dimensions: ${form.sizeDimensions}`,
      `Color: ${form.color}`,
      `Material: ${form.material}`,
      `Technical Specs: ${form.technicalSpecs}`,
      `Reference Link: ${form.referenceLink || "N/A"}`,
      `Preferred Shipping Method: ${form.preferredShippingMethod}`,
      `Delivery Notes: ${form.deliveryNotes}`,
      `Request Images: ${imageUrls.join(", ")}`,
    ].join("\n");

  const handleSubmit = async () => {
    const requiredFields: Array<keyof PurchaseRequestFormState> = [
      "fullName",
      "phone",
      "email",
      "country",
      "city",
      "productName",
      "productDescription",
      "quantity",
      "sizeDimensions",
      "color",
      "material",
      "technicalSpecs",
      "preferredShippingMethod",
      "deliveryNotes",
    ];

    const missing = requiredFields.some((field) => !form[field].trim());
    if (missing) {
      toast.error("يرجى استكمال جميع الحقول المطلوبة.");
      return;
    }

    if (files.length === 0) {
      toast.error("رفع صورة منتج واحدة على الأقل مطلوب.");
      return;
    }

    setSubmitting(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const filePath = `purchase-requests/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
        if (uploadError) {
          throw uploadError;
        }
        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }

      const { error } = await supabase.from("inquiries").insert({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        company: `${form.country} - ${form.city}`,
        inquiry_type: "purchase_request",
        message: buildPayload(uploadedUrls),
        factory_name: form.preferredShippingMethod,
      });

      if (error) {
        throw error;
      }

      toast.success("تم استلام طلب الشراء وسيقوم فريق Lourex بمراجعته.");
      setForm(initialState);
      setFiles([]);
    } catch (error: any) {
      toast.error(error.message || "تعذر إرسال الطلب حالياً.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label>الاسم الكامل</Label>
          <Input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
        </div>
        <div>
          <Label>رقم الهاتف</Label>
          <Input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
        </div>
        <div>
          <Label>البريد الإلكتروني</Label>
          <Input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </div>
        <div>
          <Label>الدولة / المدينة</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="الدولة" value={form.country} onChange={(event) => updateField("country", event.target.value)} />
            <Input placeholder="المدينة" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>اسم المنتج</Label>
          <Input value={form.productName} onChange={(event) => updateField("productName", event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>وصف المنتج</Label>
          <Textarea rows={4} value={form.productDescription} onChange={(event) => updateField("productDescription", event.target.value)} />
        </div>
        <div>
          <Label>الكمية</Label>
          <Input value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
        </div>
        <div>
          <Label>المقاس / الأبعاد</Label>
          <Input value={form.sizeDimensions} onChange={(event) => updateField("sizeDimensions", event.target.value)} />
        </div>
        <div>
          <Label>اللون</Label>
          <Input value={form.color} onChange={(event) => updateField("color", event.target.value)} />
        </div>
        <div>
          <Label>الخامة</Label>
          <Input value={form.material} onChange={(event) => updateField("material", event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>المواصفات الفنية</Label>
          <Textarea rows={4} value={form.technicalSpecs} onChange={(event) => updateField("technicalSpecs", event.target.value)} />
        </div>
        <div>
          <Label>رابط مرجعي إن وجد</Label>
          <Input value={form.referenceLink} onChange={(event) => updateField("referenceLink", event.target.value)} />
        </div>
        <div>
          <Label>طريقة الشحن المفضلة</Label>
          <Input
            placeholder="جوي / بحري / بري"
            value={form.preferredShippingMethod}
            onChange={(event) => updateField("preferredShippingMethod", event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>ملاحظات التسليم</Label>
          <Textarea rows={3} value={form.deliveryNotes} onChange={(event) => updateField("deliveryNotes", event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>صور المنتج المطلوبة</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Upload className="h-6 w-6" />
            <span>ارفع صورة واحدة على الأقل ويمكنك رفع حتى 5 صور</span>
          </button>
          {previews.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {previews.map((preview) => (
                <div key={preview.name} className="relative overflow-hidden rounded-2xl border border-border">
                  <img src={preview.url} alt={preview.name} className="h-28 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(preview.name)}
                    className="absolute end-2 top-2 rounded-full bg-background/90 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          سيتم استخدام هذه البيانات لتحويل الطلب إلى صفقة تشغيلية قابلة للمتابعة والتدقيق.
        </p>
        <Button variant="gold" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "جاري الإرسال..." : "إرسال طلب الشراء"}
        </Button>
      </div>
    </div>
  );
};
