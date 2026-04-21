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

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message) {
      return message;
    }
  }

  return fallback;
}

const initialFormState: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

const ContactPage = () => {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContactFormState>(initialFormState);

  const isArabic = lang === "ar";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedCompany = form.company.trim();
    const trimmedMessage = form.message.trim();

    if (!trimmedName || !trimmedEmail) {
      toast.error(isArabic ? "يرجى ملء الحقول المطلوبة" : "Please fill in the required fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("inquiries").insert({
        name: trimmedName.slice(0, 100),
        email: trimmedEmail.slice(0, 255),
        phone: trimmedPhone.slice(0, 20),
        company: trimmedCompany.slice(0, 100),
        message: trimmedMessage.slice(0, 1000),
        inquiry_type: "contact",
      });

      if (error) {
        throw error;
      }

      toast.success(isArabic ? "تم إرسال رسالتك بنجاح" : "Message sent successfully");
      setForm(initialFormState);
    } catch (error: unknown) {
      toast.error(
          getErrorMessage(
              error,
              isArabic ? "تعذر إرسال الرسالة، حاول مرة أخرى" : "Failed to send message, please try again",
          ),
      );
    } finally {
      setLoading(false);
    }
  };

  const info = [
    { icon: Mail, label: "Email", value: "info@lourex.com" },
    { icon: Phone, label: isArabic ? "الهاتف" : "Phone", value: "+90 (212) 000 0000" },
    { icon: MapPin, label: isArabic ? "الموقع" : "Location", value: "Istanbul, Turkey" },
    { icon: Globe, label: isArabic ? "الموقع الإلكتروني" : "Website", value: "lourex.lovable.app" },
  ];

  return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pb-16 pt-24">
          <div className="container mx-auto max-w-5xl px-4 md:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 text-center"
            >
              <h1 className="mb-3 text-3xl font-bold md:text-4xl">
                {isArabic ? "تواصل" : "Contact"}{" "}
                <span className="text-gradient-gold">{isArabic ? "معنا" : "Us"}</span>
              </h1>

              <p className="mx-auto max-w-xl text-muted-foreground">
                {isArabic
                    ? "نحن هنا لمساعدتك. تواصل معنا لأي استفسار أو دعم."
                    : "We're here to help. Reach out for any inquiries or support."}
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-2xl border border-border/50 bg-card p-6"
                >
                  <h2 className="mb-2 text-lg font-bold">
                    {isArabic ? "أرسل رسالة" : "Send a Message"}
                  </h2>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                        placeholder={isArabic ? "الاسم *" : "Name *"}
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        required
                        maxLength={100}
                        disabled={loading}
                    />

                    <Input
                        type="email"
                        placeholder={isArabic ? "البريد الإلكتروني *" : "Email *"}
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        maxLength={255}
                        disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                        placeholder={isArabic ? "الهاتف" : "Phone"}
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        maxLength={20}
                        disabled={loading}
                    />

                    <Input
                        placeholder={isArabic ? "الشركة" : "Company"}
                        value={form.company}
                        onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                        maxLength={100}
                        disabled={loading}
                    />
                  </div>

                  <Textarea
                      placeholder={isArabic ? "رسالتك..." : "Your message..."}
                      value={form.message}
                      onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                      rows={5}
                      maxLength={1000}
                      disabled={loading}
                  />

                  <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                    {loading
                        ? isArabic
                            ? "جاري الإرسال..."
                            : "Sending..."
                        : isArabic
                            ? "إرسال"
                            : "Send Message"}
                  </Button>
                </form>
              </motion.div>

              <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
              >
                {info.map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    </div>
                ))}

                <div className="mt-4 rounded-xl border border-primary/20 bg-card p-6">
                  <h3 className="mb-2 font-bold">{isArabic ? "ساعات العمل" : "Business Hours"}</h3>

                  <p className="text-sm text-muted-foreground">
                    {isArabic
                        ? "الأحد - الخميس: 9:00 - 18:00"
                        : "Monday - Friday: 9:00 AM - 6:00 PM"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {isArabic
                        ? "المنطقة الزمنية: توقيت تركيا (GMT+3)"
                        : "Timezone: Turkey (GMT+3)"}
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