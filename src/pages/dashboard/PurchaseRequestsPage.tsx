import { type FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRightLeft,
    Archive,
    Ban,
    CheckCircle2,
    ClipboardList,
    Copy,
    Eye,
    FileImage,
    Filter,
    Loader2,
    MessageSquareWarning,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    StickyNote,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    acceptTransferProofWithPayment,
    convertRequestToDeal,
    deletePurchaseRequestRecord,
    loadPurchaseRequests,
    rejectTransferProof,
    updatePurchaseRequestInternalNotes,
    updatePurchaseRequestStatus,
} from "@/lib/operationsDomain";
import type { PurchaseRequestStatus } from "@/types/lourex";
import { isInternalRole } from "@/features/auth/rbac";
import { canConvertPurchaseRequest, canTransitionPurchaseRequestStatus } from "@/domain/operations/guards";
import { resubmitPurchaseRequest } from "@/domain/operations/service";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import { getSignedUrl } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

type PurchaseRequests = Awaited<ReturnType<typeof loadPurchaseRequests>>;
type PurchaseRequestRow = PurchaseRequests[number];
type TransferPaymentType = "first_payment" | "second_payment" | "full_payment";
type PurchaseRequestAiMode =
    | "purchase_request_summary"
    | "purchase_request_missing_info"
    | "purchase_request_customer_reply"
    | "purchase_request_supplier_brief"
    | "purchase_request_compliance_notes";

const purchaseRequestAiActions: Array<{
    mode: PurchaseRequestAiMode;
    label: string;
    labelAr: string;
}> = [
    { mode: "purchase_request_summary", label: "AI Summary", labelAr: "ملخص ذكي" },
    { mode: "purchase_request_missing_info", label: "Missing Info", labelAr: "المعلومات الناقصة" },
    { mode: "purchase_request_customer_reply", label: "Generate Customer Reply", labelAr: "صياغة رد للعميل" },
    { mode: "purchase_request_supplier_brief", label: "Supplier Brief", labelAr: "مسودة للمورد" },
    { mode: "purchase_request_compliance_notes", label: "Compliance Notes", labelAr: "ملاحظات الامتثال" },
];

const getAiActionLabel = (mode: PurchaseRequestAiMode, lang: string) =>
    purchaseRequestAiActions.find((action) => action.mode === mode)?.[lang === "ar" ? "labelAr" : "label"] ||
    purchaseRequestAiActions[0].label;

const valueOrDash = (value: unknown) => {
    if (typeof value === "string") return value.trim() || "-";
    if (typeof value === "number") return value > 0 ? String(value) : "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return "-";
};

const statusBadgeClasses: Record<PurchaseRequestStatus, string> = {
    intake_submitted: "border-blue-400/25 bg-blue-500/10 text-blue-100",
    under_review: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    awaiting_clarification: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
    ready_for_conversion: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    transfer_proof_pending: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    transfer_proof_rejected: "border-rose-400/25 bg-rose-500/10 text-rose-100",
    in_progress: "border-sky-400/25 bg-sky-500/10 text-sky-100",
    completed: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    cancelled: "border-slate-500/25 bg-slate-500/10 text-slate-300",
};

const getStatusBadgeClass = (status: PurchaseRequestStatus | string | null | undefined) =>
    status && status in statusBadgeClasses
        ? statusBadgeClasses[status as PurchaseRequestStatus]
        : "border-slate-500/25 bg-slate-500/10 text-slate-300";

const canResubmitPurchaseRequest = (status: PurchaseRequestStatus) =>
    status === "cancelled" || status === "awaiting_clarification";

const buildSafeAiRequestContext = (row: PurchaseRequestRow) => ({
    id: row.id,
    requestNumber: row.requestNumber,
    status: row.status,
    createdAt: row.createdAt,
    productName: row.productName,
    productDescription: row.productDescription,
    quantity: row.quantity,
    destination: row.destination,
    preferredShippingMethod: row.preferredShippingMethod,
    expectedSupplyDate: row.expectedSupplyDate,
    weight: row.weight,
    brand: row.brand,
    qualityLevel: row.qualityLevel,
    manufacturingCountry: row.manufacturingCountry,
    isFullSourcing: row.isFullSourcing,
    isReadyMade: row.isReadyMade,
    hasPreviousSample: row.hasPreviousSample,
    sizeDimensions: row.sizeDimensions,
    material: row.material,
    color: row.color,
    referenceLink: row.referenceLink,
    technicalSpecs: row.technicalSpecs,
    attachmentCount: row.attachments.length,
    customer: {
        name: row.customer.fullName,
        email: row.customer.email,
        phone: row.customer.phone,
        country: row.customer.country,
        city: row.customer.city,
    },
});

const findMissingRequestInfo = (row: PurchaseRequestRow, lang: string) => {
    const checks: Array<[boolean, string, string]> = [
        [Boolean(row.productName?.trim()), "Product name/title", "اسم المنتج"],
        [Boolean(row.productDescription?.trim() && row.productDescription.trim().length >= 30), "Detailed product description", "وصف تفصيلي للمنتج"],
        [Boolean(row.quantity && row.quantity > 0), "Quantity", "الكمية"],
        [Boolean(row.destination?.trim()), "Destination country/city", "بلد أو مدينة الوجهة"],
        [Boolean(row.technicalSpecs?.trim()), "Technical specifications", "المواصفات الفنية"],
        [Boolean(row.referenceLink?.trim()), "Reference/product link", "رابط مرجعي للمنتج"],
        [row.attachments.length > 0, "Images or attachments", "صور أو مرفقات"],
        [Boolean(row.material?.trim() || row.sizeDimensions?.trim() || row.color?.trim() || row.brand?.trim()), "Material, size, color, brand, or model details", "تفاصيل المادة أو المقاس أو اللون أو العلامة"],
    ];

    return checks.filter(([isPresent]) => !isPresent).map(([, en, ar]) => (lang === "ar" ? ar : en));
};

