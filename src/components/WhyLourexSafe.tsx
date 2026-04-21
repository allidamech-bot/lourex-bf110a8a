import { motion } from "framer-motion";
import { BadgeCheck, FileCheck, Scale, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const WhyLourexSafe = () => {
  const { lang } = useI18n();

  const items = [
    {
      icon: BadgeCheck,
      title: lang === "ar" ? "مراجعة قبل التنفيذ" : "Reviewed before execution",
      desc:
        lang === "ar"
          ? "الطلب لا يدخل مباشرة إلى التنفيذ، بل يراجع أولًا لضمان وضوح المنتج والمواصفات وطريقة الشحن قبل إنشاء الصفقة."
          : "Requests do not move directly into execution. They are reviewed first to confirm product clarity, specifications, and shipping path.",
    },
    {
      icon: FileCheck,
      title: lang === "ar" ? "كل شيء موثق داخل الصفقة" : "Everything documented inside the deal",
      desc:
        lang === "ar"
          ? "الطلب والصفقة والتتبع والمحاسبة وطلبات التعديل والتدقيق تظهر كسياقات مترابطة داخل النظام."
          : "Request, deal, tracking, accounting, edit requests, and audit all stay connected inside one operating record.",
    },
    {
      icon: Scale,
      title: lang === "ar" ? "تصحيح رسمي لا تعديل عشوائي" : "Formal correction, not silent editing",
      desc:
        lang === "ar"
          ? "عند الحاجة إلى تصحيح مالي أو مراجعة، يتم ذلك عبر طلب تعديل رسمي بحالة واضحة وموافقة أو رفض موثق."
          : "When financial correction is needed, it goes through a formal request with a visible status and documented approval or rejection.",
    },
    {
      icon: Shield,
      title: lang === "ar" ? "رؤية واضحة لمسار الشحنة" : "Clear shipment visibility",
      desc:
        lang === "ar"
          ? "العميل يرى أين وصلت العملية ضمن المراحل الرسمية، والفريق يعرف من المسؤول عن المرحلة التالية."
          : "Customers can see where the shipment stands in the official stages, and the team knows who owns the next operational step.",
    },
  ];

  return (
    <section className="bg-card/50 py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "لماذا تبدو Lourex منصة آمنة واحترافية" : "Why Lourex feels safe and professional"}
          </h2>
          <p className="text-base leading-8 text-muted-foreground">
            {lang === "ar"
              ? "لأن كل جزء في الرحلة التجارية يمر داخل نظام منضبط: طلب واضح، مراجعة داخلية، تنفيذ مراقب، محاسبة مقفلة، وتدقيق قابل للرجوع."
              : "Because every part of the trade journey moves through a controlled system: clear intake, internal review, monitored execution, locked accounting, and reviewable audit history."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="luxury-card rounded-[2rem] p-6 text-center group"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-colors group-hover:bg-primary/20">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-serif text-lg font-bold">{item.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyLourexSafe;
