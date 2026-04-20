import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface InquiryModalProps {
  open: boolean;
  onClose: () => void;
  factoryName?: string;
  inquiryType?: string;
}

const InquiryModal = ({ open, onClose, factoryName = "", inquiryType = "general" }: InquiryModalProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("submit-inquiry", {
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          message: form.message,
          inquiry_type: inquiryType,
          factory_name: factoryName,
        },
      });

      if (res.error || (res.data && res.data.error)) {
        const errMsg = res.data?.error || "Submission failed";
        toast.error(typeof errMsg === "string" ? errMsg : "Invalid input");
      } else {
        toast.success(t("inquiry.success"));
        setForm({ name: "", email: "", phone: "", company: "", message: "" });
        onClose();
      }
    } catch {
      toast.error("Submission failed");
    }
    setLoading(false);
  };

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
            className="glass-card rounded-xl w-full max-w-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 end-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold mb-1">{t("inquiry.title")}</h3>
            {factoryName && (
              <p className="text-sm text-gold mb-4">{factoryName}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 mt-4">
              <Input
                placeholder={t("inquiry.name")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-secondary border-border"
                required
              />
              <Input
                type="email"
                placeholder={t("inquiry.email")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-secondary border-border"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder={t("inquiry.phone")}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
                <Input
                  placeholder={t("inquiry.company")}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <textarea
                placeholder={t("inquiry.message")}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full h-24 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
              />
              <Button variant="gold" type="submit" className="w-full" disabled={loading}>
                {loading ? t("inquiry.sending") : t("inquiry.submit")}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InquiryModal;
