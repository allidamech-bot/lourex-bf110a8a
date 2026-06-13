import { type FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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
    RefreshCw,
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
import {
    fetchDeals,
    resubmitPurchaseRequest,
} from "@/domain/operations/service";
import { generateBranchProfiles, calculateBranchRiskScore } from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { BranchRiskScorePanel } from "@/features/organization-intelligence/components/BranchRiskScorePanel";
import {
  detectOperationalBlockers,
  generateExecutionSequence
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { ExecutionSequencePanel } from "@/features/autonomous-coordination/components/ExecutionSequencePanel";
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
import { OperationsHealthCenter } from "@/features/operations-intelligence/components/OperationsHealthCenter";
import { PriorityQueueEngine } from "@/features/operations-intelligence/components/PriorityQueueEngine";
import { generateRecommendations } from "@/features/operations-intelligence/lib/operationsRecommendationEngine";
import { DashboardPageShell, DashboardSection, DashboardGrid } from "@/components/layout";
import { Label } from "@/components/ui/label";

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
    { mode: "purchase_request_analysis", label: "Readiness Analysis", labelAr: "طھط­ظ„ظٹظ„ ط§ظ„ط¬ط§ظ‡ط²ظٹط©" },
    { mode: "purchase_request_summary", label: "AI Summary", labelAr: "ظ…ظ„ط®طµ ط°ظƒظٹ" },
    { mode: "missing_information_checklist", label: "Missing Info", labelAr: "ط§ظ„ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ†ط§ظ‚طµط©" },
    { mode: "customer_reply_draft", label: "Customer Reply Draft", labelAr: "ظ…ط³ظˆط¯ط© ط±ط¯ ظ„ظ„ط¹ظ…ظٹظ„" },
    { mode: "supplier_brief", label: "Supplier Brief", labelAr: "ظ…ط³ظˆط¯ط© ظ„ظ„ظ…ظˆط±ط¯" },
    { mode: "purchase_request_compliance_notes", label: "Compliance Notes", labelAr: "ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ط§ظ…طھط«ط§ظ„" },
    { mode: "purchase_request_risk_review", label: "RFQ Risk Review", labelAr: "ظ…ط±ط§ط¬ط¹ط© ظ…ط®ط§ط·ط± RFQ" },
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
    intake_submitted: "border-amber-500/20 bg-amber-500/5 text-amber-200",
    under_review: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    awaiting_clarification: "border-amber-200/15 bg-stone-50/5 text-amber-300",
    ready_for_conversion: "border-emerald-500/20 bg-emerald-500/5 text-emerald-100",
    transfer_proof_pending: "border-amber-500/20 bg-amber-500/5 text-amber-200",
    transfer_proof_rejected: "border-rose-500/20 bg-rose-500/5 text-rose-100",
    in_progress: "border-amber-200/20 bg-stone-50/5 text-stone-100",
    completed: "border-emerald-500/30 bg-emerald-500/15 text-emerald-100",
    cancelled: "border-stone-700 bg-stone-800 text-stone-400",
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
        [Boolean(row.productName?.trim()), "Product name/title", "ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬"],
        [Boolean(row.productDescription?.trim() && row.productDescription.trim().length >= 30), "Detailed product description", "ظˆطµظپ طھظپطµظٹظ„ظٹ ظ„ظ„ظ…ظ†طھط¬"],
        [Boolean(row.quantity && row.quantity > 0), "Quantity", "ط§ظ„ظƒظ…ظٹط©"],
        [Boolean(row.destination?.trim()), "Destination country/city", "ط¨ظ„ط¯ ط£ظˆ ظ…ط¯ظٹظ†ط© ط§ظ„ظˆط¬ظ‡ط©"],
        [Boolean(row.technicalSpecs?.trim()), "Technical specifications", "ط§ظ„ظ…ظˆط§طµظپط§طھ ط§ظ„ظپظ†ظٹط©"],
        [Boolean(row.referenceLink?.trim()), "Reference/product link", "ط±ط§ط¨ط· ظ…ط±ط¬ط¹ظٹ ظ„ظ„ظ…ظ†طھط¬"],
        [row.attachments.length > 0, "Images or attachments", "طµظˆط± ط£ظˆ ظ…ط±ظپظ‚ط§طھ"],
        [Boolean(row.material?.trim() || row.sizeDimensions?.trim() || row.color?.trim() || row.brand?.trim()), "Material, size, color, brand, or model details", "طھظپط§طµظٹظ„ ط§ظ„ظ…ط§ط¯ط© ط£ظˆ ط§ظ„ظ…ظ‚ط§ط³ ط£ظˆ ط§ظ„ظ„ظˆظ† ط£ظˆ ط§ظ„ط¹ظ„ط§ظ…ط©"],
    ];

    return checks.filter(([isPresent]) => !isPresent).map(([, en, ar]) => (lang === "ar" ? ar : en));
};

