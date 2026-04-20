import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContactPage = () => {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error(lang === "ar" ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      name: form.name.trim().slice(0, 100),
      email: form.email.trim().slice(0, 255),
      phone: form.phone.trim().slice(0, 20),
      company: form.company.trim().slice(0, 100),
      message: form.message.trim().slice(0, 1000),
      inquiry_type: "contact",
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(lang === "ar" ? "تم إرسال رسالتك بنجاح" : "Message sent successfully");
      setForm({ name: "", email: "", phone: "", company: "", message: "" });
    }
  };

  const info = [
    { icon: Mail, label: "Email", value: "info@lourex.com" },
    { icon: Phone, label: lang === "ar" ? "الهاتف" : "Phone", value: "+90 (212) 000 0000" },
    { icon: MapPin, label: lang === "ar" ? "الموقع" : "Location", value: "Istanbul, Turkey" },
    { icon: Globe, label: lang === "ar" ? "الموقع الإلكتروني" : "Website", value: "lourex.lovable.app" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {lang === "ar" ? "تواصل" : "Contact"} <span className="text-gradient-gold">{lang === "ar" ? "معنا" : "Us"}</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {lang === "ar"
                ? "نحن هنا لمساعدتك. تواصل معنا لأي استفسار أو دعم."
                : "We're here to help. Reach out for any inquiries or support."}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold mb-2">
                  {lang === "ar" ? "أرسل رسالة" : "Send a Message"}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder={lang === "ar" ? "الاسم *" : "Name *"}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    maxLength={100}
                  />
                  <Input
                    type="email"
                    placeholder={lang === "ar" ? "البريد الإلكتروني *" : "Email *"}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder={lang === "ar" ? "الهاتف" : "Phone"}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={20}
                  />
                  <Input
                    placeholder={lang === "ar" ? "الشركة" : "Company"}
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <Textarea
                  placeholder={lang === "ar" ? "رسالتك..." : "Your message..."}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  maxLength={1000}
                />
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading
                    ? (lang === "ar" ? "جاري الإرسال..." : "Sending...")
                    : (lang === "ar" ? "إرسال" : "Send Message")}
                </Button>
              </form>
            </motion.div>

            {/* Contact Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              {info.map((item, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                </div>
              ))}

              <div className="bg-card border border-primary/20 rounded-xl p-6 mt-4">
                <h3 className="font-bold mb-2">
                  {lang === "ar" ? "ساعات العمل" : "Business Hours"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lang === "ar" ? "الأحد - الخميس: 9:00 - 18:00" : "Monday - Friday: 9:00 AM - 6:00 PM"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lang === "ar" ? "المنطقة الزمنية: توقيت تركيا (GMT+3)" : "Timezone: Turkey (GMT+3)"}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
