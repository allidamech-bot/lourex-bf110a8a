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
    requestPurchaseRequestClarification,
    updatePurchaseRequestInternalNotes,
    updatePurchaseRequestStatus,
} from "@/lib/operationsDomain";
import type { PurchaseRequestStatus } from "@/types/lourex";
import { isInternalRole } from "@/features/auth/rbac";
import { canConvertPurchaseRequest, canTransitionPurchaseRequestStatus } from "@/domain/operations/guards";
import { resubmitPurchaseRequest } from "@/domain/operations/service";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import { getSignedUrl } from "@/lib/storage";
import { getAiReplyText, invokeLourexAi } from "@/lib/aiClient";
import { revealActiveSection, setStableSearchParam } from "@/lib/activeNavigation";
import { SmartPurchaseRequestPanel } from "@/features/purchase-requests/components/SmartPurchaseRequestPanel";
import { OfficialOrderConversationBox } from "@/components/OfficialOrderConversationBox";
import { OrderFollowupTimeline } from "@/components/OrderFollowupTimeline";

type PurchaseRequests = Awaited<ReturnType<typeof loadPurchaseRequests>>;
type PurchaseRequestRow = PurchaseRequests[number];
type TransferPaymentType = "first_payment" | "second_payment" | "full_payment";
type PurchaseRequestAiMode =
    | "purchase_request_analysis"
    | "purchase_request_summary"
    | "missing_information_checklist"
    | "purchase_request_missing_info"
    | "customer_reply_draft"
    | "purchase_request_customer_reply"
    | "supplier_brief"
    | "purchase_request_supplier_brief"
    | "purchase_request_compliance_notes"
    | "purchase_request_risk_review";

const purchaseRequestAiActions: Array<{
    mode: PurchaseRequestAiMode;
    label: string;
    labelAr: string;
}> = [
    { mode: "purchase_request_analysis", label: "Readiness Analysis", labelAr: "تحليل الجاهزية" },
    { mode: "purchase_request_summary", label: "AI Summary", labelAr: "ملخص ذكي" },
    { mode: "missing_information_checklist", label: "Missing Info", labelAr: "المعلومات الناقصة" },
    { mode: "customer_reply_draft", label: "Customer Reply Draft", labelAr: "مسودة رد للعميل" },
    { mode: "supplier_brief", label: "Supplier Brief", labelAr: "مسودة للمورد" },
    { mode: "purchase_request_compliance_notes", label: "Compliance Notes", labelAr: "ملاحظات الامتثال" },
    { mode: "purchase_request_risk_review", label: "RFQ Risk Review", labelAr: "مراجعة مخاطر RFQ" },
];

const getAiActionLabel = (mode: PurchaseRequestAiMode, lang: string) =>
    purchaseRequestAiActions.find((action) => action.mode === mode)?.[lang === "ar" ? "labelAr" : "label"] ||
    purchaseRequestAiActions[0].label;

