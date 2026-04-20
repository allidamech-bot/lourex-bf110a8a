import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import RequestQuoteModal from "@/components/RequestQuoteModal";

const FinalCTA = forwardRef<HTMLElement>((_props, ref) => {
  const { lang } = useI18n();
  const [showQuote, setShowQuote] = useState(false);

  const content = {
    en: {
      title: "Ready to Start Sourcing?",
      subtitle: "Get a free quote from verified Turkish manufacturers. No commitment required — just tell us what you need.",
      cta1: "Request a Quote",
      cta2: "Explore Suppliers",
      trust: "Average response time: 24 hours",
    },
    ar: {
      title: "مستعد لبدء التوريد؟",
      subtitle: "احصل على عرض سعر مجاني من مصانع تركية موثقة. لا التزام مطلوب — أخبرنا بما تحتاجه.",
      cta1: "اطلب عرض سعر",
      cta2: "استكشف الموردين",
      trust: "متوسط وقت الاستجابة: 24 ساعة",
    },
    tr: {
      title: "Tedarik Etmeye Hazır mısınız?",
      subtitle: "Doğrulanmış Türk üreticilerinden ücretsiz teklif alın. Taahhüt gerekmez — sadece neye ihtiyacınız olduğunu söyleyin.",
      cta1: "Teklif İsteyin",
      cta2: "Tedarikçileri Keşfedin",
      trust: "Ortalama yanıt süresi: 24 saat",
    },
  };

  const t = content[lang] || content.en;

  return (
    <>
      <section ref={ref} className="py-24 bg-card/50">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4">{t.title}</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">{t.subtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button variant="gold" size="lg" className="text-base px-10 font-semibold" onClick={() => setShowQuote(true)}>
                <FileText className="w-4 h-4 me-2" />
                {t.cta1}
                <ArrowRight className="ms-2" size={18} />
              </Button>
              <Button variant="gold-outline" size="lg" className="text-base px-10" asChild>
                <Link to="/catalog">{t.cta2}</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span>{t.trust}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <RequestQuoteModal open={showQuote} onClose={() => setShowQuote(false)} />
    </>
  );
});
FinalCTA.displayName = "FinalCTA";

export default FinalCTA;
