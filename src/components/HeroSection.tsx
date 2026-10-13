import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Route, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-trade.jpg";
import { useI18n } from "@/lib/i18n";

const HeroSection = () => {
  const { lang } = useI18n();
  const reduceMotion = useReducedMotion();
  const isArabic = lang === "ar";

  const entrance = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : delay, ease: "easeOut" as const },
  });

  return (
    <section
      aria-labelledby="lourex-hero-title"
      className="relative isolate overflow-hidden bg-[#F6FAF9] text-[#182A30] dark:bg-[#070B0D] dark:text-[#F5F8F7]"
    >
      {/* A quiet navigation-route signature, not a decorative card grid. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -start-48 -top-56 h-[34rem] w-[34rem] rounded-full border border-[#087F78]/10 dark:border-[#36D3C0]/10" />
        <div className="absolute -start-24 -top-32 h-[22rem] w-[22rem] rounded-full border border-[#087F78]/10 dark:border-[#36D3C0]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_18%,rgba(8,127,120,0.07),transparent_42%)] dark:bg-[radial-gradient(ellipse_at_70%_18%,rgba(54,211,192,0.075),transparent_40%)]" />
      </div>

      <div className="container relative mx-auto px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 xl:gap-20">
          <div className="relative z-10 max-w-[38rem]">
            <motion.div {...entrance(0)}>
              <div className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[#087F78] dark:text-[#36D3C0] sm:text-xs">
                <span className="h-px w-8 bg-current" aria-hidden="true" />
                {isArabic ? "لوريكس • وساطة وتنسيق توريد" : "LOUREX / SOURCING & TRADE"}
              </div>
            </motion.div>

            <motion.h1
              id="lourex-hero-title"
              {...entrance(0.08)}
              className="mt-7 max-w-[12ch] text-[clamp(2.6rem,5.6vw,5rem)] font-extrabold leading-[1.12] tracking-[-0.045em] text-[#123B39] dark:text-[#F5F8F7] sm:mt-8"
            >
              <span className="block">
                {isArabic ? "شريكك الموثوق في" : "A trusted partner in"}
              </span>
              <span className="block text-[#087F78] dark:text-[#36D3C0]">
                {isArabic ? "التجارة الدولية." : "international trade."}
              </span>
            </motion.h1>

            <motion.p
              {...entrance(0.16)}
              className="mt-6 max-w-[29rem] text-[16px] leading-[1.9] text-[#50666A] dark:text-[#A1B2B4] sm:text-[17px]"
            >
              {isArabic
                ? "ننسّق التوريد وطلبات الشراء ومتابعة الشحنات، من المصدر حتى التسليم."
                : "Sourcing, purchase requests and shipment follow-up. Coordinated from origin to delivery."}
            </motion.p>

            <motion.div {...entrance(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/request"
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-[#087F78] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-15px_rgba(8,127,120,0.58)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#076E69] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#087F78]/25 dark:bg-[#36D3C0] dark:text-[#070B0D] dark:hover:bg-[#62E4D5] dark:focus-visible:ring-[#36D3C0]/25"
              >
                {isArabic ? "قدّم طلب شراء" : "Submit a request"}
                <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#CADDD9] bg-white/70 px-6 py-3 text-sm font-semibold text-[#123B39] transition duration-200 hover:border-[#087F78]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#087F78]/15 dark:border-[#293638] dark:bg-[#11191B] dark:text-[#F5F8F7] dark:hover:border-[#36D3C0]/50 dark:hover:bg-[#172124]"
              >
                {isArabic ? "استكشف المنتجات" : "Explore products"}
                <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </motion.div>

            {/* Existing tracking and workspace routes remain directly accessible. */}
            <motion.div
              {...entrance(0.32)}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#DCE9E5] pt-5 text-[13px] text-[#50666A] dark:border-[#293638] dark:text-[#A1B2B4]"
            >
              <Link
                to="/track"
                className="inline-flex min-h-10 items-center gap-2 transition-colors hover:text-[#087F78] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F78] dark:hover:text-[#36D3C0]"
              >
                <Route className="h-4 w-4 text-[#087F78] dark:text-[#36D3C0]" aria-hidden="true" />
                {isArabic ? "تتبع شحنة" : "Track a shipment"}
              </Link>
              <Link
                to="/auth"
                className="inline-flex min-h-10 items-center gap-2 transition-colors hover:text-[#087F78] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F78] dark:hover:text-[#36D3C0]"
              >
                <ShieldCheck className="h-4 w-4 text-[#087F78] dark:text-[#36D3C0]" aria-hidden="true" />
                {isArabic ? "بوابة الأعمال" : "Business portal"}
              </Link>
            </motion.div>
          </div>

          <motion.div {...entrance(0.14)} className="relative min-w-0">
            <div aria-hidden="true" className="absolute -end-4 -top-4 h-24 w-24 rounded-tr-[3rem] border-e border-t border-[#087F78]/30 dark:border-[#36D3C0]/30 sm:-end-6 sm:-top-6" />
            <div className="relative h-[330px] overflow-hidden rounded-[1.75rem] border border-[#D9E8E5] bg-[#123B39] shadow-[0_28px_70px_-35px_rgba(18,59,57,0.3)] dark:border-[#293638] dark:bg-[#11191B] dark:shadow-[0_35px_90px_-40px_rgba(0,0,0,0.75)] sm:h-[450px] sm:rounded-[2.25rem] lg:h-[590px]">
              <img
                src={heroImg}
                alt={isArabic ? "عمليات التوريد والشحن التجاري الدولي" : "International trade sourcing and shipping operations"}
                className="h-full w-full object-cover object-center"
                width={1920}
                height={1080}
                fetchPriority="high"
                decoding="async"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071C1D]/85 via-[#071C1D]/10 to-transparent" />
              <div className="absolute bottom-0 start-0 end-0 p-6 text-white sm:p-9">
                <div className="mb-4 h-px w-12 bg-[#80E7DB]" aria-hidden="true" />
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#C6F5EF]">
                  {isArabic ? "من المصدر إلى التسليم" : "FROM ORIGIN TO DELIVERY"}
                </p>
                <p className="mt-2 max-w-[21rem] text-xl font-bold leading-snug sm:text-2xl">
                  {isArabic ? "تجارة واضحة. علاقات أقوى." : "Trade made clear. Partnerships made stronger."}
                </p>
              </div>
            </div>
            <div aria-hidden="true" className="absolute -bottom-3 -start-3 h-20 w-20 rounded-bl-[2rem] border-b border-s border-[#087F78]/30 dark:border-[#36D3C0]/30 sm:-bottom-5 sm:-start-5" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
