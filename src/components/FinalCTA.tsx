import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardList, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const FinalCTA = forwardRef<HTMLElement>((_props, ref) => {
  const { lang } = useI18n();

  return (
    <section ref={ref} className="bg-card/50 py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl rounded-[2.5rem] border border-primary/10 bg-[linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.88))] px-8 py-12 text-center shadow-[0_30px_80px_-42px_rgba(0,0,0,0.24)] dark:shadow-[0_30px_80px_-42px_rgba(0,0,0,0.85)]"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-6 font-serif text-3xl font-bold md:text-5xl">
            {lang === "ar"
              ? "ابدأ مع Lourex كعملية منضبطة لا كطلب عابر"
              : "Start with Lourex as a disciplined operation, not a casual inquiry"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            {lang === "ar"
              ? "إذا كان لديك منتج يحتاج إلى تنفيذ فعلي، فارفع الطلب بصوره ومواصفاته. سيبدأ المسار من المراجعة، ثم الصفقة، ثم التتبع والمحاسبة والتدقيق ضمن منصة واحدة."
              : "If you have a product that needs real sourcing and execution, submit it with images and detailed specs. Lourex will move it through review, deal creation, tracking, accounting, and audit within one platform."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="gold" size="lg" className="px-10 text-base font-semibold" asChild>
              <Link to="/request">
                <ClipboardList className="me-2 h-4 w-4" />
                {lang === "ar" ? "إرسال طلب شراء" : "Submit purchase request"}
                <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="px-10 text-base" asChild>
              <Link to="/track">{lang === "ar" ? "تتبع شحنة قائمة" : "Track an existing shipment"}</Link>
            </Button>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            {lang === "ar"
              ? "رحلة تجارية أوضح. قرارات أكثر ضبطًا. ثقة أعلى للعميل والفريق."
              : "A clearer trade journey. Better-controlled decisions. Greater trust for both customer and team."}
          </div>
        </motion.div>
      </div>
    </section>
  );
});

FinalCTA.displayName = "FinalCTA";

export default FinalCTA;
