import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  PackageSearch,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-trade.jpg";
import { useI18n } from "@/lib/i18n";

const HeroSection = () => {
  const { t, lang } = useI18n();

  const isArabic = lang === "ar";

  const heroEyebrow = isArabic
    ? "توريد من تركيا • عمليات B2B • متابعة حتى التسليم"
    : "Turkey Sourcing • B2B Trade Operations • Delivery Follow-up";

  const heroTitlePrefix = isArabic ? "لوركس تدير" : "LOUREX manages";
  const heroTitleGradient = isArabic ? " توريد المنتجات التركية " : " Turkish product sourcing ";
  const heroTitleSuffix = isArabic
    ? "للسعودية والخليج من طلب الشراء حتى التسليم."
    : "for Saudi and Gulf buyers from purchase request to final delivery.";

  const heroDescription = isArabic
    ? "لوركس LOUREX هي شركة توريد وعمليات تجارية B2B مقرها تركيا، تساعد الشركات والتجار في السعودية والخليج على الوصول إلى منتجات تركية موثوقة، وإدارة طلبات الشراء، والتنسيق مع الموردين، ومتابعة الصفقات حتى التسليم."
    : "LOUREX is a Turkey-based B2B sourcing and trade operations company helping businesses in Saudi Arabia and the Gulf source verified Turkish products, manage purchase requests, coordinate suppliers, execute deals, and follow delivery through to completion.";

  const stats = [
    {
      icon: ClipboardList,
      value: t("home.hero.stats.intake.value"),
      label: t("home.hero.stats.intake.label"),
    },
    {
      icon: PackageSearch,
      value: t("home.hero.stats.deal.value"),
      label: t("home.hero.stats.deal.label"),
    },
    {
      icon: Route,
      value: t("home.hero.stats.stages.value"),
      label: t("home.hero.stats.stages.label"),
    },
    {
      icon: BadgeDollarSign,
      value: t("home.hero.stats.locked.value"),
      label: t("home.hero.stats.locked.label"),
    },
  ];

  const entryPoints = [
    {
      label: isArabic ? "عميل يريد طلب شراء" : "Customer purchase request",
      description: isArabic ? "ابدأ بطلب واضح مع صور ومواصفات قابلة للمراجعة." : "Start with a clear request, images, and review-ready specifications.",
      to: "/request",
      icon: ClipboardList,
    },
    {
      label: isArabic ? "تتبع شحنة قائمة" : "Track an active shipment",
      description: isArabic ? "اعرف المرحلة الحالية من المسار الرسمي دون رسائل متفرقة." : "See the current official stage without fragmented status messages.",
      to: "/track",
      icon: Route,
    },
    {
      label: isArabic ? "دخول غرفة العمليات" : "Enter operations room",
      description: isArabic ? "إدارة الطلبات والصفقات والتتبع والمحاسبة من لوحة واحدة." : "Manage requests, deals, tracking, and accounting from one workspace.",
      to: "/auth",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      <div className="absolute inset-0">
        <img src={heroImg} alt="Lourex operations" className="h-full w-full object-cover grayscale-[0.55] contrast-110" width={1920} height={1080} />
        <div className="absolute inset-0 bg-stone-950/86" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(214,160,74,0.12),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(245,245,244,0.05),transparent_24%),linear-gradient(135deg,rgba(12,10,9,0.2),rgba(41,37,36,0.6))]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pb-16 pt-16 md:px-8 md:pt-24">
        <div className="grid items-end gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-stone-300/15 bg-stone-950/45 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-200 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                {heroEyebrow}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="font-serif text-4xl font-bold leading-[1.08] text-stone-100 md:text-6xl xl:text-7xl"
            >
              {heroTitlePrefix}
              <span className="text-amber-300">
                {heroTitleGradient}
              </span>
              {heroTitleSuffix}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="mt-7 max-w-2xl text-lg leading-8 text-stone-300 md:text-xl"
            >
              {heroDescription}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button variant="default" size="lg" className="bg-amber-300 px-8 text-base font-semibold text-stone-950 shadow-lg shadow-stone-950/30 hover:bg-amber-200" asChild>
                <Link to="/request">
                  {t("home.hero.ctaRequest")}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-stone-200/15 bg-stone-950/35 px-8 text-base text-stone-100 hover:bg-stone-900/70"
                asChild
              >
                <Link to="/track">{t("home.hero.ctaTrack")}</Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="rounded-[2rem] border border-stone-200/10 bg-stone-950/55 p-5 shadow-2xl shadow-stone-950/50 backdrop-blur-xl"
          >
            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-amber-200/10 bg-stone-900/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-400">
                      {t("home.hero.controlTitle")}
                    </p>
                    <p className="font-serif text-2xl font-semibold text-stone-100">
                      {t("home.hero.controlSubtitle")}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-400">
                  {t("home.hero.controlDescription")}
                </p>
              </div>

              <div className="grid gap-3">
                {entryPoints.map((entry, index) => (
                  <motion.div
                    key={entry.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + index * 0.08 }}
                  >
                    <Link
                      to={entry.to}
                      className="group flex items-start gap-4 rounded-[1.25rem] border border-stone-200/10 bg-stone-900/45 p-4 transition hover:border-amber-300/25 hover:bg-stone-900/75"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-stone-200/10 bg-stone-950/50 text-amber-300">
                        <entry.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-100 group-hover:text-amber-200">{entry.label}</p>
                        <p className="mt-1 text-sm leading-6 text-stone-400">{entry.description}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.52 + index * 0.06 }}
                    className="rounded-[1.4rem] border border-stone-200/10 bg-stone-900/45 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-300">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 font-serif text-lg font-semibold text-stone-100">{stat.value}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
