import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type TestimonialContent = {
  quote: string;
  name: string;
  role: string;
};

type Testimonial = {
  en: TestimonialContent;
  ar: TestimonialContent;
};

const testimonials: Testimonial[] = [
  {
    en: {
      quote:
        "LOUREX helped us identify reliable manufacturers quickly and with real operational confidence.",
      name: "Ahmad K.",
      role: "Import Manager, Saudi Arabia",
    },
    ar: {
      quote:
        "ساعدتنا LOUREX على الوصول إلى مصانع موثوقة بسرعة وبثقة تشغيلية حقيقية.",
      name: "أحمد ك.",
      role: "مدير الاستيراد، السعودية",
    },
  },
  {
    en: {
      quote:
        "The platform made our sourcing workflow clearer from the first request to final delivery tracking.",
      name: "Fatima R.",
      role: "Procurement Director, UAE",
    },
    ar: {
      quote:
        "جعلت المنصة رحلة التوريد أوضح لنا من أول طلب وحتى متابعة التسليم النهائي.",
      name: "فاطمة ر.",
      role: "مديرة المشتريات، الإمارات",
    },
  },
  {
    en: {
      quote:
        "As a supplier, LOUREX opened qualified business opportunities that were difficult to reach before.",
      name: "Mehmet Y.",
      role: "Factory Owner, Turkey",
    },
    ar: {
      quote:
        "كمورد، فتحت لنا LOUREX فرصاً تجارية مؤهلة كان من الصعب الوصول إليها سابقاً.",
      name: "محمد ي.",
      role: "صاحب مصنع، تركيا",
    },
  },
  {
    en: {
      quote:
        "The process feels structured and trustworthy for both sides, which matters a lot in cross-border trade.",
      name: "Sara M.",
      role: "Business Owner, Kuwait",
    },
    ar: {
      quote:
        "المسار يبدو منظمًا وموثوقًا للطرفين، وهذا مهم جداً في التجارة العابرة للحدود.",
      name: "سارة م.",
      role: "صاحبة أعمال، الكويت",
    },
  },
];

const palette = [
  "bg-blue-500/20 text-blue-500",
  "bg-emerald-500/20 text-emerald-500",
  "bg-purple-500/20 text-purple-500",
  "bg-primary/20 text-primary",
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

const Testimonials = forwardRef<HTMLElement>((_props, ref) => {
  const { lang } = useI18n();

  return (
    <section ref={ref} className="bg-background py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar" ? "ماذا يقول عملاؤنا" : "What our clients say"}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, index) => {
            const content = testimonial[lang];

            return (
              <motion.div
                key={content.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="luxury-card relative p-8"
              >
                <Quote className="absolute end-6 top-6 h-8 w-8 text-primary/10" />

                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                <p className="mb-6 leading-relaxed text-foreground italic">"{content.quote}"</p>

                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      palette[index % palette.length]
                    }`}
                  >
                    {getInitials(content.name)}
                  </div>
                  <div>
                    <div className="font-serif text-sm font-bold">{content.name}</div>
                    <div className="text-xs text-muted-foreground">{content.role}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

Testimonials.displayName = "Testimonials";

export default Testimonials;
