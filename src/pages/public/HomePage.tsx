import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ClipboardCheck,
  Handshake,
  Plane,
  SearchCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import HomeProductSpotlight from "@/components/home/HomeProductSpotlight";
import SourcingIllustration from "@/components/home/SourcingIllustration";
import heroImg from "@/assets/hero-trade.jpg";
import { useI18n } from "@/lib/i18n";
import "./lourex-home.css";

const EN_DESCRIPTION =
  "LOUREX is an international trading and sourcing coordination company connecting buyers with sourcing opportunities across commercial products and managing purchase requests, supplier coordination, and delivery follow-up.";
const AR_DESCRIPTION =
  "لوريكس شركة تجارة دولية وتنسيق مصادر توريد، تربط المشترين بمصادر المنتجات، وتنسّق متطلبات الشراء والتواصل مع الموردين ومتابعة الطلبات حتى التسليم.";

export default function HomePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 125, damping: 30, restDelta: 0.001 });
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: ClipboardCheck,
      name: ar ? "الاحتياج" : "THE BRIEF",
      short: ar ? "عرّفنا بالمنتج" : "Define the request",
      title: ar ? "كل تجارة تبدأ بحاجة واضحة." : "A better trade begins with a clear brief.",
      description: ar ? "تحدد المنتج والكمية والمواصفات والوجهة من خلال طلب شراء واحد." : "Tell us what you need: products, quantities, specifications and delivery destination.",
      link: "/request",
      cta: ar ? "أنشئ طلب شراء" : "Create a request",
    },
    {
      icon: SearchCheck,
      name: ar ? "المصدر" : "SOURCING",
      short: ar ? "الربط بالمورد" : "Connect with sources",
      title: ar ? "من طلبك تبدأ خيارات التوريد." : "Your needs lead the sourcing conversation.",
      description: ar ? "تعمل LOUREX على تنسيق البحث والتواصل مع المصادر المناسبة للمتطلبات التجارية." : "LOUREX coordinates sourcing discussions around your actual commercial requirements.",
      link: "/products",
      cta: ar ? "استكشف المنتجات" : "Browse products",
    },
    {
      icon: Handshake,
      name: ar ? "التنسيق" : "COORDINATION",
      short: ar ? "ترتيب التفاصيل" : "Align the details",
      title: ar ? "العلاقة التجارية تُبنى بالتفاصيل." : "The details make the connection work.",
      description: ar ? "تنسيق الكميات والمواصفات والتواصل بين أطراف العملية ومراحلها." : "Bringing specifications, quantities and commercial conversations into one coordinated process.",
      link: "/about",
      cta: ar ? "تعرف على LOUREX" : "Discover our approach",
    },
    {
      name: ar ? "التجهيز" : "PREPARATION",
      short: ar ? "متابعة الطلب" : "Follow the operation",
      title: ar ? "من الموافقة إلى المتابعة." : "A clearer path from agreement to progress.",
      description: ar ? "نعمل على متابعة الخطوات التجارية مع الجهات المعنية وفق المتطلبات المتفق عليها." : "Follow the agreed commercial steps with the relevant parties as the order progresses.",
      link: "/auth",
      cta: ar ? "بوابة الأعمال" : "Business workspace",
    },
    {
      icon: Plane,
      name: ar ? "الوجهة" : "DELIVERY",
      short: ar ? "رؤية حتى الوصول" : "Visibility to destination",
      title: ar ? "رحلة الطلب تبقى واضحة." : "Follow the journey to its destination.",
      description: ar ? "اطلع على الحالات المتاحة لشحنتك باستخدام رقم التتبع، دون افتراض وسيلة نقل محددة." : "Check available shipment milestones with your tracking reference; transport modes depend on each order.",
      link: "/track",
      cta: ar ? "تتبع الشحنة" : "Track a shipment",
    },
  ];

  const categories = [
    {
      code: "01", to: "/chocolate-sourcing",
      name: ar ? "الشوكولاتة والحلويات" : "Confectionery & sweets",
      note: ar ? "تنسيق توريد العلامات التجارية والمنتجات المعبأة" : "Commercial sourcing for confectionery products",
      kind: "confectionery" as const,
    },
    {
      code: "02", to: "/biscuits-sourcing",
      name: ar ? "البسكويت والوجبات الخفيفة" : "Biscuits & snacks",
      note: ar ? "التعبئة والكميات وطلبات التوريد" : "Packaging, quantities and purchase inquiries",
      kind: "snacks" as const,
      icon: Boxes,
    },
    {
      code: "03", to: "/food-products-sourcing",
      name: ar ? "المواد والمنتجات الغذائية" : "Food & FMCG",
      note: ar ? "احتياجات متنوعة للتجار والموزعين" : "Sourcing needs for trade and distribution",
      kind: "food" as const,
    },
    {
      code: "04", to: "/products",
      name: ar ? "المزيد من المنتجات" : "More sourcing categories",
      note: ar ? "التصنيفات المتاحة في كتالوج LOUREX" : "Explore the existing LOUREX catalog",
      kind: "other" as const,
    },
  ];

  const active = steps[activeStep];
  const ActiveIcon = active.icon;
  const reveal = {
    initial: reducedMotion ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.12 },
    transition: { duration: reducedMotion ? 0 : 0.6 },
  };

  return (
    <div className="dark lourex-home min-h-screen overflow-x-clip bg-[#050B15] text-white" data-lourex-home>
      <SEO title={ar ? "لوريكس | تجارة دولية ومصادر توريد" : "LOUREX | International Trading & Resources"} description={ar ? AR_DESCRIPTION : EN_DESCRIPTION} url="https://www.lou-rex.com/" />
      <SiteHeader />
      <motion.div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[1100] h-[3px] bg-gradient-to-r from-[#397AEF] to-[#F05265]" style={{ scaleX: progress, transformOrigin: ar ? "right center" : "left center" }} />
      <main>
        <HeroSection />

        {/* Five connected milestones, with a single active trade brief and working routes. */}
        <section id="explore" className="relative border-y border-[#24334A] bg-[#09111E] py-11 sm:py-14" aria-labelledby="journey-heading">
          <div className="mx-auto max-w-[1520px] px-5 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid gap-8 lg:grid-cols-[270px_1fr] lg:gap-12">
              <motion.div {...reveal}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8AAAD5] rtl:tracking-normal">LOUREX / 01—05</p>
                <h2 id="journey-heading" className="mt-3 max-w-[18ch] text-[clamp(1.6rem,2.8vw,2.6rem)] font-extrabold leading-tight text-white">
                  {ar ? "رحلة طلبك مع LOUREX" : "Your trade journey"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#9EB2CD]">{ar ? "اختر مرحلة لاستكشاف دورنا." : "Select a stage to see how we connect the process."}</p>
              </motion.div>
              <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-2">
                <div className="pointer-events-none absolute start-[10%] end-[10%] top-8 hidden h-px bg-gradient-to-r from-[#4179E2] via-[#9863AA] to-[#E34B5F] sm:block" aria-hidden="true" />
                {steps.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    aria-pressed={activeStep === index}
                    className={"group relative flex min-h-[100px] flex-col items-start gap-2 rounded-xl border px-3 py-4 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#96BAFC] sm:min-h-[128px] sm:items-center sm:text-center " + (
                      activeStep === index ? "border-[#7A93D4]/75 bg-[#1A2945]" : "border-[#273650] bg-[#101B2C] hover:border-[#5377B4] hover:bg-[#17243A]"
                    )}
                  >
                    <span className={"relative z-10 flex h-9 w-9 items-center justify-center rounded-full border " + (activeStep === index ? "border-[#FA7383] bg-[#A42B48] text-white" : "border-[#4C6490] bg-[#162B4B] text-[#A0C0F2]")}>
                      <item.icon className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums text-[#91A8CB]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-[12px] font-extrabold leading-snug text-white sm:text-[13px]">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 grid min-h-[155px] gap-6 rounded-2xl border border-[#2E415A] bg-[#101F31] p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-7 lg:ms-[318px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#A1BBE8]/20 bg-[#3265AD]/20 text-[#9BC5FF]"><ActiveIcon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" /></div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={activeStep} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reducedMotion ? 0 : 0.2 }} aria-live="polite">
                  <h3 className="text-xl font-bold text-white">{active.title}</h3>
                  <p className="mt-2 max-w-[670px] text-sm leading-7 text-[#AABDD4]">{active.description}</p>
                </motion.div>
              </AnimatePresence>
              <Link to={active.link} className="group inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap border-b border-[#E95D72]/50 text-[13px] font-bold text-[#FF9BA7] hover:border-[#FF9BA7]">
                {active.cta}<ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"/>
              </Link>
            </div>
          </div>
        </section>

        {/* Large editorial categories inspired by the approved moodboard, not stock card repetition. */}
        <section id="sourcing" aria-labelledby="sourcing-heading" className="relative bg-[#060D19] py-20 sm:py-28">
          <div className="mx-auto max-w-[1520px] px-5 sm:px-8 lg:px-12 xl:px-16">
            <motion.div {...reveal} className="mb-10 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[790px]">
                <p className="lrx-kicker">LOUREX / SOURCING</p>
                <h2 id="sourcing-heading" className="mt-5 text-[clamp(2.2rem,4.5vw,4.9rem)] font-extrabold leading-[1.15] tracking-tight text-white rtl:tracking-normal">
                  {ar ? <>منتجات متعددة. <span className="text-[#91BFFC]">فرص أوسع.</span></> : <>Products are the beginning. <span className="text-[#91BFFC]">Connections create opportunity.</span></>}
                </h2>
              </div>
              <Link to="/products" className="group inline-flex min-h-12 w-fit items-center gap-3 rounded-xl border border-[#53739F] px-5 text-sm font-bold text-white hover:border-[#A4C5F5] hover:bg-[#16243B]">
                {ar ? "عرض جميع التصنيفات" : "Browse the catalog"}<ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"/>
              </Link>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category, index) => (
                <motion.div key={category.to} {...reveal} transition={{ duration: reducedMotion ? 0 : .5, delay: reducedMotion ? 0 : index * .07 }}>
                  <Link to={category.to} className={"lrx-category lrx-category--" + category.kind + " group relative flex min-h-[290px] flex-col justify-between overflow-hidden rounded-[22px] border border-[#344560] p-6 transition-transform duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93BAFC] sm:min-h-[340px]"}>
                    <div className="lrx-category-art" aria-hidden="true">
                      <SourcingIllustration variant={category.kind} className="h-full w-full" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between text-[11px] font-bold tracking-[0.12em] text-[#A9C6EA]">
                      <span>LOUREX / {category.code}</span><ArrowDownRight className="h-5 w-5 -rotate-90 transition-transform group-hover:-rotate-45 rtl:rotate-180" aria-hidden="true"/>
                    </div>
                    <div className="relative z-10">
                      <h3 className="max-w-[18ch] text-[clamp(1.3rem,2vw,1.8rem)] font-bold leading-snug text-white">{category.name}</h3>
                      <p className="mt-3 text-[13px] leading-6 text-[#C3D1E4]">{category.note}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Read-only real products or sourcing brief fallback; no placeholder product claims. */}
        <HomeProductSpotlight />

        {/* Distinctive LOUREX connection network; deliberately abstract, not live supplier telemetry. */}
        <section id="network" aria-labelledby="network-heading" className="relative isolate overflow-hidden border-y border-[#24314A] bg-[#091524] py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,rgba(40,86,153,.2),transparent_58%)]" aria-hidden="true"/>
          <div className="relative mx-auto grid max-w-[1520px] gap-9 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 lg:px-12 xl:px-16">
            <motion.div {...reveal}>
              <p className="lrx-kicker">LOUREX / THE CONNECTION</p>
              <h2 id="network-heading" className="mt-5 max-w-[18ch] text-[clamp(2.35rem,4.7vw,5rem)] font-extrabold leading-[1.12] tracking-tight text-white rtl:tracking-normal">
                {ar ? <>نحو مصادر جديدة. <span className="text-[#83B5FB]">بفكرة واحدة.</span></> : <>The right connection changes <span className="text-[#83B5FB]">everything.</span></>}
              </h2>
              <p className="mt-6 max-w-[490px] text-[15px] leading-9 text-[#AEC0D7]">
                {ar
                  ? "من احتياج التاجر إلى التواصل مع المصادر المناسبة، نربط التفاصيل والأطراف التجارية في مسار مفهوم."
                  : "From the buyer's brief to sourcing conversations, we connect commercial needs, people and details in a clearer process."}
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {(ar ? ["تحديد الاحتياج", "تنسيق الموردين", "متابعة العمليات"] : ["Requirements", "Supplier coordination", "Operations follow-up"]).map(label=>(
                  <span key={label} className="rounded-full border border-[#48618A] bg-[#152640] px-3.5 py-2 text-xs font-semibold text-[#C6D9F2]">{label}</span>
                ))}
              </div>
              <Link to="/why-lourex" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl border border-[#6184B4] px-5 text-sm font-bold text-white transition-colors hover:border-[#A9CCFD] hover:bg-[#1C3050]">
                {ar ? "لماذا LOUREX؟" : "Why LOUREX?"}<ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"/>
              </Link>
            </motion.div>
            <motion.div {...reveal} className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[25px] border border-[#30425E] bg-[#080F1D] sm:min-h-[430px]">
              <div className="absolute -top-40 start-1/3 h-80 w-80 rounded-full bg-[#376BC1]/20 blur-[90px]" aria-hidden="true"/>
              <svg viewBox="0 0 700 440" className="h-full w-full max-w-[740px]" role="img" aria-label={ar ? "رسم توضيحي لمسارات الاتصال التجاري حول LOUREX" : "Illustrative commercial network centered on LOUREX"}>
                <defs><linearGradient id="lrx-map-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4A98FF"/><stop offset="100%" stopColor="#F75A6F"/></linearGradient></defs>
                <g fill="none" stroke="#3B5B88" strokeOpacity=".34" strokeWidth="1">
                  <ellipse cx="350" cy="220" rx="278" ry="170"/><ellipse cx="350" cy="220" rx="195" ry="170"/>
                  <ellipse cx="350" cy="220" rx="95" ry="170"/>
                  <path d="M72 220H628M120 136Q350 188 580 136M120 304Q350 252 580 304"/>
                  <circle cx="350" cy="220" r="128" strokeOpacity=".18"/><circle cx="350" cy="220" r="208" strokeOpacity=".14"/>
                </g>
                <g fill="none" stroke="url(#lrx-map-grad)" strokeWidth="2" strokeLinecap="round">
                  <motion.path d="M90 120Q255 40 350 220T620 103" initial={reducedMotion?false:{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true}} transition={{duration:reducedMotion?0:1.6}} />
                  <motion.path d="M88 337Q258 405 350 220T620 320" initial={reducedMotion?false:{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true}} transition={{duration:reducedMotion?0:1.8,delay:reducedMotion?0:.2}} />
                  <motion.path d="M205 84Q251 205 350 220T492 365" initial={reducedMotion?false:{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true}} transition={{duration:reducedMotion?0:1.5}} />
                </g>
                {[{x:90,y:120},{x:620,y:103},{x:88,y:337},{x:620,y:320},{x:205,y:84},{x:492,y:365}].map((p,i)=>(
                  <g key={i}><circle cx={p.x} cy={p.y} r="11" fill="#0D1A2C" stroke={i%2?"#EF5C74":"#649EF9"} strokeWidth="1.5"/><circle cx={p.x} cy={p.y} r="3.5" fill={i%2?"#EF5C74":"#649EF9"}/></g>
                ))}
                <circle cx="350" cy="220" r="57" fill="#071120" stroke="#89A6D4" strokeOpacity=".55" strokeWidth="1.5"/>
                <text x="350" y="213" textAnchor="middle" fill="white" fontSize="25" fontWeight="800">LOUREX</text>
                <text x="350" y="239" textAnchor="middle" fill="#A3BDDF" fontSize="11" letterSpacing="3">CONNECTION</text>
              </svg>
              <span className="absolute bottom-5 start-6 text-[10px] font-bold uppercase tracking-[0.12em] text-[#88A2C5] rtl:tracking-normal">{ar ? "تصوّر توضيحي لمسار التوريد" : "ILLUSTRATIVE NETWORK — NOT LIVE DATA"}</span>
            </motion.div>
          </div>
        </section>

        {/* Closing brand moment uses the project's existing photography, loaded only near viewport. */}
        <section className="relative isolate overflow-hidden bg-[#060E1B]">
          <img src={heroImg} alt={ar ? "مشهد تجاري للتوريد والنقل" : "International trade and transport scene"} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-45" width={1920} height={1080}/>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#050B15]/95 via-[#050B15]/70 to-[#091528]/65 rtl:bg-gradient-to-l"/>
          <div className="relative mx-auto grid max-w-[1520px] items-end gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 xl:px-16">
            <motion.div {...reveal}>
              <p className="lrx-kicker">LOUREX / YOUR NEXT CONNECTION</p>
              <h2 className="mt-6 max-w-[17ch] text-[clamp(2.5rem,5.3vw,5.6rem)] font-extrabold leading-[1.12] tracking-tight text-white rtl:tracking-normal">
                {ar ? "الفرصة القادمة تبدأ بخطوة." : "Your next opportunity starts here."}
              </h2>
              <p className="mt-6 max-w-[600px] text-[16px] leading-9 text-[#C4D1E4]">{ar ? "أرسل طلبك التجاري ودعنا نتناقش في خيارات التوريد المناسبة." : "Tell us what your business needs and start a sourcing conversation."}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/request" className="inline-flex min-h-[54px] items-center gap-3 rounded-xl bg-[#E83F51] px-6 text-sm font-bold text-white transition-colors hover:bg-[#FA6273]">{ar?"ابدأ الآن":"Start a request"}<ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"/></Link>
                <Link to="/contact" className="inline-flex min-h-[54px] items-center gap-3 rounded-xl border border-[#A5BDE1]/50 bg-[#0D1C30]/55 px-6 text-sm font-bold text-white transition-colors hover:bg-[#1A2D4A]">{ar?"تواصل معنا":"Talk to our team"}<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true"/></Link>
              </div>
            </motion.div>
            <div className="hidden justify-end lg:flex" aria-hidden="true">
              <div className="border-s border-[#CF5472]/70 ps-8 text-end">
                <span className="block text-[clamp(3rem,6vw,5rem)] font-black tracking-[0.08em] text-white">LOURE<span className="text-[#F04D62]">X</span></span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-[#C1CDE2]">INTERNATIONAL TRADING & RESOURCES</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer/>
    </div>
  );
}