const inferComplianceNotes = (row: PurchaseRequestRow, lang: string) => {
    const text = `${row.productName} ${row.productDescription} ${row.technicalSpecs}`.toLowerCase();
    const notes: string[] = [];

    const add = (en: string, ar: string) => notes.push(lang === "ar" ? ar : en);

    if (/(food|snack|drink|beverage|halal|meat|coffee|chocolate|غذاء|غذائي|مشروب|حلال|قهوة)/i.test(text)) {
        add("Food items may require SFDA, Halal, ingredient, and import documentation review.", "المنتجات الغذائية قد تحتاج إلى مراجعة وثائق SFDA والحلال والمكونات والاستيراد.");
    }
    if (/(cosmetic|cream|makeup|perfume|shampoo|skin|beauty|تجميل|كريم|عطر|شامبو)/i.test(text)) {
        add("Cosmetics may require ingredient lists, label artwork, and SFDA-related review.", "مستحضرات التجميل قد تحتاج إلى قائمة مكونات وتصميم الملصق ومراجعة مرتبطة بـ SFDA.");
    }
    if (/(chemical|paint|solvent|resin|adhesive|msds|tds|كيما|دهان|لاصق)/i.test(text)) {
        add("Chemicals may require MSDS/TDS documents and safety classification review.", "المواد الكيميائية قد تحتاج إلى MSDS/TDS ومراجعة تصنيف السلامة.");
    }
    if (/(electronic|battery|charger|led|appliance|voltage|power|إلكترون|بطارية|شاحن|كهرب)/i.test(text)) {
        add("Electronics may require conformity documents, electrical specifications, and safety checks.", "الإلكترونيات قد تحتاج إلى وثائق مطابقة ومواصفات كهربائية وفحوصات سلامة.");
    }
    if (/(textile|fabric|clothing|garment|cotton|polyester|نسيج|قماش|ملابس|قطن)/i.test(text)) {
        add("Textiles may require material composition, size, color, label, and care details.", "المنسوجات قد تحتاج إلى تركيب المادة والمقاسات والألوان وبيانات الملصق والعناية.");
    }

    if (notes.length === 0) {
        add(
            "No category-specific flag was inferred. Final documentation and import requirements should still be reviewed by the Lourex team.",
            "لم يتم استنتاج ملاحظة امتثال محددة حسب الفئة. يجب أن يراجع فريق لوركس المتطلبات النهائية للوثائق والاستيراد.",
        );
    }

    return notes;
};

const buildLocalAiOutput = (mode: PurchaseRequestAiMode, row: PurchaseRequestRow, lang: string) => {
    const missing = findMissingRequestInfo(row, lang);
    const compliance = inferComplianceNotes(row, lang);
    const isArabic = lang === "ar";

    if (mode === "purchase_request_summary") {
        return isArabic
            ? [
                  `ملخص تشغيلي للطلب ${row.requestNumber}`,
                  `- المنتج: ${valueOrDash(row.productName)}`,
                  `- العميل: ${valueOrDash(row.customer.fullName)} (${valueOrDash(row.customer.country)} / ${valueOrDash(row.customer.city)})`,
                  `- الحاجة: ${valueOrDash(row.productDescription)}`,
                  `- الكمية: ${valueOrDash(row.quantity)}`,
                  `- الوجهة: ${valueOrDash(row.destination)}`,
                  `- الحالة الحالية: ${valueOrDash(row.status)}`,
                  `- الإجراء المقترح: مراجعة التفاصيل الناقصة ثم إعداد أسئلة توضيحية أو brief للمورد حسب جاهزية البيانات.`,
              ].join("\n")
            : [
                  `Operational summary for ${row.requestNumber}`,
                  `- Product: ${valueOrDash(row.productName)}`,
                  `- Customer: ${valueOrDash(row.customer.fullName)} (${valueOrDash(row.customer.country)} / ${valueOrDash(row.customer.city)})`,
                  `- Need: ${valueOrDash(row.productDescription)}`,
                  `- Quantity: ${valueOrDash(row.quantity)}`,
                  `- Destination: ${valueOrDash(row.destination)}`,
                  `- Current status: ${valueOrDash(row.status)}`,
                  `- Recommended next action: review missing details, then prepare customer clarification questions or a supplier brief depending on readiness.`,
              ].join("\n");
    }

    if (mode === "purchase_request_missing_info") {
        const list = missing.length ? missing : [isArabic ? "لا توجد فجوات واضحة، لكن يفضل تأكيد المواصفات النهائية مع العميل." : "No obvious gaps, but final specifications should still be confirmed with the customer."];
        return isArabic
            ? [`المعلومات الناقصة أو الضعيفة:`, ...list.map((item) => `- ${item}`), `\nأسئلة مقترحة:`, `- هل توجد مواصفات فنية أو معيار جودة محدد؟`, `- هل توجد متطلبات تغليف أو شهادات مطلوبة؟`, `- هل لدى العميل سعر مستهدف أو موعد توريد مفضل؟`].join("\n")
            : [`Missing or weak information:`, ...list.map((item) => `- ${item}`), `\nSuggested questions:`, `- Are there technical specifications or a target quality standard?`, `- Are packaging requirements or certificates required?`, `- Does the customer have a target price or preferred supply date?`].join("\n");
    }

    if (mode === "purchase_request_customer_reply") {
        const missingText = missing.length ? missing.join(", ") : isArabic ? "تأكيد المواصفات النهائية" : "final specification confirmation";
        return isArabic
            ? [
                  `عميلنا العزيز،`,
                  `شكراً لإرسال طلب الشراء رقم ${row.requestNumber}. بدأ فريق لوركس مراجعة الطلب بشكل مبدئي.`,
                  `حتى نتمكن من توجيه الطلب للموردين المناسبين بدقة، نحتاج إلى توضيح: ${missingText}.`,
                  `يرجى مشاركة أي صور أو روابط أو مواصفات إضافية متاحة. هذا الرد لا يتضمن وعداً بسعر نهائي أو موعد توريد نهائي، وسيقوم فريق لوركس بالمراجعة النهائية قبل أي التزام تشغيلي.`,
              ].join("\n\n")
            : [
                  `Dear ${row.customer.fullName || "Customer"},`,
                  `Thank you for submitting purchase request ${row.requestNumber}. The Lourex team has started the initial review.`,
                  `To route this request accurately to suitable suppliers, please clarify: ${missingText}.`,
                  `Please share any available images, links, or additional specifications. This draft does not promise a final price or delivery date; the Lourex team will complete the final review before any operational commitment.`,
              ].join("\n\n");
    }

    if (mode === "purchase_request_supplier_brief") {
        return isArabic
            ? [
                  `مسودة brief للمورد`,
                  `- المنتج: ${valueOrDash(row.productName)}`,
                  `- الوصف: ${valueOrDash(row.productDescription)}`,
                  `- المواصفات: ${valueOrDash(row.technicalSpecs)}`,
                  `- الكمية: ${valueOrDash(row.quantity)}`,
                  `- الوجهة: ${valueOrDash(row.destination)}`,
                  `- الشحن المفضل: ${valueOrDash(row.preferredShippingMethod)}`,
                  `- المادة/المقاس/اللون: ${valueOrDash(row.material)} / ${valueOrDash(row.sizeDimensions)} / ${valueOrDash(row.color)}`,
                  `- العلامة أو مستوى الجودة: ${valueOrDash(row.brand)} / ${valueOrDash(row.qualityLevel)}`,
                  `- مرفقات العميل: ${row.attachments.length}`,
                  `- أسئلة للمورد: تأكيد MOQ، مدة الإنتاج التقديرية، التغليف، الشهادات المطلوبة، وإمكانية توفير عينة إن لزم.`,
              ].join("\n")
            : [
                  `Supplier sourcing brief`,
                  `- Product: ${valueOrDash(row.productName)}`,
                  `- Description: ${valueOrDash(row.productDescription)}`,
                  `- Specifications: ${valueOrDash(row.technicalSpecs)}`,
                  `- Quantity: ${valueOrDash(row.quantity)}`,
                  `- Destination: ${valueOrDash(row.destination)}`,
                  `- Preferred shipping: ${valueOrDash(row.preferredShippingMethod)}`,
                  `- Material/size/color: ${valueOrDash(row.material)} / ${valueOrDash(row.sizeDimensions)} / ${valueOrDash(row.color)}`,
                  `- Brand or quality level: ${valueOrDash(row.brand)} / ${valueOrDash(row.qualityLevel)}`,
                  `- Customer attachments: ${row.attachments.length}`,
                  `- Supplier questions: confirm MOQ, estimated production lead time, packaging, required certificates, and sample availability if needed.`,
              ].join("\n");
    }

    return isArabic
        ? [`ملاحظات امتثال إرشادية:`, ...compliance.map((item) => `- ${item}`), `\nهذه الملاحظات إرشادية فقط. المراجعة النهائية للوثائق والمتطلبات التنظيمية تتم بواسطة فريق لوركس.`].join("\n")
        : [`Advisory compliance notes:`, ...compliance.map((item) => `- ${item}`), `\nThese notes are advisory only. Final documentation and regulatory review must be performed by the Lourex team.`].join("\n");
};

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
    ) {
        const message = (error as { message: string }).message.trim();
        if (message) return message;
    }

    return fallback;
}

