import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const { lang } = useI18n();

  const faqs = [
    {
      en: {
        q: "What is the minimum order quantity (MOQ)?",
        a: "MOQ varies by product and factory. Most suppliers accept orders starting from 1 pallet (approximately 500–1,000 units depending on the product). We also offer LCL (Less than Container Load) consolidation for smaller orders.",
      },
      ar: {
        q: "ما هو الحد الأدنى لكمية الطلب (MOQ)؟",
        a: "يختلف الحد الأدنى حسب المنتج والمصنع. معظم الموردين يقبلون طلبات تبدأ من باليت واحد (حوالي 500-1000 وحدة). نوفر أيضاً خدمة تجميع الشحنات للطلبات الأصغر.",
      },
    },
    {
      en: {
        q: "How does the payment process work?",
        a: "We use a milestone-based escrow structure: 30% deposit upon order confirmation, and 70% balance released only after pre-shipment inspection approval. Your funds are held securely until you confirm the goods meet specifications.",
      },
      ar: {
        q: "كيف تعمل عملية الدفع؟",
        a: "نستخدم نظام ضمان قائم على المراحل: 30% مقدم عند تأكيد الطلب، و70% رصيد يُحرر فقط بعد موافقة فحص ما قبل الشحن. أموالك محفوظة بأمان حتى تأكيد استلام البضائع.",
      },
    },
    {
      en: {
        q: "How are suppliers verified?",
        a: "Every supplier undergoes strict KYC verification including Commercial Register, Tax Certificate, and Industrial License review. We also conduct factory audits and maintain reliability scores based on order history and buyer feedback.",
      },
      ar: {
        q: "كيف يتم التحقق من الموردين؟",
        a: "يخضع كل مورد لتحقق صارم يشمل السجل التجاري والشهادة الضريبية والرخصة الصناعية. نجري أيضاً تدقيقات مصنعية ونحتفظ بنقاط موثوقية بناءً على تاريخ الطلبات.",
      },
    },
    {
      en: {
        q: "What countries do you ship to?",
        a: "We ship to Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman, Egypt, Jordan, Iraq, and 35+ countries worldwide. Our primary trade corridors are Turkey → Saudi Arabia and Turkey → Gulf region.",
      },
      ar: {
        q: "ما هي الدول التي تشحنون إليها؟",
        a: "نشحن إلى السعودية والإمارات وقطر والكويت والبحرين وعمان ومصر والأردن والعراق وأكثر من 35 دولة. ممراتنا التجارية الرئيسية من تركيا إلى السعودية والخليج.",
      },
    },
    {
      en: {
        q: "How long does shipping take?",
        a: "Standard sea freight from Turkey to Saudi Arabia takes 7–12 days. Production lead times vary by product (typically 2–4 weeks). We provide real-time tracking at every stage from factory to delivery.",
      },
      ar: {
        q: "كم تستغرق مدة الشحن؟",
        a: "الشحن البحري من تركيا إلى السعودية يستغرق 7-12 يوم. مدة الإنتاج تختلف حسب المنتج (عادة 2-4 أسابيع). نوفر تتبع مباشر في كل مرحلة.",
      },
    },
    {
      en: {
        q: "What if there's a problem with my order?",
        a: "We have a dedicated dispute resolution team. All orders include pre-shipment inspections with photo/video evidence. If goods don't match specifications, the balance payment is held until the issue is resolved.",
      },
      ar: {
        q: "ماذا لو كانت هناك مشكلة في طلبي؟",
        a: "لدينا فريق مختص لحل النزاعات. جميع الطلبات تشمل فحص ما قبل الشحن بالصور والفيديو. إذا لم تطابق البضائع المواصفات، يتم تعليق الدفعة حتى حل المشكلة.",
      },
    },
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
            {lang === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ar"
              ? "إجابات على الأسئلة الأكثر شيوعاً حول التوريد والشحن عبر LOUREX"
              : "Answers to the most common questions about sourcing and shipping through LOUREX"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => {
              const loc = faq[lang as "en" | "ar"] || faq.en;
              return (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border/50 rounded-xl px-6 bg-card/50 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-start font-serif font-semibold text-base hover:text-primary transition-colors py-5 [&[data-state=open]]:text-primary">
                    {loc.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                    {loc.a}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
