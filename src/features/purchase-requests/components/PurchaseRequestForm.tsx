import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createPurchaseRequestRecord } from "@/lib/operationsDomain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

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

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-[1.8rem] border border-border/60 bg-card/90 p-6 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_42px_-32px_rgba(0,0,0,0.45)]">
    <h3 className="font-serif text-2xl font-semibold">{title}</h3>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    <div className="mt-6 grid gap-5 md:grid-cols-2">{children}</div>
  </section>
);

const FieldHint = ({ text }: { text: string }) => <p className="mt-2 text-xs leading-6 text-muted-foreground">{text}</p>;

export const PurchaseRequestForm = () => {
  const { lang } = useI18n();
  const [form, setForm] = useState<PurchaseRequestFormState>(initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.name));
    };
  }, [files]);

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file), size: `${Math.round(file.size / 1024)} KB` })),
    [files],
  );

  const updateField = (field: keyof PurchaseRequestFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (selected.length === 0) {
      setErrorMessage(lang === "ar" ? "يجب رفع صور بصيغة صالحة." : "Please upload valid image files.");
      return;
    }
    setErrorMessage("");
    setFiles((current) => [...current, ...selected].slice(0, 5));
  };

  const removeFile = (name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name));
  };

  const buildPayload = (requestNumber: string, imageUrls: string[]) =>
    [
      "LOUREX PURCHASE REQUEST",
      `Request Number: ${requestNumber}`,
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
      setErrorMessage(
        lang === "ar"
          ? "يرجى استكمال جميع الحقول الأساسية قبل إرسال الطلب."
          : "Please complete all required fields before submitting the request.",
      );
      return;
    }

    if (files.length === 0) {
      setErrorMessage(
        lang === "ar"
          ? "رفع صورة منتج واحدة على الأقل مطلوب لبدء عملية Lourex بشكل صحيح."
          : "At least one product image is required to start the Lourex intake process.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const requestNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const filePath = `purchase-requests/${requestNumber}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }

      const { error } = await supabase.from("inquiries").insert({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        company: `${form.country} - ${form.city}`,
        inquiry_type: "purchase_request",
        message: buildPayload(requestNumber, uploadedUrls),
        factory_name: form.preferredShippingMethod,
      });

      if (error) throw error;

      const { error: structuredError } = await createPurchaseRequestRecord({
        requestNumber,
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        country: form.country,
        city: form.city,
        productName: form.productName,
        productDescription: form.productDescription,
        quantity: Number(form.quantity || 0),
        sizeDimensions: form.sizeDimensions,
        color: form.color,
        material: form.material,
        technicalSpecs: form.technicalSpecs,
        referenceLink: form.referenceLink,
        preferredShippingMethod: form.preferredShippingMethod,
        deliveryNotes: form.deliveryNotes,
        imageUrls: uploadedUrls,
      });

      if (structuredError) throw structuredError;

      setSubmittedRequest(requestNumber);
      setForm(initialState);
      setFiles([]);
      toast.success(lang === "ar" ? "تم استلام الطلب بنجاح." : "Purchase request received successfully.");
    } catch (error: any) {
      const message =
        error.message ||
        (lang === "ar" ? "تعذر إرسال الطلب حاليًا." : "The request could not be submitted right now.");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRequest) {
    return (
      <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_34%),linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.92))] p-8 shadow-[0_28px_60px_-36px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_60px_-36px_rgba(0,0,0,0.68)] md:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-6 font-serif text-3xl font-semibold">
            {lang === "ar" ? "تم استلام طلب الشراء" : "Purchase request received"}
          </h3>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            {lang === "ar" ? "رقم الطلب المرجعي هو" : "Your reference number is"}{" "}
            <span className="font-semibold text-foreground">{submittedRequest}</span>.
            {" "}
            {lang === "ar"
              ? "سيقوم فريق Lourex بمراجعته وتحويله إلى خطوة تشغيلية مناسبة عند اكتمال التقييم."
              : "The Lourex team will review it and move it into the appropriate operational step once the assessment is complete."}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {(
              lang === "ar"
                ? [
                    "مراجعة داخلية للبيانات والصور",
                    "تقييم قابلية التنفيذ والتحويل إلى صفقة",
                    "التواصل معك عند الحاجة إلى استكمال أو بدء التنفيذ",
                  ]
                : [
                    "Internal review of the request data and images",
                    "Execution assessment and deal conversion decision",
                    "Follow-up with you if clarification or execution kickoff is needed",
                  ]
            ).map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-border/60 bg-secondary/25 p-4 text-sm leading-7 text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
          <Button variant="gold" className="mt-8" onClick={() => setSubmittedRequest(null)}>
            {lang === "ar" ? "إرسال طلب جديد" : "Submit another request"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <SectionCard
        title={lang === "ar" ? "بيانات المنتج" : "Product details"}
        description={
          lang === "ar"
            ? "كلما كانت تفاصيل المنتج أدق، كانت المراجعة والتنفيذ أسرع وأكثر احترافية."
            : "The more precise your product information is, the faster and more professional the review and sourcing process becomes."
        }
      >
        <div className="md:col-span-2">
          <Label>{lang === "ar" ? "اسم المنتج" : "Product name"}</Label>
          <Input value={form.productName} onChange={(event) => updateField("productName", event.target.value)} />
          <FieldHint text={lang === "ar" ? "استخدم اسمًا واضحًا يفهمه فريق التوريد والتنفيذ مباشرة." : "Use a clear commercial name that the sourcing team can understand immediately."} />
        </div>

        <div className="md:col-span-2">
          <Label>{lang === "ar" ? "وصف المنتج" : "Product description"}</Label>
          <Textarea rows={4} value={form.productDescription} onChange={(event) => updateField("productDescription", event.target.value)} />
          <FieldHint text={lang === "ar" ? "اشرح الاستخدام أو النوع أو الفئة التجارية بدل الوصف القصير فقط." : "Describe the use case, type, or commercial category instead of a short label only."} />
        </div>

        <div>
          <Label>{lang === "ar" ? "الكمية" : "Quantity"}</Label>
          <Input value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} placeholder={lang === "ar" ? "مثال: 250" : "Example: 250"} />
        </div>

        <div>
          <Label>{lang === "ar" ? "المقاس / الأبعاد" : "Size / dimensions"}</Label>
          <Input value={form.sizeDimensions} onChange={(event) => updateField("sizeDimensions", event.target.value)} placeholder={lang === "ar" ? "مثال: 120×80×45 سم" : "Example: 120×80×45 cm"} />
        </div>

        <div>
          <Label>{lang === "ar" ? "اللون" : "Color"}</Label>
          <Input value={form.color} onChange={(event) => updateField("color", event.target.value)} />
        </div>

        <div>
          <Label>{lang === "ar" ? "الخامة" : "Material"}</Label>
          <Input value={form.material} onChange={(event) => updateField("material", event.target.value)} />
        </div>

        <div className="md:col-span-2">
          <Label>{lang === "ar" ? "المواصفات الفنية" : "Technical specifications"}</Label>
          <Textarea rows={4} value={form.technicalSpecs} onChange={(event) => updateField("technicalSpecs", event.target.value)} />
          <FieldHint text={lang === "ar" ? "اذكر المقاسات الفنية، المعايير، الملحقات، الجهد الكهربائي، أو أي متطلبات تنفيذية." : "Include technical dimensions, standards, accessories, voltage, or any execution-critical requirements."} />
        </div>

        <div className="md:col-span-2">
          <Label>{lang === "ar" ? "رابط مرجعي إن وجد" : "Reference link if available"}</Label>
          <Input value={form.referenceLink} onChange={(event) => updateField("referenceLink", event.target.value)} placeholder="https://..." />
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "ar" ? "الصور والشحن" : "Images and shipping"}
        description={
          lang === "ar"
            ? "هذه العناصر تساعد على تقييم واقعي للطلب ومسار الشحن الأنسب."
            : "These items help Lourex evaluate the request realistically and choose the right shipment path."
        }
      >
        <div className="md:col-span-2">
          <Label>{lang === "ar" ? "صور المنتج المطلوبة" : "Required product images"}</Label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-[1.8rem] border-2 border-dashed border-primary/20 bg-[linear-gradient(180deg,hsla(var(--secondary)/0.45),hsla(var(--secondary)/0.25))] px-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">
              {lang === "ar" ? "اسحب الصور هنا أو اضغط للاختيار" : "Drop images here or click to select"}
            </span>
            <span className="text-xs text-muted-foreground">
              {lang === "ar" ? "مطلوب صورة واحدة على الأقل، والحد الأقصى 5 صور." : "At least one image is required, with a maximum of 5 files."}
            </span>
          </button>
          {previews.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {previews.map((preview) => (
                <div key={preview.name} className="relative overflow-hidden rounded-[1.4rem] border border-border bg-card">
                  <img src={preview.url} alt={preview.name} className="h-28 w-full object-cover" />
                  <div className="p-3">
                    <p className="truncate text-xs font-medium">{preview.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{preview.size}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(preview.name)} className="absolute end-2 top-2 rounded-full bg-background/90 p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <FieldHint text={lang === "ar" ? "يفضل رفع صور متعددة من زوايا مختلفة أو صور لمرجع مشابه." : "It is better to upload multiple angles or a close reference sample if available."} />
          )}
        </div>

        <div>
          <Label>{lang === "ar" ? "طريقة الشحن المفضلة" : "Preferred shipping method"}</Label>
          <Input
            placeholder={lang === "ar" ? "جوي / بحري / بري" : "Air / Sea / Land"}
            value={form.preferredShippingMethod}
            onChange={(event) => updateField("preferredShippingMethod", event.target.value)}
          />
        </div>

        <div>
          <Label>{lang === "ar" ? "ملاحظات التسليم" : "Delivery notes"}</Label>
          <Input value={form.deliveryNotes} onChange={(event) => updateField("deliveryNotes", event.target.value)} placeholder={lang === "ar" ? "أوقات التسليم، قيود الموقع، أو ملاحظات خاصة" : "Delivery timing, site restrictions, or special notes"} />
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "ar" ? "بيانات التواصل" : "Contact details"}
        description={
          lang === "ar"
            ? "ستُستخدم هذه البيانات للمتابعة معك أثناء المراجعة والتحويل إلى صفقة تشغيلية."
            : "These details are used to follow up with you during review and deal conversion."
        }
      >
        <div>
          <Label>{lang === "ar" ? "الاسم الكامل" : "Full name"}</Label>
          <Input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
        </div>
        <div>
          <Label>{lang === "ar" ? "رقم الهاتف" : "Phone number"}</Label>
          <Input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
        </div>
        <div>
          <Label>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
          <Input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </div>
        <div>
          <Label>{lang === "ar" ? "الدولة / المدينة" : "Country / city"}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder={lang === "ar" ? "الدولة" : "Country"} value={form.country} onChange={(event) => updateField("country", event.target.value)} />
            <Input placeholder={lang === "ar" ? "المدينة" : "City"} value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </div>
        </div>
      </SectionCard>

      <div className="rounded-[1.8rem] border border-primary/15 bg-[linear-gradient(180deg,hsla(var(--card)/0.96),hsla(var(--card)/0.92))] px-6 py-5 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_42px_-32px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{lang === "ar" ? "تجربة إدخال موثوقة وعملية" : "Professional, trust-first intake flow"}</p>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                {lang === "ar"
                  ? "سيراجع فريق Lourex الطلب ثم يحوله إلى صفقة تشغيلية عند جاهزيته، مع الحفاظ على أثر واضح داخل المنصة."
                  : "The Lourex team will review this request and convert it into an operational deal when it is ready, while keeping a clear platform record."}
              </p>
            </div>
          </div>
          <Button variant="gold" size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {lang === "ar" ? "جاري الإرسال..." : "Submitting..."}
              </>
            ) : (
              <>
                <ImagePlus className="me-2 h-4 w-4" />
                {lang === "ar" ? "إرسال طلب الشراء" : "Submit purchase request"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