export default function PurchaseRequestsPage() {
    const { locale, t, lang } = useI18n();
    const { profile } = useAuthSession();
    const isInternal = isInternalRole(profile?.role);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [rows, setRows] = useState<Awaited<ReturnType<typeof loadPurchaseRequests>>>([]);
    const [loading, setLoading] = useState(true);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
    const [actingOnProof, setActingOnProof] = useState(false);
    const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
    const [transferPaymentType, setTransferPaymentType] = useState<TransferPaymentType>("first_payment");
    const [transferReceivedAmount, setTransferReceivedAmount] = useState("");
    const [transferCurrency, setTransferCurrency] = useState("SAR");
    const [transferPaymentMethod, setTransferPaymentMethod] = useState("bank_transfer");
    const [transferReferenceNumber, setTransferReferenceNumber] = useState("");
    const [transferInternalNote, setTransferInternalNote] = useState("");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeFilter, setActiveFilter] = useState<"all" | PurchaseRequestStatus>("all");
    const [internalNotesDraft, setInternalNotesDraft] = useState("");
    const [loadError, setLoadError] = useState("");
    const [aiActionLoading, setAiActionLoading] = useState<PurchaseRequestAiMode | null>(null);
    const [aiOutput, setAiOutput] = useState("");
    const [aiOutputTitle, setAiOutputTitle] = useState("");
    const [aiUsedFallback, setAiUsedFallback] = useState(false);
    const initialLoadStartedRef = useRef(false);

    const selectedRequestIdFromParams = searchParams.get("request");
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(selectedRequestIdFromParams);
    const detailsPanelRef = useRef<HTMLDivElement>(null);
    const shouldRevealDetailsRef = useRef(false);

    const revealDetailsPanel = useCallback(() => {
        window.requestAnimationFrame(() => {
            const detailsPanel = detailsPanelRef.current;
            if (!detailsPanel) return;

            const rect = detailsPanel.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const safeTop = 80;
            const isAlreadyVisible = rect.top >= safeTop && rect.top <= viewportHeight * 0.7;

            if (!isAlreadyVisible) {
                detailsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }, []);

    const statusActions: Array<{ value: PurchaseRequestStatus; label: string }> = [
        { value: "under_review", label: t("requests.actions.under_review") },
        { value: "awaiting_clarification", label: t("requests.actions.awaiting_clarification") },
        { value: "ready_for_conversion", label: t("requests.actions.ready_for_conversion") },
    ];
    const actionLabels = {
        open: lang === "ar" ? "فتح" : "Open",
    };

    const transferPaymentLabels = {
        paymentType: lang === "ar" ? "نوع الدفعة" : "Payment type",
        firstPayment: lang === "ar" ? "دفعة أولى" : "First payment",
        secondPayment: lang === "ar" ? "دفعة ثانية" : "Second payment",
        fullPayment: lang === "ar" ? "مبلغ كامل" : "Full payment",
        receivedAmount: lang === "ar" ? "المبلغ المستلم" : "Received amount",
        currency: lang === "ar" ? "العملة" : "Currency",
        paymentMethod: lang === "ar" ? "طريقة الدفع" : "Payment method",
        transferReferenceNumber: lang === "ar" ? "رقم مرجع التحويل" : "Transfer reference number",
        internalNote: lang === "ar" ? "ملاحظة داخلية" : "Internal note",
        acceptAndRecord: lang === "ar" ? "قبول التحويل وتسجيله" : "Accept and record payment",
        bankTransfer: lang === "ar" ? "تحويل بنكي" : "Bank transfer",
        amountRequired:
            lang === "ar" ? "يجب إدخال مبلغ مستلم أكبر من صفر." : "Enter a received amount greater than zero.",
        typeRequired: lang === "ar" ? "يجب اختيار نوع الدفعة." : "Select a payment type.",
        accepted:
            lang === "ar"
                ? "تم قبول التحويل وتسجيل الدفعة محاسبياً"
                : "Transfer accepted and payment recorded",
    };

    const requestArchiveLabels = {
        cancel: lang === "ar" ? "إلغاء" : "Cancel",
        archive: lang === "ar" ? "أرشفة" : "Archive",
        cancelConfirm:
            lang === "ar"
                ? "هل تريد إلغاء هذا الطلب؟ سيبقى ظاهراً بحالة ملغاة."
                : "Cancel this request? It will remain visible with cancelled status.",
        archiveConfirm:
            lang === "ar"
                ? "هل تريد أرشفة هذا الطلب؟ سيختفي من القائمة النشطة مع حفظ سجله التشغيلي."
                : "Archive this request? It will disappear from the active list while preserving operational history.",
        cancelled: lang === "ar" ? "تم إلغاء الطلب." : "Request cancelled.",
        archived: lang === "ar" ? "تمت أرشفة الطلب." : "Request archived.",
    };

    const requestResubmitLabels = {
        resubmit: lang === "ar" ? "إعادة إرسال" : "Resubmit",
        confirm:
            lang === "ar"
                ? "هل تريد إنشاء طلب جديد بناء على بيانات هذا الطلب؟"
                : "Create a new request from this request's details?",
        unavailable:
            lang === "ar"
                ? "إعادة الإرسال متاحة فقط للطلبات الملغاة أو التي تنتظر التوضيح."
                : "Resubmit is only available for cancelled requests or requests awaiting clarification.",
        success:
            lang === "ar"
                ? "تمت إعادة إرسال الطلب كطلب جديد."
                : "Request resubmitted as a new request.",
        failed:
            lang === "ar"
                ? "تعذرت إعادة إرسال الطلب."
                : "Failed to resubmit request.",
    };

    const requestFilters: Array<{ key: "all" | PurchaseRequestStatus; label: string }> = [
        { key: "all", label: t("requests.filters.all") },
        { key: "intake_submitted", label: t("requests.filters.intake_submitted") },
        { key: "under_review", label: t("requests.filters.under_review") },
        { key: "awaiting_clarification", label: t("requests.filters.awaiting_clarification") },
        { key: "ready_for_conversion", label: t("requests.filters.ready_for_conversion") },
        { key: "transfer_proof_pending", label: t("requests.filters.transfer_proof_pending") },
        { key: "in_progress", label: t("requests.filters.in_progress") },
    ];

    const setSelectedRequest = useCallback(
        (requestId: string | null, revealDetails = false) => {
            shouldRevealDetailsRef.current = Boolean(requestId && revealDetails);
            setSelectedRequestId(requestId);
            const nextParams = new URLSearchParams(searchParams);

            if (requestId) {
                nextParams.set("request", requestId);
            } else {
                nextParams.delete("request");
            }

            setSearchParams(nextParams);

            if (requestId && revealDetails && requestId === selectedRequestId) {
                shouldRevealDetailsRef.current = false;
                revealDetailsPanel();
            }
        },
        [revealDetailsPanel, searchParams, selectedRequestId, setSearchParams],
    );

    useEffect(() => {
        setSelectedRequestId(selectedRequestIdFromParams);
    }, [selectedRequestIdFromParams]);

    const refresh = useCallback(
        async (preserveSelection = true) => {
            setLoading(true);
            setLoadError("");

            try {
                const data = await loadPurchaseRequests();
                setRows(data);

                if (!preserveSelection) {
                    const requestedRowExists =
                        selectedRequestId !== null && data.some((row) => row.id === selectedRequestId);
                    setSelectedRequest(requestedRowExists ? selectedRequestId : data[0]?.id ?? null);
                    return;
                }

                if (selectedRequestId && data.some((row) => row.id === selectedRequestId)) {
                    return;
                }

                setSelectedRequest(data[0]?.id ?? null);
            } catch (error: unknown) {
                const message = getErrorMessage(
                    error,
                    t("requests.toasts.loadError") || "Failed to load purchase requests",
                );
                setLoadError(message);
                toast.error(message);
            } finally {
                setLoading(false);
            }
        },
        [selectedRequestId, setSelectedRequest, t],
    );

    useEffect(() => {
        if (initialLoadStartedRef.current) {
            return;
        }

        initialLoadStartedRef.current = true;
        void refresh(false);
    }, [refresh]);

    const filteredRows = useMemo(() => {
        const normalized = deferredSearch.trim().toLowerCase();

        return rows.filter((row) => {
            const matchesFilter = activeFilter === "all" ? true : row.status === activeFilter;
            const matchesSearch =
                !normalized ||
                row.requestNumber.toLowerCase().includes(normalized) ||
                row.productName.toLowerCase().includes(normalized) ||
                row.customer.fullName.toLowerCase().includes(normalized) ||
                row.customer.email.toLowerCase().includes(normalized);

            return matchesFilter && matchesSearch;
        });
    }, [rows, deferredSearch, activeFilter]);

    const selectedRow = useMemo(() => {
        if (filteredRows.length === 0) {
            return null;
        }

        if (!selectedRequestId) {
            return filteredRows[0] || null;
        }

        return filteredRows.find((row) => row.id === selectedRequestId) || filteredRows[0] || null;
    }, [filteredRows, selectedRequestId]);

    useEffect(() => {
        if (!selectedRow || !shouldRevealDetailsRef.current) {
            return;
        }

        shouldRevealDetailsRef.current = false;
        revealDetailsPanel();
    }, [revealDetailsPanel, selectedRow]);

    useEffect(() => {
        setAiActionLoading(null);
        setAiOutput("");
        setAiOutputTitle("");
        setAiUsedFallback(false);

        if (!selectedRow) {
            setInternalNotesDraft("");
            setProofSignedUrl(null);
            return;
        }

        setInternalNotesDraft(selectedRow.internalNotes || "");
        setTransferPaymentType("first_payment");
        setTransferReceivedAmount("");
        setTransferCurrency("SAR");
        setTransferPaymentMethod("bank_transfer");
        setTransferReferenceNumber("");
        setTransferInternalNote("");

        if (selectedRow.transferProofUrl) {
            void getSignedUrl("DOCUMENTS", selectedRow.transferProofUrl).then((url) => setProofSignedUrl(url));
        } else {
            setProofSignedUrl(null);
        }
    }, [selectedRow]);

    const handleAiAction = async (mode: PurchaseRequestAiMode) => {
        if (!selectedRow || aiActionLoading) {
            return;
        }

        const outputTitle = getAiActionLabel(mode, lang);
        setAiActionLoading(mode);
        setAiOutputTitle(outputTitle);
        setAiOutput("");
        setAiUsedFallback(false);

        try {
            const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
                body: {
                    message: `${outputTitle} for internal purchase request ${selectedRow.requestNumber}`,
                    messages: [],
                    pageContext: "dashboard_purchase_requests",
                    route: window.location.pathname,
                    locale,
                    userRole: profile?.role,
                    analysisMode: mode,
                    requestContext: buildSafeAiRequestContext(selectedRow),
                },
            });

            if (error) {
                throw error;
            }

            const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
            if (!reply) {
                throw new Error("Empty AI response");
            }

            setAiOutput(reply);
        } catch (error: unknown) {
            logOperationalError("purchase_request_ai_review", error, {
                requestId: selectedRow.id,
                requestNumber: selectedRow.requestNumber,
                mode,
            });
            setAiUsedFallback(true);
            setAiOutput(buildLocalAiOutput(mode, selectedRow, lang));
        } finally {
            setAiActionLoading(null);
        }
    };

    const handleCopyAiOutput = async () => {
        if (!aiOutput) {
            return;
        }

        try {
            await navigator.clipboard.writeText(aiOutput);
            toast.success(lang === "ar" ? "تم نسخ مخرجات الذكاء الاصطناعي." : "AI output copied.");
        } catch (error: unknown) {
            logOperationalError("purchase_request_ai_copy", error, { requestId: selectedRow?.id });
            toast.error(lang === "ar" ? "تعذر نسخ النص." : "Could not copy AI output.");
        }
    };

    useEffect(() => {
        if (filteredRows.length === 0) {
            return;
        }

        const existsInFiltered = filteredRows.some((row) => row.id === selectedRequestId);
        if (!existsInFiltered) {
            setSelectedRequest(filteredRows[0].id);
        }
    }, [filteredRows, selectedRequestId, setSelectedRequest]);

    const requestMetrics = useMemo(
        () => ({
            total: rows.length,
            review: rows.filter(
                (row) =>
                    row.status === "under_review" ||
                    row.status === "ready_for_conversion" ||
                    row.status === "transfer_proof_pending",
            ).length,
            ready: rows.filter((row) => row.status === "ready_for_conversion").length,
            converted: rows.filter((row) => row.status === "in_progress" || row.status === "completed").length,
        }),
        [rows],
    );

    const handleStatusUpdate = async (requestId: string, status: PurchaseRequestStatus) => {
        if (updatingStatusId) return;
        const current = rows.find((row) => row.id === requestId);
        if (!current || !canTransitionPurchaseRequestStatus(current.status, status)) {
            toast.error(t("requests.toasts.statusError"));
            return;
        }

        setUpdatingStatusId(requestId);

        try {
            const { error } = await updatePurchaseRequestStatus(requestId, status, internalNotesDraft);
            if (error) {
                throw error;
            }

            toast.success(`${t("requests.toasts.statusUpdated")} ${current.requestNumber} → ${t(`statuses.${status}`)}`);
            await refresh();
            setSelectedRequest(requestId);
        } catch (error: unknown) {
            logOperationalError("purchase_request_status_update", error, { requestId, status });
            toast.error(getErrorMessage(error, t("requests.toasts.statusError")));
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleCancelRequest = async (row: PurchaseRequestRow) => {
        if (updatingStatusId) return;
        if (!window.confirm(requestArchiveLabels.cancelConfirm)) return;

        setUpdatingStatusId(row.id);

        try {
            const { error } = await updatePurchaseRequestStatus(row.id, "cancelled", internalNotesDraft);
            if (error) {
                throw error;
            }

            toast.success(`${requestArchiveLabels.cancelled} ${row.requestNumber}`);
            await refresh();
            setSelectedRequest(row.id);
        } catch (error: unknown) {
            logOperationalError("purchase_request_cancel", error, { requestId: row.id });
            toast.error(getErrorMessage(error, t("requests.toasts.statusError")));
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleResubmitRequest = async (row: PurchaseRequestRow) => {
        if (updatingStatusId) return;
        if (!canResubmitPurchaseRequest(row.status)) {
            toast.error(requestResubmitLabels.unavailable);
            return;
        }

        if (!window.confirm(requestResubmitLabels.confirm)) return;

        setUpdatingStatusId(row.id);

        try {
            const result = await resubmitPurchaseRequest(row.id);
            if (result.error) {
                throw new Error(result.error.message);
            }

            toast.success(`${requestResubmitLabels.success} ${row.requestNumber}`);
            const newRequestId = result.data?.id ?? null;
            await refresh(false);
            setSelectedRequest(newRequestId || row.id, Boolean(newRequestId));
        } catch (error: unknown) {
            logOperationalError("purchase_request_resubmit", error, { requestId: row.id });
            toast.error(getErrorMessage(error, requestResubmitLabels.failed));
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleArchiveRequest = async (row: PurchaseRequestRow) => {
        if (updatingStatusId) return;
        if (!window.confirm(requestArchiveLabels.archiveConfirm)) return;

        setUpdatingStatusId(row.id);

        try {
            await deletePurchaseRequestRecord(row.id);
            toast.success(`${requestArchiveLabels.archived} ${row.requestNumber}`);
            const remainingRows = rows.filter((current) => current.id !== row.id);
            const nextSelectedId = remainingRows[0]?.id ?? null;
            setSelectedRequest(nextSelectedId, Boolean(nextSelectedId));
            await refresh(false);
        } catch (error: unknown) {
            logOperationalError("purchase_request_archive", error, { requestId: row.id });
            toast.error(getErrorMessage(error, t("requests.toasts.statusError")));
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedRow) {
            return;
        }
        if (savingNotesId) return;

        setSavingNotesId(selectedRow.id);

        try {
            const { error } = await updatePurchaseRequestInternalNotes(selectedRow.id, internalNotesDraft);
            if (error) {
                throw error;
            }

            toast.success(`${t("requests.toasts.notesSaved")} ${selectedRow.requestNumber}`);
            await refresh();
            setSelectedRequest(selectedRow.id);
        } catch (error: unknown) {
            logOperationalError("purchase_request_notes_update", error, { requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("requests.toasts.notesError")));
        } finally {
            setSavingNotesId(null);
        }
    };

    const handleConvert = async () => {
        if (!selectedRow) {
            return;
        }
        if (convertingId) return;

        if (selectedRow.convertedDealNumber) {
            navigate(`/dashboard/deals?deal=${selectedRow.convertedDealNumber}`);
            return;
        }

        if (
            !canConvertPurchaseRequest({
                role: profile?.role,
                status: selectedRow.status,
                convertedDealNumber: selectedRow.convertedDealNumber,
            })
        ) {
            toast.error(t("requests.toasts.convertError"));
            return;
        }

        setConvertingId(selectedRow.id);

        try {
            const converted = await convertRequestToDeal(selectedRow, {
                operationalNotes: internalNotesDraft,
            });

            toast.success(
                t("requests.toasts.converted", {
                    request: selectedRow.requestNumber,
                    deal: converted.dealNumber,
                }),
            );
            trackEvent("deal_converted", {
                flow: "request_review",
                requestId: selectedRow.id,
                requestNumber: selectedRow.requestNumber,
                dealNumber: converted.dealNumber,
            });

            await refresh();
            navigate(`/dashboard/deals?deal=${converted.dealNumber}`);
        } catch (error: unknown) {
            logOperationalError("deal_convert", error, { flow: "request_review", requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("requests.toasts.convertError")));
        } finally {
            setConvertingId(null);
        }
    };

    const handleAcceptTransfer = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!selectedRow || actingOnProof) return;

        if (!transferPaymentType) {
            toast.error(transferPaymentLabels.typeRequired);
            return;
        }

        const amount = Number(transferReceivedAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(transferPaymentLabels.amountRequired);
            return;
        }

        setActingOnProof(true);

        try {
            const result = await acceptTransferProofWithPayment(selectedRow.id, {
                paymentType: transferPaymentType,
                amount,
                currency: transferCurrency.trim() || "SAR",
                paymentMethod: transferPaymentMethod.trim() || "bank_transfer",
                transferReferenceNumber: transferReferenceNumber.trim(),
                internalNote: transferInternalNote.trim(),
            });

            if (!result.success) {
                throw new Error(t("transferProof.acceptFailed"));
            }

            toast.success(transferPaymentLabels.accepted);
            await refresh();
            setSelectedRequest(selectedRow.id);
        } catch (error: unknown) {
            logOperationalError("transfer_proof_accept", error, { requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("transferProof.acceptFailed")));
        } finally {
            setActingOnProof(false);
        }
    };

    const handleRejectTransfer = async () => {
        if (!selectedRow || actingOnProof) return;
        const reason = window.prompt(t("transferProof.rejectionReason"));
        if (reason === null) return;

        setActingOnProof(true);

        try {
            const { error } = await rejectTransferProof(selectedRow.id, reason);
            if (error) {
                throw error;
            }

            toast.success(t("transferProof.rejected"));
            await refresh();
            setSelectedRequest(selectedRow.id);
        } catch (error: unknown) {
            logOperationalError("transfer_proof_reject", error, { requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("transferProof.rejectFailed")));
        } finally {
            setActingOnProof(false);
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04]" />
                ))}
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title={t("requests.emptyTitle")}
                description={t("requests.emptyDescription")}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <BentoCard className="space-y-5 rounded-[1.5rem] border-white/10 bg-white/[0.03]">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("requests.inboxEyebrow")}</p>
                        <h2 className="mt-2 font-serif text-2xl font-semibold">{t("requests.inboxTitle")}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("requests.inboxDescription")}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: t("requests.total"), value: requestMetrics.total },
                            { label: t("requests.review"), value: requestMetrics.review },
                            { label: t("requests.ready"), value: requestMetrics.ready },
                            { label: t("requests.converted"), value: requestMetrics.converted },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-colors hover:border-blue-400/25">
                                <p className="text-2xl font-bold text-white">{item.value}</p>
                                <p className="mt-1 text-xs text-slate-400">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t("requests.searchPlaceholder")}
                                className="h-10 rounded-xl border-white/10 bg-white/[0.04] ps-9"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={() => void refresh()}>
                                {t("common.refresh")}
                            </Button>
                            {requestFilters.map((filter) => (
                                <Button
                                    key={filter.key}
                                    variant={activeFilter === filter.key ? "gold" : "outline"}
                                    size="sm"
                                    className="h-10 rounded-xl"
                                    onClick={() => setActiveFilter(filter.key)}
                                >
                                    <Filter className="me-2 h-4 w-4" />
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {loadError ? (
                        <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
                            {loadError}
                        </div>
                    ) : null}

                    {filteredRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6">
                            <EmptyState
                                icon={ClipboardList}
                                title={t("requests.emptyFilteredTitle")}
                                description={t("requests.emptyFilteredDescription")}
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRows.map((row) => {
                                const isSelected = selectedRow?.id === row.id;
                                const isBusy = updatingStatusId === row.id;
                                const canCancel = canTransitionPurchaseRequestStatus(row.status, "cancelled");
                                const canResubmit = canResubmitPurchaseRequest(row.status);

                                return (
                                    <div
                                        key={row.id}
                                        className={`rounded-[1.35rem] border transition-colors ${
                                            isSelected
                                                ? "border-blue-400/40 bg-blue-500/10 shadow-[0_18px_46px_-34px_rgba(59,130,246,0.9)]"
                                                : "border-white/10 bg-white/[0.03] hover:border-blue-400/25 hover:bg-blue-500/5"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRequest(row.id, true)}
                                            className="w-full px-4 py-4 text-start"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                                                    {row.requestNumber}
                                                </p>
                                                <p className="mt-2 truncate text-base font-semibold text-foreground">
                                                    {row.productName || t("requests.genericRequest")}
                                                </p>
                                                <p className="mt-1 truncate text-sm text-muted-foreground">{row.customer.fullName}</p>
                                            </div>

                                            <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(row.status)}`}>
                        {t(`statuses.${row.status}`)}
                      </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span>{t("requests.attachmentsCount", { count: row.attachments.length })}</span>
                                            <span>•</span>
                                            <span>{new Date(row.createdAt).toLocaleDateString(locale)}</span>
                                        </div>
                                        </button>

                                        <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg border-white/10 bg-white/[0.03] px-2.5 text-xs hover:border-blue-400/35 hover:bg-blue-500/10"
                                                onClick={() => setSelectedRequest(row.id, true)}
                                            >
                                                <Eye className="me-1.5 h-3.5 w-3.5" />
                                                {actionLabels.open}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg border-amber-400/25 bg-amber-400/10 px-2.5 text-xs text-amber-100 hover:bg-amber-400/15"
                                                disabled={isBusy || !canResubmit}
                                                onClick={() => void handleResubmitRequest(row)}
                                                title={!canResubmit ? requestResubmitLabels.unavailable : undefined}
                                            >
                                                <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                                                {requestResubmitLabels.resubmit}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg border-slate-500/25 bg-slate-500/10 px-2.5 text-xs text-slate-200 hover:bg-slate-500/15"
                                                disabled={isBusy || !canCancel}
                                                onClick={() => void handleCancelRequest(row)}
                                            >
                                                {isBusy ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Ban className="me-1.5 h-3.5 w-3.5" />}
                                                {requestArchiveLabels.cancel}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg border-rose-400/25 bg-rose-500/10 px-2.5 text-xs text-rose-100 hover:bg-rose-500/15"
                                                disabled={isBusy}
                                                onClick={() => void handleArchiveRequest(row)}
                                            >
                                                <Archive className="me-1.5 h-3.5 w-3.5" />
                                                {requestArchiveLabels.archive}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </BentoCard>

                {selectedRow ? (
                    <BentoCard
                        ref={detailsPanelRef}
                        className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.5rem] border-blue-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(6,17,31,0.9))] p-0 xl:self-start"
                    >
                        <div className="border-b border-white/10 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-blue-200">
                                        {selectedRow.requestNumber}
                                    </p>
                                    <h2 className="mt-2 font-serif text-3xl font-semibold text-white">
                                        {selectedRow.productName || t("requests.genericRequest")}
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-400">
                                        {selectedRow.customer.fullName} • {selectedRow.customer.email}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {isInternal && selectedRow.convertedDealNumber ? (
                                        <Button variant="outline" asChild>
                                            <Link to={`/dashboard/deals?deal=${selectedRow.convertedDealNumber}`}>
                                                <Eye className="me-2 h-4 w-4" />
                                                {t("requests.openDeal")}
                                            </Link>
                                        </Button>
                                    ) : null}

                                    {isInternal && (
                                        <Button
                                            variant="gold"
                                            disabled={
                                                convertingId === selectedRow.id ||
                                                (!selectedRow.convertedDealNumber &&
                                                    !canConvertPurchaseRequest({
                                                        role: profile?.role,
                                                        status: selectedRow.status,
                                                        convertedDealNumber: selectedRow.convertedDealNumber,
                                                    }))
                                            }
                                            onClick={handleConvert}
                                        >
                                            {convertingId === selectedRow.id ? (
                                                <>
                                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                                    {t("requests.converting")}
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRightLeft className="me-2 h-4 w-4" />
                                                    {selectedRow.convertedDealNumber ? t("requests.goToDeal") : t("requests.convert")}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {(() => {
                                    return (
                                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(selectedRow.status)}`}>
            {t(`statuses.${selectedRow.status}`)}
        </span>
                                    );
                                })()}

                                {selectedRow.convertedDealNumber ? (
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {t("requests.linkedDeal", { deal: selectedRow.convertedDealNumber })}
                  </span>
                                ) : null}

                                {selectedRow.isLegacyFallback ? (
                                    <span className="rounded-full bg-secondary/25 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t("requests.legacy")}
                  </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid gap-0 xl:grid-cols-[1.02fr_0.98fr]">
                            <div className="border-b border-border/50 p-6 xl:border-b-0 xl:border-e">
                                <div className="space-y-5">
                                    <div>
                                        <p className="text-sm leading-7 text-muted-foreground">
                                            {selectedRow.productDescription || t("requests.noDescription")}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        {[
                                            { label: t("requests.labels.customer"), value: selectedRow.customer.fullName },
                                            { label: t("requests.labels.email"), value: selectedRow.customer.email },
                                            { label: t("requests.labels.phone"), value: selectedRow.customer.phone || t("requests.noPhone") },
                                            {
                                                label: t("requests.labels.location"),
                                                value: `${selectedRow.customer.country || "—"} / ${selectedRow.customer.city || "—"}`,
                                            },
                                            { label: t("requests.labels.trackingCode"), value: selectedRow.trackingCode || "—" },
                                            { label: t("requests.labels.quantity"), value: String(selectedRow.quantity || "—") },
                                            { label: t("requests.labels.shipping"), value: selectedRow.preferredShippingMethod || "—" },
                                            { label: t("requests.labels.destination"), value: selectedRow.destination || "—" },
                                            { label: t("requests.labels.expectedDate"), value: selectedRow.expectedSupplyDate || "—" },
                                            { label: t("requests.labels.weight"), value: selectedRow.weight || "—" },
                                            { label: t("requests.labels.brand"), value: selectedRow.brand || "—" },
                                            { label: t("requests.labels.qualityLevel"), value: selectedRow.qualityLevel || "—" },
                                            { label: t("requests.labels.manufacturingCountry"), value: selectedRow.manufacturingCountry || "—" },
                                            {
                                                label: t("requests.labels.sourcingType"),
                                                value: selectedRow.isFullSourcing
                                                    ? t("requests.labels.fullSourcing")
                                                    : t("requests.labels.shippingOnly"),
                                            },
                                            {
                                                label: t("requests.labels.product"),
                                                value: selectedRow.isReadyMade
                                                    ? t("requests.labels.readyMade")
                                                    : t("requests.labels.manufacturing"),
                                            },
                                            {
                                                label: t("requests.labels.hasSample"),
                                                value: selectedRow.hasPreviousSample ? t("common.yes") : t("common.no"),
                                            },
                                            { label: t("requests.labels.size"), value: selectedRow.sizeDimensions || "—" },
                                            { label: t("requests.labels.material"), value: selectedRow.material || "—" },
                                            { label: t("requests.labels.color"), value: selectedRow.color || "—" },
                                            { label: t("requests.labels.reference"), value: selectedRow.referenceLink || t("requests.noReference") },
                                        ].map((item) => (
                                            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                <p className="text-xs text-slate-400">{item.label}</p>
                                                <p className="mt-1 break-words text-sm font-medium text-white">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            <p className="font-medium">{t("requests.labels.technicalSpecs")}</p>
                                        </div>
                                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                            {selectedRow.technicalSpecs || t("requests.noSpecs")}
                                        </p>
                                    </div>

                                    <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <FileImage className="h-4 w-4 text-primary" />
                                            <p className="font-medium">{t("requests.labels.attachments")}</p>
                                        </div>

                                        {selectedRow.attachments.length === 0 ? (
                                            <p className="mt-3 text-sm text-muted-foreground">{t("requests.noAttachments")}</p>
                                        ) : (
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                {selectedRow.attachments.map((attachment) => (
                                                    <a
                                                        key={attachment.id}
                                                        href={attachment.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 transition-colors hover:border-primary/25"
                                                    >
                                                        <p className="break-words font-medium">{attachment.fileName}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">{attachment.category}</p>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isInternal && (
                                <div className="p-6">
                                    <div className="space-y-5">
                                        {selectedRow.status === "transfer_proof_pending" && (
                                            <div className="rounded-[1.35rem] border border-primary/20 bg-primary/5 p-6">
                                                <div className="flex items-center gap-3">
                                                    <FileImage className="h-5 w-5 text-primary" />
                                                    <h3 className="text-lg font-semibold">{t("transferProof.title")}</h3>
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">{t("transferProof.description")}</p>

                                                {proofSignedUrl && (
                                                    <div className="mt-4">
                                                        <a
                                                            href={proofSignedUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {selectedRow.transferProofName || "View Proof"}
                                                        </a>
                                                    </div>
                                                )}

                                                <form className="mt-6 space-y-4" onSubmit={handleAcceptTransfer}>
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <label className="space-y-1.5 text-sm">
                                                            <span className="text-muted-foreground">{transferPaymentLabels.paymentType}</span>
                                                            <select
                                                                value={transferPaymentType}
                                                                onChange={(event) => setTransferPaymentType(event.target.value as TransferPaymentType)}
                                                                disabled={actingOnProof}
                                                                className="h-10 w-full rounded-xl border border-white/10 bg-background px-3 text-sm text-foreground"
                                                            >
                                                                <option value="first_payment">{transferPaymentLabels.firstPayment}</option>
                                                                <option value="second_payment">{transferPaymentLabels.secondPayment}</option>
                                                                <option value="full_payment">{transferPaymentLabels.fullPayment}</option>
                                                            </select>
                                                        </label>
                                                        <label className="space-y-1.5 text-sm">
                                                            <span className="text-muted-foreground">{transferPaymentLabels.receivedAmount}</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={transferReceivedAmount}
                                                                onChange={(event) => setTransferReceivedAmount(event.target.value)}
                                                                disabled={actingOnProof}
                                                            />
                                                        </label>
                                                        <label className="space-y-1.5 text-sm">
                                                            <span className="text-muted-foreground">{transferPaymentLabels.currency}</span>
                                                            <Input
                                                                value={transferCurrency}
                                                                onChange={(event) => setTransferCurrency(event.target.value)}
                                                                disabled={actingOnProof}
                                                            />
                                                        </label>
                                                        <label className="space-y-1.5 text-sm">
                                                            <span className="text-muted-foreground">{transferPaymentLabels.paymentMethod}</span>
                                                            <Input
                                                                value={transferPaymentMethod}
                                                                onChange={(event) => setTransferPaymentMethod(event.target.value)}
                                                                disabled={actingOnProof}
                                                                placeholder={transferPaymentLabels.bankTransfer}
                                                            />
                                                        </label>
                                                        <label className="space-y-1.5 text-sm md:col-span-2">
                                                            <span className="text-muted-foreground">{transferPaymentLabels.transferReferenceNumber}</span>
                                                            <Input
                                                                value={transferReferenceNumber}
                                                                onChange={(event) => setTransferReferenceNumber(event.target.value)}
                                                                disabled={actingOnProof}
                                                            />
                                                        </label>
                                                        <label className="space-y-1.5 text-sm md:col-span-2">
                                                            <span className="text-muted-foreground">{transferPaymentLabels.internalNote}</span>
                                                            <Textarea
                                                                value={transferInternalNote}
                                                                onChange={(event) => setTransferInternalNote(event.target.value)}
                                                                disabled={actingOnProof}
                                                                rows={3}
                                                            />
                                                        </label>
                                                    </div>

                                                    <div className="flex flex-wrap gap-3">
                                                        <Button
                                                            type="submit"
                                                            disabled={actingOnProof}
                                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                        >
                                                            {actingOnProof ? (
                                                                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="me-2 h-4 w-4" />
                                                            )}
                                                            {transferPaymentLabels.acceptAndRecord}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleRejectTransfer}
                                                            disabled={actingOnProof}
                                                            className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                                                        >
                                                            <MessageSquareWarning className="me-2 h-4 w-4" />
                                                            {t("requests.actions.rejectTransfer")}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}

                                        {selectedRow.status === "transfer_proof_rejected" && (
                                            <div className="rounded-[1.35rem] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
                                                <p className="font-bold">{t("transferProof.rejected")}</p>
                                                <p className="mt-1 text-sm">
                                                    {t("transferProof.rejectionReason")} {selectedRow.transferRejectionReason}
                                                </p>
                                            </div>
                                        )}

                                        <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
                                            {t("requests.reviewPanel")}
                                        </div>

                                        <div className="rounded-[1.35rem] border border-primary/25 bg-[#080808] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                                                            <Sparkles className="h-4 w-4" />
                                                        </span>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-[0.18em] text-primary">
                                                                {lang === "ar"
                                                                    ? "مساعد LOUREX AI لمراجعة الطلب"
                                                                    : "LOUREX AI Review Assistant"}
                                                            </p>
                                                            <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                                {lang === "ar"
                                                                    ? "مخرجات الذكاء الاصطناعي إرشادية فقط، والمراجعة النهائية تتم بواسطة فريق لوركس."
                                                                    : "AI output is advisory. Final review must be performed by the Lourex team."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {aiOutput ? (
                                                    <Button variant="outline" size="sm" onClick={() => void handleCopyAiOutput()}>
                                                        <Copy className="me-2 h-4 w-4" />
                                                        {lang === "ar" ? "نسخ" : "Copy"}
                                                    </Button>
                                                ) : null}
                                            </div>

                                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                                {purchaseRequestAiActions.map((action) => {
                                                    const isLoading = aiActionLoading === action.mode;

                                                    return (
                                                        <Button
                                                            key={action.mode}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="justify-start border-primary/25 bg-[#111111] text-start text-foreground hover:border-primary/45 hover:bg-primary/10"
                                                            disabled={Boolean(aiActionLoading)}
                                                            onClick={() => void handleAiAction(action.mode)}
                                                        >
                                                            {isLoading ? (
                                                                <Loader2 className="me-2 h-4 w-4 shrink-0 animate-spin text-primary" />
                                                            ) : (
                                                                <Sparkles className="me-2 h-4 w-4 shrink-0 text-primary" />
                                                            )}
                                                            <span className="truncate">
                                                                {lang === "ar" ? action.labelAr : action.label}
                                                            </span>
                                                        </Button>
                                                    );
                                                })}
                                            </div>

                                            {aiUsedFallback ? (
                                                <div className="mt-4 rounded-[1rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
                                                    {lang === "ar"
                                                        ? "مساعد LOUREX AI غير متاح الآن. تم إنشاء مسودة إرشادية محلية بدلاً من ذلك."
                                                        : "LOUREX AI is unavailable right now. A local advisory draft was generated instead."}
                                                </div>
                                            ) : null}

                                            {aiOutput ? (
                                                <div className="mt-4 rounded-[1rem] border border-primary/20 bg-[#111111] p-4">
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-primary">{aiOutputTitle}</p>
                                                        <span className="rounded-full border border-primary/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                                                            {lang === "ar" ? "إرشادي" : "Advisory"}
                                                        </span>
                                                    </div>
                                                    <pre className="max-h-[24rem] whitespace-pre-wrap break-words font-sans text-sm leading-7 text-foreground">{aiOutput}</pre>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                                            <div className="flex items-center gap-3">
                                                <StickyNote className="h-4 w-4 text-primary" />
                                                <p className="font-medium">{t("requests.labels.internalNotes")}</p>
                                            </div>

                                            <Textarea
                                                rows={8}
                                                value={internalNotesDraft}
                                                onChange={(event) => setInternalNotesDraft(event.target.value)}
                                                className="mt-4"
                                                placeholder={t("requests.notesPlaceholder")}
                                            />

                                            <Button
                                                className="mt-4"
                                                variant="outline"
                                                onClick={handleSaveNotes}
                                                disabled={savingNotesId === selectedRow.id}
                                            >
                                                {savingNotesId === selectedRow.id ? (
                                                    <>
                                                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                                        {t("requests.savingNotes")}
                                                    </>
                                                ) : (
                                                    t("requests.saveNotes")
                                                )}
                                            </Button>
                                        </div>

                                        {!selectedRow.convertedDealNumber ? (
                                            <div className="grid gap-3">
                                                {statusActions.map((action) => (
                                                    <Button
                                                        key={action.value}
                                                        variant={selectedRow.status === action.value ? "gold" : "outline"}
                                                        disabled={
                                                            updatingStatusId === selectedRow.id ||
                                                            selectedRow.status === action.value ||
                                                            Boolean(selectedRow.isLegacyFallback) ||
                                                            !canTransitionPurchaseRequestStatus(selectedRow.status, action.value)
                                                        }
                                                        onClick={() => handleStatusUpdate(selectedRow.id, action.value)}
                                                    >
                                                        {updatingStatusId === selectedRow.id && selectedRow.status !== action.value ? (
                                                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                                        ) : action.value === "ready_for_conversion" ? (
                                                            <CheckCircle2 className="me-2 h-4 w-4" />
                                                        ) : (
                                                            <MessageSquareWarning className="me-2 h-4 w-4" />
                                                        )}
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
                                                {t("requests.convertedHint")}
                                            </div>
                                        )}

                                        <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4 text-sm">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="h-4 w-4 text-primary" />
                                                <p className="font-medium">{t("requests.labels.reviewHistory")}</p>
                                            </div>

                                            <p className="mt-2 text-muted-foreground">
                                                {t("requests.receivedAt", {
                                                    value: new Date(selectedRow.createdAt).toLocaleString(locale),
                                                })}
                                            </p>

                                            <p className="mt-1 text-muted-foreground">
                                                {selectedRow.reviewedAt
                                                    ? t("requests.reviewedAt", {
                                                        value: new Date(selectedRow.reviewedAt).toLocaleString(locale),
                                                    })
                                                    : t("requests.noReviewYet")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </BentoCard>
                ) : (
                    <EmptyState
                        icon={ClipboardList}
                        title={t("requests.emptyFilteredTitle")}
                        description={t("requests.emptyFilteredDescription")}
                    />
                )}
            </div>
        </div>
    );
}
