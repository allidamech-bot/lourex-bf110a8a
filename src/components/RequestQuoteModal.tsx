import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface RequestQuoteModalProps {
  open: boolean;
  onClose: () => void;
}

const categories = [
  "Textiles & Fabrics",
  "Food & Beverages",
  "Steel & Metals",
  "Packaging & Paper",
  "Chemicals & Plastics",
  "Furniture & Home",
  "Electronics",
  "Industrial Equipment",
  "Construction Materials",
  "Other",
];

const timelines = ["Urgent (1-2 weeks)", "Standard (3-4 weeks)", "Flexible (1-2 months)", "Planning stage"];

const RequestQuoteModal = ({ open, onClose }: RequestQuoteModalProps) => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    product_type: "",
    quantity: "",
    target_country: "",
    budget: "",
    timeline: "",
    notes: "",
  });

  // If a verified user opens this, route them to the structured RFQ flow instead.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("verification_status").eq("id", user.id).maybeSingle();
      if (profile && ["verified", "approved"].includes(profile.verification_status)) {
        onClose();
        navigate("/rfq/new");
      }
    })();
  }, [open, navigate, onClose]);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.product_type || !form.quantity) {
      toast.error(lang === "ar" ? "يرجى ملء الحقول المطلوبة" : "Please fill in the required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("submit-inquiry", {
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          message: `[QUOTE REQUEST]\nProduct: ${form.product_type}\nQuantity: ${form.quantity}\nCountry: ${form.target_country}\nBudget: ${form.budget}\nTimeline: ${form.timeline}\nNotes: ${form.notes}`,
          inquiry_type: "quote_request",
          factory_name: "",
        },
      });
      if (res.error || res.data?.error) {
        toast.error("Submission failed. Please try again.");
      } else {
        toast.success(lang === "ar" ? "تم إرسال طلب عرض السعر بنجاح!" : "Quote request submitted successfully!");
        setForm({ name: "", email: "", phone: "", company: "", product_type: "", quantity: "", target_country: "", budget: "", timeline: "", notes: "" });
        onClose();
      }
    } catch {
      toast.error("Submission failed.");
    }
    setLoading(false);
  };

  const labels = {
    en: { title: "Request a Quote", subtitle: "Tell us what you need and we'll connect you with the right supplier.", name: "Full Name *", email: "Email *", phone: "Phone", company: "Company", product: "Product Type *", quantity: "Quantity *", country: "Destination Country", budget: "Budget Range (optional)", timeline: "Timeline", notes: "Additional Notes", submit: "Submit Quote Request", sending: "Submitting..." },
    ar: { title: "طلب عرض سعر", subtitle: "أخبرنا بما تحتاجه وسنصلك بالمورد المناسب.", name: "الاسم الكامل *", email: "البريد الإلكتروني *", phone: "الهاتف", company: "الشركة", product: "نوع المنتج *", quantity: "الكمية *", country: "بلد الوجهة", budget: "الميزانية (اختياري)", timeline: "الجدول الزمني", notes: "ملاحظات إضافية", submit: "إرسال طلب العرض", sending: "جاري الإرسال..." },
    tr: { title: "Teklif İsteyin", subtitle: "İhtiyacınızı bize söyleyin, sizi doğru tedarikçiyle buluşturalım.", name: "Ad Soyad *", email: "E-posta *", phone: "Telefon", company: "Şirket", product: "Ürün Tipi *", quantity: "Miktar *", country: "Hedef Ülke", budget: "Bütçe Aralığı (isteğe bağlı)", timeline: "Zaman Çizelgesi", notes: "Ek Notlar", submit: "Teklif Talebini Gönder", sending: "Gönderiliyor..." },
  };
  const t = labels[lang] || labels.en;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 end-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="font-serif text-2xl font-bold mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder={t.name} value={form.name} onChange={(e) => update("name", e.target.value)} className="bg-secondary border-border" required />
                <Input type="email" placeholder={t.email} value={form.email} onChange={(e) => update("email", e.target.value)} className="bg-secondary border-border" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder={t.phone} value={form.phone} onChange={(e) => update("phone", e.target.value)} className="bg-secondary border-border" />
                <Input placeholder={t.company} value={form.company} onChange={(e) => update("company", e.target.value)} className="bg-secondary border-border" />
              </div>

              <select
                value={form.product_type}
                onChange={(e) => update("product_type", e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="" disabled>{t.product}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <Input placeholder={t.quantity} value={form.quantity} onChange={(e) => update("quantity", e.target.value)} className="bg-secondary border-border" required />
                <Input placeholder={t.country} value={form.target_country} onChange={(e) => update("target_country", e.target.value)} className="bg-secondary border-border" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input placeholder={t.budget} value={form.budget} onChange={(e) => update("budget", e.target.value)} className="bg-secondary border-border" />
                <select
                  value={form.timeline}
                  onChange={(e) => update("timeline", e.target.value)}
                  className="h-10 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled>{t.timeline}</option>
                  {timelines.map((tl) => (
                    <option key={tl} value={tl}>{tl}</option>
                  ))}
                </select>
              </div>

              <textarea
                placeholder={t.notes}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className="w-full h-20 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />

              <Button variant="gold" type="submit" className="w-full font-semibold" disabled={loading}>
                <Send className="w-4 h-4 me-2" />
                {loading ? t.sending : t.submit}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RequestQuoteModal;
