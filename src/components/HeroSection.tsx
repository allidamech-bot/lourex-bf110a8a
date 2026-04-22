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
        <img src={heroImg} alt="Lourex operations" className="h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,16,29,0.94)_8%,rgba(10,21,38,0.88)_45%,rgba(248,249,251,0.16)_100%)] dark:bg-[linear-gradient(115deg,rgba(5,10,18,0.98)_8%,rgba(11,19,31,0.92)_45%,rgba(12,18,27,0.45)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.14),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.08),transparent_18%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pb-16 pt-16 md:px-8 md:pt-24">
        <div className="grid items-end gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-background/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                {t("home.hero.eyebrow")}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="font-serif text-4xl font-bold leading-[1.08] text-foreground md:text-6xl xl:text-7xl"
            >
              {t("home.hero.titlePrefix")}
              <span className="text-gradient-gold">
                {t("home.hero.titleGradient")}
              </span>
              {t("home.hero.titleSuffix")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="mt-7 max-w-2xl text-lg leading-8 text-foreground/80 md:text-xl"
            >
              {t("home.hero.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button variant="gold" size="lg" className="px-8 text-base font-semibold" asChild>
                <Link to="/request">
                  {t("home.hero.ctaRequest")}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-border/80 bg-background/60 px-8 text-base text-foreground hover:bg-background/80"
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
            className="rounded-[2rem] border border-border/60 bg-card/85 p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_30px_90px_-30px_rgba(0,0,0,0.65)]"
          >
            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-primary/20 bg-background/70 p-5 dark:bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("home.hero.controlTitle")}
                    </p>
                    <p className="font-serif text-2xl font-semibold text-foreground">
                      {t("home.hero.controlSubtitle")}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
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
                    className="rounded-[1.4rem] border border-border/60 bg-background/70 p-4 dark:border-white/10 dark:bg-black/15"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 font-serif text-xl font-semibold text-foreground">{stat.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.label}</p>
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

