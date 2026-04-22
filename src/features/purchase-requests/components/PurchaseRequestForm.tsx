import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, ShieldCheck, Upload, X, Hash, MapPin, Package, ClipboardCheck, Calendar, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createRequest,
  uploadPurchaseRequestImages,
} from "@/domain/operations/service";
import type { PurchaseRequestImageUpload } from "@/domain/operations/types";
import { useI18n } from "@/lib/i18n";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

type PurchaseRequestFormState = {
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
  // Phase 4 expanded fields
  weight: string;
  manufacturingCountry: string;
  brand: string;
  qualityLevel: string;
  isReadyMade: boolean;
  hasPreviousSample: boolean;
  expectedSupplyDate: string;
  destination: string;
  deliveryAddress: string;
  isFullSourcing: boolean;
};

const initialState: PurchaseRequestFormState = {
  productName: "",
  productDescription: "",
  quantity: "",
  sizeDimensions: "",
  color: "",
  material: "",
  technicalSpecs: "",
  referenceLink: "",
  preferredShippingMethod: "sea",
  deliveryNotes: "",
  weight: "",
  manufacturingCountry: "",
  brand: "",
  qualityLevel: "",
  isReadyMade: false,
  hasPreviousSample: false,
  expectedSupplyDate: "",
  destination: "",
  deliveryAddress: "",
  isFullSourcing: true,
};

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="rounded-[1.8rem] border border-border/60 bg-card/90 p-6 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_42px_-32px_rgba(0,0,0,0.45)]">
    <h3 className="font-serif text-2xl font-semibold">{title}</h3>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    <div className="mt-6 grid gap-5 md:grid-cols-2">{children}</div>
  </section>
);

const FieldHint = ({ text }: { text: string }) => (
  <p className="mt-2 text-xs leading-6 text-muted-foreground">{text}</p>
);

const createUploadPreview = (file: File): PurchaseRequestImageUpload => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
  file,
  previewUrl: URL.createObjectURL(file),
  name: file.name,
  sizeLabel: `${Math.round(file.size / 1024)} KB`,
});

