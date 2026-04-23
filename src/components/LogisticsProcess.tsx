import { motion } from "framer-motion";
import {
  ClipboardPlus,
  FileSearch,
  Handshake,
  PackageCheck,
  PlaneTakeoff,
  Scale,
  Truck,
  WalletCards,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const LogisticsProcess = () => {
  const { lang } = useI18n();

  const steps = [
    {
      icon: ClipboardPlus,
      title: lang === "ar" ? "استلام طلب الشراء" : "Purchase request intake",
      desc:
        lang === "ar"
          ? "العميل يرفع الطلب مع الصور والتفاصيل والمواصفات القابلة للتنفيذ."
          : "The customer submits the request with images, operational details, and sourcing specifications.",
    },
    {
      icon: FileSearch,
      title: lang === "ar" ? "مراجعة داخلية" : "Internal review",
      desc:
        lang === "ar"
          ? "فريق Lourex يراجع اكتمال الطلب ويجهزه للتحويل إلى عملية تشغيلية."
          : "The Lourex team reviews completeness and prepares the request for operational conversion.",
    },
    {
      icon: Handshake,
      title: lang === "ar" ? "تحويل إلى صفقة" : "Convert into deal",
      desc:
        lang === "ar"
          ? "يتم إنشاء Deal / Operation مع تحديد الأطراف ومسؤوليات التنفيذ."
          : "A deal/operation is created with the responsible parties and execution ownership clearly assigned.",
    },
    {
      icon: PackageCheck,
      title: lang === "ar" ? "تنفيذ من بلد المنشأ" : "Origin-side execution",
      desc:
        lang === "ar"
          ? "وكيل تركيا يدير التوريد والتجهيز والتحضير والخروج من بلد المنشأ."
          : "The Turkish partner manages sourcing, preparation, packing, and departure from origin.",
    },
    {
      icon: PlaneTakeoff,
      title: lang === "ar" ? "شحن وتتبع مرحلي" : "Shipment and staged tracking",
      desc:
        lang === "ar"
          ? "الشحنة تمر عبر 11 مرحلة واضحة قابلة للعرض على العميل والفريق."
          : "The shipment moves through 11 formal stages visible to both internal teams and the customer.",
    },
    {
      icon: Scale,
      title: lang === "ar" ? "وصول وتخليص بالوجهة" : "Destination execution",
      desc:
        lang === "ar"
          ? "وكيل السعودية يدير الاستلام المحلي والتخليص والتنسيق النهائي."
          : "The Saudi partner manages arrival, customs, local handling, and final coordination.",
    },
    {
      icon: WalletCards,
      title: lang === "ar" ? "قيد مالي مقفل" : "Locked financial control",
      desc:
        lang === "ar"
          ? "المعاملات تسجل كقيود عامة أو مرتبطة بالصفقة ثم تغلق بعد الإنشاء."
          : "Entries are created as global or deal-linked records, then locked immediately after creation.",
    },
    {
      icon: Truck,
      title: lang === "ar" ? "تسليم وتقارير" : "Delivery and reporting",
      desc:
        lang === "ar"
          ? "العملية تنتهي بتسليم واضح وسجل تدقيقي وتقارير عامة وتقارير حسب العميل أو الصفقة."
          : "The flow ends with delivery, audit visibility, and reporting at platform, customer, and deal level.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-background py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_32%)]" />
      <div className="container relative mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            {lang === "ar" ? "التدفق التشغيلي" : "Operations Flow"}
          </p>
          <h2 className="font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "تدفق Lourex من الطلب حتى التسليم" : "The Lourex flow from request to delivery"}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
            {lang === "ar"
              ? "هذا ليس مسار شراء مباشر من متجر، بل سير تشغيل منظم يجمع العميل وفريق العمليات ووكلاء البلدين ضمن خطوات واضحة قابلة للمتابعة والتدقيق."
              : "This is not a store checkout flow. It is a structured operational journey connecting the customer, Lourex team, and both partners through accountable steps."}
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="group rounded-[2rem] border border-primary/10 bg-[linear-gradient(180deg,hsla(var(--card)/0.96),hsla(var(--card)/0.88))] p-6 shadow-[0_24px_55px_-36px_rgba(0,0,0,0.26)] dark:shadow-[0_24px_55px_-36px_rgba(0,0,0,0.68)]"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary rtl:rotate-0">
                  <step.icon className="h-6 w-6 rtl:-scale-x-100" />
                  <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-semibold transition-colors group-hover:text-primary">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogisticsProcess;
