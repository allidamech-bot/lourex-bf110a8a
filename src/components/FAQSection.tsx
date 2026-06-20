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
        q: "What is LOUREX?",
        a: "LOUREX is a trade intermediary and sourcing coordination company for food and sweets products, connecting business buyers with suppliers and managing purchase requests, supplier coordination, deal follow-up, and delivery tracking.",
      },
      ar: {
        q: "ما هي لوريكس؟",
        a: "لوريكس LOUREX هي شركة وساطة وتنسيق توريد وتصدير للمواد الغذائية والحلويات، تربط المشترين التجاريين بالموردين وتدير طلبات الشراء، تنسيق الموردين، متابعة الصفقات، والشحن حتى التسليم.",
      },
    },
    {
      en: {
        q: "Is LOUREX a marketplace?",
        a: "No. LOUREX is not primarily a marketplace or supplier listing website. LOUREX works as a trade intermediary and sourcing coordination company.",
      },
      ar: {
        q: "هل لوريكس منصة بيع أو سوق إلكتروني؟",
        a: "لا. لوريكس ليست مجرد سوق إلكتروني أو قائمة موردين. لوريكس تعمل كوسيط تجاري وشركة تنسيق توريد وتصدير.",
      },
    },
    {
      en: {
        q: "What products does LOUREX focus on?",
        a: "LOUREX focuses on chocolate, biscuits, food products, Turkish products, and Syrian products.",
      },
      ar: {
        q: "ما المنتجات التي تركز عليها لوريكس؟",
        a: "تركز لوريكس على الشوكولاتة، البسكويت، المواد الغذائية، المنتجات التركية، والمنتجات السورية.",
      },
    },
  ];

  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "الأسئلة الشائعة عن لوريكس" : "LOUREX FAQ"}
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            {lang === "ar"
              ? "إجابات مختصرة حول دور لوريكس كوسيط توريد وتنسيق تجاري."
              : "Short answers about LOUREX as a trade intermediary and sourcing coordination company."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => {
              const loc = faq[lang as "en" | "ar"] || faq.en;
              return (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-xl border border-border/50 bg-card/50 px-6 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="py-5 text-start font-serif text-base font-semibold transition-colors hover:text-primary [&[data-state=open]]:text-primary">
                    {loc.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
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
