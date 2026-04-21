import { Mail, MessageSquareText, Phone } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { useI18n } from "@/lib/i18n";

export default function ContactPage() {
  const { lang } = useI18n();

  const cards = [
    { icon: Mail, label: "Email", value: "ops@lourex.com" },
    { icon: Phone, label: lang === "ar" ? "الهاتف" : "Phone", value: "+90 555 000 0000" },
    {
      icon: MessageSquareText,
      label: lang === "ar" ? "مكتب العمليات" : "Operations Desk",
      value: lang === "ar" ? "الأحد - الخميس | 09:00 - 18:00" : "Sun - Thu | 09:00 - 18:00",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:px-8">
        <SectionHeading
          eyebrow={lang === "ar" ? "تواصل" : "Contact"}
          title={lang === "ar" ? "تواصل مع فريق Lourex" : "Contact the Lourex team"}
          description={
            lang === "ar"
              ? "للاستفسارات التشغيلية أو المتابعة أو التنسيق بين الوكلاء والعميل."
              : "For operational inquiries, follow-up requests, or coordination between partners and customer."
          }
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((item) => (
            <div key={item.label} className="rounded-3xl border border-border/60 bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
