import { motion } from "framer-motion";
import { Package, MessageCircle, MapPin, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

const DashboardPreview = () => {
  const { lang } = useI18n();

  const panels = [
    { icon: Package, label: lang === "ar" ? "الطلبات" : "Orders", value: "Track & manage orders", color: "text-blue-500" },
    { icon: MessageCircle, label: lang === "ar" ? "الرسائل" : "Messages", value: "Real-time chat with suppliers", color: "text-emerald-500" },
    { icon: MapPin, label: lang === "ar" ? "التتبع" : "Tracking", value: "Follow shipments live", color: "text-purple-500" },
    { icon: BarChart3, label: lang === "ar" ? "التحليلات" : "Analytics", value: "Business insights & stats", color: "text-primary" },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4">
            {lang === "ar" ? "لوحة تحكم قوية" : "Powerful Dashboard"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ar"
              ? "أدر أعمالك التجارية بالكامل من مكان واحد"
              : "Manage your entire trade operations from one place."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="luxury-card p-6 md:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {panels.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-secondary/50 border border-border/50 text-center">
                <p.icon className={`w-8 h-8 mx-auto mb-3 ${p.color}`} />
                <h4 className="font-semibold text-sm mb-1">{p.label}</h4>
                <p className="text-xs text-muted-foreground">{p.value}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button variant="gold" asChild>
              <Link to="/auth">{lang === "ar" ? "ابدأ الآن" : "Get Started"}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
