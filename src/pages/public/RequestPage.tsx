import { SEO } from "@/components/seo/SEO";
import { ClipboardList, PackageSearch, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PurchaseRequestForm } from "@/features/purchase-requests/components/PurchaseRequestForm";
import { useI18n } from "@/lib/i18n";

export default function RequestPage() {
  const { lang } = useI18n();

  const cards = [
    {
      icon: ClipboardList,
      title: lang === "ar" ? "طھظپط§طµظٹظ„ ظ‚ط§ط¨ظ„ط© ظ„ظ„ظ…ط±ط§ط¬ط¹ط©" : "Review-ready detail",
      desc:
        lang === "ar"
          ? "ظ†ط·ظ„ط¨ طھظپط§طµظٹظ„ ظˆطµظˆط±ظ‹ط§ ط­ظ‚ظٹظ‚ظٹط© ط­طھظ‰ ظ„ط§ ظٹطھط­ظˆظ„ ط§ظ„ط·ظ„ط¨ ط¥ظ„ظ‰ ظ…ط±ط§ط³ظ„ط§طھ ط؛ط§ظ…ط¶ط© ظٹطµط¹ط¨ طھظ†ظپظٹط°ظ‡ط§."
          : "We ask for real images and useful detail so the request does not become a vague message thread.",
    },
    {
      icon: PackageSearch,
      title: lang === "ar" ? "ط¬ط§ظ‡ط² ظ„ظ„طھط­ظˆظٹظ„ ط¥ظ„ظ‰ طµظپظ‚ط©" : "Ready for deal conversion",
      desc:
        lang === "ar"
          ? "ط¨ط¹ط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط© ظٹظ…ظƒظ† ظ„ظپط±ظٹظ‚ Lourex طھط­ظˆظٹظ„ ط§ظ„ط·ظ„ط¨ ط¥ظ„ظ‰ ط¹ظ…ظ„ظٹط© طھط´ط؛ظٹظ„ظٹط© ط¯ط§ط®ظ„ ظ„ظˆط­ط© ط§ظ„طھط­ظƒظ… ظ…ط¨ط§ط´ط±ط©."
          : "After review, the Lourex team can convert the request into an operational deal inside the dashboard.",
    },
    {
      icon: ShieldCheck,
      title: lang === "ar" ? "ط«ظ‚ط© ط£ط¹ظ„ظ‰ ظپظٹ ط§ظ„طھظ†ظپظٹط°" : "Higher execution trust",
      desc:
        lang === "ar"
          ? "ط§ظ„ظ…ط³ط§ط± ظٹط¨ط¯ط£ ظ…ظ† ظ‡ظ†ط§ ط«ظ… ظٹظ†طھظ‚ظ„ ط¥ظ„ظ‰ ط§ظ„طھطھط¨ط¹ ظˆط§ظ„ظ…ط­ط§ط³ط¨ط© ظˆط§ظ„ط³ط¬ظ„ ط§ظ„طھط¯ظ‚ظٹظ‚ظٹ ط¯ط§ط®ظ„ ظ†ظپط³ ط§ظ„ظ…ظ†طµط©."
          : "The flow starts here, then continues into tracking, accounting, and audit context within the same system.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={lang === "ar" ? "ط¥ط±ط³ط§ظ„ ط·ظ„ط¨ ط´ط±ط§ط،" : "Submit Purchase Request"}
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
                eyebrow={lang === "ar" ? "ط§ط³طھظ‚ط¨ط§ظ„ ط§ظ„ط·ظ„ط¨" : "Purchase Intake"}
                title={lang === "ar" ? "ط¥ط±ط³ط§ظ„ ط·ظ„ط¨ ط´ط±ط§ط، ط¨ظ…ط³طھظˆظ‰ طھظ†ظپظٹط°ظٹ" : "Submit an execution-ready purchase request"}
                description={
                  lang === "ar"
                    ? "ظ‡ط°ظ‡ ط§ظ„طµظپط­ط© ظ„ظٹط³طھ ظ†ظ…ظˆط°ط¬ ط§طھطµط§ظ„ ط¹ط§ط¯ظٹ. ط¥ظ†ظ‡ط§ ظ†ظ‚ط·ط© ط¯ط®ظˆظ„ ط±ط³ظ…ظٹط© ظ„ط¹ظ…ظ„ظٹط© LourexطŒ ظ„ط°ظ„ظƒ طµظ…ظ…ظ†ط§ظ‡ط§ ظ„طھظƒظˆظ† ط£ظƒط«ط± ظˆط¶ظˆط­ظ‹ط§ ظˆظ‡ط¯ظˆط،ظ‹ط§ ظˆط«ظ‚ط©."
                    : "This is not a generic contact form. It is the formal intake point for a Lourex operation, designed for clarity, trust, and real execution."
                }
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

            <PurchaseRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}