export const PurchaseRequestForm = () => {
  const { t } = useI18n();
  const { profile } = useAuthSession();
  const [form, setForm] = useState<PurchaseRequestFormState>(initialState);
  const [uploads, setUploads] = useState<PurchaseRequestImageUpload[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedData, setSubmittedData] = useState<{ requestNumber: string; trackingCode: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const successSteps = useMemo(
    () => [
      t("requests.intake.successSteps.one"),
      t("requests.intake.successSteps.two"),
      t("requests.intake.successSteps.three"),
    ],
    [t],
  );

  const updateField = (field: keyof PurchaseRequestFormState, value: any) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const clearUploads = (items: PurchaseRequestImageUpload[]) => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      setErrorMessage(t("requests.intake.errors.invalidImages"));
      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setUploads((current) => {
      const next = [...current];
      const remainingSlots = Math.max(0, 5 - current.length);
      imageFiles.slice(0, remainingSlots).forEach((file) => {
        next.push(createUploadPreview(file));
      });
      return next;
    });
    event.target.value = "";
  };

  const removeUpload = (id: string) => {
    setUploads((current) => {
      const target = current.find((upload) => upload.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((upload) => upload.id !== id);
    });
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
      "productName",
      "productDescription",
      "quantity",
      "sizeDimensions",
      "color",
      "material",
      "technicalSpecs",
      "preferredShippingMethod",
      "destination",
    ];

    const missing = requiredFields.some((field) => {
      const val = form[field];
      return typeof val === "string" ? !val.trim() : !val;
    });

    if (missing) {
      setErrorMessage(t("requests.intake.errors.missingFields"));
      return;
    }

    if (uploads.length === 0) {
      setErrorMessage(t("requests.intake.errors.missingImages"));
      return;
    }

    if (!profile) {
      setErrorMessage("You must be logged in to submit a request.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const requestNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      const trackingCode = `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      
      const uploadResult = await uploadPurchaseRequestImages(requestNumber, uploads);
      if (uploadResult.error || !uploadResult.data) {
        throw new Error(uploadResult.error?.message || t("requests.intake.errors.submitFailed"));
      }

      const structuredResult = await createRequest({
        requestNumber,
        trackingCode,
        fullName: profile.fullName || "Customer",
        phone: profile.phone || "",
        email: profile.email || "",
        country: profile.country || "",
        city: profile.city || "",
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
        imageUrls: uploadResult.data,
        // Expanded Phase 4 fields
        weight: form.weight,
        manufacturingCountry: form.manufacturingCountry,
        brand: form.brand,
        qualityLevel: form.qualityLevel,
        isReadyMade: form.isReadyMade,
        hasPreviousSample: form.hasPreviousSample,
        expectedSupplyDate: form.expectedSupplyDate,
        destination: form.destination,
        deliveryAddress: form.deliveryAddress,
        isFullSourcing: form.isFullSourcing,
      });

      if (structuredResult.error) {
        throw new Error(structuredResult.error.message);
      }

      setSubmittedData({ requestNumber, trackingCode });
      setForm(initialState);
      clearUploads(uploads);
      setUploads([]);
      toast.success(t("requests.intake.errors.success"));
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("requests.intake.errors.submitFailed");

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedData) {
    return (
      <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_34%),linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.92))] p-8 shadow-[0_28px_60px_-36px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_60px_-36px_rgba(0,0,0,0.68)] md:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-6 font-serif text-3xl font-semibold">
            {t("requests.intake.successTitle")}
          </h3>
          
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/5 p-6">
               <Hash className="mb-2 h-6 w-6 text-primary" />
               <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("requests.intake.successReference")}</span>
               <span className="mt-1 text-2xl font-bold text-foreground">{submittedData.requestNumber}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/5 p-6">
               <ShieldCheck className="mb-2 h-6 w-6 text-primary" />
               <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("nav.track")}</span>
               <span className="mt-1 text-2xl font-bold text-foreground">{submittedData.trackingCode}</span>
            </div>
          </div>

          <p className="mt-6 text-base leading-8 text-muted-foreground">
            {t("requests.intake.successDescription")}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {successSteps.map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-border/60 bg-secondary/25 p-4 text-sm leading-7 text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
          <Button variant="gold" className="mt-8" onClick={() => setSubmittedData(null)}>
            {t("requests.intake.submitAnother")}
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
        title={t("requests.intake.productTitle")}
        description={t("requests.intake.productDescription")}
      >
        <div className="md:col-span-2">
          <Label>{t("requests.intake.productName")} *</Label>
          <Input value={form.productName} onChange={(event) => updateField("productName", event.target.value)} />
          <FieldHint text={t("requests.intake.productNameHint")} />
        </div>

        <div className="md:col-span-2">
          <Label>{t("requests.intake.productDescriptionLabel")} *</Label>
          <Textarea rows={4} value={form.productDescription} onChange={(event) => updateField("productDescription", event.target.value)} />
          <FieldHint text={t("requests.intake.productDescriptionHint")} />
        </div>

        <div>
          <Label>{t("requests.intake.quantity")} *</Label>
          <Input value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} placeholder={t("requests.intake.quantityPlaceholder")} />
        </div>

        <div>
          <Label>{t("requests.intake.dimensions")} *</Label>
          <Input value={form.sizeDimensions} onChange={(event) => updateField("sizeDimensions", event.target.value)} placeholder={t("requests.intake.dimensionsPlaceholder")} />
        </div>

        <div>
          <Label>{t("requests.intake.color")} *</Label>
          <Input value={form.color} onChange={(event) => updateField("color", event.target.value)} />
        </div>

        <div>
          <Label>{t("requests.intake.material")} *</Label>
          <Input value={form.material} onChange={(event) => updateField("material", event.target.value)} />
        </div>

        <div>
          <Label>{t("requests.intake.weight")}</Label>
          <Input value={form.weight} onChange={(event) => updateField("weight", event.target.value)} />
        </div>

        <div>
          <Label>{t("requests.intake.brand")}</Label>
          <Input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} />
        </div>

        <div>
          <Label>{t("requests.intake.manufacturingCountry")}</Label>
          <Input value={form.manufacturingCountry} onChange={(event) => updateField("manufacturingCountry", event.target.value)} />
        </div>

        <div>
          <Label>{t("requests.intake.qualityLevel")}</Label>
          <Input value={form.qualityLevel} onChange={(event) => updateField("qualityLevel", event.target.value)} />
        </div>

        <div className="md:col-span-2">
          <Label>{t("requests.intake.technicalSpecs")} *</Label>
          <Textarea rows={4} value={form.technicalSpecs} onChange={(event) => updateField("technicalSpecs", event.target.value)} />
          <FieldHint text={t("requests.intake.technicalSpecsHint")} />
        </div>

        <div className="md:col-span-2 space-y-4">
           <div className="flex items-center space-x-2 rtl:space-x-reverse">
             <Checkbox 
               id="isReadyMade" 
               checked={form.isReadyMade} 
               onCheckedChange={(checked) => updateField("isReadyMade", !!checked)} 
             />
             <Label htmlFor="isReadyMade" className="cursor-pointer font-normal">{t("requests.intake.readyMade")}</Label>
           </div>
           
           <div className="flex items-center space-x-2 rtl:space-x-reverse">
             <Checkbox 
               id="hasPreviousSample" 
               checked={form.hasPreviousSample} 
               onCheckedChange={(checked) => updateField("hasPreviousSample", !!checked)} 
             />
             <Label htmlFor="hasPreviousSample" className="cursor-pointer font-normal">{t("requests.intake.hasPreviousSample")}</Label>
           </div>
        </div>

        <div className="md:col-span-2">
          <Label>{t("requests.intake.referenceLink")}</Label>
          <Input value={form.referenceLink} onChange={(event) => updateField("referenceLink", event.target.value)} placeholder="https://..." />
        </div>
      </SectionCard>

      <SectionCard
        title={t("requests.intake.shippingTitle")}
        description={t("requests.intake.shippingDescription")}
      >
        <div className="md:col-span-2">
          <Label>{t("requests.intake.images")} *</Label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-[1.8rem] border-2 border-dashed border-primary/20 bg-[linear-gradient(180deg,hsla(var(--secondary)/0.45),hsla(var(--secondary)/0.25))] px-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">{t("requests.intake.imagesCta")}</span>
            <span className="text-xs text-muted-foreground">{t("requests.intake.imagesHint")}</span>
          </button>
          {uploads.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {uploads.map((upload) => (
                <div key={upload.id} className="relative overflow-hidden rounded-[1.4rem] border border-border bg-card">
                  <img src={upload.previewUrl} alt={upload.name} className="h-28 w-full object-cover" />
                  <div className="p-3">
                    <p className="truncate text-xs font-medium">{upload.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{upload.sizeLabel}</p>
                  </div>
                  <button type="button" onClick={() => removeUpload(upload.id)} className="absolute end-2 top-2 rounded-full bg-background/90 p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <FieldHint text={t("requests.intake.imagesExtraHint")} />
          )}
        </div>

        <div className="md:col-span-2">
           <Label>{t("requests.intake.preferredShippingMethod")} *</Label>
           <RadioGroup 
             value={form.preferredShippingMethod} 
             onValueChange={(val) => updateField("preferredShippingMethod", val)}
             className="mt-3 grid grid-cols-3 gap-4"
           >
              {['air', 'sea', 'land'].map((method) => (
                <div key={method}>
                  <RadioGroupItem value={method} id={`ship-${method}`} className="peer sr-only" />
                  <Label
                    htmlFor={`ship-${method}`}
                    className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    {method === 'air' && <Truck className="mb-2 h-6 w-6 rotate-[-15deg]" />}
                    {method === 'sea' && <Truck className="mb-2 h-6 w-6" />}
                    {method === 'land' && <Truck className="mb-2 h-6 w-6" />}
                    <span className="text-xs font-semibold capitalize">{method}</span>
                  </Label>
                </div>
              ))}
           </RadioGroup>
        </div>

        <div>
          <Label>{t("requests.intake.destination")} *</Label>
          <Input 
            value={form.destination} 
            onChange={(event) => updateField("destination", event.target.value)} 
            placeholder={t("requests.intake.destination")} 
          />
        </div>

        <div>
          <Label>{t("requests.intake.expectedSupplyDate")}</Label>
          <Input 
            type="date" 
            value={form.expectedSupplyDate} 
            onChange={(event) => updateField("expectedSupplyDate", event.target.value)} 
          />
        </div>

        <div className="md:col-span-2">
          <Label>{t("requests.intake.deliveryAddress")}</Label>
          <Input 
            value={form.deliveryAddress} 
            onChange={(event) => updateField("deliveryAddress", event.target.value)} 
          />
        </div>

        <div className="md:col-span-2">
           <Label className="mb-3 block">{t("requests.intake.type")}</Label>
           <RadioGroup 
             value={form.isFullSourcing ? "full" : "shipping"} 
             onValueChange={(val) => updateField("isFullSourcing", val === "full")}
             className="grid grid-cols-2 gap-4"
           >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="full" id="type-full" />
                <Label htmlFor="type-full" className="font-normal">{t("requests.intake.isFullSourcing")}</Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="shipping" id="type-shipping" />
                <Label htmlFor="type-shipping" className="font-normal">{t("requests.intake.isShippingOnly")}</Label>
              </div>
           </RadioGroup>
        </div>

        <div className="md:col-span-2">
          <Label>{t("requests.intake.deliveryNotes")}</Label>
          <Textarea 
            value={form.deliveryNotes} 
            onChange={(event) => updateField("deliveryNotes", event.target.value)} 
            placeholder={t("requests.intake.deliveryNotesPlaceholder")} 
          />
        </div>
      </SectionCard>


      <div className="rounded-[1.8rem] border border-primary/15 bg-[linear-gradient(180deg,hsla(var(--card)/0.96),hsla(var(--card)/0.92))] px-6 py-5 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_42px_-32px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{t("requests.intake.summaryTitle")}</p>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                {t("requests.intake.summaryDescription")}
              </p>
            </div>
          </div>
          <Button variant="gold" size="lg" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("requests.intake.submitting")}
              </>
            ) : (
              <>
                <ImagePlus className="me-2 h-4 w-4" />
                {t("requests.intake.submit")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
