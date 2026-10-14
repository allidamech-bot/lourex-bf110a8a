import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Check, Globe2, PackageSearch, SearchCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

/** The X marks a connection, not a claim about routes or live suppliers. */
const HeroSection = () => {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reduceMotion = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 23 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      id="lourex-hero"
      aria-labelledby="lourex-hero-title"
      className="relative isolate overflow-hidden bg-[#050B15] text-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_52%_66%,rgba(24,71,126,0.24),transparent_56%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(126,166,210,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(126,166,210,0.12)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative mx-auto max-w-[1520px] px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pb-16 xl:px-16">
        <div className="mx-auto max-w-[1000px] text-center">
          <motion.p {...reveal(0)} className="mx-auto inline-flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#AAC7EB] sm:text-[11px] rtl:tracking-normal">
            <span className="h-px w-7 bg-[#659BEA]/70" aria-hidden="true" />
            LOUREX — INTERNATIONAL TRADING & RESOURCES
            <span className="h-px w-7 bg-[#EC5263]/70" aria-hidden="true" />
          </motion.p>
          <motion.h1 {...reveal(0.08)} id="lourex-hero-title" className="mx-auto mt-7 max-w-[19ch] text-[clamp(2.5rem,6.1vw,6.3rem)] font-extrabold leading-[1.12] tracking-[-0.055em] text-white rtl:max-w-[25ch] rtl:tracking-normal">
            {ar ? (
              <>كل شيء يبدأ بطلب. <span className="block bg-gradient-to-l from-[#83C9FF] via-[#F9F9FF] to-[#FF7585] bg-clip-text text-transparent">ونحن نربطه بالعالم.</span></>
            ) : (
              <>Every opportunity starts somewhere. <span className="block bg-gradient-to-r from-[#80BCFF] via-white to-[#FF7987] bg-clip-text text-transparent">We connect it to the world.</span></>
            )}
          </motion.h1>
          <motion.p {...reveal(0.16)} className="mx-auto mt-6 max-w-[660px] text-[15px] leading-8 text-[#AABBCD] sm:text-[17px] sm:leading-9">
            {ar
              ? "تربط LOUREX المشترين التجاريين بمصادر التوريد، وتنسّق المتطلبات والطلبات ومراحل المتابعة — من الفكرة إلى الوجهة."
              : "LOUREX connects business buyers with sourcing opportunities and coordinates the requirements, relationships and follow-through behind every order."}
          </motion.p>
          <motion.div {...reveal(0.24)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/request" className="group inline-flex min-h-[52px] min-w-[170px] items-center justify-center gap-3 rounded-xl bg-[#E83F51] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_40px_-20px_rgba(235,53,79,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#F04F60] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF7A88]/40">
              {ar ? "ابدأ طلب شراء" : "Start a sourcing request"}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link to="/products" className="group inline-flex min-h-[52px] min-w-[170px] items-center justify-center gap-3 rounded-xl border border-[#7996B4]/50 bg-[#14243B]/65 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-[#88B7F1] hover:bg-[#1A3050] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6CA6F4]/30">
              {ar ? "اكتشف المنتجات" : "Explore products"}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>

        <motion.div {...reveal(0.28)} className="relative mx-auto mt-12 grid max-w-[1280px] gap-5 lg:mt-14 lg:min-h-[335px] lg:grid-cols-[0.95fr_1.05fr_1fr] lg:items-center">
          {/* A buyer's needs become a structured trade request. */}
          <div className="relative z-10 mx-auto w-full max-w-[370px] overflow-hidden rounded-[22px] border border-[#7896B9]/30 bg-[#0D192B]/90 p-5 shadow-[0_28px_75px_-40px_rgba(0,0,0,0.8)] sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#93BEF4] rtl:tracking-normal">
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                {ar ? "احتياج العميل" : "THE BUYER'S BRIEF"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4E8CEB]/15 text-[#91BFFC]"><SearchCheck className="h-4 w-4" aria-hidden="true" /></span>
            </div>
            <h2 className="mt-5 text-[22px] font-bold leading-snug text-white sm:text-[25px]">
              {ar ? "تبحث عن منتج محدد؟" : "Looking for the right product?"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#A8BDCF]">
              {ar ? "ابدأ بالمواصفات والكميات والوجهة." : "Start with your specifications, quantity and destination."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {(ar ? ["اسم المنتج", "المواصفات", "الكمية المطلوبة", "بلد التسليم"] : ["Product", "Specifications", "Quantity", "Destination"]).map((label) => (
                <span key={label} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#58749C]/20 bg-[#1A2B41]/75 px-3 text-[11px] font-semibold text-[#D1DFEE]">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#6EACFF]" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Brand signature: two colored trade flows converge on X. Lightweight inline SVG. */}
          <div className="pointer-events-none relative z-0 mx-auto flex min-h-[175px] w-full max-w-[420px] items-center justify-center lg:min-h-[330px]">
            <div aria-hidden="true" className="absolute h-[235px] w-[235px] rounded-full bg-[#265BB6]/15 blur-[55px]" />
            <svg viewBox="0 0 420 270" className="relative w-full max-w-[420px] overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="lrx-blue" x1="0" x2="1"><stop offset="0%" stopColor="#327BE8" stopOpacity="0"/><stop offset="60%" stopColor="#4E9DFF"/><stop offset="100%" stopColor="#9ACBFF"/></linearGradient>
                <linearGradient id="lrx-red" x1="0" x2="1"><stop offset="0%" stopColor="#FF5F76"/><stop offset="55%" stopColor="#ED455C"/><stop offset="100%" stopColor="#FF5D74" stopOpacity="0"/></linearGradient>
                <filter id="lrx-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>
              </defs>
              <ellipse cx="210" cy="137" rx="119" ry="114" fill="none" stroke="#5D86C8" strokeOpacity=".16"/>
              <ellipse cx="210" cy="137" rx="92" ry="92" fill="none" stroke="#5D86C8" strokeOpacity=".13"/>
              <path d="M0 159C100 159 130 93 210 136" stroke="url(#lrx-blue)" strokeWidth="7" strokeLinecap="round" fill="none" filter="url(#lrx-glow)" opacity=".7" />
              <path d="M210 136C278 165 324 116 420 116" stroke="url(#lrx-red)" strokeWidth="7" strokeLinecap="round" fill="none" filter="url(#lrx-glow)" opacity=".7" />
              <motion.path d="M0 159C100 159 130 93 210 136" stroke="url(#lrx-blue)" strokeWidth="2.5" strokeLinecap="round" fill="none" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 1.3, delay: .3 }} />
              <motion.path d="M210 136C278 165 324 116 420 116" stroke="url(#lrx-red)" strokeWidth="2.5" strokeLinecap="round" fill="none" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 1.3, delay: 1.1 }} />
              <g transform="translate(210 137)">
                <path d="M-38 -38L-2 0L-38 38H-9L14 12L37 38H64L27 0L64 -38H36L14 -12L-10 -38Z" fill="#172B4D" opacity=".6" transform="translate(3 3)"/>
                <path d="M-53 -52L0 0L-53 52H-15L26 11L-14 -52Z" fill="#368AF4" />
                <path d="M53 -52L0 0L53 52H15L-26 11L14 -52Z" fill="#FF5264" />
              </g>
            </svg>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
              <div className="text-[30px] font-black tracking-[0.075em] text-white">LOURE<span className="text-[#F05769]">X</span></div>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#9FB6D2]">CONNECTING OPPORTUNITIES</div>
            </div>
          </div>

          {/* A conceptual network, not real-time supplier numbers or locations. */}
          <div className="relative z-10 mx-auto w-full max-w-[380px]">
            <div className="relative overflow-hidden rounded-[22px] border border-[#6D91BB]/25 bg-[#0A182B]/85 p-6 shadow-[0_28px_75px_-45px_rgba(0,0,0,0.85)]">
              <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full bg-[#2359B8]/20 blur-3xl" />
              <div className="relative flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C0D1E6] rtl:tracking-normal">{ar ? "فرص التوريد" : "SOURCING CONNECTIONS"}</span>
                <Globe2 className="h-5 w-5 text-[#84B8F6]" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="relative mx-auto mt-3 h-[158px] w-full max-w-[275px]">
                <svg viewBox="0 0 260 158" className="h-full w-full" fill="none" aria-hidden="true">
                  <circle cx="130" cy="79" r="67" stroke="#4A85DA" strokeOpacity=".35"/>
                  <ellipse cx="130" cy="79" rx="33" ry="67" stroke="#4A85DA" strokeOpacity=".25"/>
                  <path d="M63 79H197 M72 48Q130 73 188 48 M72 110Q130 85 188 110" stroke="#4A85DA" strokeOpacity=".25"/>
                  <path d="M37 42Q106 -6 163 64T234 27 M35 129Q120 107 163 64T232 126" stroke="#E45A6A" strokeWidth="1.4" strokeOpacity=".75" strokeDasharray="3 5"/>
                  <circle cx="37" cy="42" r="5" fill="#5E9EF8"/><circle cx="163" cy="64" r="6" fill="#E65A6D"/><circle cx="234" cy="27" r="5" fill="#5E9EF8"/>
                  <circle cx="35" cy="129" r="4" fill="#5E9EF8"/><circle cx="232" cy="126" r="5" fill="#E65A6D"/>
                </svg>
              </div>
              <p className="relative text-center text-[12px] leading-6 text-[#AAC4DC]">{ar ? "نحو المصدر المناسب، حسب احتياجك" : "Connecting needs with sourcing possibilities"}</p>
            </div>
          </div>
        </motion.div>

        <a href="#explore" className="mx-auto mt-8 flex w-fit min-h-11 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8BABCE] transition-colors hover:text-white rtl:tracking-normal">
          {ar ? "اكتشف رحلة لوريكس" : "DISCOVER THE JOURNEY"}
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
