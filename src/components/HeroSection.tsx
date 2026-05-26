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
  const { t } = useI18n();

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

  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      <div className="absolute inset-0">
        <img src={heroImg} alt="Lourex operations" className="h-full w-full object-cover grayscale-[0.4]" width={1920} height={1080} />
        <div className="absolute inset-0 bg-stone-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.08),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.03),transparent_18%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pb-16 pt-16 md:px-8 md:pt-24">
        <div className="grid items-end gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-amber-500/30 bg-stone-900/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-500 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                {t("home.hero.eyebrow")}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="font-serif text-4xl font-bold leading-[1.08] text-stone-100 md:text-6xl xl:text-7xl"
            >
              {t("home.hero.titlePrefix")}
              <span className="text-amber-500">
                {t("home.hero.titleGradient")}
              </span>
              {t("home.hero.titleSuffix")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="mt-7 max-w-2xl text-lg leading-8 text-stone-300 md:text-xl"
            >
              {t("home.hero.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button variant="default" size="lg" className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 px-8 text-base font-semibold text-stone-950 shadow-lg shadow-amber-950/20 hover:brightness-110" asChild>
                <Link to="/request">
                  {t("home.hero.ctaRequest")}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-amber-200/20 bg-stone-900/40 px-8 text-base text-stone-100 hover:bg-stone-900/60"
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
            className="rounded-[2rem] border border-amber-200/15 bg-stone-50/5 p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-amber-500/20 bg-stone-900/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
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

              <div className="grid gap-4 md:grid-cols-2">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 + index * 0.08 }}
                    className="rounded-[1.4rem] border border-amber-200/10 bg-stone-900/50 p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 font-serif text-xl font-semibold text-stone-100">{stat.value}</p>
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

