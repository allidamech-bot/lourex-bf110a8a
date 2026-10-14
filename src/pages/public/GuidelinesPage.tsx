import { ArrowUpRight, ClipboardList, FileCheck2, MapPinned, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SEO } from "@/components/seo/SEO";
import { useI18n } from "@/lib/i18n";

export default function GuidelinesPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: ar ? "جهّز تفاصيل طلبك" : "Prepare your request",
      body: ar
        ? "اكتب اسم المنتج والمواصفات والكمية وبلد التسليم ومتطلبات التعبئة أو الملصقات. أرفق المستندات أو الصور إن توفرت."
        : "Specify the product, quantity, destination and any packaging or labeling requirements. Attach useful files or photos if available.",
    },
    {
      number: "02",
      icon: FileCheck2,
      title: ar ? "أرسل الطلب للمراجعة" : "Submit for review",
      body: ar
        ? "استخدم نموذج طلب التوريد. يراجع الفريق المعلومات، وقد يتواصل معك لتوضيح التفاصيل قبل متابعة تنسيق المصادر."
        : "Use the sourcing request form. The team reviews your details and may ask for clarification before coordinating sourcing.",
    },
    {
      number: "03",
      icon: MapPinned,
      title: ar ? "تابع الخطوات التجارية" : "Follow the next steps",
      body: ar
        ? "يمكنك مراجعة طلباتك من بوابة العميل، واستخدام صفحة التتبع عندما يتوفر لديك مرجع تتبع صالح."
        : "Review your requests in the customer portal. Use the tracking page whenever you have a valid tracking reference.",
    },
  ];
  const links = [
    { to: "/request", icon: ClipboardList, title: ar ? "إرسال طلب توريد" : "Submit a sourcing request", description: ar ? "ابدأ بالتفاصيل الأساسية." : "Start with the essential details." },
    { to: "/track", icon: MapPinned, title: ar ? "تتبع الطلب" : "Track a request", description: ar ? "لديك مرجع تتبع؟" : "Have a tracking reference?" },
    { to: "/contact", icon: MessageCircle, title: ar ? "تواصل معنا" : "Contact LOUREX", description: ar ? "للأسئلة أو التوضيحات." : "For questions or clarification." },
  ];

  return (
    <div className="lourex-public lourex-guidelines min-h-screen bg-background text-foreground">
      <SEO
        title={ar ? "إرشادات استخدام لوريكس" : "LOUREX | Sourcing guidelines"}
        description={ar
          ? "دليل عملي لإرسال طلب توريد إلى لوريكس ومتابعته والتواصل مع الفريق."
          : "A practical guide to preparing and submitting a sourcing request and following up with LOUREX."}
        url="https://www.lou-rex.com/guidelines"
      />
      <SiteHeader />
      <main className="lrx-interior-main container mx-auto px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <header className="lrx-interior-intro">
          <p className="lrx-interior-kicker">LOUREX / {ar ? "دليل التوريد" : "SOURCING GUIDE"}</p>
          <h1>{ar ? "من التفاصيل إلى الخطوة التالية." : "Your next step starts with clarity."}</h1>
          <p className="lrx-interior-lead">
            {ar
              ? "تعرّف على طريقة إعداد طلب واضح، وما يحدث بعد إرساله، وكيف تتابع مع فريق لوريكس."
              : "See what to include in your request, how the review works and where to follow up with the LOUREX team."}
          </p>
        </header>

        <section aria-labelledby="guidelines-steps-title" className="mt-9 sm:mt-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="guidelines-steps-title" className="text-xl font-bold text-heading sm:text-2xl">{ar ? "طريقة العمل" : "How it works"}</h2>
            <span aria-hidden="true" className="h-px w-12 bg-[#d6ad6c]/60" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="lrx-interior-card flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tabular-nums tracking-[.12em] text-[#d6ad6c]">{step.number}</span>
                  <step.icon className="h-5 w-5 text-[#d6ad6c]" strokeWidth={1.6} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold leading-snug text-heading">{step.title}</h3>
                <p className="text-sm leading-8 text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="guidelines-action-title" className="mt-8 grid gap-6 border-t border-border/70 pt-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
          <div className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center border border-[#d6ad6c]/30 bg-[#d6ad6c]/10 text-[#d6ad6c]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id="guidelines-action-title" className="text-xl font-bold text-heading sm:text-2xl">
              {ar ? "اختر الخطوة المناسبة" : "Choose where to go next"}
            </h2>
            <p className="max-w-md text-sm leading-8 text-muted-foreground">
              {ar
                ? "هذه إرشادات استخدام وليست شروطًا تعاقدية. للمعلومات القانونية راجع صفحة الشروط والأحكام."
                : "This is a practical guide, not a contract. See the Terms page for legal information."}
            </p>
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#d6ad6c] underline-offset-4 hover:underline" to="/terms">
              {ar ? "قراءة الشروط والأحكام" : "Read terms & conditions"}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3">
            {links.map((link) => (
              <Link to={link.to} key={link.to} className="lrx-interior-link group">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#d6ad6c]/25 bg-[#d6ad6c]/[.06] text-[#d6ad6c]">
                  <link.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-heading">{link.title}</span>
                  <span className="mt-1 block text-xs leading-6 text-muted-foreground">{link.description}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#d6ad6c] transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
