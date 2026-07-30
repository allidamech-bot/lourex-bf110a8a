import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Lang } from "@/lib/i18n";
import type { PurchaseRequest } from "@/types/lourex";
import {
  analyzeSmartPurchaseRequest,
  buildRequestTimeline,
  buildSupplierBriefDraft,
  getNextSmartStatus,
  type MissingInformationKey,
  type SmartRequestSignal,
} from "@/features/purchase-requests/lib/smartRequest";

type SmartPurchaseRequestPanelProps = {
  request: PurchaseRequest;
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onRequestClarification?: () => void;
  onMarkReady?: () => void;
  clarificationDraft?: string;
  onClarificationDraftChange?: (value: string) => void;
  clarificationBusy?: boolean;
  disabled?: boolean;
  showCustomerReply?: boolean;
  customerReply?: string;
  onCustomerReplyChange?: (value: string) => void;
  onSubmitCustomerReply?: () => void;
  customerReplyBusy?: boolean;
  showInternalSections?: boolean;
};

const signalClasses: Record<SmartRequestSignal, string> = {
  low: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  medium: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  high: "border-rose-400/25 bg-rose-500/10 text-rose-100",
};

const normalizePhoneForLink = (value: string) => {
  const normalized = value.trim().replace(/[^\d+]/g, "").replace(/^00/, "+");
  return normalized.startsWith("+") ? normalized : normalized;
};

