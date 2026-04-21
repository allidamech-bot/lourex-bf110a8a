import { SiteHeader } from "@/components/layout/SiteHeader";
import CoreFeatures from "@/components/CoreFeatures";
import DashboardPreview from "@/components/DashboardPreview";
import FinalCTA from "@/components/FinalCTA";
import HeroSection from "@/components/HeroSection";
import LogisticsProcess from "@/components/LogisticsProcess";
import TrustSection from "@/components/TrustSection";
import WhyLourexSafe from "@/components/WhyLourexSafe";
import { motion } from "framer-motion";
import { BadgeDollarSign, ClipboardCheck, Route, Users2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { lang } = useI18n();

  const charter = [
    {
      icon: Users2,
      title: lang === "ar" ? "نموذج الأطراف الثلاثة" : "Three-party operating model",
      description:
        lang === "ar"
          ? "Lourex تعمل بين العميل ووكيل تركيا ووكيل السعودية ضمن مسؤوليات واضحة لا ضمن سوق مفتوح وفوضوي."
          : "Lourex operates between the customer, Turkish partner, and Saudi partner through clearly defined responsibilities, not an open marketplace.",
    },
    {
      icon: ClipboardCheck,
      title: lang === "ar" ? "من الطلب إلى العملية" : "From request to operation",
      description:
        lang === "ar"
          ? "كل طلب يبدأ بصورة ومواصفات، ثم يراجع داخليًا، ثم يتحول إلى صفقة تشغيلية قابلة للمتابعة والتنفيذ."
          : "Every request starts with images and details, is reviewed internally, then becomes a managed operational deal.",
    },
    {
      icon: Route,
      title: lang === "ar" ? "مسار لوجستي رسمي" : "Official logistics flow",
      description:
        lang === "ar"
          ? "الشحنة تتحرك عبر 11 مرحلة Lourex الرسمية مع وضوح المرحلة الحالية والجهة المسؤولة والتقدم المتبقي."
          : "Shipments move through Lourex's official 11 stages with clear current status, ownership, and remaining progress.",
    },
    {
      icon: BadgeDollarSign,
      title: lang === "ar" ? "انضباط مالي مدقق" : "Auditable financial discipline",
      description:
        lang === "ar"
          ? "القيود المالية إما عامة أو مرتبطة بالصفقة، وتغلق بعد الإنشاء، وأي تصحيح يمر عبر طلب تعديل رسمي."
          : "Financial entries are either global or deal-linked, lock after creation, and any correction must go through a formal edit request.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <HeroSection />
      <section className="relative overflow-hidden border-y border-border/50 bg-[linear-gradient(180deg,hsla(var(--secondary)/0.35),transparent)] py-20">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
              {lang === "ar" ? "ميثاق Lourex" : "Lourex Charter"}
            </p>
            <h2 className="mt-5 font-serif text-3xl font-bold md:text-5xl">
              {lang === "ar"
                ? "منصة وسيطة تضبط الرحلة التجارية كاملة"
                : "An intermediary platform that controls the full trade journey"}
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              {lang === "ar"
                ? "Lourex ليست مجرد واجهة طلبات ولا واجهة شحن مستقلة. هي نظام تشغيلي متكامل يربط قبول الطلب، تشغيل الصفقة، تقدم الشحنة، الانضباط المالي، وسجل التدقيق في قصة واحدة واضحة للعميل والفريق."
                : "Lourex is not just a form front-end or a separate shipment viewer. It is a connected operating system that ties together request intake, deal execution, shipment progress, financial discipline, and audit history in one coherent story."}
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {charter.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-[1.9rem] border border-primary/10 bg-card/90 p-6 shadow-[0_24px_55px_-38px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_55px_-38px_rgba(0,0,0,0.75)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-serif text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <LogisticsProcess />
      <CoreFeatures />
      <TrustSection />
      <WhyLourexSafe />
      <DashboardPreview />
      <FinalCTA />
    </div>
  );
}
