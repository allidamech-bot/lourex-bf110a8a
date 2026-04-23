import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowUpRight,
  FileImage,
  FileText,
  FileUp,
  Receipt,
  Route,
  Save,
  Truck,
  UserCog,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchDeals,
  fetchOperationalUsers,
  updateDealStatus,
} from "@/domain/operations/service";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  operationalStatusMeta,
  uploadDealAttachment,
} from "@/lib/operationsDomain";
import { getShipmentStageCopy } from "@/lib/shipmentStages";
import { useI18n } from "@/lib/i18n";
import type { DealOperationalStatus } from "@/types/lourex";
import { logOperationalError } from "@/lib/monitoring";

const HEADER_SEPARATOR = " | ";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default function DealsPage() {
  const { lang, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuthSession();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchOperationalUsers>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [turkishPartnerId, setTurkishPartnerId] = useState("");
  const [saudiPartnerId, setSaudiPartnerId] = useState("");
  const [operationalStatus, setOperationalStatus] =
    useState<DealOperationalStatus>("awaiting_assignment");
  const [attachmentCategory, setAttachmentCategory] = useState("reference");
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const selectedDealNumber = searchParams.get("deal");
  const canManageDeal = profile?.role === "owner" || profile?.role === "operations_employee";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsData, usersData] = await Promise.all([fetchDeals(), fetchOperationalUsers()]);
      setRows(dealsData);
      setUsers(usersData);
    } catch (error) {
      logOperationalError("deals_load", error);
      toast.error(t("deals.toasts.saveError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedDeal = rows.find((row) => row.dealNumber === selectedDealNumber) || rows[0] || null;

  useEffect(() => {
    if (!selectedDeal) return;
    setNotesDraft(selectedDeal.notes || "");
    setTurkishPartnerId(selectedDeal.turkishPartnerId || "");
    setSaudiPartnerId(selectedDeal.saudiPartnerId || "");
    setOperationalStatus(selectedDeal.operationalStatus);
    setAttachmentCategory("reference");
  }, [selectedDeal]);

  const turkishPartners = useMemo(
    () => users.filter((user) => user.role === "turkish_partner" && user.status === "active"),
    [users],
  );

  const saudiPartners = useMemo(
    () => users.filter((user) => user.role === "saudi_partner" && user.status === "active"),
    [users],
  );

  const selectedDealHeaderMeta = selectedDeal
    ? [
        selectedDeal.customerName,
        selectedDeal.requestNumber
          ? t("deals.requestRef", { value: selectedDeal.requestNumber })
          : null,
        selectedDeal.trackingId
          ? t("deals.trackingRef", { value: selectedDeal.trackingId })
          : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(HEADER_SEPARATOR)
    : "";

  const handleSave = async () => {
    if (!selectedDeal) return;
    if (saving) return;

    setSaving(true);
    try {
      const { error } = await updateDealStatus(selectedDeal.id, {
        notes: notesDraft,
        operationalStatus,
        turkishPartnerId: turkishPartnerId || null,
        saudiPartnerId: saudiPartnerId || null,
      });
      if (error) throw error;
      toast.success(t("deals.toasts.saved"));
      await refresh();
      setSearchParams({ deal: selectedDeal.dealNumber });
    } catch (error: unknown) {
      logOperationalError("deal_save", error, { dealId: selectedDeal.id });
      toast.error(getErrorMessage(error, t("deals.toasts.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDeal) return;
    if (uploadingAttachment) return;

    setUploadingAttachment(true);
    try {
      await uploadDealAttachment({
        dealId: selectedDeal.id,
        dealNumber: selectedDeal.dealNumber,
        file,
        category: attachmentCategory.trim() || "reference",
      });
      toast.success(t("deals.toasts.attachmentUploaded"));
      await refresh();
    } catch (error: unknown) {
      logOperationalError("deal_attachment_upload", error, { dealId: selectedDeal.id });
      toast.error(getErrorMessage(error, t("deals.toasts.attachmentError")));
    } finally {
      event.target.value = "";
      setUploadingAttachment(false);
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
        icon={Route}
        title={t("deals.emptyTitle")}
        description={t("deals.emptyDescription")}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <BentoCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t("deals.inboxEyebrow")}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{t("deals.inboxTitle")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {t("deals.inboxDescription")}
          </p>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => setSearchParams({ deal: row.dealNumber })}
              className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                selectedDeal?.id === row.id
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/60 bg-secondary/15 hover:border-primary/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.dealNumber}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.customerName}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  {getShipmentStageCopy(row.stage, lang).label}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{row.operationTitle}</p>
            </button>
          ))}
        </div>
      </BentoCard>

      {selectedDeal ? (
        <BentoCard className="p-0">
          <div className="border-b border-border/50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("deals.operationalCenter")}
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold">{selectedDeal.dealNumber}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedDealHeaderMeta}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedDeal.sourceRequestId ? (
                  <Button variant="outline" asChild>
                    <Link to={`/dashboard/requests?request=${selectedDeal.sourceRequestId}`}>
                      {t("deals.backToRequest")}
                    </Link>
                  </Button>
                ) : null}
                <Button variant="gold" asChild>
                  <Link
                    to={`/dashboard/tracking?deal=${selectedDeal.dealNumber}&tracking=${selectedDeal.trackingId || ""}`}
                  >
                    {t("deals.openTracking")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-0 2xl:grid-cols-[1.02fr_0.98fr]">
            <div className="border-b border-border/50 p-6 2xl:border-b-0 2xl:border-e">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    label: t("deals.labels.customer"),
                    value: selectedDeal.customerName || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.email"),
                    value: selectedDeal.customerEmail || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.phone"),
                    value: selectedDeal.customerPhone || t("common.notAvailable"),
                  },
                  {
                    label: t("deals.labels.operationTitle"),
                    value: selectedDeal.operationTitle || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.requestNumber"),
                    value: selectedDeal.requestNumber || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.trackingNumber"),
                    value: selectedDeal.trackingId || t("deals.noTracking"),
                  },
                  {
                    label: t("deals.labels.accountingReference"),
                    value: selectedDeal.accountingReference || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.origin"),
                    value: selectedDeal.originCountry || t("roles.partnerTurkey"),
                  },
                  {
                    label: t("deals.labels.destination"),
                    value: selectedDeal.destinationCountry || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.dealValue"),
                    value: `${selectedDeal.totalValue.toLocaleString()} ${selectedDeal.currency || "SAR"}`,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-primary/15 bg-primary/8 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">
                  {t("deals.labels.currentStage")}
                </p>
                <p className="mt-2 font-serif text-2xl font-semibold">
                  {getShipmentStageCopy(selectedDeal.stage, lang).label}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t("deals.operationContext")}
                </p>
              </div>

              <div className="mt-5 rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-primary" />
                  <p className="font-medium">{t("deals.labels.financialSummary")}</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {[
                    {
                      label: t("deals.labels.totalIncome"),
                      value: `${selectedDeal.accountingSummary.income.toLocaleString()} ${selectedDeal.currency}`,
                    },
                    {
                      label: t("deals.labels.totalExpense"),
                      value: `${selectedDeal.accountingSummary.expense.toLocaleString()} ${selectedDeal.currency}`,
                    },
                    {
                      label: t("deals.labels.netSignal"),
                      value: `${selectedDeal.accountingSummary.net.toLocaleString()} ${selectedDeal.currency}`,
                      className:
                        selectedDeal.accountingSummary.net >= 0
                          ? "text-emerald-400"
                          : "text-rose-400",
                    },
                    {
                      label: t("deals.labels.entriesCount"),
                      value: selectedDeal.accountingSummary.entriesCount,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.15rem] bg-card p-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`mt-1 font-medium ${item.className || ""}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-5">
                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <UserCog className="h-4 w-4 text-primary" />
                    <p className="font-medium">{t("deals.labels.assignment")}</p>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {t("deals.labels.turkishPartner")}
                      </label>
                      <select
                        value={turkishPartnerId}
                        onChange={(event) => setTurkishPartnerId(event.target.value)}
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{t("deals.unassigned")}</option>
                        {turkishPartners.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {t("deals.labels.saudiPartner")}
                      </label>
                      <select
                        value={saudiPartnerId}
                        onChange={(event) => setSaudiPartnerId(event.target.value)}
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{t("deals.unassigned")}</option>
                        {saudiPartners.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {t("deals.labels.operationalStatus")}
                      </label>
                      <select
                        value={operationalStatus}
                        onChange={(event) =>
                          setOperationalStatus(event.target.value as DealOperationalStatus)
                        }
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Object.entries(operationalStatusMeta).map(([key]) => (
                          <option key={key} value={key}>
                            {t(`statuses.${key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button variant="outline" onClick={handleSave} disabled={saving || !canManageDeal}>
                      <Save className={`me-2 h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
                      {saving ? t("deals.saving") : t("deals.saveChanges")}
                    </Button>
                    {!canManageDeal ? (
                      <p className="text-xs leading-6 text-muted-foreground">
                        {t("deals.saveLimited")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("deals.labels.notes")}</p>
                  </div>
                  <Textarea
                    rows={8}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    className="mt-4"
                    disabled={!canManageDeal}
                    placeholder={t("deals.notesPlaceholder")}
                  />
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-4 w-4 text-primary" />
                    <p className="font-medium">{t("deals.labels.attachments")}</p>
                  </div>

                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                  />

                  <div className="mt-4 rounded-[1.2rem] border border-border/60 bg-card/60 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        value={attachmentCategory}
                        onChange={(event) => setAttachmentCategory(event.target.value)}
                        placeholder={t("deals.attachmentCategoryPlaceholder")}
                        disabled={!canManageDeal || uploadingAttachment}
                      />
                      <Button
                        variant="outline"
                        disabled={!canManageDeal || uploadingAttachment}
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        <FileUp className="me-2 h-4 w-4" />
                        {uploadingAttachment
                          ? t("deals.uploadingAttachment")
                          : t("deals.uploadAttachment")}
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">
                      {t("deals.attachmentHint")}
                    </p>
                  </div>

                  {selectedDeal.attachments.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">{t("deals.noAttachments")}</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedDeal.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 transition-colors hover:border-primary/25"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{attachment.fileName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {attachment.category}
                              </p>
                            </div>
                            <ArrowUpRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-primary" />
                    <p className="font-medium">{t("deals.labels.linkedWorkspaces")}</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Link
                      to={`/dashboard/tracking?deal=${selectedDeal.dealNumber}&tracking=${selectedDeal.trackingId || ""}`}
                      className="flex items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Truck className="h-4 w-4" />
                      {t("deals.openTrackingWorkspace")}
                    </Link>
                    <Link
                      to={`/dashboard/accounting?deal=${selectedDeal.dealNumber}`}
                      className="flex items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Receipt className="h-4 w-4" />
                      {t("deals.openAccountingWorkspace")}
                    </Link>
                    <Link
                      to={`/dashboard/edit-requests?deal=${selectedDeal.dealNumber}`}
                      className="flex items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      {t("deals.openEditRequests")}
                    </Link>
                    <Link
                      to={`/dashboard/audit?deal=${selectedDeal.dealNumber}${selectedDeal.sourceRequestId ? `&request=${selectedDeal.sourceRequestId}` : ""}`}
                      className="flex items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Route className="h-4 w-4" />
                      {t("deals.openAuditTrace")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BentoCard>
      ) : null}
    </div>
  );
}
