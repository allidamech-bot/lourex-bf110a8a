import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowRight, PackageSearch, Route, FileCheck2, Globe2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import { useI18n } from "@/lib/i18n";

const EN_DESCRIPTION =
  "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.";

const AR_DESCRIPTION =
  "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.";

export default function HomePage() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const reducedMotion = useReducedMotion();

  const services = [
    {
      label: isArabic ? "01 / الشوكولاتة والحلويات" : "01 / CHOCOLATE & SWEETS",
      title: isArabic ? "توريد الحلويات" : "Sweets sourcing",
      description: isArabic ? "حلول توريد للمستوردين والموزعين." : "For importers and distributors.",
      to: "/chocolate-sourcing",
      icon: PackageSearch,
      className: "bg-[#E9F5F1] dark:bg-[#122B2A]",
    },
    {
      label: isArabic ? "02 / البسكويت" : "02 / BISCUITS",
      title: isArabic ? "منتجات البسكويت" : "Biscuits",
      description: isArabic ? "تنسيق عروض وطلبات تجارية." : "Coordinated trade requests.",
      to: "/biscuits-sourcing",
      icon: FileCheck2,
      className: "bg-white dark:bg-[#11191B]",
    },
    {
      label: isArabic ? "03 / المواد الغذائية" : "03 / FOOD PRODUCTS",
      title: isArabic ? "المواد الغذائية" : "Food products",
      description: isArabic ? "مصادر توريد متعددة وفق احتياجك." : "Sourcing options tailored to your needs.",
      to: "/food-products-sourcing",
      icon: Globe2,
      className: "bg-white dark:bg-[#11191B]",
    },
  ];

  const steps = [
    {
      index: "01",
      title: isArabic ? "أرسل طلبك" : "Submit your request",
      text: isArabic ? "المنتج، الكمية والمواصفات." : "Product, quantity and specifications.",
    },
    {
      index: "02",
      title: isArabic ? "نراجع المتطلبات" : "We review the details",
      text: isArabic ? "تنسيق التوريد مع الأطراف المعنية." : "Sourcing and supplier coordination.",
    },
    {
      index: "03",
      title: isArabic ? "نتابع التنفيذ" : "Coordinate execution",
      text: isArabic ? "متابعة الصفقة حسب مراحلها." : "Deal progress, step by step.",
    },
    {
      index: "04",
      title: isArabic ? "تتبّع التسليم" : "Track delivery",
      text: isArabic ? "وضوح الحالة حتى التسليم." : "Visibility through delivery.",
    },
  ];

  const entrance = {
    initial: reducedMotion ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reducedMotion ? 0 : 0.5 },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={isArabic ? "لوريكس | تنسيق توريد وتجارة دولية" : "LOUREX | Trade & Sourcing Coordination"}
        description={isArabic ? AR_DESCRIPTION : EN_DESCRIPTION}
        url="https://www.lou-rex.com/"
      />
      <SiteHeader />
      <main>
        <HeroSection />

        <section className="border-y border-border/70 bg-card/65 py-6 dark:bg-[#0C1213]">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-4 px-4 sm:justify-between sm:px-6 lg:px-8">
            {[
              isArabic ? "وساطة وتنسيق توريد" : "Trade & sourcing",
              isArabic ? "طلبات شراء منظمة" : "Structured requests",
              isArabic ? "متابعة الشحنات" : "Shipment tracking",
            ].map((item, i) => (
              <span key={item} className="inline-flex items-center gap-3 text-[12px] font-bold text-[#50666A] dark:text-[#A1B2B4] sm:text-[13px]">
                <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (i === 1 ? "bg-[#E7B34D]" : "bg-primary")} />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32" id="sourcing">
          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...entrance} className="mb-10 flex flex-col justify-between gap-6 sm:mb-14 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {isArabic ? "مجالات العمل" : "WHAT WE SOURCE"}
                </p>
                <h2 className="mt-4 max-w-[18ch] text-[clamp(2.1rem,4vw,3.65rem)] font-bold leading-[1.18] tracking-tight text-heading">
                  {isArabic ? "مصادر توريد تبدأ من احتياجك." : "Sourcing built around your business."}
                </h2>
              </div>
              <Link to="/products" className="inline-flex min-h-11 w-fit items-center gap-2 border-b border-primary/40 py-2 text-sm font-bold text-primary transition-colors hover:border-primary">
                {isArabic ? "استعرض المنتجات" : "Discover products"}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </motion.div>

            <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <motion.div key={service.to} {...entrance} className={index === 0 ? "lg:col-span-2" : ""} transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : index * 0.08 }}>
                  <Link
                    to={service.to}
                    className={`group relative flex h-full min-h-[285px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-border/60 p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_24px_56px_-35px_rgba(8,127,120,0.28)] sm:p-9 ${service.className}`}
                  >
                    <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full border border-primary/10 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
                    <div className="pointer-events-none absolute -end-8 -top-8 h-36 w-36 rounded-full border border-primary/10" aria-hidden="true" />
                    <div className="relative flex items-center justify-between gap-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{service.label}</span>
                      <service.icon className="h-6 w-6 text-primary/70" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <h3 className="text-[clamp(1.5rem,2.5vw,2.25rem)] font-bold leading-snug text-heading">{service.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{service.description}</p>
                      <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 text-primary transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowUpRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
              <motion.div {...entrance} className="flex min-h-[285px] flex-col justify-between rounded-[1.75rem] border border-[#1A7770] bg-[#087F78] p-7 text-white dark:border-[#225954] dark:bg-[#143F3B] sm:p-9 lg:col-span-2">
                <Globe2 className="h-7 w-7 text-[#D6F5F0]" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3 className="text-2xl font-bold leading-snug">
                    {isArabic ? "منتجات تركية وسورية" : "Turkish & Syrian products"}
                  </h3>
                  <div className="mt-6 flex flex-wrap gap-5">
                    <Link to="/turkish-products" className="inline-flex min-h-10 items-center gap-2 border-b border-white/50 text-sm font-semibold hover:border-white">
                      {isArabic ? "المنتجات التركية" : "Turkish products"} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                    <Link to="/syrian-products" className="inline-flex min-h-10 items-center gap-2 border-b border-white/50 text-sm font-semibold hover:border-white">
                      {isArabic ? "المنتجات السورية" : "Syrian products"} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-border/60 bg-[#E9F3F0] py-20 dark:bg-[#11191B] sm:py-28" id="process">
          <div aria-hidden="true" className="pointer-events-none absolute -end-48 bottom-[-17rem] h-[40rem] w-[40rem] rounded-full border border-primary/10" />
          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...entrance} className="max-w-[43rem]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{isArabic ? "رحلة العمل" : "THE PROCESS"}</p>
              <h2 className="mt-4 text-[clamp(2.1rem,4vw,3.65rem)] font-bold leading-tight tracking-tight text-heading">
                {isArabic ? "من طلب واضح إلى متابعة دقيقة." : "From request to delivery. Clearly."}
              </h2>
            </motion.div>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div {...entrance} key={step.index} transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.07 * index }} className="relative flex min-h-[210px] flex-col rounded-[1.5rem] border border-border/70 bg-card p-6 dark:bg-[#172124]">
                  <div className="mb-auto flex items-center justify-between">
                    <span className="text-4xl font-light tabular-nums tracking-tight text-primary/50">{step.index}</span>
                    {index < steps.length - 1 ? <ArrowRight aria-hidden="true" className="h-4 w-4 text-primary/50 rtl:rotate-180" /> : <Route className="h-5 w-5 text-primary" aria-hidden="true" />}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-heading">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </motion.div>
              ))}
            </div>
            <Link to="/track" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">
              {isArabic ? "تتبع شحنة" : "Track a shipment"} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[#092B2A] py-20 text-white dark:bg-[#070B0D] sm:py-28">
          <div className="pointer-events-none absolute -end-28 -top-56 h-[38rem] w-[38rem] rounded-full border border-[#36D3C0]/20" aria-hidden="true" />
          <div className="pointer-events-none absolute -end-8 -top-32 h-[26rem] w-[26rem] rounded-full border border-[#36D3C0]/15" aria-hidden="true" />
          <div className="container relative mx-auto grid items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-8">
            <motion.div {...entrance}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72E5D8]">{isArabic ? "منصة العمليات" : "THE LOUREX WORKSPACE"}</p>
              <h2 className="mt-5 max-w-[18ch] text-[clamp(2.25rem,4.2vw,4rem)] font-bold leading-[1.17] tracking-tight">
                {isArabic ? "كل خطوة في مكانها." : "Every step in its place."}
              </h2>
              <p className="mt-5 max-w-lg text-[16px] leading-8 text-[#B2CFCA]">
                {isArabic ? "الطلبات، الصفقات والتتبع عبر مساحة عمل موحّدة، بحسب صلاحيات كل طرف." : "Requests, deals and tracking in one workspace, tailored to each role."}
              </p>
              <Link to="/auth" className="mt-9 inline-flex min-h-12 items-center gap-3 rounded-2xl bg-[#36D3C0] px-6 py-3 text-sm font-bold text-[#071C1D] transition hover:bg-[#8AEEDF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#36D3C0]/30">
                {isArabic ? "الدخول إلى مساحة العمل" : "Enter your workspace"} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div {...entrance} className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] p-6 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.8)] backdrop-blur-md sm:p-9">
              <div className="flex items-center justify-between border-b border-white/15 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#36D3C0]" aria-hidden="true" />
                  <span className="text-sm font-semibold">{isArabic ? "مساحة العمل" : "Workspace"}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#72E5D8]">LOUREX</span>
              </div>
              {[
                { label: isArabic ? "طلبات الشراء" : "Purchase requests", to: "/request", icon: PackageSearch },
                { label: isArabic ? "متابعة الشحن" : "Shipment tracking", to: "/track", icon: Route },
                { label: isArabic ? "المعلومات والخدمات" : "Company & services", to: "/about", icon: Globe2 },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="group flex min-h-[76px] items-center justify-between gap-4 border-b border-white/10 py-4 last:border-0 hover:text-[#72E5D8]">
                  <div className="flex items-center gap-4">
                    <item.icon className="h-5 w-5 text-[#72E5D8]" strokeWidth={1.6} aria-hidden="true" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="bg-background py-20 sm:py-28">
          <div className="container mx-auto flex flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{isArabic ? "ابدأ الآن" : "LET'S TALK BUSINESS"}</p>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight tracking-tight text-heading">
                {isArabic ? "جاهز لتبدأ رحلة التوريد؟" : "Ready to source with confidence?"}
              </h2>
            </div>
            <Link to="/request" className="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-2xl bg-primary px-7 py-3 font-bold text-primary-foreground transition hover:opacity-90">
              {isArabic ? "قدّم طلبك" : "Start a request"} <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