export const SmartPurchaseRequestPanel = ({
  request,
  lang,
  t,
  onRequestClarification,
  onMarkReady,
  clarificationDraft = "",
  onClarificationDraftChange,
  clarificationBusy = false,
  disabled = false,
  showCustomerReply = false,
  customerReply = "",
  onCustomerReplyChange,
  onSubmitCustomerReply,
  customerReplyBusy = false,
  showInternalSections = true,
}: SmartPurchaseRequestPanelProps) => {
  const analysis = analyzeSmartPurchaseRequest(request);
  const timeline = buildRequestTimeline(request);
  const recommendedStatus = getNextSmartStatus(analysis);
  const supplierBrief = buildSupplierBriefDraft(request, lang);
  const signalLabel = (signal: SmartRequestSignal) => t(`requests.smart.signals.${signal}`);
  const missingLabel = (key: MissingInformationKey) => t(`requests.smart.missing.${key}`);
  const isArabic = lang === "ar";
  const phone = request.customer.phone?.trim() || "";
  const email = request.customer.email?.trim() || "";
  const customerName = request.customer.fullName?.trim() || (isArabic ? "عميل غير معروف" : "Unknown customer");
  const location = [request.customer.country?.trim(), request.customer.city?.trim()].filter(Boolean).join(" / ");
  const phoneForLink = normalizePhoneForLink(phone);
  const whatsappPhone = phoneForLink.replace(/^\+/, "");
  const contactLabels = isArabic
    ? {
        title: "بيانات العميل",
        description: "معلومات التواصل المرتبطة بهذا الطلب",
        phone: "رقم الهاتف",
        email: "البريد الإلكتروني",
        location: "الدولة والمدينة",
        requestNumber: "رقم الطلب",
        call: "اتصال",
        whatsapp: "واتساب",
        sendEmail: "إرسال بريد",
        missingPhone: "رقم الهاتف غير متوفر في هذا الطلب",
        missingEmail: "البريد الإلكتروني غير متوفر",
        missingLocation: "الموقع غير محدد",
      }
    : {
        title: "Customer details",
        description: "Contact information linked to this request",
        phone: "Phone number",
        email: "Email address",
        location: "Country and city",
        requestNumber: "Request number",
        call: "Call",
        whatsapp: "WhatsApp",
        sendEmail: "Send email",
        missingPhone: "No phone number was provided for this request",
        missingEmail: "No email address was provided",
        missingLocation: "Location was not provided",
      };

  return (
    <div className="space-y-4 rounded-[1.35rem] border border-primary/20 bg-[#080808] p-4">
      {showInternalSections ? (
        <section className="rounded-[1rem] border border-primary/25 bg-primary/[0.06] p-4" aria-label={contactLabels.title}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{contactLabels.title}</p>
                <h3 className="mt-1 break-words text-lg font-bold text-foreground">{customerName}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{contactLabels.description}</p>
              </div>
            </div>

            <span className="max-w-full self-start rounded-full border border-primary/20 bg-background/40 px-3 py-1 text-xs font-medium text-foreground">
              {request.requestNumber}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className={`rounded-[0.9rem] border p-3 ${phone ? "border-border/60 bg-background/30" : "border-amber-400/25 bg-amber-500/10"}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>{contactLabels.phone}</span>
              </div>
              <p className={`mt-2 break-all text-sm font-semibold ${phone ? "text-foreground" : "text-amber-200"}`} dir="ltr">
                {phone || contactLabels.missingPhone}
              </p>
            </div>

            <div className="rounded-[0.9rem] border border-border/60 bg-background/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>{contactLabels.email}</span>
              </div>
              <p className="mt-2 break-all text-sm font-semibold text-foreground" dir="ltr">
                {email || contactLabels.missingEmail}
              </p>
            </div>

            <div className="rounded-[0.9rem] border border-border/60 bg-background/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{contactLabels.location}</span>
              </div>
              <p className="mt-2 break-words text-sm font-semibold text-foreground">{location || contactLabels.missingLocation}</p>
            </div>

            <div className="rounded-[0.9rem] border border-border/60 bg-background/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span>{contactLabels.requestNumber}</span>
              </div>
              <p className="mt-2 break-all text-sm font-semibold text-foreground" dir="ltr">
                {request.requestNumber}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {phoneForLink ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={`tel:${phoneForLink}`}>
                  <Phone className="me-2 h-4 w-4" />
                  {contactLabels.call}
                </a>
              </Button>
            ) : null}

            {whatsappPhone ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="me-2 h-4 w-4" />
                  {contactLabels.whatsapp}
                </a>
              </Button>
            ) : null}

            {email ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={`mailto:${email}`}>
                  <Mail className="me-2 h-4 w-4" />
                  {contactLabels.sendEmail}
                </a>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">{t("requests.smart.title")}</p>
            <p className="mt-1 break-words text-xs leading-6 text-muted-foreground">{t("requests.smart.description")}</p>
          </div>
        </div>
        <span className="max-w-full self-start rounded-full border border-primary/20 px-2.5 py-1 text-[11px] text-muted-foreground">
          {t(`requests.smart.workflow.${analysis.workflowStatus}`)}
        </span>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        {[
          { label: t("requests.smart.readinessScore"), value: `${analysis.readinessScore}/100` },
          { label: t("requests.smart.completenessScore"), value: `${analysis.completenessScore}/100` },
          { label: t("requests.smart.clarificationCount"), value: String(analysis.estimatedClarificationCount) },
          { label: t("requests.smart.recommendedNext"), value: t(`statuses.${recommendedStatus}`) },
        ].map((item) => (
          <div key={item.label} className="rounded-[1rem] border border-primary/15 bg-secondary/15 p-3">
            <p className="break-words text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-[1rem] border p-3 ${signalClasses[analysis.sourcingDifficulty]}`}>
          <p className="text-xs font-semibold">{t("requests.smart.sourcingDifficulty")}</p>
          <p className="mt-1 text-sm">{signalLabel(analysis.sourcingDifficulty)}</p>
        </div>
        <div className={`rounded-[1rem] border p-3 ${signalClasses[analysis.complianceRisk]}`}>
          <p className="text-xs font-semibold">{t("requests.smart.complianceRisk")}</p>
          <p className="mt-1 text-sm">{signalLabel(analysis.complianceRisk)}</p>
        </div>
      </div>

      <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("requests.smart.missingTitle")}</p>
        </div>
        {analysis.missingInformation.length ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {analysis.missingInformation.map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{missingLabel(key)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("requests.smart.noMissing")}</p>
        )}
      </div>

      <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t("requests.smart.timelineTitle")}</p>
        </div>
        <div className="mt-4 space-y-3">
          {timeline.map((event) => (
            <div key={event.key} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${event.active ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary/20 text-muted-foreground"}`}>
                {event.active ? <CheckCircle2 className="h-3 w-3" /> : null}
              </span>
              <div className="min-w-0">
                <p className={event.active ? "text-foreground" : "text-muted-foreground"}>{t(event.labelKey)}</p>
                {event.timestamp ? <p className="mt-0.5 text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString(lang === "ar" ? "ar" : "en")}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInternalSections ? (
        <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{t("requests.smart.supplierBriefTitle")}</p>
          </div>
          <pre className="mt-3 max-h-[18rem] whitespace-pre-wrap break-words font-sans text-sm leading-7 text-muted-foreground">
            {supplierBrief}
          </pre>
        </div>
      ) : null}

      {onRequestClarification || onMarkReady ? (
        <div className="rounded-[1rem] border border-border/60 bg-secondary/10 p-4">
          <p className="text-sm font-semibold">{t("requests.smart.clarificationWorkflow")}</p>
          {onRequestClarification ? (
            <Textarea
              rows={4}
              value={clarificationDraft}
              onChange={(event) => onClarificationDraftChange?.(event.target.value)}
              className="mt-3"
              placeholder={t("requests.smart.clarificationPlaceholder")}
              disabled={clarificationBusy || disabled}
            />
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {onRequestClarification ? (
              <Button type="button" variant="outline" disabled={clarificationBusy || disabled || !clarificationDraft.trim()} onClick={onRequestClarification}>
                {clarificationBusy ? t("common.saving") : t("requests.smart.requestClarification")}
              </Button>
            ) : null}
            {onMarkReady ? (
              <Button type="button" variant="gold" disabled={disabled} onClick={onMarkReady}>
                {t("requests.smart.markReadyForSourcing")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showCustomerReply ? (
        <div className="rounded-[1rem] border border-primary/20 bg-primary/8 p-4">
          <p className="text-sm font-semibold">{t("requests.smart.customerReplyTitle")}</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{t("requests.smart.customerReplyDescription")}</p>
          <Textarea
            rows={4}
            value={customerReply}
            onChange={(event) => onCustomerReplyChange?.(event.target.value)}
            className="mt-3"
            placeholder={t("requests.smart.customerReplyPlaceholder")}
            disabled={customerReplyBusy}
          />
          <Button type="button" className="mt-3" variant="gold" disabled={customerReplyBusy || !customerReply.trim()} onClick={onSubmitCustomerReply}>
            {customerReplyBusy ? t("common.saving") : t("requests.smart.submitCustomerReply")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
