import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
    ArrowRightLeft,
    CheckCircle2,
    ClipboardList,
    Eye,
    FileImage,
    Filter,
    Loader2,
    MessageSquareWarning,
    Search,
    ShieldCheck,
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
    acceptTransferProof,
    convertRequestToDeal,
    loadPurchaseRequests,
    rejectTransferProof,
    requestStatusMeta,
    updatePurchaseRequestInternalNotes,
    updatePurchaseRequestStatus,
} from "@/lib/operationsDomain";
import type { PurchaseRequestStatus } from "@/types/lourex";
import { isInternalRole } from "@/features/auth/rbac";
import { canConvertPurchaseRequest, canTransitionPurchaseRequestStatus } from "@/domain/operations/guards";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";
import { getSignedUrl } from "@/lib/storage";

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
    const { locale, t } = useI18n();
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
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [activeFilter, setActiveFilter] = useState<"all" | PurchaseRequestStatus>("all");
    const [internalNotesDraft, setInternalNotesDraft] = useState("");
    const [loadError, setLoadError] = useState("");

    const selectedRequestId = searchParams.get("request");
    const getRequestStatusMeta = (status: PurchaseRequestStatus | string | null | undefined) => {
        if (status && status in requestStatusMeta) {
            return requestStatusMeta[status as PurchaseRequestStatus];
        }

        return {
            label: status || t("common.unknown"),
            tone: "bg-zinc-500/15 text-zinc-300",
        };
    };

    const statusActions: Array<{ value: PurchaseRequestStatus; label: string }> = [
        { value: "under_review", label: t("requests.actions.under_review") },
        { value: "awaiting_clarification", label: t("requests.actions.awaiting_clarification") },
        { value: "ready_for_conversion", label: t("requests.actions.ready_for_conversion") },
    ];

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
        (requestId: string | null) => {
            const nextParams = new URLSearchParams(searchParams);

            if (requestId) {
                nextParams.set("request", requestId);
            } else {
                nextParams.delete("request");
            }

            setSearchParams(nextParams);
        },
        [searchParams, setSearchParams],
    );

    const refresh = useCallback(
        async (preserveSelection = true) => {
            setLoading(true);
            setLoadError("");

            try {
                const data = await loadPurchaseRequests();
                setRows(data);

                if (!preserveSelection) {
                    setSelectedRequest(data[0]?.id ?? null);
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

        return filteredRows.find((row) => row.id === selectedRequestId) || filteredRows[0] || null;
    }, [filteredRows, selectedRequestId]);

    useEffect(() => {
        if (!selectedRow) {
            setInternalNotesDraft("");
            setProofSignedUrl(null);
            return;
        }

        setInternalNotesDraft(selectedRow.internalNotes || "");

        if (selectedRow.transferProofUrl) {
            void getSignedUrl("DOCUMENTS", selectedRow.transferProofUrl).then((url) => setProofSignedUrl(url));
        } else {
            setProofSignedUrl(null);
        }
    }, [selectedRow]);

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

    const handleAcceptTransfer = async () => {
        if (!selectedRow || actingOnProof) return;

        setActingOnProof(true);

        try {
            const result = await acceptTransferProof(selectedRow.id);

            if (!result.success) {
                throw new Error(t("transferProof.acceptFailed"));
            }

            toast.success(t("transferProof.accepted"));
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
            <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-44 w-full rounded-[2rem]" />
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
                <BentoCard className="space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("requests.inboxEyebrow")}</p>
                        <h2 className="mt-2 font-serif text-2xl font-semibold">{t("requests.inboxTitle")}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("requests.inboxDescription")}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: t("requests.total"), value: requestMetrics.total },
                            { label: t("requests.review"), value: requestMetrics.review },
                            { label: t("requests.ready"), value: requestMetrics.ready },
                            { label: t("requests.converted"), value: requestMetrics.converted },
                        ].map((item) => (
                            <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 p-4 text-center">
                                <p className="text-2xl font-bold">{item.value}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
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
                                className="ps-9"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => void refresh()}>
                                {t("common.refresh")}
                            </Button>
                            {requestFilters.map((filter) => (
                                <Button
                                    key={filter.key}
                                    variant={activeFilter === filter.key ? "gold" : "outline"}
                                    size="sm"
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
                        <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/10 p-6">
                            <EmptyState
                                icon={ClipboardList}
                                title={t("requests.emptyFilteredTitle")}
                                description={t("requests.emptyFilteredDescription")}
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRows.map((row) => {
                                const statusMeta = getRequestStatusMeta(row.status);

                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        onClick={() => setSelectedRequest(row.id)}
                                        className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                                            selectedRow?.id === row.id
                                                ? "border-primary/30 bg-primary/10"
                                                : "border-border/60 bg-secondary/15 hover:border-primary/20"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                                    {row.requestNumber}
                                                </p>
                                                <p className="mt-2 font-medium">{row.productName || t("requests.genericRequest")}</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{row.customer.fullName}</p>
                                            </div>

                                            <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusMeta.tone}`}>
                        {t(`statuses.${row.status}`)}
                      </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span>{t("requests.attachmentsCount", { count: row.attachments.length })}</span>
                                            <span>•</span>
                                            <span>{new Date(row.createdAt).toLocaleDateString(locale)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </BentoCard>

                {selectedRow ? (
                    <BentoCard className="p-0">
                        <div className="border-b border-border/50 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                        {selectedRow.requestNumber}
                                    </p>
                                    <h2 className="mt-2 font-serif text-3xl font-semibold">
                                        {selectedRow.productName || t("requests.genericRequest")}
                                    </h2>
                                    <p className="mt-2 text-sm text-muted-foreground">
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
                                    const statusMeta = getRequestStatusMeta(selectedRow.status);

                                    return (
                                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusMeta.tone}`}>
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
                                            <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 px-4 py-3">
                                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                                <p className="mt-1 break-words text-sm font-medium">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
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

                                                <div className="mt-6 flex gap-3">
                                                    <Button
                                                        onClick={handleAcceptTransfer}
                                                        disabled={actingOnProof}
                                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                    >
                                                        {actingOnProof ? (
                                                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="me-2 h-4 w-4" />
                                                        )}
                                                        {t("requests.actions.acceptTransfer")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleRejectTransfer}
                                                        disabled={actingOnProof}
                                                        className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                                                    >
                                                        <MessageSquareWarning className="me-2 h-4 w-4" />
                                                        {t("requests.actions.rejectTransfer")}
                                                    </Button>
                                                </div>
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