const normalizePurchaseRequestAiMode = (mode: PurchaseRequestAiMode): PurchaseRequestAiMode => {
    if (mode === "missing_information_checklist") return "purchase_request_missing_info";
    if (mode === "customer_reply_draft") return "purchase_request_customer_reply";
    if (mode === "supplier_brief") return "purchase_request_supplier_brief";
    return mode;
};

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
    cancelled: "border-slate-400/40 bg-slate-500/20 text-slate-100 ring-1 ring-slate-400/20",
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
    const normalizedMode = normalizePurchaseRequestAiMode(mode);
    const missing = findMissingRequestInfo(row, lang);
    const compliance = inferComplianceNotes(row, lang);
    const isArabic = lang === "ar";

    if (normalizedMode === "purchase_request_analysis") {
        const readinessScore = Math.max(0, Math.min(100, 100 - missing.length * 10));
        return isArabic
            ? [
                  `تحليل جاهزية الطلب ${row.requestNumber}`,
                  `- درجة الجاهزية: ${readinessScore}/100`,
                  `- الحقول الناقصة: ${missing.length ? missing.join("، ") : "لا توجد فجوات واضحة"}`,
                  `- أسئلة مقترحة للعميل: تأكيد المواصفات الفنية، التغليف، الشهادات المطلوبة، والسعر المستهدف إن وجد.`,
                  `- موجز للمورد: المنتج ${valueOrDash(row.productName)}، الكمية ${valueOrDash(row.quantity)}، الوجهة ${valueOrDash(row.destination)}، والمرفقات ${row.attachments.length}.`,
                  `- ملاحظات مخاطر: ${compliance[0]}`,
                  `- هذا التحليل إرشادي فقط ولا يعتمد أو يغير حالة الطلب.`,
              ].join("\n")
            : [
                  `Readiness analysis for ${row.requestNumber}`,
                  `- Readiness score: ${readinessScore}/100`,
                  `- Missing fields: ${missing.length ? missing.join(", ") : "No obvious gaps"}`,
                  `- Suggested customer questions: confirm technical specs, packaging, required certificates, and target price if available.`,
                  `- Supplier brief seed: product ${valueOrDash(row.productName)}, quantity ${valueOrDash(row.quantity)}, destination ${valueOrDash(row.destination)}, attachments ${row.attachments.length}.`,
                  `- Risk notes: ${compliance[0]}`,
                  `- This is advisory only and does not approve or change the request status.`,
              ].join("\n");
    }

    if (normalizedMode === "purchase_request_summary") {
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

    if (normalizedMode === "purchase_request_missing_info") {
        const list = missing.length ? missing : [isArabic ? "لا توجد فجوات واضحة، لكن يفضل تأكيد المواصفات النهائية مع العميل." : "No obvious gaps, but final specifications should still be confirmed with the customer."];
        return isArabic
            ? [`المعلومات الناقصة أو الضعيفة:`, ...list.map((item) => `- ${item}`), `\nأسئلة مقترحة:`, `- هل توجد مواصفات فنية أو معيار جودة محدد؟`, `- هل توجد متطلبات تغليف أو شهادات مطلوبة؟`, `- هل لدى العميل سعر مستهدف أو موعد توريد مفضل؟`].join("\n")
            : [`Missing or weak information:`, ...list.map((item) => `- ${item}`), `\nSuggested questions:`, `- Are there technical specifications or a target quality standard?`, `- Are packaging requirements or certificates required?`, `- Does the customer have a target price or preferred supply date?`].join("\n");
    }

    if (normalizedMode === "purchase_request_customer_reply") {
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

    if (normalizedMode === "purchase_request_supplier_brief") {
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

function isAiQuotaError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const status = (error as { status?: unknown }).status;
    const message = (error as { message?: unknown }).message;

    return status === 402 || (typeof message === "string" && message.includes("402"));
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
    const [clarificationDraft, setClarificationDraft] = useState("");
    const [clarificationBusy, setClarificationBusy] = useState(false);
    const initialLoadStartedRef = useRef(false);

    const selectedRequestIdFromParams = searchParams.get("request");
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(selectedRequestIdFromParams);
    const detailsPanelRef = useRef<HTMLDivElement>(null);
    const shouldRevealDetailsRef = useRef(false);

    const revealDetailsPanel = useCallback(() => {
        revealActiveSection(detailsPanelRef.current, { force: true, focus: true });
    }, []);

    const statusActions: Array<{ value: PurchaseRequestStatus; label: string }> = [
        { value: "under_review", label: t("requests.actions.under_review") },
        { value: "awaiting_clarification", label: t("requests.actions.awaiting_clarification") },
        { value: "ready_for_conversion", label: t("requests.actions.ready_for_conversion") },
    ];
    const actionLabels = {
        open: t("requests.dashboardActions.open"),
    };

    const transferPaymentLabels = {
        paymentType: t("requests.transferProof.paymentType"),
        firstPayment: t("requests.transferProof.firstPayment"),
        secondPayment: t("requests.transferProof.secondPayment"),
        fullPayment: t("requests.transferProof.fullPayment"),
        receivedAmount: t("requests.transferProof.receivedAmount"),
        currency: t("requests.transferProof.currency"),
        paymentMethod: t("requests.transferProof.paymentMethod"),
        transferReferenceNumber: t("requests.transferProof.transferReferenceNumber"),
        internalNote: t("requests.transferProof.internalNote"),
        acceptAndRecord: t("requests.transferProof.acceptAndRecord"),
        bankTransfer: t("requests.transferProof.bankTransfer"),
        amountRequired: t("requests.transferProof.amountRequired"),
        typeRequired: t("requests.transferProof.typeRequired"),
        accepted: t("requests.transferProof.paymentRecorded"),
    };

    const requestArchiveLabels = {
        cancel: t("requests.dashboardActions.cancel"),
        archive: t("requests.dashboardActions.archive"),
        cancelConfirm: t("requests.dashboardActions.cancelConfirm"),
        archiveConfirm: t("requests.dashboardActions.archiveConfirm"),
        cancelled: t("requests.dashboardActions.cancelled"),
        archived: t("requests.dashboardActions.archived"),
    };

    const requestResubmitLabels = {
        resubmit: t("requests.dashboardActions.resubmit"),
        confirm: t("requests.dashboardActions.resubmitConfirm"),
        unavailable: t("requests.dashboardActions.resubmitUnavailable"),
        success: t("requests.dashboardActions.resubmitted"),
        failed: t("requests.dashboardActions.resubmitFailed"),
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
        (requestId: string | null, revealDetails = false, replace = false) => {
            shouldRevealDetailsRef.current = Boolean(requestId && revealDetails);
            setSelectedRequestId(requestId);
            setSearchParams(setStableSearchParam(searchParams, "request", requestId), { replace });

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
                    setSelectedRequest(requestedRowExists ? selectedRequestId : data[0]?.id ?? null, false, true);
                    return;
                }

                if (selectedRequestId && data.some((row) => row.id === selectedRequestId)) {
                    return;
                }

                setSelectedRequest(data[0]?.id ?? null, false, true);
            } catch (error: unknown) {
                const message = getErrorMessage(error, t("requests.toasts.loadError"));
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
        setClarificationDraft("");
        setTransferPaymentType("first_payment");
        setTransferReceivedAmount("");
        setTransferCurrency("SAR");
        setTransferPaymentMethod("bank_transfer");
        setTransferReferenceNumber("");
        setTransferInternalNote("");

        if (selectedRow.transferProofUrl) {
            void getSignedUrl("TRANSFER_PROOFS", selectedRow.transferProofUrl)
                .catch(() => getSignedUrl("DOCUMENTS", selectedRow.transferProofUrl))
                .then((url) => setProofSignedUrl(url))
                .catch(() => setProofSignedUrl(null));
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
            const responseLanguage = lang === "ar" ? "Arabic" : "English";
            const { data, error } = await invokeLourexAi({
                lang,
                area: "purchase_request_ai_review",
                context: {
                    requestId: selectedRow.id,
                    requestNumber: selectedRow.requestNumber,
                    mode,
                },
                body: {
                    message:
                        lang === "ar"
                            ? `${outputTitle} لطلب الشراء الداخلي ${selectedRow.requestNumber}. أجب باللغة العربية فقط.`
                            : `${outputTitle} for internal purchase request ${selectedRow.requestNumber}. Respond in English only.`,
                    messages: [],
                    pageContext: "dashboard_purchase_requests",
                    route: window.location.pathname,
                    locale,
                    language: lang,
                    responseLanguage,
                    languageInstruction: `Respond in ${responseLanguage} only.`,
                    userRole: profile?.role,
                    analysisMode: mode,
                    requestContext: buildSafeAiRequestContext(selectedRow),
                },
            });

            if (error) {
                throw error;
            }

            const reply = getAiReplyText(data);
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
            
            const isQuotaError = isAiQuotaError(error);
            setAiUsedFallback(true);
            setAiOutput(buildLocalAiOutput(mode, selectedRow, lang));
            
            if (isQuotaError) {
                toast.error(lang === "ar" ? "انتهت حصة الذكاء الاصطناعي حالياً. تم استخدام المحلل المحلي." : "AI quota exceeded. Local analyzer used instead.");
            }
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
            toast.success(t("requests.ai.copySuccess"));
        } catch (error: unknown) {
            logOperationalError("purchase_request_ai_copy", error, { requestId: selectedRow?.id });
            toast.error(t("requests.ai.copyError"));
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
            const { error } = await updatePurchaseRequestStatus(requestId, status, internalNotesDraft, lang);
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

    const handleSmartClarificationRequest = async () => {
        if (!selectedRow || clarificationBusy || !clarificationDraft.trim()) {
            return;
        }

        setClarificationBusy(true);

        try {
            const { error } = await requestPurchaseRequestClarification(selectedRow.id, clarificationDraft);
            if (error) {
                throw error;
            }

            toast.success(t("requests.smart.clarificationSent"));
            setClarificationDraft("");
            await refresh();
            setSelectedRequest(selectedRow.id);
        } catch (error: unknown) {
            logOperationalError("purchase_request_smart_clarification", error, { requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("requests.smart.clarificationError")));
        } finally {
            setClarificationBusy(false);
        }
    };

    const handleSmartReadyForSourcing = async () => {
        if (!selectedRow) {
            return;
        }

        await handleStatusUpdate(selectedRow.id, "ready_for_conversion");
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
                throw new Error(t("requests.transferProof.acceptFailed"));
            }

            toast.success(transferPaymentLabels.accepted);
            await refresh();
            setSelectedRequest(selectedRow.id);
        } catch (error: unknown) {
            logOperationalError("transfer_proof_accept", error, { requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("requests.transferProof.acceptFailed")));
        } finally {
            setActingOnProof(false);
        }
    };

    const handleRejectTransfer = async () => {
        if (!selectedRow || actingOnProof) return;
        const reason = window.prompt(t("requests.transferProof.rejectionReason"));
        if (reason === null) return;

        setActingOnProof(true);

        try {
            const { error } = await rejectTransferProof(selectedRow.id, reason);
            if (error) {
                throw error;
            }

            toast.success(t("requests.transferProof.rejected"));
            await refresh();
            setSelectedRequest(selectedRow.id);
        } catch (error: unknown) {
            logOperationalError("transfer_proof_reject", error, { requestId: selectedRow.id });
            toast.error(getErrorMessage(error, t("requests.transferProof.rejectFailed")));
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
        <div className="w-full max-w-full min-w-0 space-y-4">
            <PageHelpBox pageKey="purchase_requests" role={profile?.role} />
            <div className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-[minmax(24rem,0.82fr)_minmax(0,1.18fr)]">
                <BentoCard className="space-y-5 rounded-[1.5rem] border-white/10 bg-white/[0.03]">
                    <div>
                        <p className="whitespace-normal text-xs font-semibold text-muted-foreground">{t("requests.inboxEyebrow")}</p>
                        <h2 className="mt-2 font-serif text-2xl font-semibold">{t("requests.inboxTitle")}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("requests.inboxDescription")}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
                        {[
                            { label: t("requests.total"), value: requestMetrics.total },
                            { label: t("requests.review"), value: requestMetrics.review },
                            { label: t("requests.ready"), value: requestMetrics.ready },
                            { label: t("requests.converted"), value: requestMetrics.converted },
                        ].map((item) => (
                            <div key={item.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-colors hover:border-blue-400/25">
                                <p className="text-2xl font-bold text-white">{item.value}</p>
                                <p className="mt-1 whitespace-normal text-xs leading-tight text-slate-400">{item.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t("requests.searchPlaceholder")}
                                className="h-10 rounded-xl border-white/10 bg-white/[0.04] ps-9"
                            />
                        </div>

                        <div className="flex w-full flex-wrap gap-2 md:w-auto">
                            <Button variant="outline" size="sm" className="h-10 min-w-fit rounded-xl whitespace-nowrap" onClick={() => void refresh()}>
                                {t("common.refresh")}
                            </Button>
                            {requestFilters.map((filter) => (
                                <Button
                                    key={filter.key}
                                    variant={activeFilter === filter.key ? "gold" : "outline"}
                                    size="sm"
                                    className="h-10 min-w-fit rounded-xl whitespace-nowrap"
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
                                const isCancelled = row.status === "cancelled";
                                const canCancel = canTransitionPurchaseRequestStatus(row.status, "cancelled");
                                const canResubmit = canResubmitPurchaseRequest(row.status);

                                return (
                                    <div
                                        key={row.id}
                                        className={`w-full max-w-full min-w-0 rounded-[1.35rem] border transition-colors ${
                                            isCancelled
                                                ? isSelected
                                                    ? "border-slate-400/45 bg-slate-500/10 shadow-[0_18px_46px_-36px_rgba(148,163,184,0.75)]"
                                                    : "border-slate-500/25 bg-slate-500/[0.06] opacity-80 hover:border-slate-400/35 hover:bg-slate-500/10"
                                                : isSelected
                                                ? "border-blue-400/40 bg-blue-500/10 shadow-[0_18px_46px_-34px_rgba(59,130,246,0.9)]"
                                                : "border-white/10 bg-white/[0.03] hover:border-blue-400/25 hover:bg-blue-500/5"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            aria-current={isSelected ? "true" : undefined}
                                            onClick={() => setSelectedRequest(row.id, true)}
                                            className="w-full px-4 py-4 text-start"
                                        >
                                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="whitespace-nowrap text-xs font-semibold text-slate-400">
                                                    {row.requestNumber}
                                                </p>
                                                <p className="mt-2 text-base font-semibold text-foreground sm:truncate">
                                                    {row.productName || t("requests.genericRequest")}
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground sm:truncate">{row.customer.fullName}</p>
                                                {isCancelled ? (
                                                    <p className="mt-2 break-words text-xs font-medium text-slate-300">
                                                        {t("requests.dashboardActions.cancelledNotice")}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <span className={`max-w-full self-start truncate rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(row.status)}`}>
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
                                                className="h-8 min-w-fit rounded-lg border-white/10 bg-white/[0.03] px-2.5 text-xs whitespace-nowrap hover:border-blue-400/35 hover:bg-blue-500/10"
                                                onClick={() => setSelectedRequest(row.id, true)}
                                            >
                                                <Eye className="me-1.5 h-3.5 w-3.5" />
                                                {actionLabels.open}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 min-w-fit rounded-lg border-amber-400/25 bg-amber-400/10 px-2.5 text-xs text-amber-100 whitespace-nowrap hover:bg-amber-400/15"
                                                disabled={isBusy || !canResubmit}
                                                onClick={() => void handleResubmitRequest(row)}
                                                title={!canResubmit ? requestResubmitLabels.unavailable : undefined}
                                            >
                                                <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                                                {requestResubmitLabels.resubmit}
                                            </Button>
                                            {!isCancelled ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 min-w-fit rounded-lg border-slate-500/25 bg-slate-500/10 px-2.5 text-xs text-slate-200 whitespace-nowrap hover:bg-slate-500/15"
                                                    disabled={isBusy || !canCancel}
                                                    onClick={() => void handleCancelRequest(row)}
                                                >
                                                    {isBusy ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Ban className="me-1.5 h-3.5 w-3.5" />}
                                                    {requestArchiveLabels.cancel}
                                                </Button>
                                            ) : null}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 min-w-fit rounded-lg border-rose-400/25 bg-rose-500/10 px-2.5 text-xs text-rose-100 whitespace-nowrap hover:bg-rose-500/15"
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
                        tabIndex={-1}
                        className={`rounded-[1.5rem] p-0 ${
                            selectedRow.status === "cancelled"
                                ? "border-slate-400/25 bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(15,23,42,0.88))]"
                                : "border-blue-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(6,17,31,0.9))]"
                        }`}
                    >
                        <div className="border-b border-white/10 p-4 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="whitespace-normal text-xs font-semibold text-blue-200">
                                        {selectedRow.requestNumber}
                                    </p>
                                    <h2 className="mt-2 break-words font-serif text-2xl font-semibold text-white sm:text-3xl">
                                        {selectedRow.productName || t("requests.genericRequest")}
                                    </h2>
                                    <p className="mt-2 break-words text-sm text-slate-400">
                                        {selectedRow.customer.fullName} • {selectedRow.customer.email}
                                    </p>
                                </div>

                                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
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
                                        <span className={`max-w-full break-words rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(selectedRow.status)}`}>
            {t(`statuses.${selectedRow.status}`)}
        </span>
                                    );
                                })()}

                                {selectedRow.convertedDealNumber ? (
                                    <span className="max-w-full break-words rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {t("requests.linkedDeal", { deal: selectedRow.convertedDealNumber })}
                  </span>
                                ) : null}

                                {selectedRow.isLegacyFallback ? (
                                    <span className="max-w-full break-words rounded-full bg-secondary/25 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t("requests.legacy")}
                  </span>
                                ) : null}
                            </div>

                            {selectedRow.status === "cancelled" ? (
                                <div className="mt-4 rounded-2xl border border-slate-400/25 bg-slate-500/10 p-4 text-sm leading-7 text-slate-200">
                                    {t("requests.dashboardActions.cancelledNotice")}
                                </div>
                            ) : null}

                            <div className="mt-5 grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
                                {[
                                    { label: t("requests.labels.requestNumber"), value: selectedRow.requestNumber },
                                    { label: t("requests.labels.status"), value: t(`statuses.${selectedRow.status}`) },
                                    {
                                        label: t("requests.labels.date"),
                                        value: new Date(selectedRow.createdAt).toLocaleString(locale),
                                    },
                                    {
                                        label: t("requests.labels.customer"),
                                        value: selectedRow.customer.fullName || t("common.notAvailable"),
                                    },
                                ].map((item) => (
                                    <div key={item.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                        <p className="break-words text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                            {item.label}
                                        </p>
                                        <p className="mt-1 break-words text-sm font-semibold text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-0 2xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                            <div className="min-w-0 border-b border-border/50 p-4 sm:p-6 2xl:border-b-0 2xl:border-e">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <p className="whitespace-normal text-xs font-semibold text-primary">
                                            {t("requests.intake.productTitle")}
                                        </p>
                                        <p className="text-sm leading-7 text-muted-foreground">
                                            {selectedRow.productDescription || t("requests.noDescription")}
                                        </p>
                                    </div>

                                    <p className="whitespace-normal text-xs font-semibold text-slate-400">
                                        {t("requests.labels.details")}
                                    </p>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                                            <div key={item.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                <p className="break-words text-xs text-slate-400">{item.label}</p>
                                                <p className="mt-1 break-words text-sm font-medium text-white">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            <p className="font-medium">{t("requests.labels.technicalSpecs")}</p>
                                        </div>
                                        <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
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
                                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                            <div className="min-w-0 p-4 sm:p-6">
                                    <div className="space-y-5">
                                        {selectedRow.status === "transfer_proof_pending" && (
                                            <div className="rounded-[1.35rem] border border-primary/20 bg-primary/5 p-4 sm:p-6">
                                                <div className="flex items-center gap-3">
                                                    <FileImage className="h-5 w-5 text-primary" />
                                                    <h3 className="text-lg font-semibold">{t("requests.transferProof.title")}</h3>
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">{t("requests.transferProof.description")}</p>

                                                {proofSignedUrl && (
                                                    <div className="mt-4">
                                                        <a
                                                            href={proofSignedUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {selectedRow.transferProofName || t("requests.transferProof.viewProof")}
                                                        </a>
                                                    </div>
                                                )}

                                                <form className="mt-6 space-y-4" onSubmit={handleAcceptTransfer}>
                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

                                                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                                            <div className="rounded-[1.35rem] border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100 sm:p-6">
                                                <p className="font-bold">{t("requests.transferProof.rejected")}</p>
                                                <p className="mt-1 break-words text-sm">
                                                    {t("requests.transferProof.rejectionReason")} {selectedRow.transferRejectionReason}
                                                </p>
                                            </div>
                                        )}

                                        <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
                                            {t("requests.reviewPanel")}
                                        </div>

                                        <SmartPurchaseRequestPanel
                                            request={selectedRow}
                                            lang={lang}
                                            t={t}
                                            clarificationDraft={clarificationDraft}
                                            onClarificationDraftChange={setClarificationDraft}
                                            clarificationBusy={clarificationBusy}
                                            disabled={Boolean(
                                                selectedRow.isLegacyFallback ||
                                                    updatingStatusId === selectedRow.id ||
                                                    selectedRow.convertedDealNumber,
                                            )}
                                            onRequestClarification={() => void handleSmartClarificationRequest()}
                                            onMarkReady={() => void handleSmartReadyForSourcing()}
                                        />

                                        <OfficialOrderConversationBox
                                            requestId={selectedRow.id}
                                            requestNumber={selectedRow.requestNumber}
                                            dealId={selectedRow.convertedDealId}
                                            customerId={selectedRow.customer.id}
                                            status={selectedRow.status}
                                            role="admin"
                                            assignedAdminId={profile?.id}
                                        />

                                        <OrderFollowupTimeline
                                            requestId={selectedRow.id}
                                            dealId={selectedRow.convertedDealId}
                                            customerId={selectedRow.customer.id}
                                            mode="admin"
                                        />

                                        <div className="rounded-[1.35rem] border border-primary/25 bg-[#080808] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                                                            <Sparkles className="h-4 w-4" />
                                                        </span>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-[0.18em] text-primary">
                                                                {t("requests.ai.title")}
                                                            </p>
                                                            <p className="mt-1 break-words text-xs leading-6 text-muted-foreground">
                                                                {t("requests.ai.description")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {aiOutput ? (
                                                    <Button variant="outline" size="sm" onClick={() => void handleCopyAiOutput()}>
                                                        <Copy className="me-2 h-4 w-4" />
                                                        {t("requests.ai.copy")}
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
                                                        <span className="min-w-0 break-words sm:truncate">
                                                                {lang === "ar" ? action.labelAr : action.label}
                                                            </span>
                                                        </Button>
                                                    );
                                                })}
                                            </div>

                                            {aiUsedFallback ? (
                                                <div className="mt-4 rounded-[1rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
                                                    {t("requests.ai.unavailable")}
                                                </div>
                                            ) : null}

                                            {aiOutput ? (
                                                <div className="mt-4 rounded-[1rem] border border-primary/20 bg-[#111111] p-4">
                                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <p className="break-words text-sm font-semibold text-primary">{aiOutputTitle}</p>
                                                        <span className="max-w-full self-start break-words rounded-full border border-primary/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                                                            {t("requests.ai.advisory")}
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
