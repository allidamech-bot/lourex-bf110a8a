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
  const { lang } = useI18n();

  const stats = [
    {
      icon: ClipboardList,
      value: lang === "ar" ? "طلب منظم" : "Structured intake",
      label:
        lang === "ar"
          ? "صور ومواصفات تنفيذية واضحة منذ البداية"
          : "Images and execution-ready specifications from the first step",
    },
    {
      icon: PackageSearch,
      value: lang === "ar" ? "صفقة تشغيلية" : "Operational deal",
      label:
        lang === "ar"
          ? "تحويل الطلب إلى مركز عمليات واضح ومترابط"
          : "Conversion from request into a connected operational center",
    },
    {
      icon: Route,
      value: lang === "ar" ? "11 مرحلة" : "11 stages",
      label:
        lang === "ar"
          ? "تتبع رسمي من قبول الصفقة حتى التسليم"
          : "Official tracking from deal acceptance to final delivery",
    },
    {
      icon: BadgeDollarSign,
      value: lang === "ar" ? "قيد مقفل" : "Locked entry",
      label:
        lang === "ar"
          ? "محاسبة منضبطة مع تعديل رسمي وسجل تدقيق"
          : "Controlled accounting with formal edit requests and audit trace",
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
                {lang === "ar" ? "وكيل تركيا • وكيل السعودية • العميل" : "Turkey agent • Saudi agent • Customer"}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="font-serif text-4xl font-bold leading-[1.08] text-foreground md:text-6xl xl:text-7xl"
            >
              {lang === "ar" ? "Lourex تدير الرحلة من" : "Lourex manages the flow from"}
              <span className="text-gradient-gold">
                {lang === "ar" ? " طلب شراء تفصيلي " : " detailed purchase request "}
              </span>
              {lang === "ar"
                ? "إلى صفقة تشغيلية وشحنة مضبوطة ومحاسبة قابلة للتدقيق."
                : "to an auditable deal, controlled shipment, and disciplined accounting."}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="mt-7 max-w-2xl text-lg leading-8 text-foreground/80 md:text-xl"
            >
              {lang === "ar"
                ? "Lourex ليست سوقًا ولا منصة عرض موردين. هي نظام وساطة وتشغيل يربط العميل ووكيل تركيا ووكيل السعودية ضمن طلبات مراجعة، صفقات تنفيذ، تتبع رسمي، انضباط مالي، وسجل أعمال موثوق."
                : "Lourex is not a marketplace or supplier listing. It is a broker operations platform connecting the customer, Turkish partner, and Saudi partner through reviewed requests, managed deals, official tracking, disciplined finance, and trusted audit history."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button variant="gold" size="lg" className="px-8 text-base font-semibold" asChild>
                <Link to="/request">
                  {lang === "ar" ? "ابدأ طلب شراء" : "Start a purchase request"}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-border/80 bg-background/60 px-8 text-base text-foreground hover:bg-background/80"
                asChild
              >
                <Link to="/track">{lang === "ar" ? "تتبع الشحنة" : "Track shipment"}</Link>
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
                      {lang === "ar" ? "ضبط تشغيلي" : "Operational control"}
                    </p>
                    <p className="font-serif text-2xl font-semibold text-foreground">
                      {lang === "ar" ? "صفقة • تتبع • محاسبة" : "Deal • Tracking • Accounting"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {lang === "ar"
                    ? "رؤية تنفيذية موحدة من استلام الطلب إلى التسليم، مع وضوح المرحلة الحالية والقرار المالي والأثر التدقيقي."
                    : "A unified execution view from intake to delivery, with clear stage ownership, financial context, and audit visibility."}
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

