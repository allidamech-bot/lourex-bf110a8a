import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, Compass, Route } from "lucide-react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-trade.jpg";
import { useI18n } from "@/lib/i18n";

const HeroSection = () => {
  const { lang } = useI18n();
  const reducedMotion = useReducedMotion();
  const imageFrame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: imageFrame, offset: ["start end", "end start"] });
  const imageParallaxY = useTransform(scrollYProgress, [0, 1], [-24, 24]);
  const ar = lang === "ar";

  const reveal = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      aria-labelledby="lourex-hero-title"
      className="relative isolate overflow-hidden bg-[#F7FAF8] text-[#143432] dark:bg-[#080E10] dark:text-[#F4F8F6]"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -start-64 -top-64 h-[42rem] w-[42rem] rounded-full bg-[#6BC5B9]/[0.075] blur-3xl dark:bg-[#36D3C0]/[0.06]" />
        <div className="absolute -end-48 bottom-[-20rem] h-[42rem] w-[42rem] rounded-full border border-[#087F78]/10 dark:border-[#36D3C0]/10" />
        <div className="absolute -end-20 bottom-[-12rem] h-[29rem] w-[29rem] rounded-full border border-[#087F78]/10 dark:border-[#36D3C0]/10" />
      </div>

      <div className="relative mx-auto grid max-w-[1500px] items-center gap-11 px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:min-h-[710px] lg:grid-cols-[minmax(0,0.87fr)_minmax(0,1.13fr)] lg:gap-9 lg:px-10 lg:pb-24 lg:pt-20 xl:min-h-[795px] xl:gap-16 xl:px-14">
        <div className="relative z-10 max-w-[660px]">
          <motion.div {...reveal(0)} className="flex items-center gap-3">
            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <span className="absolute h-2 w-2 rounded-full bg-[#087F78] dark:bg-[#36D3C0]" />
              {!reducedMotion && <span className="absolute h-4 w-4 animate-ping rounded-full border border-[#087F78]/30 dark:border-[#36D3C0]/35" />}
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#087F78] dark:text-[#6DE6D8] sm:text-xs rtl:tracking-normal">
              {ar ? "لوريكس · للتوريد والتجارة الدولية" : "LOUREX  /  INTERNATIONAL SOURCING"}
            </span>
            <span className="h-px w-10 bg-[#087F78]/25 dark:bg-[#36D3C0]/30" />
          </motion.div>

          <motion.h1
            id="lourex-hero-title"
            {...reveal(0.12)}
            className="mt-8 max-w-[14ch] text-[clamp(2.8rem,5.4vw,5.8rem)] font-extrabold leading-[1.12] tracking-[-0.052em] text-[#143432] dark:text-[#F4F8F6] sm:mt-9 rtl:tracking-normal"
          >
            {ar ? (
              <>شريكك الموثوق <span className="relative inline-block text-[#087F78] dark:text-[#56DCCA]">في التجارة الدولية<span aria-hidden="true" className="absolute -bottom-1 start-0 h-[3px] w-[42%] rounded-full bg-[#E4B458]" /></span></>
            ) : (
              <>Your partner in <span className="relative inline-block text-[#087F78] dark:text-[#56DCCA]">global trade.<span aria-hidden="true" className="absolute -bottom-1 start-0 h-[3px] w-[42%] rounded-full bg-[#E4B458]" /></span></>
            )}
          </motion.h1>

          <motion.p
            {...reveal(0.22)}
            className="mt-8 max-w-[32rem] text-[16px] leading-[1.95] text-[#576B69] dark:text-[#B4C6C5] sm:text-[18px]"
          >
            {ar
              ? "نربط أعمالك بمصادر التوريد، وننسّق الطلبات والشحنات بثقة ووضوح — من أول تواصل حتى التسليم."
              : "Connecting your business with sourcing opportunities, coordinating trade and logistics from the first conversation to delivery."}
          </motion.p>

          <motion.div {...reveal(0.32)} className="mt-9 flex flex-wrap items-center gap-3 sm:mt-11">
            <Link
              to="/request"
              className="group inline-flex min-h-[54px] items-center justify-center gap-4 rounded-[15px] bg-[#087F78] px-6 py-3 text-[14px] font-bold text-white shadow-[0_20px_45px_-24px_rgba(8,127,120,0.9)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#086D67] hover:shadow-[0_22px_48px_-20px_rgba(8,127,120,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#087F78]/25 dark:bg-[#4AD7C4] dark:text-[#071716] dark:hover:bg-[#81EBDF]"
            >
              {ar ? "اطلب عرض توريد" : "Start sourcing"}
              <ArrowUpRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link
              to="/products"
              className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-[15px] border border-[#BCD1CB] bg-white/70 px-6 py-3 text-[14px] font-bold text-[#143432] transition-all duration-300 hover:-translate-y-1 hover:border-[#087F78]/50 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#087F78]/15 dark:border-[#2A3A3B] dark:bg-[#172123] dark:text-[#F4F8F6] dark:hover:border-[#4AD7C4]/50 dark:hover:bg-[#1A2A2C]"
            >
              {ar ? "استكشف المنتجات" : "Explore products"}
              <ArrowUpRight className="h-4 w-4 text-[#087F78] transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100 dark:text-[#4AD7C4]" aria-hidden="true" />
            </Link>
          </motion.div>

          <motion.div {...reveal(0.4)} className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#C9DAD5]/70 pt-6 dark:border-[#2A3738]">
            {[
              ar ? "تنسيق التوريد" : "Sourcing",
              ar ? "إدارة الطلبات" : "Trade operations",
              ar ? "متابعة الشحن" : "Shipment visibility",
            ].map((label) => (
              <span key={label} className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#536A68] dark:text-[#AFC3C1]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#087F78] dark:bg-[#56DCCA]" />
                {label}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div {...reveal(0.16)} className="relative min-w-0 lg:ps-5">
          <div className="pointer-events-none absolute -start-2 -top-5 z-10 hidden h-32 w-32 rounded-tl-[4rem] border-s border-t border-[#087F78]/40 dark:border-[#56DCCA]/40 sm:block" aria-hidden="true" />
          <div ref={imageFrame} className="group relative min-h-[385px] overflow-hidden rounded-[26px] border border-[#CADBD6]/55 bg-[#092928] shadow-[0_40px_95px_-45px_rgba(9,63,58,0.55)] dark:border-[#324548]/60 dark:shadow-[0_40px_105px_-48px_rgba(0,0,0,0.9)] sm:min-h-[535px] lg:min-h-[600px] xl:min-h-[645px]">
            <motion.img
              src={heroImg}
              alt={ar ? "الشحن والتوريد الدولي للبضائع" : "International sourcing and freight operations"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.045] motion-reduce:transform-none"
              width={1920}
              height={1080}
              fetchPriority="high"
              decoding="async"
              style={reducedMotion ? undefined : { y: imageParallaxY, scale: 1.09 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#031A1A]/95 via-[#041E1F]/25 to-[#05191A]/25" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10312C]/10 to-transparent" aria-hidden="true" />

            <div className="absolute start-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-[#051D1C]/55 px-4 py-2.5 backdrop-blur-xl sm:start-7 sm:top-7">
              <Compass className="h-4 w-4 text-[#6DE6D8]" strokeWidth={1.6} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:text-[11px]">
                {ar ? "من المصدر إلى وجهتك" : "FROM ORIGIN TO DESTINATION"}
              </span>
            </div>

            <svg
              aria-hidden="true"
              viewBox="0 0 520 340"
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none absolute end-[-6%] top-[18%] w-[103%] max-w-none opacity-70"
            >
              <path d="M15 280 C 135 218 150 308 254 166 S 420 115 500 45" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1.2" strokeDasharray="4 7" />
              <motion.path
                d="M15 280 C 135 218 150 308 254 166 S 420 115 500 45"
                fill="none"
                stroke="#81EDDF"
                strokeWidth="2"
                strokeLinecap="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reducedMotion ? 0 : 2.2, delay: reducedMotion ? 0 : 0.8, ease: "easeOut" }}
              />
              <circle cx="15" cy="280" r="5" fill="#81EDDF" />
              <circle cx="254" cy="166" r="5" fill="#81EDDF" stroke="#0B3432" strokeWidth="3" />
              <circle cx="500" cy="45" r="7" fill="#E7BB6A" stroke="#0B3432" strokeWidth="3" />
            </svg>

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 xl:p-10">
              <div className="mb-5 h-[2px] w-12 rounded-full bg-[#81EDDF]" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#A7EDE4] rtl:tracking-normal">
                {ar ? "تجارة أوضح. شراكات أقوى." : "BETTER CONNECTIONS. CLEARER TRADE."}
              </p>
              <p className="mt-3 max-w-[29rem] text-[clamp(1.45rem,2.6vw,2.3rem)] font-bold leading-[1.25] tracking-tight text-white rtl:tracking-normal">
                {ar ? "حلول توريد تجمع الأطراف والخطوات في مسار واحد." : "One connected journey from sourcing to delivery."}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-5">
                <div className="flex items-center gap-2.5 text-xs text-white/85">
                  <Route className="h-4 w-4 text-[#81EDDF]" aria-hidden="true" />
                  {ar ? "سلسلة توريد مترابطة" : "Connected sourcing"}
                </div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-[#C7EEE8]">LOUREX / 01</span>
              </div>
            </div>
          </div>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -start-6 top-[41%] z-20 hidden w-52 overflow-hidden rounded-2xl border border-[#D1E6DF] bg-white/95 p-4 text-[#123F3A] shadow-[0_25px_65px_-27px_rgba(3,37,33,0.4)] backdrop-blur-xl xl:block dark:border-[#2C524B] dark:bg-[#152B29]/95 dark:text-[#E7F8F4]"
            animate={reducedMotion ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#087F78] dark:text-[#77DECE]">LOUREX / TRADE DESK</p>
            <div className="mt-4 flex items-center justify-between">
              {[ar ? "توريد" : "Source", ar ? "تنسيق" : "Align", ar ? "تسليم" : "Deliver"].map((text, index) => (
                <div key={text} className="flex flex-col items-center gap-2">
                  <span className={"h-2.5 w-2.5 rounded-full " + (index === 1 ? "bg-[#E4B458]" : "bg-[#087F78] dark:bg-[#5EDBC9]")} />
                  <span className="text-[10px] font-bold">{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-[#087F78]/35 via-[#E4B458]/50 to-[#087F78]/35" />
          </motion.div>
          <div className="pointer-events-none absolute -bottom-5 -end-5 hidden h-24 w-24 rounded-br-[3rem] border-b border-e border-[#087F78]/40 dark:border-[#56DCCA]/40 sm:block" aria-hidden="true" />
        </motion.div>
      </div>

      <a
        href="#explore"
        className="group absolute bottom-4 start-5 hidden min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#087F78] transition-colors hover:text-[#145A55] dark:text-[#56DCCA] lg:inline-flex xl:start-14"
      >
        <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" aria-hidden="true" />
        {ar ? "اكتشف لوريكس" : "SCROLL TO EXPLORE"}
      </a>
    </section>
  );
};

export default HeroSection;
