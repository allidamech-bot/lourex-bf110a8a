import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Hash,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  createPurchaseRequestWithAttachments,
  updatePurchaseRequestWithAttachments,
} from "@/domain/operations/service";
import type { OperationsRequest, PurchaseRequestImageUpload } from "@/domain/operations/types";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import { supabase } from "@/integrations/supabase/client";

type PurchaseRequestFormState = {
  fullName: string;
  email: string;
  phone: string;
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

type PurchaseRequestFieldErrors = Partial<Record<keyof PurchaseRequestFormState | "uploads", string>>;

type RequestAnalysisResult = {
  readiness_score: number;
  product_category: string;
  missing_fields: string[];
  compliance_flags: string[];
  suggested_questions: string[];
  summary_ar: string;
  summary_en: string;
  fallbackText?: string;
};

const initialState: PurchaseRequestFormState = {
  fullName: "",
  email: "",
  phone: "",
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

const buildInitialStateFromRequest = (request?: OperationsRequest | null): PurchaseRequestFormState => {
  if (!request) {
    return initialState;
  }

  return {
    fullName: request.customer.fullName || "",
    email: request.customer.email || "",
    phone: request.customer.phone || "",
    productName: request.productName || "",
    productDescription: request.productDescription || "",
    quantity: request.quantity ? String(request.quantity) : "",
    sizeDimensions: request.sizeDimensions || "",
    color: request.color || "",
    material: request.material || "",
    technicalSpecs: request.technicalSpecs || "",
    referenceLink: request.referenceLink || "",
    preferredShippingMethod: request.preferredShippingMethod || "sea",
    deliveryNotes: request.deliveryNotes || "",
    weight: request.weight || "",
    manufacturingCountry: request.manufacturingCountry || "",
    brand: request.brand || "",
    qualityLevel: request.qualityLevel || "",
    isReadyMade: Boolean(request.isReadyMade),
    hasPreviousSample: Boolean(request.hasPreviousSample),
    expectedSupplyDate: request.expectedSupplyDate || "",
    destination: request.destination || "",
    deliveryAddress: request.deliveryAddress || "",
    isFullSourcing: request.isFullSourcing ?? true,
  };
};

const MAX_UPLOADS = 5;
const MAX_IMAGE_SIZE_MB = 8;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const normalizeArabicDigits = (value: string) =>
    value
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizeNumberInput = (value: string) =>
    normalizeArabicDigits(value)
        .replace(/[^\d]/g, "")
        .replace(/^0+(?=\d)/, "");

const normalizeTextInput = (value: string) => normalizeArabicDigits(value);

const getSafeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidOptionalUrl = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const getTodayDateString = () => {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - timezoneOffset).toISOString().split("T")[0];
};

const trimPayload = (value: string) => normalizeArabicDigits(value).trim();

const clampScore = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const parseAnalyzerResponse = (raw: unknown): RequestAnalysisResult | null => {
  if (!raw) {
    return null;
  }

  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(match ? match[0] : cleaned) as Record<string, unknown>;

    return {
      readiness_score: clampScore(parsed.readiness_score),
      product_category: typeof parsed.product_category === "string" ? parsed.product_category : "General sourcing",
      missing_fields: toStringArray(parsed.missing_fields),
      compliance_flags: toStringArray(parsed.compliance_flags),
      suggested_questions: toStringArray(parsed.suggested_questions),
      summary_ar: typeof parsed.summary_ar === "string" ? parsed.summary_ar : "",
      summary_en: typeof parsed.summary_en === "string" ? parsed.summary_en : "",
    };
  } catch {
    return {
      readiness_score: 0,
      product_category: "Advisory response",
      missing_fields: [],
      compliance_flags: [],
      suggested_questions: [],
      summary_ar: "",
      summary_en: "",
      fallbackText: text,
    };
  }
};

const getScoreLabel = (score: number, lang: "en" | "ar") => {
  if (score >= 90) return lang === "ar" ? "جاهز جدا" : "Excellent";
  if (score >= 70) return lang === "ar" ? "جيد" : "Good";
  if (score >= 40) return lang === "ar" ? "يحتاج تفاصيل" : "Needs details";
  return lang === "ar" ? "غير كاف" : "Too vague";
};

const inferLocalCategory = (form: PurchaseRequestFormState) => {
  const combined = `${form.productName} ${form.productDescription} ${form.technicalSpecs}`.toLowerCase();

  if (/food|snack|beverage|halal|dates|coffee|sauce|طعام|غذاء|قهوة|تمر/.test(combined)) return "Food / FMCG";
  if (/cosmetic|cream|shampoo|perfume|makeup|lotion|تجميل|عطر|كريم/.test(combined)) return "Cosmetics";
  if (/chemical|detergent|solvent|paint|msds|منظف|كيميائ/.test(combined)) return "Chemicals";
  if (/electronic|battery|charger|lamp|cable|electric|إلكترون|بطارية|كابل/.test(combined)) return "Electronics";
  if (/textile|shirt|fabric|cotton|polyester|clothes|قماش|ملابس|قطن/.test(combined)) return "Textiles";
  if (/packaging|box|carton|bottle|label|bag|تغليف|كرتون|عبوة/.test(combined)) return "Packaging";

  return "General sourcing";
};

