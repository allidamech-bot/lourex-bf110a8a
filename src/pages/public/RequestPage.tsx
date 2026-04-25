import { SEO } from "@/components/seo/SEO";
import { ClipboardList, PackageSearch, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PurchaseRequestForm } from "@/features/purchase-requests/components/PurchaseRequestForm";
import { fetchRequests } from "@/domain/operations/service";
import { useI18n } from "@/lib/i18n";
import type { OperationsRequest } from "@/domain/operations/types";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function RequestPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editRequestId = searchParams.get("edit");
  const [editRequest, setEditRequest] = useState<OperationsRequest | null>(null);
  const [loadingEditRequest, setLoadingEditRequest] = useState(Boolean(editRequestId));
  const [editRequestError, setEditRequestError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!editRequestId) {
      setEditRequest(null);
      setLoadingEditRequest(false);
      setEditRequestError("");
      return;
    }

    setLoadingEditRequest(true);
    setEditRequestError("");

    fetchRequests()
      .then((requests) => {
        if (cancelled) return;

        const request = requests.find((item) => item.id === editRequestId) || null;
        setEditRequest(request);

        if (!request) {
          setEditRequestError(t("requests.intake.errors.notFound") || "The request could not be found.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditRequestError(t("requests.intake.errors.notFound") || "The request could not be found.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEditRequest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editRequestId, t]);

  const cards = [
    {
      icon: ClipboardList,
      title: t("requestPage.cards.detail.title"),
      desc: t("requestPage.cards.detail.desc"),
    },
    {
      icon: PackageSearch,
      title: t("requestPage.cards.conversion.title"),
      desc: t("requestPage.cards.conversion.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("requestPage.cards.trust.title"),
      desc: t("requestPage.cards.trust.desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={lang === "ar" ? "إرسال طلب شراء" : "Submit Purchase Request"}
        description={
          lang === "ar"
            ? "أرسل طلب شراء جديد لعمليات التوريد والاستيراد والتصدير عبر منصة Lourex."
            : "Submit a new purchase request for sourcing, import, and export operations through the Lourex platform."
        }
      />
      <SiteHeader />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_30%)]" />
        <div className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow={t("requestPage.eyebrow")}
                title={t("requestPage.title")}
                description={t("requestPage.description")}
              />
              <div className="grid gap-4">
                {cards.map((item) => (
                  <div key={item.title} className="rounded-[1.7rem] border border-primary/12 bg-card/90 p-5 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.2)] dark:shadow-[0_18px_42px_-34px_rgba(0,0,0,0.48)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {loadingEditRequest ? (
              <div className="rounded-[2rem] border border-border/60 bg-card/90 p-8 text-sm text-muted-foreground">
                {t("common.loading") || "Loading..."}
              </div>
            ) : editRequestId && editRequestError ? (
              <div className="rounded-[2rem] border border-destructive/20 bg-destructive/10 p-8 text-sm text-destructive">
                {editRequestError}
              </div>
            ) : (
              <PurchaseRequestForm
                mode={editRequestId ? "edit" : "create"}
                requestId={editRequestId || undefined}
                initialRequest={editRequest}
                onEditSuccess={(request) => navigate(`/customer-portal/requests?request=${request.id}`)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
