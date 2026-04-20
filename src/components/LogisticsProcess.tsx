import { motion } from "framer-motion";
import { Search, ClipboardCheck, Factory, Camera, Ship, FileCheck, Truck, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const LogisticsProcess = () => {
  const { lang } = useI18n();

  const steps = [
    { icon: Search, en: { title: "Sourcing", desc: "Find verified factories for your product category" }, ar: { title: "البحث عن المصدر", desc: "ابحث عن مصانع موثقة لفئة منتجك" } },
    { icon: ClipboardCheck, en: { title: "RFQ & Quotation", desc: "Request quotes, compare offers, negotiate terms" }, ar: { title: "طلب عرض الأسعار", desc: "اطلب عروض أسعار، قارن، تفاوض" } },
    { icon: Factory, en: { title: "Production", desc: "Factory begins production with 30% deposit secured" }, ar: { title: "الإنتاج", desc: "المصنع يبدأ الإنتاج بعد تأمين 30% مقدم" } },
    { icon: Camera, en: { title: "Pre-Shipment Inspection", desc: "Photo & video verification before shipping" }, ar: { title: "فحص ما قبل الشحن", desc: "تحقق بالصور والفيديو قبل الشحن" } },
    { icon: Ship, en: { title: "Shipping", desc: "Cargo dispatched via sea or air freight" }, ar: { title: "الشحن", desc: "إرسال البضائع بحراً أو جواً" } },
    { icon: FileCheck, en: { title: "Customs Clearance", desc: "Documentation and compliance handled" }, ar: { title: "التخليص الجمركي", desc: "إدارة المستندات والامتثال" } },
    { icon: Truck, en: { title: "Last-Mile Delivery", desc: "Cargo delivered to your warehouse" }, ar: { title: "التوصيل النهائي", desc: "توصيل البضائع إلى مستودعك" } },
    { icon: CheckCircle, en: { title: "Settlement", desc: "70% balance released after delivery confirmation" }, ar: { title: "التسوية", desc: "تحرير 70% رصيد بعد تأكيد الاستلام" } },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4">
            {lang === "ar" ? "كيف يعمل التوريد والشحن" : "How Sourcing & Shipping Works"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {lang === "ar"
              ? "عملية شفافة من المصنع إلى مستودعك — كل خطوة مؤمنة ومتتبعة"
              : "A transparent process from factory to your warehouse — every step secured and tracked"}
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute start-6 md:start-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />

            <div className="space-y-6">
              {steps.map((step, i) => {
                const loc = step[lang as "en" | "ar"] || step.en;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: lang === "ar" ? 30 : -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-5 relative"
                  >
                    <div className="relative z-10 shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-card border border-primary/20 flex items-center justify-center">
                      <step.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      <span className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div className="pt-2 md:pt-3">
                      <h3 className="font-serif text-base md:text-lg font-bold mb-1">{loc.title}</h3>
                      <p className="text-sm text-muted-foreground">{loc.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogisticsProcess;
