import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Globe2,
  Handshake,
  MapPinned,
  PackageSearch,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import HomeProductSpotlight from "@/components/home/HomeProductSpotlight";
import TradeNetworkExperience from "@/components/home/TradeNetworkExperience";
import { useI18n } from "@/lib/i18n";

const EN_DESCRIPTION =
  "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.";

const AR_DESCRIPTION =
  "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.";

export default function HomePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const [activeSector, setActiveSector] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const sectors = [
    {
      eyebrow: ar ? "01 — الأغذية والحلويات" : "01 — CONFECTIONERY",
      name: ar ? "الشوكولاتة والحلويات" : "Chocolate & sweets",
      short: ar ? "خيارات توريد للعلامات والموزعين والمستوردين." : "Sourcing for brands, importers and distributors.",
      statement: ar ? "من المنتج الذي تريده، إلى شريك التوريد المناسب." : "From the product you need to the sourcing partner who fits.",
      link: "/chocolate-sourcing",
      cta: ar ? "اكتشف توريد الشوكولاتة" : "Explore confectionery sourcing",
      icon: PackageSearch,
    },
    {
      eyebrow: ar ? "02 — المنتجات المعبأة" : "02 — PACKAGED GOODS",
      name: ar ? "البسكويت والوجبات الخفيفة" : "Biscuits & snacks",
      short: ar ? "تنسيق مواصفات التعبئة والكميات والطلبات." : "Coordinating packaging, quantities and purchase requests.",
      statement: ar ? "تفاصيل واضحة تجعل كل طلب قابلًا للتنفيذ." : "Clear requirements turn an inquiry into an actionable request.",
      link: "/biscuits-sourcing",
      cta: ar ? "اكتشف توريد البسكويت" : "Explore biscuit sourcing",
      icon: ClipboardCheck,
    },
    {
      eyebrow: ar ? "03 — توريد الأغذية" : "03 — FOOD SOURCING",
      name: ar ? "المنتجات الغذائية" : "Food products",
      short: ar ? "مصادر متعددة وطلبات مصممة حسب احتياج العمل." : "Flexible sourcing tailored to commercial requirements.",
      statement: ar ? "اختيارات أوسع، وتنسيق يربط التفاصيل ببعضها." : "More sourcing options, coordinated in one clear process.",
      link: "/food-products-sourcing",
      cta: ar ? "استكشف المنتجات الغذائية" : "Explore food sourcing",
      icon: Globe2,
    },
  ];

  const journey = [
    {
      number: "01",
      title: ar ? "حدّد ما تحتاجه" : "Define the requirement",
      short: ar ? "مواصفات، كميات ووجهة." : "Specs, quantities, destination.",
      label: ar ? "طلب الشراء" : "PURCHASE REQUEST",
      headline: ar ? "البداية الصحيحة تصنع فرقًا." : "Start with clarity.",
      description: ar
        ? "أرسل المنتج والمواصفات والكمية المطلوبة ضمن طلب واحد منظم."
        : "Bring products, specifications and quantities together in one structured request.",
      cta: ar ? "إنشاء طلب" : "Create request",
      to: "/request",
      icon: ClipboardCheck,
    },
    {
      number: "02",
      title: ar ? "نراجع مصادر التوريد" : "Coordinate sourcing",
      short: ar ? "تواصل منظم مع الموردين." : "Organised supplier coordination.",
      label: ar ? "تنسيق الموردين" : "SUPPLIER COORDINATION",
      headline: ar ? "الشريك المناسب يبدأ بمعلومات واضحة." : "Better sourcing starts with better coordination.",
      description: ar
        ? "ننسّق المتطلبات مع الأطراف المناسبة ونرتّب مسار المتابعة."
        : "Align commercial requirements with the appropriate sourcing parties.",
      cta: ar ? "تعرّف على لوريكس" : "About LOUREX",
      to: "/about",
      icon: Handshake,
    },
    {
      number: "03",
      title: ar ? "نتابع الصفقة" : "Follow the operation",
      short: ar ? "مراحل ومسؤوليات واضحة." : "Visible stages and responsibilities.",
      label: ar ? "إدارة العمليات" : "TRADE OPERATIONS",
      headline: ar ? "كل خطوة لها مكان واضح." : "Every step in context.",
      description: ar
        ? "معلومات الطلب والتنسيق والمتابعة داخل مسار عمل واحد حسب صلاحيات كل طرف."
        : "Request details and follow-up belong in one role-aware workspace.",
      cta: ar ? "بوابة الأعمال" : "Business workspace",
      to: "/auth",
      icon: ShieldCheck,
    },
    {
      number: "04",
      title: ar ? "نراقب مسار الشحنة" : "Track the shipment",
      short: ar ? "متابعة واضحة حتى التسليم." : "Visibility towards delivery.",
      label: ar ? "متابعة الشحن" : "SHIPMENT TRACKING",
      headline: ar ? "اعرف أين وصلت شحنتك." : "Keep the journey visible.",
      description: ar
        ? "اطّلع على حالة الشحنة ومراحلها المتاحة من خلال رقم التتبع."
        : "Look up available shipment status and milestones using your tracking reference.",
      cta: ar ? "تتبع شحنة" : "Track shipment",
      to: "/track",
      icon: Route,
    },
  ];

  const sector = sectors[activeSector];
  const SectorIcon = sector.icon;
  const step = journey[activeStep];
  const StepIcon = step.icon;

  const reveal = {
    initial: reducedMotion ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.13 },
    transition: { duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SEO
        title={ar ? "لوريكس | توريد وتجارة دولية" : "LOUREX | International Trade & Sourcing"}
        description={ar ? AR_DESCRIPTION : EN_DESCRIPTION}
        url="https://www.lou-rex.com/"
      />
      <SiteHeader />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[1100] h-[3px] origin-left bg-primary dark:bg-[#58E0D0]"
        style={{ scaleX: progress, transformOrigin: ar ? "right center" : "left center" }}
      />
      <main>
        <HeroSection />

        {/* A quiet editorial ribbon, not invented performance metrics. */}
        <section aria-label={ar ? "خدمات لوريكس" : "LOUREX capabilities"} className="relative border-y border-border/65 bg-white dark:bg-[#10191B]" id="explore">
          <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-x-5 gap-y-6 px-5 py-8 sm:px-8 md:grid-cols-4 lg:px-10 xl:px-14">
            {[
              { icon: Compass, label: ar ? "شبكة توريد" : "SOURCING", detail: ar ? "ربط الاحتياج بالمصدر" : "Connect with sources" },
              { icon: ClipboardCheck, label: ar ? "طلبات منظمة" : "TRADE REQUESTS", detail: ar ? "من الطلب إلى المتابعة" : "Structured workflows" },
              { icon: Handshake, label: ar ? "تنسيق تجاري" : "COORDINATION", detail: ar ? "علاقات وخطوات أوضح" : "Aligned trade partners" },
              { icon: Truck, label: ar ? "تتبع الشحن" : "LOGISTICS", detail: ar ? "وضوح مراحل التسليم" : "Delivery visibility" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-start gap-3 md:border-e md:border-border/70 md:pe-5 md:last:border-e-0">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.11em] text-heading rtl:tracking-normal">{item.label}</p>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.detail}</p>
                  <span className="sr-only">{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sector selector: interactive actual sourcing routes, not static card repetition. */}
        <section id="sourcing" className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-36" aria-labelledby="sourcing-title">
          <div className="pointer-events-none absolute -end-64 top-12 h-[34rem] w-[34rem] rounded-full border border-primary/10" aria-hidden="true" />
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-10 xl:px-14">
            <motion.div {...reveal} className="mb-11 flex flex-col justify-between gap-8 lg:mb-16 lg:flex-row lg:items-end">
              <div className="max-w-[47rem]">
                <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary rtl:tracking-normal">
                  <span className="h-px w-9 bg-primary/55" aria-hidden="true" />
                  {ar ? "مجالات التوريد" : "OUR EXPERTISE"}
                </p>
                <h2 id="sourcing-title" className="mt-6 text-[clamp(2.35rem,4.4vw,4.6rem)] font-extrabold leading-[1.18] tracking-[-0.04em] text-heading rtl:tracking-normal">
                  {ar ? <>أكثر من منتجات. <span className="text-primary">شراكات تفتح أبوابًا.</span></> : <>Beyond products. <span className="text-primary">Built on connections.</span></>}
                </h2>
              </div>
              <Link to="/products" className="group inline-flex min-h-12 w-fit items-center gap-3 border-b border-primary/45 py-2 text-sm font-bold text-primary transition-colors hover:border-primary">
                {ar ? "استعرض كتالوج المنتجات" : "Explore the catalog"}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </motion.div>

            <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8">
              <motion.div {...reveal} className="relative min-h-[420px] overflow-hidden rounded-[28px] bg-[#0E3430] p-7 text-white shadow-[0_35px_85px_-55px_rgba(8,127,120,0.65)] sm:min-h-[540px] sm:p-11">
                <div className="pointer-events-none absolute -end-20 -top-48 h-[36rem] w-[36rem] rounded-full border border-[#79E7D9]/20" aria-hidden="true" />
                <div className="pointer-events-none absolute -end-12 -top-20 h-[25rem] w-[25rem] rounded-full border border-[#79E7D9]/20" aria-hidden="true" />
                <div className="pointer-events-none absolute -end-5 top-7 h-[17rem] w-[17rem] rounded-full border border-[#79E7D9]/20" aria-hidden="true" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9CEBDD] rtl:tracking-normal">LOUREX / SOURCING</span>
                  <span className="text-xs font-bold tabular-nums text-[#B1E5DC]">0{activeSector + 1} / 03</span>
                </div>

                <div className="absolute end-[9%] top-[20%] flex h-40 w-40 items-center justify-center rounded-full border border-[#81E8DA]/25 bg-[#19645C]/20 text-[#84EADB] shadow-[0_0_85px_rgba(84,211,194,0.18)] sm:h-56 sm:w-56" aria-hidden="true">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={activeSector} initial={reducedMotion ? false : { opacity: 0, scale: 0.8, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={reducedMotion ? undefined : { opacity: 0, scale: 1.12, rotate: 10 }} transition={{ duration: reducedMotion ? 0 : 0.4 }}>
                      <SectorIcon className="h-20 w-20 stroke-[0.7] sm:h-28 sm:w-28" />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="relative z-10 flex h-full min-h-[345px] flex-col justify-end sm:min-h-[455px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={activeSector} initial={reducedMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -12 }} transition={{ duration: reducedMotion ? 0 : 0.35 }} aria-live="polite">
                      <p className="max-w-[28rem] text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#8EE8DA] rtl:tracking-normal">{sector.eyebrow}</p>
                      <h3 className="mt-4 max-w-[21ch] text-[clamp(1.85rem,3.6vw,3.2rem)] font-extrabold leading-[1.2] tracking-tight text-white rtl:tracking-normal">{sector.statement}</h3>
                      <Link to={sector.link} className="group mt-8 inline-flex min-h-12 w-fit items-center gap-3 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-[13px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                        {sector.cta}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div {...reveal} className="flex flex-col gap-3" aria-label={ar ? "اختر قطاع التوريد" : "Select a sourcing sector"}>
                {sectors.map((item, i) => (
                  <button
                    key={item.link}
                    type="button"
                    onClick={() => setActiveSector(i)}
                    aria-pressed={activeSector === i}
                    className={"group relative flex min-h-[131px] w-full items-center gap-5 overflow-hidden rounded-[23px] border px-5 py-6 text-start transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-7 " + (
                      activeSector === i
                        ? "border-primary/35 bg-[#E5F5F0] shadow-[0_18px_45px_-34px_rgba(8,127,120,0.5)] dark:border-[#56DCCA]/35 dark:bg-[#15312F]"
                        : "border-border/75 bg-card hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/60"
                    )}
                  >
                    <div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors " + (activeSector === i ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary")}>
                      <item.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary rtl:tracking-normal">{item.eyebrow}</span>
                      <span className="mt-2 block text-[18px] font-extrabold text-heading sm:text-[21px]">{item.name}</span>
                      <span className="mt-1 block text-[13px] leading-6 text-muted-foreground">{item.short}</span>
                    </div>
                    <ArrowDownRight className={"h-5 w-5 shrink-0 transition-transform duration-300 " + (activeSector === i ? "rotate-[-45deg] text-primary" : "text-muted-foreground group-hover:-rotate-45 group-hover:text-primary")} aria-hidden="true" />
                  </button>
                ))}
                <div className="mt-auto flex flex-wrap gap-x-5 gap-y-3 rounded-[22px] border border-border/70 bg-card px-6 py-5">
                  <Link to="/turkish-products" className="inline-flex min-h-9 items-center gap-2 text-[13px] font-bold text-heading hover:text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {ar ? "منتجات تركية" : "Turkish products"}
                    <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                  <Link to="/syrian-products" className="inline-flex min-h-9 items-center gap-2 text-[13px] font-bold text-heading hover:text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E4B458]" />
                    {ar ? "منتجات سورية" : "Syrian products"}
                    <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <HomeProductSpotlight />

        {/* An actual interactive journey, showing the four existing site workflows. */}
        <section id="process" aria-labelledby="process-title" className="relative isolate overflow-hidden bg-[#091715] py-20 text-white sm:py-28 lg:py-36">
          <div className="pointer-events-none absolute -start-64 -top-44 h-[38rem] w-[38rem] rounded-full bg-[#135D55]/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -end-32 -bottom-44 h-[32rem] w-[32rem] rounded-full border border-[#68DCCC]/10" aria-hidden="true" />
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-10 xl:px-14">
            <motion.div {...reveal} className="mb-11 max-w-3xl lg:mb-16">
              <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#73E5D5] rtl:tracking-normal">
                <span className="h-px w-9 bg-[#73E5D5]/65" aria-hidden="true" />
                {ar ? "رحلة العمل" : "THE TRADE JOURNEY"}
              </p>
              <h2 id="process-title" className="mt-6 text-[clamp(2.35rem,4.4vw,4.6rem)] font-extrabold leading-[1.17] tracking-tight text-white rtl:tracking-normal">
                {ar ? <>عملية مترابطة. <span className="text-[#65DFCE]">من البداية إلى النهاية.</span></> : <>One connected process. <span className="text-[#65DFCE]">Every step matters.</span></>}
              </h2>
            </motion.div>

            <div className="grid items-stretch gap-7 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-12">
              <div className="flex flex-col" aria-label={ar ? "خطوات عمل لوريكس" : "LOUREX process steps"}>
                {journey.map((item, i) => (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => setActiveStep(i)}
                    aria-pressed={activeStep === i}
                    className={"group flex w-full items-center gap-5 border-b py-5 text-start transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73E5D5]/60 sm:py-7 " + (
                      activeStep === i ? "border-[#62DDCD]/55" : "border-white/15 hover:border-white/40"
                    )}
                  >
                    <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[12px] font-extrabold tabular-nums transition-colors " + (
                      activeStep === i ? "border-[#65DFCE] bg-[#65DFCE] text-[#062320]" : "border-white/20 text-white/55"
                    )}>{item.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className={"block text-[18px] font-bold transition-colors sm:text-[21px] " + (activeStep === i ? "text-white" : "text-[#AABEB9] group-hover:text-white")}>{item.title}</span>
                      <span className="mt-1 block text-[12px] leading-6 text-[#829E98] sm:text-[13px]">{item.short}</span>
                    </span>
                    <ArrowUpRight className={"h-5 w-5 shrink-0 transition-all duration-300 rtl:-scale-x-100 " + (activeStep === i ? "text-[#73E5D5]" : "text-[#628079] group-hover:text-[#73E5D5]")} aria-hidden="true" />
                  </button>
                ))}
                <div className="mt-8 flex items-center gap-2">
                  {journey.map((item, i) => (
                    <button
                      key={item.number}
                      type="button"
                      onClick={() => setActiveStep(i)}
                      aria-label={(ar ? "المرحلة " : "Stage ") + item.number}
                      aria-pressed={activeStep === i}
                      className={"h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#73E5D5] " + (activeStep === i ? "w-11 bg-[#73E5D5]" : "w-5 bg-white/20 hover:bg-white/40")}
                    />
                  ))}
                </div>
              </div>

              <div className="relative flex min-h-[460px] flex-col overflow-hidden rounded-[28px] border border-[#38524E]/70 bg-[linear-gradient(140deg,#132D29,#0E2522_62%,#071C1A)] p-6 shadow-[0_40px_90px_-55px_rgba(0,0,0,0.85)] sm:min-h-[565px] sm:p-10">
                <div className="pointer-events-none absolute -end-20 -top-36 h-[29rem] w-[29rem] rounded-full border border-[#62DDCD]/15" aria-hidden="true" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#73E5D5]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B3DDD6]">LOUREX / WORKFLOW</span>
                  </div>
                  <span className="font-mono text-xs text-[#8ABBB0]">{step.number} / 04</span>
                </div>

                <div className="relative mt-8 min-h-[210px] sm:mt-11 sm:min-h-[245px]">
                  <svg viewBox="0 0 640 300" className="absolute inset-0 h-full w-full overflow-visible" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                    <path d="M62 234 C145 234 154 99 237 124 S 343 285 405 189 S 500 85 578 80" stroke="#709F96" strokeOpacity="0.27" strokeWidth="2" strokeDasharray="5 8" />
                    <motion.path
                      d="M62 234 C145 234 154 99 237 124 S 343 285 405 189 S 500 85 578 80"
                      stroke="#71E3D2"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      initial={false}
                      animate={{ pathLength: (activeStep + 1) / journey.length }}
                      transition={{ duration: reducedMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
                    />
                    {[
                      [62, 234],
                      [237, 124],
                      [405, 189],
                      [578, 80],
                    ].map(([cx, cy], index) => (
                      <g key={index}>
                        <circle cx={cx} cy={cy} r="15" stroke="#8FE9DC" strokeOpacity={index <= activeStep ? "0.5" : "0.13"} strokeWidth="1" />
                        <circle cx={cx} cy={cy} r={index === activeStep ? "8" : "5"} fill={index <= activeStep ? "#8BE9DA" : "#39615A"} />
                      </g>
                    ))}
                  </svg>
                  <div className="pointer-events-none absolute -end-2 top-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A0C9C0]/65" aria-hidden="true">
                    COORDINATED TRADE
                  </div>
                </div>

                <div className="relative z-10 mt-auto border-t border-white/15 pt-7 sm:pt-8">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeStep}
                      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                      transition={{ duration: reducedMotion ? 0 : 0.36 }}
                      aria-live="polite"
                    >
                      <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#83E6D8] rtl:tracking-normal">
                        <StepIcon className="h-4 w-4" aria-hidden="true" />
                        {step.label}
                      </p>
                      <h3 className="mt-4 max-w-[24ch] text-[clamp(1.55rem,2.7vw,2.65rem)] font-bold leading-[1.23] text-white">{step.headline}</h3>
                      <p className="mt-3 max-w-lg text-[14px] leading-7 text-[#A8C3BD]">{step.description}</p>
                      <Link to={step.to} className="group mt-6 inline-flex min-h-11 items-center gap-3 text-sm font-bold text-[#86EADA] hover:text-white">
                        {step.cta}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 rtl:-scale-x-100" aria-hidden="true" />
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TradeNetworkExperience />

        {/* Editorial reassurance without fictitious certifications, numbers or testimonials. */}
        <section className="relative overflow-hidden bg-[#E9F3EF] py-20 dark:bg-[#11201E] sm:py-28 lg:py-32">
          <div className="mx-auto grid max-w-[1500px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.87fr)_minmax(0,1.13fr)] lg:gap-20 lg:px-10 xl:px-14">
            <motion.div {...reveal}>
              <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary rtl:tracking-normal">
                <span className="h-px w-9 bg-primary/55" aria-hidden="true" />
                {ar ? "لماذا لوريكس؟" : "THE LOUREX APPROACH"}
              </p>
              <h2 className="mt-6 text-[clamp(2.25rem,4.2vw,4.3rem)] font-extrabold leading-[1.18] tracking-tight text-heading rtl:tracking-normal">
                {ar ? "التجارة ليست مجرد شحنة. إنها ثقة تُبنى." : "Trade is more than a shipment. It's a relationship."}
              </h2>
              <p className="mt-6 max-w-[31rem] text-[16px] leading-9 text-muted-foreground">
                {ar
                  ? "نؤمن أن وضوح التفاصيل، والتنسيق بين الأطراف، واستمرارية المتابعة هي أساس العلاقة التجارية الناجحة."
                  : "Clear information, aligned partners and consistent follow-through are the foundation of better business."}
              </p>
              <Link to="/about" className="group mt-8 inline-flex min-h-12 items-center gap-3 border-b border-primary/45 py-2 text-sm font-bold text-primary transition-colors hover:border-primary">
                {ar ? "تعرّف على شركتنا" : "Discover our company"}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </motion.div>

            <motion.div {...reveal} className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-7 shadow-[0_30px_65px_-55px_rgba(8,127,120,0.35)] sm:p-11">
              <div className="pointer-events-none absolute -end-28 -top-40 h-[25rem] w-[25rem] rounded-full border border-primary/10" aria-hidden="true" />
              <div className="pointer-events-none absolute -end-14 -top-28 h-[20rem] w-[20rem] rounded-full border border-primary/10" aria-hidden="true" />
              <div className="relative flex items-center justify-between border-b border-border/80 pb-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-primary rtl:tracking-normal">LOUREX / PRINCIPLES</span>
                <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
              </div>
              {[
                { icon: Check, title: ar ? "مواصفات واضحة" : "Clear specifications", desc: ar ? "المنتج والكمية والاحتياج في ملف منظم." : "Products, quantity and requirements in context." },
                { icon: Handshake, title: ar ? "تنسيق بين الأطراف" : "Aligned partnerships", desc: ar ? "تواصل وخطوات عمل أكثر وضوحًا." : "Commercial coordination with defined steps." },
                { icon: MapPinned, title: ar ? "متابعة متصلة" : "Connected follow-through", desc: ar ? "رؤية أفضل لمراحل الطلب والشحنة." : "Better visibility into request and shipment stages." },
              ].map((item, index) => (
                <div key={item.title} className="group flex gap-5 border-b border-border/75 py-7 last:border-b-0 last:pb-0">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:-translate-y-1">
                    <item.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-primary/75">0{index + 1}</p>
                    <h3 className="mt-1 text-[18px] font-bold text-heading sm:text-[20px]">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-7 text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Signature closing action. */}
        <section className="bg-background px-5 py-16 sm:px-8 sm:py-24 lg:px-10 xl:px-14">
          <motion.div {...reveal} className="relative mx-auto max-w-[1450px] overflow-hidden rounded-[30px] bg-[#087F78] px-7 py-14 text-white shadow-[0_32px_90px_-52px_rgba(8,127,120,0.8)] sm:px-12 sm:py-20 lg:px-20 lg:py-24 dark:bg-[#164F48]">
            <div className="pointer-events-none absolute -end-40 -top-52 h-[39rem] w-[39rem] rounded-full border border-white/20" aria-hidden="true" />
            <div className="pointer-events-none absolute -end-16 -top-32 h-[28rem] w-[28rem] rounded-full border border-white/20" aria-hidden="true" />
            <div className="pointer-events-none absolute -end-4 top-12 h-[13rem] w-[13rem] rounded-full border border-white/20" aria-hidden="true" />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#BCF5EC] rtl:tracking-normal">
                  {ar ? "لنعمل معًا" : "LET'S MOVE TRADE FORWARD"}
                </p>
                <h2 className="mt-5 max-w-[20ch] text-[clamp(2.4rem,4.7vw,5.2rem)] font-extrabold leading-[1.12] tracking-[-0.045em] text-white rtl:tracking-normal">
                  {ar ? "فرصتك القادمة تبدأ بطلب واضح." : "The next opportunity starts with a conversation."}
                </h2>
                <p className="mt-5 max-w-xl text-[15px] leading-8 text-[#D4F5EF] sm:text-[17px]">
                  {ar ? "شاركنا ما تحتاجه، ودعنا ننسّق الخطوة التالية." : "Tell us what your business needs. We'll help coordinate the next step."}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <Link to="/request" className="group inline-flex min-h-[56px] w-full items-center justify-between gap-5 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-[#0D4540] shadow-[0_20px_38px_-25px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#E5FCF7] sm:w-auto sm:min-w-[240px]">
                  {ar ? "ابدأ طلب التوريد" : "Send a sourcing request"}
                  <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
                <Link to="/contact" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto sm:min-w-[240px]">
                  {ar ? "تواصل مع فريقنا" : "Contact our team"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