const buildLocalAnalysis = (
  form: PurchaseRequestFormState,
  imageCount: number,
  lang: "en" | "ar",
): RequestAnalysisResult => {
  const checks: Array<{ filled: boolean; missingEn: string; missingAr: string; points: number }> = [
    { filled: Boolean(trimPayload(form.productName)), missingEn: "Product name/title", missingAr: "اسم المنتج", points: 12 },
    { filled: trimPayload(form.productDescription).length >= 30, missingEn: "Detailed product description", missingAr: "وصف تفصيلي للمنتج", points: 16 },
    { filled: Boolean(trimPayload(form.quantity)), missingEn: "Quantity", missingAr: "الكمية", points: 10 },
    { filled: Boolean(trimPayload(form.destination)), missingEn: "Destination country/city", missingAr: "مدينة أو دولة الوجهة", points: 10 },
    { filled: Boolean(trimPayload(form.sizeDimensions)), missingEn: "Size or dimensions", missingAr: "المقاسات أو الأبعاد", points: 8 },
    { filled: Boolean(trimPayload(form.material)), missingEn: "Material", missingAr: "الخامة", points: 8 },
    { filled: Boolean(trimPayload(form.color)), missingEn: "Color", missingAr: "اللون", points: 6 },
    { filled: trimPayload(form.technicalSpecs).length >= 20, missingEn: "Technical specifications", missingAr: "المواصفات الفنية", points: 12 },
    { filled: imageCount > 0, missingEn: "Product images", missingAr: "صور المنتج", points: 10 },
    { filled: Boolean(trimPayload(form.referenceLink) || trimPayload(form.brand) || trimPayload(form.qualityLevel)), missingEn: "Reference link, brand, or target quality", missingAr: "رابط مرجعي أو علامة تجارية أو مستوى جودة", points: 8 },
  ];

  const readinessScore = checks.reduce((total, item) => total + (item.filled ? item.points : 0), 0);
  const missingFields = checks.filter((item) => !item.filled).map((item) => (lang === "ar" ? item.missingAr : item.missingEn));
  const category = inferLocalCategory(form);
  const complianceFlags =
    category === "Food / FMCG"
      ? ["Food may require SFDA, Halal, and import documentation review."]
      : category === "Cosmetics"
        ? ["Cosmetics may require ingredient list, label artwork, and SFDA-related review."]
        : category === "Chemicals"
          ? ["Chemicals may require MSDS/TDS and safety classification."]
          : category === "Electronics"
            ? ["Electronics may require conformity and electrical specifications."]
            : category === "Textiles"
              ? ["Textiles may require material composition, sizes, colors, and label details."]
              : category === "Packaging"
                ? ["Packaging may require dimensions, material, thickness, and print specifications."]
                : ["Compliance review is advisory and depends on final product details."];

  return {
    readiness_score: readinessScore,
    product_category: category,
    missing_fields: missingFields,
    compliance_flags: complianceFlags,
    suggested_questions: [
      lang === "ar" ? "ما الاستخدام النهائي أو السوق المستهدف للمنتج؟" : "What is the final use or target market for this product?",
      lang === "ar" ? "هل توجد مواصفات تعبئة أو ملصقات مطلوبة؟" : "Are there required packaging or label specifications?",
      lang === "ar" ? "هل توجد عينة أو رابط مرجعي يمكن مطابقته؟" : "Is there a sample or reference link to match?",
    ],
    summary_ar: "هذا تحليل إرشادي محلي لأن خدمة الذكاء الاصطناعي غير متاحة حاليا. يمكن إرسال الطلب يدويا وسيجري فريق لوركس المراجعة النهائية.",
    summary_en: "This is a local advisory analysis because LOUREX AI is currently unavailable. You can still submit manually and the Lourex team will perform the final review.",
  };
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

const FieldError = ({ text }: { text?: string }) => {
  if (!text) {
    return null;
  }

  return (
      <p className="mt-2 flex items-center gap-2 text-xs font-medium leading-6 text-destructive">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{text}</span>
      </p>
  );
};

const createUploadPreview = (file: File): PurchaseRequestImageUpload => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${getSafeId()}`,
  file,
  previewUrl: URL.createObjectURL(file),
  name: file.name,
  sizeLabel:
      file.size >= 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`,
});

type PurchaseRequestFormProps = {
  mode?: "create" | "edit";
  requestId?: string;
  initialRequest?: OperationsRequest | null;
  onEditSuccess?: (request: OperationsRequest) => void;
};

