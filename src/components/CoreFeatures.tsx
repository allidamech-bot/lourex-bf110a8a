import { motion } from "framer-motion";
import { BarChart3, FileLock2, ScanSearch, ShieldCheck, Truck, Users2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CoreFeatures = () => {
  const { lang } = useI18n();

  const features = [
    {
      icon: ScanSearch,
      title: lang === "ar" ? "طلب شراء غني بالمعلومات" : "Rich purchase intake",
      desc:
        lang === "ar"
          ? "صور إلزامية، مواصفات واضحة، وبيانات كافية لفريق التنفيذ بدلًا من طلبات سطحية غير قابلة للعمل."
          : "Required images, clear specs, and sourcing details that the execution team can actually work with.",
    },
    {
      icon: Users2,
      title: lang === "ar" ? "أدوار تشغيلية واضحة" : "Clear operational roles",
      desc:
        lang === "ar"
          ? "المالك، الشريك التركي، الشريك السعودي، فريق العمليات، والعميل ضمن نموذج صلاحيات مفهوم."
          : "Owner, Turkish partner, Saudi partner, operations staff, and customer each work inside a clear responsibility model.",
    },
    {
      icon: Truck,
      title: lang === "ar" ? "تتبع مرحلي حقيقي" : "Real staged tracking",
      desc:
        lang === "ar"
          ? "11 مرحلة ثابتة تمنح العميل والفريق رؤية أفضل لمسار الصفقة والشحنة."
          : "An official 11-stage shipment model gives both the customer and team a clear operational timeline.",
    },
    {
      icon: FileLock2,
      title: lang === "ar" ? "محاسبة مقفلة بعد الإنشاء" : "Locked accounting after creation",
      desc:
        lang === "ar"
          ? "لا تعديل مباشر على القيود. أي تصحيح يمر عبر طلب تعديل رسمي يحافظ على الانضباط والشفافية."
          : "Entries are not edited directly. Corrections go through formal edit requests to preserve discipline and traceability.",
    },
    {
      icon: ShieldCheck,
      title: lang === "ar" ? "منصة قابلة للتدقيق" : "Audit-friendly platform",
      desc:
        lang === "ar"
          ? "أهم الإجراءات تسجل وتظهر في سجل تدقيقي يمكن الرجوع إليه بدل العمل في مسارات غير موثقة."
          : "Major actions are logged in a readable audit trail instead of disappearing into undocumented messages.",
    },
    {
      icon: BarChart3,
      title: lang === "ar" ? "تقارير على مستوى المنصة والصفقة" : "Platform and deal reporting",
      desc:
        lang === "ar"
          ? "رؤية عامة للعمليات، مع تقارير يمكن تفصيلها حسب العميل أو الصفقة."
          : "Operational reporting is available globally and can be broken down by customer or individual deal.",
    },
  ];

  return (
    <section className="bg-card/40 py-28">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            {lang === "ar" ? "القدرات الأساسية" : "Core Capabilities"}
          </p>
          <h2 className="font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "بنية تشغيلية أقوى من منصة عرض أو سوق" : "Operationally deeper than a marketplace or catalog"}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
            {lang === "ar"
              ? "Lourex تعطيك بيئة تنفيذ وتتبع ومحاسبة وتدقيق متكاملة، لا مجرد صفحات عرض أو تدفق سلة وشراء."
              : "Lourex provides a connected execution, tracking, accounting, and audit environment, not a browsing-and-checkout experience."}
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="luxury-card group rounded-[2rem] p-7"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-serif text-2xl font-semibold">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreFeatures;
