import { motion } from "framer-motion";
import {
  ClipboardPlus,
  FileSearch,
  Handshake,
  PackageCheck,
  Scale,
  Truck,
  WalletCards,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { shipmentStages } from "@/lib/shipmentStages";

const LogisticsProcess = () => {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  const operatingLanes = [
    {
      icon: ClipboardPlus,
      title: isArabic ? "استقبال طلب قابل للتنفيذ" : "Execution-ready request intake",
      desc: isArabic
        ? "يبدأ العميل بطلب مدعوم بالصور والمواصفات حتى لا تتحول العملية إلى مراسلات غامضة."
        : "The customer starts with images and specifications so the operation does not become a vague message thread.",
      owner: isArabic ? "العميل + فريق Lourex" : "Customer + Lourex team",
    },
    {
      icon: FileSearch,
      title: isArabic ? "مراجعة وتحويل منظم" : "Reviewed operational conversion",
      desc: isArabic
        ? "يتم تدقيق الطلب ثم تحويله إلى صفقة تشغيلية مرتبطة بالأطراف والمسؤوليات."
        : "The request is reviewed, then converted into an operational deal tied to parties and responsibilities.",
      owner: isArabic ? "فريق العمليات" : "Operations team",
    },
    {
      icon: Handshake,
      title: isArabic ? "تنسيق الشريك التركي والسعودي" : "Turkish and Saudi partner coordination",
      desc: isArabic
        ? "كل طرف يرى مساحة عمله ومسؤولياته، بدل إدارة العملية عبر محادثات متفرقة."
        : "Each party gets its workspace and responsibilities instead of running the operation through fragmented chats.",
      owner: isArabic ? "الشركاء + المالك" : "Partners + owner",
    },
    {
      icon: PackageCheck,
      title: isArabic ? "تنفيذ وتتبّع رسمي" : "Execution with official tracking",
      desc: isArabic
        ? "الشحنة تتحرك عبر 11 مرحلة رسمية قابلة للعرض للعميل والفريق حسب الصلاحيات."
        : "The shipment moves through 11 official stages visible to customer and team according to permissions.",
      owner: isArabic ? "فريق العمليات واللوجستيات" : "Operations and logistics",
    },
    {
      icon: WalletCards,
      title: isArabic ? "ضبط مالي وتدقيق" : "Financial control and audit",
      desc: isArabic
        ? "القيود المالية مرتبطة بالصفقة أو عامة، وتُقفل بعد الإنشاء مع مسار تعديل رسمي."
        : "Financial records are global or deal-linked, locked after creation, and corrected through formal edit requests.",
      owner: isArabic ? "المالك والمحاسبة" : "Owner and accounting",
    },
    {
      icon: Scale,
      title: isArabic ? "إغلاق وتقارير" : "Closure and reporting",
      desc: isArabic
        ? "تنتهي العملية بتسليم واضح وسجل تدقيقي وتقارير للمنصة والعميل والصفقة."
        : "The process ends with clear delivery, audit history, and reports at platform, customer, and deal levels.",
      owner: isArabic ? "الإدارة" : "Management",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-stone-950 py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,160,74,0.10),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,245,244,0.04),transparent_26%)]" />
      <div className="container relative mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end"
        >
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/90">
              {isArabic ? "التدفق التشغيلي" : "Operations flow"}
            </p>
            <h2 className="font-serif text-3xl font-bold text-stone-100 md:text-5xl">
              {isArabic ? "من الطلب إلى الإغلاق، بدون فوضى تشغيلية" : "From request to closure, without operational noise"}
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-stone-300">
            {isArabic
              ? "Lourex لا يتعامل مع الطلب كعملية شراء بسيطة. كل طلب يدخل مساراً منظماً يربط العميل، فريق العمليات، الشريك التركي، الشريك السعودي، التتبع، المحاسبة، والتدقيق في قصة تشغيل واحدة."
              : "Lourex does not treat the request as a simple checkout. Every request enters a governed path connecting the customer, operations team, Turkish partner, Saudi partner, tracking, accounting, and audit into one operating story."}
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {operatingLanes.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-[1.65rem] border border-stone-200/10 bg-stone-900/45 p-5 shadow-xl shadow-stone-950/20 transition hover:-translate-y-1 hover:border-amber-300/20 hover:bg-stone-900/70"
              >
                <div className="flex items-start gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-300">
                    <step.icon className="h-5 w-5 rtl:-scale-x-100" />
                    <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-950">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-stone-100 transition-colors group-hover:text-amber-100">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-400">{step.desc}</p>
                    <p className="mt-4 inline-flex rounded-full border border-stone-200/10 bg-stone-950/55 px-3 py-1 text-xs text-stone-300">
                      {step.owner}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="rounded-[2rem] border border-stone-200/10 bg-stone-900/55 p-5 shadow-2xl shadow-stone-950/35"
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
                  {isArabic ? "خريطة التتبع الرسمية" : "Official tracking map"}
                </p>
                <h3 className="mt-3 font-serif text-2xl font-semibold text-stone-100">
                  {isArabic ? "11 مرحلة قابلة للمراجعة" : "11 reviewable stages"}
                </h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-300">
                <Truck className="h-5 w-5 rtl:-scale-x-100" />
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {shipmentStages.map((stage) => (
                <div
                  key={stage.code}
                  className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-2xl border border-stone-200/10 bg-stone-950/35 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-xs font-bold text-stone-950">
                    {stage.order}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-100">
                        {isArabic ? stage.label : stage.labelEn}
                      </p>
                      <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-200">
                        {isArabic ? stage.owner : stage.ownerEn}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-stone-400">
                      {isArabic ? stage.description : stage.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LogisticsProcess;