export const PurchaseRequestForm = ({
  mode = "create",
  requestId,
  initialRequest,
  onEditSuccess,
}: PurchaseRequestFormProps) => {
  const { t, lang, locale } = useI18n();
  const { profile } = useAuthSession();
  const location = useLocation();
  const isEditMode = mode === "edit";

  const [form, setForm] = useState<PurchaseRequestFormState>(() => buildInitialStateFromRequest(initialRequest));
  const [uploads, setUploads] = useState<PurchaseRequestImageUpload[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingRequest, setAnalyzingRequest] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RequestAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PurchaseRequestFieldErrors>({});
  const [submittedData, setSubmittedData] = useState<{
    requestNumber: string;
    trackingCode: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const existingImages = useMemo(
      () =>
          initialRequest
              ? Array.from(
                  new Map(
                      [
                        ...(initialRequest.attachments || []).map((attachment) => [
                          attachment.fileUrl,
                          {
                            id: attachment.id,
                            name: attachment.fileName,
                            url: attachment.fileUrl,
                          },
                        ] as const),
                        ...(initialRequest.imageUrls || []).map((url, index) => [
                          url,
                          {
                            id: `${initialRequest.id}-image-${index}`,
                            name: `image-${index + 1}`,
                            url,
                          },
                        ] as const),
                      ].filter(([url]) => Boolean(url)),
                  ).values(),
              )
              : [],
      [initialRequest],
  );

  useEffect(() => {
    setForm(buildInitialStateFromRequest(initialRequest));
    setFieldErrors({});
    setErrorMessage("");
    setAnalysisResult(null);
    setAnalysisError("");
  }, [initialRequest]);

  const successSteps = useMemo(
      () => [
        t("requests.intake.successSteps.one"),
        t("requests.intake.successSteps.two"),
        t("requests.intake.successSteps.three"),
      ],
      [t],
  );

  const effectiveContact = useMemo(
      () => ({
        fullName: trimPayload(isEditMode ? form.fullName : profile?.fullName || form.fullName),
        email: trimPayload(isEditMode ? form.email : profile?.email || form.email),
        phone: trimPayload(isEditMode ? form.phone : profile?.phone || form.phone),
        country: trimPayload(isEditMode ? initialRequest?.customer.country || profile?.country || "" : profile?.country || ""),
        city: trimPayload(isEditMode ? initialRequest?.customer.city || profile?.city || "" : profile?.city || ""),
      }),
      [form.email, form.fullName, form.phone, initialRequest, isEditMode, profile],
  );

  const updateField = (field: keyof PurchaseRequestFormState, value: string | boolean) => {
    const nextValue =
        typeof value === "string"
            ? field === "quantity"
                ? normalizeNumberInput(value)
                : normalizeTextInput(value)
            : value;

    setForm((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const clearUploads = (items: PurchaseRequestImageUpload[]) => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  };

  const scrollToErrorSummary = () => {
    window.requestAnimationFrame(() => {
      errorSummaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const validateForm = () => {
    const nextErrors: PurchaseRequestFieldErrors = {};

    const requiredTextFields: Array<keyof PurchaseRequestFormState> = [
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

    requiredTextFields.forEach((field) => {
      const value = form[field];

      if (typeof value === "string" && !trimPayload(value)) {
        nextErrors[field] = t("requests.intake.errors.missingFields");
      }
    });

    if (!effectiveContact.fullName) {
      nextErrors.fullName = t("requests.intake.errors.missingFields");
    }

    if (!effectiveContact.email) {
      nextErrors.email = t("requests.intake.errors.missingFields");
    } else if (!isValidEmail(effectiveContact.email)) {
      nextErrors.email =
          t("requests.intake.errors.invalidEmail") ||
          "Please enter a valid email address.";
    }

    if (!effectiveContact.phone) {
      nextErrors.phone = t("requests.intake.errors.missingFields");
    }

    const parsedQuantity = Number(normalizeNumberInput(form.quantity));
    const MAX_QUANTITY = 2147483647;

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > MAX_QUANTITY) {
      nextErrors.quantity =
          parsedQuantity > MAX_QUANTITY
              ? (t("requests.intake.errors.quantityTooLarge") || `Quantity must be ${MAX_QUANTITY} or less.`)
              : (t("requests.intake.errors.invalidQuantity") || "Please enter a valid quantity greater than zero.");
    }

    if (!isValidOptionalUrl(form.referenceLink)) {
      nextErrors.referenceLink =
          t("requests.intake.errors.invalidUrl") ||
          "Please enter a valid link starting with http:// or https://.";
    }

    if (form.expectedSupplyDate) {
      const today = getTodayDateString();

      if (form.expectedSupplyDate < today && (!isEditMode || form.expectedSupplyDate !== initialRequest?.expectedSupplyDate)) {
        nextErrors.expectedSupplyDate =
            t("requests.intake.errors.invalidDate") ||
            "Please choose today or a future date.";
      }
    }

    if (uploads.length + existingImages.length === 0) {
      nextErrors.uploads = t("requests.intake.errors.missingImages");
    }

    return nextErrors;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remainingSlots = Math.max(0, MAX_UPLOADS - existingImages.length - uploads.length);

    if (selectedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    if (remainingSlots === 0) {
      const message =
          t("requests.intake.errors.maxImages") ||
          `You can upload up to ${MAX_UPLOADS} images.`;

      setErrorMessage(message);
      setFieldErrors((current) => ({ ...current, uploads: message }));
      toast.error(message);
      event.target.value = "";
      return;
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    const oversizedFiles = imageFiles.filter((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    const acceptedFiles = imageFiles
        .filter((file) => file.size <= MAX_IMAGE_SIZE_BYTES)
        .slice(0, remainingSlots);

    if (imageFiles.length === 0) {
      const message = t("requests.intake.errors.invalidImages");
      setErrorMessage(message);
      setFieldErrors((current) => ({ ...current, uploads: message }));
      toast.error(message);
      event.target.value = "";
      return;
    }

    if (oversizedFiles.length > 0) {
      const message =
          t("requests.intake.errors.imageTooLarge") ||
          `Each image must be ${MAX_IMAGE_SIZE_MB} MB or less.`;

      setErrorMessage(message);
      setFieldErrors((current) => ({ ...current, uploads: message }));
      toast.error(message);
    }

    if (acceptedFiles.length > 0) {
      setErrorMessage("");
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.uploads;
        return next;
      });

      setUploads((current) => [
        ...current,
        ...acceptedFiles.map((file) => createUploadPreview(file)),
      ]);
    }

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

  const buildAnalyzerDraft = () => ({
    productName: trimPayload(form.productName),
    productDescription: trimPayload(form.productDescription),
    quantity: trimPayload(form.quantity),
    sizeDimensions: trimPayload(form.sizeDimensions),
    color: trimPayload(form.color),
    material: trimPayload(form.material),
    technicalSpecs: trimPayload(form.technicalSpecs),
    referenceLink: trimPayload(form.referenceLink),
    preferredShippingMethod: trimPayload(form.preferredShippingMethod),
    deliveryNotes: trimPayload(form.deliveryNotes),
    weight: trimPayload(form.weight),
    manufacturingCountry: trimPayload(form.manufacturingCountry),
    brand: trimPayload(form.brand),
    qualityLevel: trimPayload(form.qualityLevel),
    isReadyMade: form.isReadyMade,
    hasPreviousSample: form.hasPreviousSample,
    expectedSupplyDate: trimPayload(form.expectedSupplyDate),
    destination: trimPayload(form.destination),
    deliveryAddress: trimPayload(form.deliveryAddress),
    isFullSourcing: form.isFullSourcing,
    uploadedImagesCount: uploads.length + existingImages.length,
  });

  const analyzeRequestDraft = async () => {
    if (analyzingRequest) {
      return;
    }

    setAnalyzingRequest(true);
    setAnalysisError("");
    setAnalysisResult(null);

    const formDraft = buildAnalyzerDraft();

    try {
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
        body: {
          message: "Analyze this purchase request draft and return only the requested JSON.",
          messages: [
            {
              role: "user",
              content: `Analyze this purchase request draft for readiness. Draft: ${JSON.stringify(formDraft)}`,
            },
          ],
          pageContext: "public_request",
          route: location.pathname,
          locale,
          userRole: profile?.role ?? "guest",
          analysisMode: "purchase_request_analyzer",
          formDraft,
        },
      });

      if (error) {
        throw error;
      }

      const rawReply = data?.analysis || data?.reply || data;
      const parsed = parseAnalyzerResponse(rawReply);

      if (!parsed) {
        throw new Error("Analysis response was empty.");
      }

      setAnalysisResult(parsed);
    } catch {
      setAnalysisError(
        lang === "ar"
          ? "مساعد LOUREX AI غير متاح الآن. يمكنك متابعة إرسال طلبك يدويا."
          : "LOUREX AI is unavailable right now. You can continue submitting your request manually.",
      );
      setAnalysisResult(buildLocalAnalysis(form, uploads.length + existingImages.length, lang));
    } finally {
      setAnalyzingRequest(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      const message = t("requests.intake.errors.missingFields");

      setFieldErrors(nextErrors);
      setErrorMessage(message);
      toast.error(message);
      scrollToErrorSummary();
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setFieldErrors({});

    try {
      const requestNumber = `PR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;      const trackingCode = `TRX-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;

      const parsedQuantity = Number(normalizeNumberInput(form.quantity));

      if (isEditMode) {
        const updateResult = await updatePurchaseRequestWithAttachments(
            requestId || initialRequest?.id || "",
            {
              fullName: effectiveContact.fullName,
              phone: effectiveContact.phone,
              email: effectiveContact.email,
              country: effectiveContact.country,
              city: effectiveContact.city,
              productName: trimPayload(form.productName),
              productDescription: trimPayload(form.productDescription),
              quantity: parsedQuantity,
              sizeDimensions: trimPayload(form.sizeDimensions),
              color: trimPayload(form.color),
              material: trimPayload(form.material),
              technicalSpecs: trimPayload(form.technicalSpecs),
              referenceLink: trimPayload(form.referenceLink),
              preferredShippingMethod: trimPayload(form.preferredShippingMethod),
              deliveryNotes: trimPayload(form.deliveryNotes),
              weight: trimPayload(form.weight),
              manufacturingCountry: trimPayload(form.manufacturingCountry),
              brand: trimPayload(form.brand),
              qualityLevel: trimPayload(form.qualityLevel),
              isReadyMade: form.isReadyMade,
              hasPreviousSample: form.hasPreviousSample,
              expectedSupplyDate: trimPayload(form.expectedSupplyDate),
              destination: trimPayload(form.destination),
              deliveryAddress: trimPayload(form.deliveryAddress),
              isFullSourcing: form.isFullSourcing,
            },
            uploads,
        );

        if (updateResult.error || !updateResult.data) {
          throw new Error(updateResult.error?.message || t("requests.intake.errors.updateFailed"));
        }

        trackEvent("purchase_request_updated", {
          flow: "purchase_request",
          requestId: updateResult.data.id,
          requestNumber: updateResult.data.requestNumber,
          images: uploads.length,
        });

        clearUploads(uploads);
        setUploads([]);
        toast.success(t("requests.intake.updateSuccess") || "Request updated successfully.");
        onEditSuccess?.(updateResult.data);
        return;
      }

      const creationResult = await createPurchaseRequestWithAttachments(
          {
            requestNumber,
            trackingCode,
            fullName: effectiveContact.fullName,
            phone: effectiveContact.phone,
            email: effectiveContact.email,
            country: effectiveContact.country,
            city: effectiveContact.city,
            productName: trimPayload(form.productName),
            productDescription: trimPayload(form.productDescription),
            quantity: parsedQuantity,
            sizeDimensions: trimPayload(form.sizeDimensions),
            color: trimPayload(form.color),
            material: trimPayload(form.material),
            technicalSpecs: trimPayload(form.technicalSpecs),
            referenceLink: trimPayload(form.referenceLink),
            preferredShippingMethod: trimPayload(form.preferredShippingMethod),
            deliveryNotes: trimPayload(form.deliveryNotes),
            imageUrls: [],
            weight: trimPayload(form.weight),
            manufacturingCountry: trimPayload(form.manufacturingCountry),
            brand: trimPayload(form.brand),
            qualityLevel: trimPayload(form.qualityLevel),
            isReadyMade: form.isReadyMade,
            hasPreviousSample: form.hasPreviousSample,
            expectedSupplyDate: trimPayload(form.expectedSupplyDate),
            destination: trimPayload(form.destination),
            deliveryAddress: trimPayload(form.deliveryAddress),
            isFullSourcing: form.isFullSourcing,
          },
          uploads,
      );

      if (creationResult.error || !creationResult.data) {
        throw new Error(
            creationResult.error?.message || t("requests.intake.errors.submitFailed"),
        );
      }

      setSubmittedData({ requestNumber, trackingCode });

      trackEvent("purchase_request_submitted", {
        flow: "purchase_request",
        authenticated: Boolean(profile),
        requestNumber,
        trackingId: trackingCode,
        images: uploads.length,
        isFullSourcing: form.isFullSourcing,
      });

      setForm(initialState);
      clearUploads(uploads);
      setUploads([]);
      toast.success(t("requests.intake.errors.success"));
    } catch (error: unknown) {
      const message =
          error instanceof Error && error.message
              ? error.message
              : t("requests.intake.errors.submitFailed");

      logOperationalError("purchase_request_submit", error, {
        flow: "purchase_request",
        authenticated: Boolean(profile),
        images: uploads.length,
      });

      setErrorMessage(message);
      toast.error(message);
      scrollToErrorSummary();
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
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("requests.intake.successReference")}
              </span>
                <span className="mt-1 text-2xl font-bold text-foreground">
                {submittedData.requestNumber}
              </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/5 p-6">
                <ShieldCheck className="mb-2 h-6 w-6 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("nav.track")}
              </span>
                <span className="mt-1 text-2xl font-bold text-foreground">
                {submittedData.trackingCode}
              </span>
              </div>
            </div>

            <p className="mt-6 text-base leading-8 text-muted-foreground">
              {t("requests.intake.successDescription")}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {successSteps.map((item) => (
                  <div
                      key={item}
                      className="rounded-[1.4rem] border border-border/60 bg-secondary/25 p-4 text-sm leading-7 text-muted-foreground"
                  >
                    {item}
                  </div>
              ))}
            </div>

            <Button
                variant="gold"
                className="mt-8"
                onClick={() => setSubmittedData(null)}
            >
              {t("requests.intake.submitAnother")}
            </Button>
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {errorMessage ? (
            <div
                ref={errorSummaryRef}
                className="flex items-start gap-3 rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
        ) : null}

        {!profile && (
            <SectionCard
                title={t("requests.intake.contactTitle") || "Contact Information"}
                description={
                    t("requests.intake.contactDescription") ||
                    "Please provide your contact details so we can reach out to you."
                }
            >
              <div className="md:col-span-2">
                <Label>{t("common.fullName") || "Full Name"} *</Label>
                <Input
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                />
                <FieldError text={fieldErrors.fullName} />
              </div>

              <div>
                <Label>{t("common.email") || "Email"} *</Label>
                <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                />
                <FieldError text={fieldErrors.email} />
              </div>

              <div>
                <Label>{t("common.phone") || "Phone"} *</Label>
                <Input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.phone)}
                />
                <FieldError text={fieldErrors.phone} />
              </div>
            </SectionCard>
        )}

        {profile && (!effectiveContact.fullName || !effectiveContact.email || !effectiveContact.phone) ? (
            <SectionCard
                title={t("requests.intake.contactTitle") || "Contact Information"}
                description={
                    t("requests.intake.contactDescription") ||
                    "Please complete the missing contact details for this request."
                }
            >
              {!effectiveContact.fullName ? (
                  <div className="md:col-span-2">
                    <Label>{t("common.fullName") || "Full Name"} *</Label>
                    <Input
                        value={form.fullName}
                        onChange={(event) => updateField("fullName", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.fullName)}
                    />
                    <FieldError text={fieldErrors.fullName} />
                  </div>
              ) : null}

              {!effectiveContact.email ? (
                  <div>
                    <Label>{t("common.email") || "Email"} *</Label>
                    <Input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.email)}
                    />
                    <FieldError text={fieldErrors.email} />
                  </div>
              ) : null}

              {!effectiveContact.phone ? (
                  <div>
                    <Label>{t("common.phone") || "Phone"} *</Label>
                    <Input
                        value={form.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.phone)}
                    />
                    <FieldError text={fieldErrors.phone} />
                  </div>
              ) : null}
            </SectionCard>
        ) : null}

        <SectionCard
            title={t("requests.intake.productTitle")}
            description={t("requests.intake.productDescription")}
        >
          <div className="md:col-span-2">
            <Label>{t("requests.intake.productName")} *</Label>
            <Input
                value={form.productName}
                onChange={(event) => updateField("productName", event.target.value)}
                aria-invalid={Boolean(fieldErrors.productName)}
            />
            <FieldHint text={t("requests.intake.productNameHint")} />
            <FieldError text={fieldErrors.productName} />
          </div>

          <div className="md:col-span-2">
            <Label>{t("requests.intake.productDescriptionLabel")} *</Label>
            <Textarea
                rows={4}
                value={form.productDescription}
                onChange={(event) =>
                    updateField("productDescription", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.productDescription)}
            />
            <FieldHint text={t("requests.intake.productDescriptionHint")} />
            <FieldError text={fieldErrors.productDescription} />
          </div>

          <div>
            <Label>{t("requests.intake.quantity")} *</Label>
            <Input
                inputMode="numeric"
                value={form.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
                placeholder={t("requests.intake.quantityPlaceholder")}
                aria-invalid={Boolean(fieldErrors.quantity)}
            />
            <FieldHint text={t("requests.intake.quantityArabicDigitsHint")} />
            <FieldError text={fieldErrors.quantity} />
          </div>

          <div>
            <Label>{t("requests.intake.dimensions")} *</Label>
            <Input
                value={form.sizeDimensions}
                onChange={(event) => updateField("sizeDimensions", event.target.value)}
                placeholder={t("requests.intake.dimensionsPlaceholder")}
                aria-invalid={Boolean(fieldErrors.sizeDimensions)}
            />
            <FieldError text={fieldErrors.sizeDimensions} />
          </div>

          <div>
            <Label>{t("requests.intake.color")} *</Label>
            <Input
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
                aria-invalid={Boolean(fieldErrors.color)}
            />
            <FieldError text={fieldErrors.color} />
          </div>

          <div>
            <Label>{t("requests.intake.material")} *</Label>
            <Input
                value={form.material}
                onChange={(event) => updateField("material", event.target.value)}
                aria-invalid={Boolean(fieldErrors.material)}
            />
            <FieldError text={fieldErrors.material} />
          </div>

          <div>
            <Label>{t("requests.intake.weight")}</Label>
            <Input
                value={form.weight}
                onChange={(event) => updateField("weight", event.target.value)}
            />
          </div>

          <div>
            <Label>{t("requests.intake.brand")}</Label>
            <Input
                value={form.brand}
                onChange={(event) => updateField("brand", event.target.value)}
            />
          </div>

          <div>
            <Label>{t("requests.intake.manufacturingCountry")}</Label>
            <Input
                value={form.manufacturingCountry}
                onChange={(event) =>
                    updateField("manufacturingCountry", event.target.value)
                }
            />
          </div>

          <div>
            <Label>{t("requests.intake.qualityLevel")}</Label>
            <Input
                value={form.qualityLevel}
                onChange={(event) => updateField("qualityLevel", event.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Label>{t("requests.intake.technicalSpecs")} *</Label>
            <Textarea
                rows={4}
                value={form.technicalSpecs}
                onChange={(event) => updateField("technicalSpecs", event.target.value)}
                aria-invalid={Boolean(fieldErrors.technicalSpecs)}
            />
            <FieldHint text={t("requests.intake.technicalSpecsHint")} />
            <FieldError text={fieldErrors.technicalSpecs} />
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox
                  id="isReadyMade"
                  checked={form.isReadyMade}
                  onCheckedChange={(checked) => updateField("isReadyMade", !!checked)}
              />
              <Label htmlFor="isReadyMade" className="cursor-pointer font-normal">
                {t("requests.intake.readyMade")}
              </Label>
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox
                  id="hasPreviousSample"
                  checked={form.hasPreviousSample}
                  onCheckedChange={(checked) =>
                      updateField("hasPreviousSample", !!checked)
                  }
              />
              <Label
                  htmlFor="hasPreviousSample"
                  className="cursor-pointer font-normal"
              >
                {t("requests.intake.hasPreviousSample")}
              </Label>
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>{t("requests.intake.referenceLink")}</Label>
            <Input
                value={form.referenceLink}
                onChange={(event) => updateField("referenceLink", event.target.value)}
                placeholder="https://..."
                aria-invalid={Boolean(fieldErrors.referenceLink)}
            />
            <FieldError text={fieldErrors.referenceLink} />
          </div>
        </SectionCard>

        <section className="rounded-[1.8rem] border border-primary/25 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_34%),linear-gradient(180deg,#111111,#080808)] p-6 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.78)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-foreground">
                  {lang === "ar" ? "محلل طلبات LOUREX AI" : "LOUREX AI Request Analyzer"}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {lang === "ar"
                    ? "حلل مسودة الطلب اختياريا قبل الإرسال لاكتشاف التفاصيل الناقصة والأسئلة المقترحة."
                    : "Optionally analyze this draft before submission to spot missing details and suggested clarification questions."}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="gold"
              onClick={() => void analyzeRequestDraft()}
              disabled={analyzingRequest}
              className="shrink-0"
            >
              {analyzingRequest ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {lang === "ar" ? "جار التحليل..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  {lang === "ar" ? "حلل الطلب بالذكاء الاصطناعي" : "Analyze request with LOUREX AI"}
                </>
              )}
            </Button>
          </div>

          {analysisError ? (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-destructive" />
              <span>{analysisError}</span>
            </div>
          ) : null}

          {analysisResult ? (
            <div className="mt-6 grid gap-4">
              {analysisResult.fallbackText ? (
                <div className="rounded-2xl border border-primary/20 bg-card/85 p-4">
                  <p className="text-xs font-semibold uppercase text-primary">
                    {lang === "ar" ? "رد استشاري" : "Advisory response"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {analysisResult.fallbackText}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
                    <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
                      <p className="text-xs font-semibold uppercase text-primary">
                        {lang === "ar" ? "جاهزية الطلب" : "Readiness score"}
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-5xl font-bold text-primary">{analysisResult.readiness_score}</span>
                        <span className="pb-2 text-sm text-muted-foreground">/100</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {getScoreLabel(analysisResult.readiness_score, lang)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/85 p-5">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {lang === "ar" ? "تصنيف المنتج" : "Product category"}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {analysisResult.product_category || (lang === "ar" ? "غير محدد" : "Not specified")}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {lang === "ar"
                          ? analysisResult.summary_ar || analysisResult.summary_en
                          : analysisResult.summary_en || analysisResult.summary_ar}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        {lang === "ar" ? "تفاصيل ناقصة" : "Missing details"}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                        {(analysisResult.missing_fields.length ? analysisResult.missing_fields : [lang === "ar" ? "لا توجد فجوات واضحة." : "No clear gaps found."]).map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        {lang === "ar" ? "ملاحظات امتثال" : "Compliance flags"}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                        {(analysisResult.compliance_flags.length ? analysisResult.compliance_flags : [lang === "ar" ? "لا توجد ملاحظات امتثال محددة." : "No specific compliance flags."]).map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        {lang === "ar" ? "أسئلة مقترحة" : "Suggested questions"}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                        {(analysisResult.suggested_questions.length ? analysisResult.suggested_questions : [lang === "ar" ? "لا توجد أسئلة إضافية حاليا." : "No extra questions right now."]).map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <p className="mt-5 text-xs leading-6 text-muted-foreground">
            {lang === "ar"
              ? "تحليل الذكاء الاصطناعي إرشادي فقط. المراجعة النهائية تتم بواسطة فريق لوركس."
              : "AI analysis is advisory. Final review is performed by the Lourex team."}
          </p>
        </section>

        <SectionCard
            title={t("requests.intake.shippingTitle")}
            description={t("requests.intake.shippingDescription")}
        >
          <div className="md:col-span-2">
            <Label>{t("requests.intake.images")} *</Label>

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
                disabled={submitting || uploads.length + existingImages.length >= MAX_UPLOADS}
                className="mt-2 flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-[1.8rem] border-2 border-dashed border-primary/20 bg-[linear-gradient(180deg,hsla(var(--secondary)/0.45),hsla(var(--secondary)/0.25))] px-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">
              {uploads.length + existingImages.length >= MAX_UPLOADS
                  ? t("requests.intake.errors.maxImages") ||
                  `Maximum ${MAX_UPLOADS} images uploaded`
                  : t("requests.intake.imagesCta")}
            </span>
              <span className="text-xs text-muted-foreground">
              {t("requests.intake.imagesHint")}
            </span>
            </button>

            <FieldError text={fieldErrors.uploads} />

            {existingImages.length > 0 || uploads.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  {existingImages.map((image) => (
                      <div
                          key={image.id}
                          className="relative overflow-hidden rounded-[1.4rem] border border-border bg-card"
                      >
                        <img
                            src={image.url}
                            alt={image.name}
                            className="h-28 w-full object-cover"
                        />
                        <div className="p-3">
                          <p className="truncate text-xs font-medium">{image.name}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {t("requests.intake.existingImage") || "Already attached"}
                          </p>
                        </div>
                      </div>
                  ))}
                  {uploads.map((upload) => (
                      <div
                          key={upload.id}
                          className="relative overflow-hidden rounded-[1.4rem] border border-border bg-card"
                      >
                        <img
                            src={upload.previewUrl}
                            alt={upload.name}
                            className="h-28 w-full object-cover"
                        />
                        <div className="p-3">
                          <p className="truncate text-xs font-medium">{upload.name}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {upload.sizeLabel}
                          </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeUpload(upload.id)}
                            disabled={submitting}
                            className="absolute end-2 top-2 rounded-full bg-background/90 p-1 disabled:cursor-not-allowed disabled:opacity-60"
                        >
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
                onValueChange={(value) => updateField("preferredShippingMethod", value)}
                className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {["air", "sea", "land"].map((method) => (
                  <div key={method}>
                    <RadioGroupItem
                        value={method}
                        id={`ship-${method}`}
                        className="peer sr-only"
                    />
                    <Label
                        htmlFor={`ship-${method}`}
                        className="flex cursor-pointer flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Truck
                          className={
                            method === "air"
                                ? "mb-2 h-6 w-6 rotate-[-15deg]"
                                : "mb-2 h-6 w-6"
                          }
                      />
                      <span className="text-xs font-semibold capitalize">
                    {method === "air" ? t("common.air") : method === "sea" ? t("common.sea") : t("common.land")}
                  </span>
                    </Label>
                  </div>
              ))}
            </RadioGroup>

            <FieldError text={fieldErrors.preferredShippingMethod} />
          </div>

          <div>
            <Label>{t("requests.intake.destination")} *</Label>
            <Input
                value={form.destination}
                onChange={(event) => updateField("destination", event.target.value)}
                placeholder={t("requests.intake.destination")}
                aria-invalid={Boolean(fieldErrors.destination)}
            />
            <FieldError text={fieldErrors.destination} />
          </div>

          <div>
            <Label>{t("requests.intake.expectedSupplyDate")}</Label>
            <Input
                type="date"
                min={getTodayDateString()}
                value={form.expectedSupplyDate}
                onChange={(event) =>
                    updateField("expectedSupplyDate", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.expectedSupplyDate)}
            />
            <FieldError text={fieldErrors.expectedSupplyDate} />
          </div>

          <div className="md:col-span-2">
            <Label>{t("requests.intake.deliveryAddress")}</Label>
            <Input
                value={form.deliveryAddress}
                onChange={(event) =>
                    updateField("deliveryAddress", event.target.value)
                }
            />
          </div>

          <div className="md:col-span-2">
            <Label className="mb-3 block">{t("requests.intake.type")}</Label>

            <RadioGroup
                value={form.isFullSourcing ? "full" : "shipping"}
                onValueChange={(value) => updateField("isFullSourcing", value === "full")}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="flex flex-col space-y-2 rounded-2xl border border-border/50 bg-secondary/5 p-4 transition-colors hover:border-primary/20">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="full" id="type-full" />
                  <Label htmlFor="type-full" className="font-semibold">
                    {t("requests.intake.isFullSourcing")}
                  </Label>
                </div>
                <p className="ps-6 text-xs leading-5 text-muted-foreground rtl:pe-6 rtl:ps-0">
                  {t("requests.intake.isFullSourcingHint")}
                </p>
              </div>

              <div className="flex flex-col space-y-2 rounded-2xl border border-border/50 bg-secondary/5 p-4 transition-colors hover:border-primary/20">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="shipping" id="type-shipping" />
                  <Label htmlFor="type-shipping" className="font-semibold">
                    {t("requests.intake.isShippingOnly")}
                  </Label>
                </div>
                <p className="ps-6 text-xs leading-5 text-muted-foreground rtl:pe-6 rtl:ps-0">
                  {t("requests.intake.isShippingOnlyHint")}
                </p>
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

            <Button
                variant="gold"
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={submitting}
            >
              {submitting ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {isEditMode
                        ? t("requests.intake.submittingUpdate") || "Saving update..."
                        : t("requests.intake.submitting")}
                  </>
              ) : (
                  <>
                    <ImagePlus className="me-2 h-4 w-4" />
                    {isEditMode
                        ? t("requests.intake.submitUpdate") || "Save and Send Update"
                        : t("requests.intake.submit")}
                  </>
              )}
            </Button>
          </div>
        </div>
      </div>
  );
};