const inferComplianceNotes = (row: PurchaseRequestRow, lang: string) => {
    const text = `${row.productName} ${row.productDescription} ${row.technicalSpecs}`.toLowerCase();
    const notes: string[] = [];

    const add = (en: string, ar: string) => notes.push(lang === "ar" ? ar : en);

    if (/(food|snack|drink|beverage|halal|meat|coffee|chocolate|ط؛ط°ط§ط،|ط؛ط°ط§ط¦ظٹ|ظ…ط´ط±ظˆط¨|ط­ظ„ط§ظ„|ظ‚ظ‡ظˆط©)/i.test(text)) {
        add("Food items may require SFDA, Halal, ingredient, and import documentation review.", "ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ط؛ط°ط§ط¦ظٹط© ظ‚ط¯ طھط­طھط§ط¬ ط¥ظ„ظ‰ ظ…ط±ط§ط¬ط¹ط© ظˆط«ط§ط¦ظ‚ SFDA ظˆط§ظ„ط­ظ„ط§ظ„ ظˆط§ظ„ظ…ظƒظˆظ†ط§طھ ظˆط§ظ„ط§ط³طھظٹط±ط§ط¯.");
    }
    if (/(cosmetic|cream|makeup|perfume|shampoo|skin|beauty|طھط¬ظ…ظٹظ„|ظƒط±ظٹظ…|ط¹ط·ط±|ط´ط§ظ…ط¨ظˆ)/i.test(text)) {
        add("Cosmetics may require ingredient lists, label artwork, and SFDA-related review.", "ظ…ط³طھط­ط¶ط±ط§طھ ط§ظ„طھط¬ظ…ظٹظ„ ظ‚ط¯ طھط­طھط§ط¬ ط¥ظ„ظ‰ ظ‚ط§ط¦ظ…ط© ظ…ظƒظˆظ†ط§طھ ظˆطھطµظ…ظٹظ… ط§ظ„ظ…ظ„طµظ‚ ظˆظ…ط±ط§ط¬ط¹ط© ظ…ط±طھط¨ط·ط© ط¨ظ€ SFDA.");
    }
    if (/(chemical|paint|solvent|resin|adhesive|msds|tds|ظƒظٹظ…ط§|ط¯ظ‡ط§ظ†|ظ„ط§طµظ‚)/i.test(text)) {
        add("Chemicals may require MSDS/TDS documents and safety classification review.", "ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ظƒظٹظ…ظٹط§ط¦ظٹط© ظ‚ط¯ طھط­طھط§ط¬ ط¥ظ„ظ‰ MSDS/TDS ظˆظ…ط±ط§ط¬ط¹ط© طھطµظ†ظٹظپ ط§ظ„ط³ظ„ط§ظ…ط©.");
    }
    if (/(electronic|battery|charger|led|appliance|voltage|power|ط¥ظ„ظƒطھط±ظˆظ†|ط¨ط·ط§ط±ظٹط©|ط´ط§ط­ظ†|ظƒظ‡ط±ط¨)/i.test(text)) {
        add("Electronics may require conformity documents, electrical specifications, and safety checks.", "ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹط§طھ ظ‚ط¯ طھط­طھط§ط¬ ط¥ظ„ظ‰ ظˆط«ط§ط¦ظ‚ ظ…ط·ط§ط¨ظ‚ط© ظˆظ…ظˆط§طµظپط§طھ ظƒظ‡ط±ط¨ط§ط¦ظٹط© ظˆظپط­ظˆطµط§طھ ط³ظ„ط§ظ…ط©.");
    }
    if (/(textile|fabric|clothing|garment|cotton|polyester|ظ†ط³ظٹط¬|ظ‚ظ…ط§ط´|ظ…ظ„ط§ط¨ط³|ظ‚ط·ظ†)/i.test(text)) {
        add("Textiles may require material composition, size, color, label, and care details.", "ط§ظ„ظ…ظ†ط³ظˆط¬ط§طھ ظ‚ط¯ طھط­طھط§ط¬ ط¥ظ„ظ‰ طھط±ظƒظٹط¨ ط§ظ„ظ…ط§ط¯ط© ظˆط§ظ„ظ…ظ‚ط§ط³ط§طھ ظˆط§ظ„ط£ظ„ظˆط§ظ† ظˆط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ„طµظ‚ ظˆط§ظ„ط¹ظ†ط§ظٹط©.");
    }

    if (notes.length === 0) {
        add(
            "No category-specific flag was inferred. Final documentation and import requirements should still be reviewed by the Lourex team.",
            "ظ„ظ… ظٹطھظ… ط§ط³طھظ†طھط§ط¬ ظ…ظ„ط§ط­ط¸ط© ط§ظ…طھط«ط§ظ„ ظ…ط­ط¯ط¯ط© ط­ط³ط¨ ط§ظ„ظپط¦ط©. ظٹط¬ط¨ ط£ظ† ظٹط±ط§ط¬ط¹ ظپط±ظٹظ‚ ظ„ظˆط±ظƒط³ ط§ظ„ظ…طھط·ظ„ط¨ط§طھ ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ظ„ظ„ظˆط«ط§ط¦ظ‚ ظˆط§ظ„ط§ط³طھظٹط±ط§ط¯.",
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
                  `طھط­ظ„ظٹظ„ ط¬ط§ظ‡ط²ظٹط© ط§ظ„ط·ظ„ط¨ ${row.requestNumber}`,
                  `- ط¯ط±ط¬ط© ط§ظ„ط¬ط§ظ‡ط²ظٹط©: ${readinessScore}/100`,
                  `- ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ†ط§ظ‚طµط©: ${missing.length ? missing.join("طŒ ") : "ظ„ط§ طھظˆط¬ط¯ ظپط¬ظˆط§طھ ظˆط§ط¶ط­ط©"}`,
                  `- ط£ط³ط¦ظ„ط© ظ…ظ‚طھط±ط­ط© ظ„ظ„ط¹ظ…ظٹظ„: طھط£ظƒظٹط¯ ط§ظ„ظ…ظˆط§طµظپط§طھ ط§ظ„ظپظ†ظٹط©طŒ ط§ظ„طھط؛ظ„ظٹظپطŒ ط§ظ„ط´ظ‡ط§ط¯ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط©طŒ ظˆط§ظ„ط³ط¹ط± ط§ظ„ظ…ط³طھظ‡ط¯ظپ ط¥ظ† ظˆط¬ط¯.`,
                  `- ظ…ظˆط¬ط² ظ„ظ„ظ…ظˆط±ط¯: ط§ظ„ظ…ظ†طھط¬ ${valueOrDash(row.productName)}طŒ ط§ظ„ظƒظ…ظٹط© ${valueOrDash(row.quantity)}طŒ ط§ظ„ظˆط¬ظ‡ط© ${valueOrDash(row.destination)}طŒ ظˆط§ظ„ظ…ط±ظپظ‚ط§طھ ${row.attachments.length}.`,
                  `- ظ…ظ„ط§ط­ط¸ط§طھ ظ…ط®ط§ط·ط±: ${compliance[0]}`,
                  `- ظ‡ط°ط§ ط§ظ„طھط­ظ„ظٹظ„ ط¥ط±ط´ط§ط¯ظٹ ظپظ‚ط· ظˆظ„ط§ ظٹط¹طھظ…ط¯ ط£ظˆ ظٹط؛ظٹط± ط­ط§ظ„ط© ط§ظ„ط·ظ„ط¨.`,
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
                  `ظ…ظ„ط®طµ طھط´ط؛ظٹظ„ظٹ ظ„ظ„ط·ظ„ط¨ ${row.requestNumber}`,
                  `- ط§ظ„ظ…ظ†طھط¬: ${valueOrDash(row.productName)}`,
                  `- ط§ظ„ط¹ظ…ظٹظ„: ${valueOrDash(row.customer.fullName)} (${valueOrDash(row.customer.country)} / ${valueOrDash(row.customer.city)})`,
                  `- ط§ظ„ط­ط§ط¬ط©: ${valueOrDash(row.productDescription)}`,
                  `- ط§ظ„ظƒظ…ظٹط©: ${valueOrDash(row.quantity)}`,
                  `- ط§ظ„ظˆط¬ظ‡ط©: ${valueOrDash(row.destination)}`,
                  `- ط§ظ„ط­ط§ظ„ط© ط§ظ„ط­ط§ظ„ظٹط©: ${valueOrDash(row.status)}`,
                  `- ط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…ظ‚طھط±ط­: ظ…ط±ط§ط¬ط¹ط© ط§ظ„طھظپط§طµظٹظ„ ط§ظ„ظ†ط§ظ‚طµط© ط«ظ… ط¥ط¹ط¯ط§ط¯ ط£ط³ط¦ظ„ط© طھظˆط¶ظٹط­ظٹط© ط£ظˆ brief ظ„ظ„ظ…ظˆط±ط¯ ط­ط³ط¨ ط¬ط§ظ‡ط²ظٹط© ط§ظ„ط¨ظٹط§ظ†ط§طھ.`,
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
        const list = missing.length ? missing : [isArabic ? "ظ„ط§ طھظˆط¬ط¯ ظپط¬ظˆط§طھ ظˆط§ط¶ط­ط©طŒ ظ„ظƒظ† ظٹظپط¶ظ„ طھط£ظƒظٹط¯ ط§ظ„ظ…ظˆط§طµظپط§طھ ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ظ…ط¹ ط§ظ„ط¹ظ…ظٹظ„." : "No obvious gaps, but final specifications should still be confirmed with the customer."];
        return isArabic
            ? [`ط§ظ„ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ†ط§ظ‚طµط© ط£ظˆ ط§ظ„ط¶ط¹ظٹظپط©:`, ...list.map((item) => `- ${item}`), `\nط£ط³ط¦ظ„ط© ظ…ظ‚طھط±ط­ط©:`, `- ظ‡ظ„ طھظˆط¬ط¯ ظ…ظˆط§طµظپط§طھ ظپظ†ظٹط© ط£ظˆ ظ…ط¹ظٹط§ط± ط¬ظˆط¯ط© ظ…ط­ط¯ط¯طں`, `- ظ‡ظ„ طھظˆط¬ط¯ ظ…طھط·ظ„ط¨ط§طھ طھط؛ظ„ظٹظپ ط£ظˆ ط´ظ‡ط§ط¯ط§طھ ظ…ط·ظ„ظˆط¨ط©طں`, `- ظ‡ظ„ ظ„ط¯ظ‰ ط§ظ„ط¹ظ…ظٹظ„ ط³ط¹ط± ظ…ط³طھظ‡ط¯ظپ ط£ظˆ ظ…ظˆط¹ط¯ طھظˆط±ظٹط¯ ظ…ظپط¶ظ„طں`].join("\n")
            : [`Missing or weak information:`, ...list.map((item) => `- ${item}`), `\nSuggested questions:`, `- Are there technical specifications or a target quality standard?`, `- Are packaging requirements or certificates required?`, `- Does the customer have a target price or preferred supply date?`].join("\n");
    }

    if (normalizedMode === "purchase_request_customer_reply") {
        const missingText = missing.length ? missing.join(", ") : isArabic ? "طھط£ظƒظٹط¯ ط§ظ„ظ…ظˆط§طµظپط§طھ ط§ظ„ظ†ظ‡ط§ط¦ظٹط©" : "final specification confirmation";
        return isArabic
            ? [
                  `ط¹ظ…ظٹظ„ظ†ط§ ط§ظ„ط¹ط²ظٹط²طŒ`,
                  `ط´ظƒط±ط§ظ‹ ظ„ط¥ط±ط³ط§ظ„ ط·ظ„ط¨ ط§ظ„ط´ط±ط§ط، ط±ظ‚ظ… ${row.requestNumber}. ط¨ط¯ط£ ظپط±ظٹظ‚ ظ„ظˆط±ظƒط³ ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط·ظ„ط¨ ط¨ط´ظƒظ„ ظ…ط¨ط¯ط¦ظٹ.`,
                  `ط­طھظ‰ ظ†طھظ…ظƒظ† ظ…ظ† طھظˆط¬ظٹظ‡ ط§ظ„ط·ظ„ط¨ ظ„ظ„ظ…ظˆط±ط¯ظٹظ† ط§ظ„ظ…ظ†ط§ط³ط¨ظٹظ† ط¨ط¯ظ‚ط©طŒ ظ†ط­طھط§ط¬ ط¥ظ„ظ‰ طھظˆط¶ظٹط­: ${missingText}.`,
                  `ظٹط±ط¬ظ‰ ظ…ط´ط§ط±ظƒط© ط£ظٹ طµظˆط± ط£ظˆ ط±ظˆط§ط¨ط· ط£ظˆ ظ…ظˆط§طµظپط§طھ ط¥ط¶ط§ظپظٹط© ظ…طھط§ط­ط©. ظ‡ط°ط§ ط§ظ„ط±ط¯ ظ„ط§ ظٹطھط¶ظ…ظ† ظˆط¹ط¯ط§ظ‹ ط¨ط³ط¹ط± ظ†ظ‡ط§ط¦ظٹ ط£ظˆ ظ…ظˆط¹ط¯ طھظˆط±ظٹط¯ ظ†ظ‡ط§ط¦ظٹطŒ ظˆط³ظٹظ‚ظˆظ… ظپط±ظٹظ‚ ظ„ظˆط±ظƒط³ ط¨ط§ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ظ‚ط¨ظ„ ط£ظٹ ط§ظ„طھط²ط§ظ… طھط´ط؛ظٹظ„ظٹ.`,
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
                  `ظ…ط³ظˆط¯ط© brief ظ„ظ„ظ…ظˆط±ط¯`,
                  `- ط§ظ„ظ…ظ†طھط¬: ${valueOrDash(row.productName)}`,
                  `- ط§ظ„ظˆطµظپ: ${valueOrDash(row.productDescription)}`,
                  `- ط§ظ„ظ…ظˆط§طµظپط§طھ: ${valueOrDash(row.technicalSpecs)}`,
                  `- ط§ظ„ظƒظ…ظٹط©: ${valueOrDash(row.quantity)}`,
                  `- ط§ظ„ظˆط¬ظ‡ط©: ${valueOrDash(row.destination)}`,
                  `- ط§ظ„ط´ط­ظ† ط§ظ„ظ…ظپط¶ظ„: ${valueOrDash(row.preferredShippingMethod)}`,
                  `- ط§ظ„ظ…ط§ط¯ط©/ط§ظ„ظ…ظ‚ط§ط³/ط§ظ„ظ„ظˆظ†: ${valueOrDash(row.material)} / ${valueOrDash(row.sizeDimensions)} / ${valueOrDash(row.color)}`,
                  `- ط§ظ„ط¹ظ„ط§ظ…ط© ط£ظˆ ظ…ط³طھظˆظ‰ ط§ظ„ط¬ظˆط¯ط©: ${valueOrDash(row.brand)} / ${valueOrDash(row.qualityLevel)}`,
                  `- ظ…ط±ظپظ‚ط§طھ ط§ظ„ط¹ظ…ظٹظ„: ${row.attachments.length}`,
                  `- ط£ط³ط¦ظ„ط© ظ„ظ„ظ…ظˆط±ط¯: طھط£ظƒظٹط¯ MOQطŒ ظ…ط¯ط© ط§ظ„ط¥ظ†طھط§ط¬ ط§ظ„طھظ‚ط¯ظٹط±ظٹط©طŒ ط§ظ„طھط؛ظ„ظٹظپطŒ ط§ظ„ط´ظ‡ط§ط¯ط§طھ ط§ظ„ظ…ط·ظ„ظˆط¨ط©طŒ ظˆط¥ظ…ظƒط§ظ†ظٹط© طھظˆظپظٹط± ط¹ظٹظ†ط© ط¥ظ† ظ„ط²ظ….`,
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
        ? [`ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ…طھط«ط§ظ„ ط¥ط±ط´ط§ط¯ظٹط©:`, ...compliance.map((item) => `- ${item}`), `\nظ‡ط°ظ‡ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط¥ط±ط´ط§ط¯ظٹط© ظپظ‚ط·. ط§ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ظ„ظ„ظˆط«ط§ط¦ظ‚ ظˆط§ظ„ظ…طھط·ظ„ط¨ط§طھ ط§ظ„طھظ†ط¸ظٹظ…ظٹط© طھطھظ… ط¨ظˆط§ط³ط·ط© ظپط±ظٹظ‚ ظ„ظˆط±ظƒط³.`].join("\n")
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
    const [deals, setDeals] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
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
                const [data, dealsData] = await Promise.all([
                    loadPurchaseRequests(),
                    fetchDeals()
                ]);
                setRows(data);
                setDeals(dealsData);

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
                            ? `${outputTitle} ظ„ط·ظ„ط¨ ط§ظ„ط´ط±ط§ط، ط§ظ„ط¯ط§ط®ظ„ظٹ ${selectedRow.requestNumber}. ط£ط¬ط¨ ط¨ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط© ظپظ‚ط·.`
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
                toast.error(lang === "ar" ? "ط§ظ†طھظ‡طھ ط­طµط© ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ط­ط§ظ„ظٹط§ظ‹. طھظ… ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ…ط­ظ„ظ„ ط§ظ„ظ…ط­ظ„ظٹ." : "AI quota exceeded. Local analyzer used instead.");
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

    const recommendations = useMemo(
        () => generateRecommendations([], rows),
        [rows]
    );

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

    const branchProfiles = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => generateBranchProfiles(rows as any, deals as any, []),
        [rows, deals]
    );

    const branchRiskScores = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => branchProfiles.map(b => calculateBranchRiskScore(b.id, rows as any, deals as any, [])),
        [branchProfiles, rows, deals]
    );

    const autonomousBlockers = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => detectOperationalBlockers(rows as any, deals as any, [], []),
        [rows, deals]
    );

    const executionSequence = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => generateExecutionSequence(rows as any, deals as any, autonomousBlockers),
        [rows, deals, autonomousBlockers]
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

            toast.success(`${t("requests.toasts.statusUpdated")} ${current.requestNumber} â†’ ${t(`statuses.${status}`)}`);
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
            <DashboardPageShell>
                <DashboardGrid variant="balanced">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04]" />
                    ))}
                </DashboardGrid>
            </DashboardPageShell>
        );
    }

    if (rows.length === 0) {
        return (
            <DashboardPageShell>
                <EmptyState
                    icon={ClipboardList}
                    title={t("requests.emptyTitle")}
                    description={t("requests.emptyDescription")}
                />
            </DashboardPageShell>
        );
    }

    return (
        <DashboardPageShell dir={lang === "ar" ? "rtl" : "ltr"}>
            <PageHelpBox pageKey="purchase_requests" role={profile?.role} />

            {isInternal && (
                <div className="space-y-12">
                     <DashboardGrid variant="balanced">
                        <DashboardSection title="Health Monitor">
                            <OperationsHealthCenter
                                activeRequests={requestMetrics.total - requestMetrics.converted}
                                pendingOperations={requestMetrics.review}
                                inTransitCount={0}
                                delayedCount={0}
                                blockedWorkflows={rows.filter(r => r.status === 'transfer_proof_rejected').length}
                                completionScore={75}
                            />
                        </DashboardSection>
                        <DashboardSection title="Action Pipeline">
                            <PriorityQueueEngine recommendations={recommendations} />
                        </DashboardSection>
                    </DashboardGrid>

                    <DashboardGrid variant="balanced">
                        <DashboardSection title="Branch Risk">
                            <BranchRiskScorePanel risks={branchRiskScores} />
                        </DashboardSection>
                        <DashboardSection title="Execution Flow">
                            <ExecutionSequencePanel steps={executionSequence} />
                        </DashboardSection>
                    </DashboardGrid>
                </div>
            )}

            <DashboardSection
                title={t("requests.inboxTitle")}
                description={t("requests.inboxDescription")}
                icon={<ClipboardList className="h-6 w-6" />}
                headerAction={
                    <div className="flex flex-wrap items-center gap-3">
                         <div className="relative w-64">
                            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t("requests.searchPlaceholder")}
                                className="ps-9 bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20 h-10"
                            />
                        </div>
                        <Button variant="outline" size="lg" onClick={() => void refresh()} className="rounded-2xl border-amber-200/10 bg-stone-900/40 text-stone-200 hover:text-amber-200 h-12 px-6">
                            <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
                            <span className="font-bold">{t("common.refresh")}</span>
                        </Button>
                    </div>
                }
            >
                <DashboardGrid variant="main">
                    <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: t("requests.total"), value: requestMetrics.total },
                                { label: t("requests.review"), value: requestMetrics.review },
                                { label: t("requests.ready"), value: requestMetrics.ready },
                                { label: t("requests.converted"), value: requestMetrics.converted },
                            ].map((item) => (
                                <div key={item.label} className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800 text-center">
                                    <p className="text-2xl font-black text-stone-100">{item.value}</p>
                                    <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mt-1">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {requestFilters.map((filter) => (
                                <Button
                                    key={filter.key}
                                    variant={activeFilter === filter.key ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-9 rounded-xl px-4 text-xs font-bold uppercase tracking-widest transition-all",
                                        activeFilter === filter.key
                                        ? "bg-amber-500/10 text-amber-200 border-amber-500/30"
                                        : "border-stone-800 bg-stone-950/40 text-stone-500 hover:text-stone-300"
                                    )}
                                    onClick={() => setActiveFilter(filter.key)}
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>

                        <div className="space-y-4 max-h-[50rem] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredRows.length === 0 ? (
                                <div className="py-12 text-center text-stone-600 italic">No matching requests found.</div>
                            ) : (
                                filteredRows.map((row) => (
                                    <div
                                        key={row.id}
                                        className={cn(
                                            "w-full rounded-[1.5rem] border transition-all group overflow-hidden",
                                            selectedRow?.id === row.id
                                                ? "border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-950/20"
                                                : "border-amber-200/5 bg-stone-950/30 hover:border-amber-200/20"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRequest(row.id, true)}
                                            className="w-full p-6 text-start"
                                        >
                                            <div className="flex min-w-0 justify-between items-start gap-4 mb-4">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{row.requestNumber}</p>
                                                    <h4 className="font-bold text-stone-100 text-lg mt-1 group-hover:text-amber-200 transition-colors truncate">
                                                        {row.productName || t("requests.genericRequest")}
                                                    </h4>
                                                    <p className="text-xs text-stone-500 font-medium mt-1 truncate">{row.customer.fullName}</p>
                                                </div>
                                                <span className={cn(
                                                    "shrink-0 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                    getStatusBadgeClass(row.status)
                                                )}>
                                                    {t(`statuses.${row.status}`)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-[10px] font-black text-stone-700 uppercase tracking-widest">
                                                <span>{t("requests.attachmentsCount", { count: row.attachments.length })}</span>
                                                <span>â€¢</span>
                                                <span>{new Date(row.createdAt).toLocaleDateString(locale)}</span>
                                            </div>
                                        </button>

                                        <div className="flex items-center gap-2 p-3 bg-stone-900/40 border-t border-amber-200/5">
                                             <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-200"
                                                onClick={() => setSelectedRequest(row.id, true)}
                                            >
                                                <Eye className="me-1.5 h-3.5 w-3.5" />
                                                {actionLabels.open}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-200"
                                                disabled={updatingStatusId === row.id || !canResubmitPurchaseRequest(row.status)}
                                                onClick={() => void handleResubmitRequest(row)}
                                            >
                                                <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                                                {requestResubmitLabels.resubmit}
                                            </Button>
                                             <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/5"
                                                disabled={updatingStatusId === row.id}
                                                onClick={() => void handleArchiveRequest(row)}
                                            >
                                                <Archive className="me-1.5 h-3.5 w-3.5" />
                                                {requestArchiveLabels.archive}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </BentoCard>

                    <aside className="space-y-12">
                        {selectedRow ? (
                            <div className="space-y-12">
                                <BentoCard className="p-8 border-amber-200/10 bg-stone-900/50">
                                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest">{selectedRow.requestNumber}</p>
                                            <h3 className="mt-1 font-serif text-3xl font-bold text-stone-100">
                                                {selectedRow.productName || t("requests.genericRequest")}
                                            </h3>
                                            <p className="text-sm text-stone-500 font-medium mt-2">{selectedRow.customer.fullName} â€¢ {selectedRow.customer.email}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {isInternal && selectedRow.convertedDealNumber && (
                                                <Button variant="outline" asChild className="h-10 border-stone-800 bg-stone-900/40 text-stone-200">
                                                    <Link to={`/dashboard/deals?deal=${selectedRow.convertedDealNumber}`}>
                                                        <Eye className="me-2 h-4 w-4" />
                                                        {t("requests.openDeal")}
                                                    </Link>
                                                </Button>
                                            )}
                                            {isInternal && (
                                                <Button
                                                    disabled={convertingId === selectedRow.id || (!selectedRow.convertedDealNumber && !canConvertPurchaseRequest({ role: profile?.role, status: selectedRow.status, convertedDealNumber: selectedRow.convertedDealNumber }))}
                                                    onClick={handleConvert}
                                                    className="h-10 rounded-xl bg-gradient-to-r from-amber-100 to-amber-700 font-black text-stone-950 shadow-xl uppercase text-xs tracking-widest"
                                                >
                                                    {convertingId === selectedRow.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 me-2" />}
                                                    {selectedRow.convertedDealNumber ? t("requests.goToDeal") : t("requests.convert")}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                         {[
                                            { label: t("requests.labels.location"), value: `${selectedRow.customer.country || "â€”"} / ${selectedRow.customer.city || "â€”"}` },
                                            { label: t("requests.labels.quantity"), value: selectedRow.quantity },
                                            { label: t("requests.labels.shipping"), value: selectedRow.preferredShippingMethod },
                                            { label: t("requests.labels.expectedDate"), value: selectedRow.expectedSupplyDate },
                                        ].map((item) => (
                                            <div key={item.label} className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800">
                                                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className="font-bold text-stone-300">{item.value || "â€”"}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <DashboardSection title={t("requests.labels.details")}>
                                        <div className="space-y-6">
                                            <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800">
                                                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-2">{t("requests.intake.productTitle")}</p>
                                                <p className="text-sm text-stone-400 leading-relaxed">{selectedRow.productDescription || "No description provided."}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800">
                                                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-2">{t("requests.labels.technicalSpecs")}</p>
                                                <p className="text-sm text-stone-400 leading-relaxed font-mono">{selectedRow.technicalSpecs || "None."}</p>
                                            </div>
                                        </div>
                                    </DashboardSection>

                                    {isInternal && (
                                        <div className="mt-12 space-y-12">
                                            <DashboardSection title="Action Center" icon={<Sparkles className="h-6 w-6" />}>
                                                <div className="space-y-6">
                                                    <SmartPurchaseRequestPanel
                                                        request={selectedRow}
                                                        lang={lang}
                                                        t={t}
                                                        clarificationDraft={clarificationDraft}
                                                        onClarificationDraftChange={setClarificationDraft}
                                                        clarificationBusy={clarificationBusy}
                                                        disabled={Boolean(selectedRow.isLegacyFallback || updatingStatusId === selectedRow.id || selectedRow.convertedDealNumber)}
                                                        onRequestClarification={() => void handleSmartClarificationRequest()}
                                                        onMarkReady={() => void handleSmartReadyForSourcing()}
                                                    />

                                                    <BentoCard className="p-6 border-amber-200/10 bg-stone-950/40">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                                                    <Sparkles className="h-4 w-4" />
                                                                </div>
                                                                <h4 className="font-bold text-stone-100 uppercase tracking-widest text-xs">{t("requests.ai.title")}</h4>
                                                            </div>
                                                            {aiOutput && (
                                                                <Button variant="ghost" size="sm" onClick={() => void handleCopyAiOutput()} className="text-stone-500 hover:text-amber-200">
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                                                            {purchaseRequestAiActions.map((action) => (
                                                                <Button
                                                                    key={action.mode}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="justify-start h-9 border-stone-800 bg-stone-900/40 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-200 hover:border-amber-200/20"
                                                                    disabled={Boolean(aiActionLoading)}
                                                                    onClick={() => void handleAiAction(action.mode)}
                                                                >
                                                                    {aiActionLoading === action.mode ? <Loader2 className="h-3 w-3 animate-spin me-2" /> : <Sparkles className="h-3 w-3 me-2" />}
                                                                    {lang === "ar" ? action.labelAr : action.label}
                                                                </Button>
                                                            ))}
                                                        </div>

                                                        {aiOutput && (
                                                            <div className="p-4 rounded-2xl bg-stone-900/60 border border-amber-200/5 animate-in fade-in slide-in-from-top-2">
                                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">{aiOutputTitle}</p>
                                                                <pre className="font-sans text-xs text-stone-400 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{aiOutput}</pre>
                                                            </div>
                                                        )}
                                                    </BentoCard>

                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("requests.labels.internalNotes")}</Label>
                                                        <Textarea
                                                            rows={6}
                                                            value={internalNotesDraft}
                                                            onChange={(event) => setInternalNotesDraft(event.target.value)}
                                                            className="bg-stone-950/40 border-amber-200/10 text-stone-100 text-sm"
                                                            placeholder={t("requests.notesPlaceholder")}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            className="w-full h-11 border-stone-800 bg-stone-900/40 text-stone-300 font-bold uppercase tracking-widest text-[10px]"
                                                            onClick={handleSaveNotes}
                                                            disabled={savingNotesId === selectedRow.id}
                                                        >
                                                            {savingNotesId === selectedRow.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("requests.saveNotes")}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DashboardSection>

                                            <DashboardSection title="Communication Node">
                                                <div className="space-y-6">
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
                                                </div>
                                            </DashboardSection>
                                        </div>
                                    )}
                                </BentoCard>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center p-12 rounded-[2rem] bg-stone-900/20 border border-dashed border-stone-800">
                                <p className="text-stone-600 font-medium italic">Select a request to view its architectural details.</p>
                            </div>
                        )}
                    </aside>
                </DashboardGrid>
            </DashboardSection>
        </DashboardPageShell>
    );
}
