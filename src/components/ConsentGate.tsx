import { forwardRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle2, ScrollText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const CONSENT_VERSION = "1.0";

interface ConsentGateProps {
  children: React.ReactNode;
}

export const ConsentGate = forwardRef<HTMLDivElement, ConsentGateProps>(({ children }, _ref) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tosChecked, setTosChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setHasConsented(true);
        return;
      }
      setUserId(user.id);

      const { data } = await (supabase as any)
        .from("legal_consents")
        .select("id")
        .eq("user_id", user.id)
        .eq("consent_type", "terms_of_service")
        .eq("version", CONSENT_VERSION)
        .maybeSingle();

      setHasConsented(!!data);
      setLoading(false);
    };

    checkConsent();
  }, []);

  const handleAccept = async () => {
    if (!userId || !tosChecked || !privacyChecked) return;
    setSubmitting(true);

    try {
      let ipAddress = "unknown";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const json = await res.json();
        ipAddress = json.ip;
      } catch { /* fallback */ }

      const deviceInfo = `${navigator.userAgent} | ${navigator.language} | ${screen.width}x${screen.height}`;

      const consents = [
        { user_id: userId, consent_type: "terms_of_service", ip_address: ipAddress, device_info: deviceInfo, version: CONSENT_VERSION },
        { user_id: userId, consent_type: "privacy_policy", ip_address: ipAddress, device_info: deviceInfo, version: CONSENT_VERSION },
      ];

      const { error } = await (supabase as any).from("legal_consents").insert(consents);
      if (error) throw error;

      setHasConsented(true);
      toast.success(t("consent.accepted"));
    } catch (err: any) {
      toast.error(err.message || "Failed to save consent");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasConsented) return <>{children}</>;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(0 0% 0% / 0.95) 100%)",
        }}
      >
        {/* Gold decorative line at top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg relative"
        >
          {/* Outer glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-primary/10 to-transparent blur-sm" />

          <div className="relative rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-8 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold tracking-wide">
                  <span className="text-primary">LOUREX</span>{" "}
                  {t("consent.title")}
                </h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                  {t("consent.description")}
                </p>
              </div>
            </div>

            {/* Legal content scrollable area */}
            <div className="max-h-52 overflow-y-auto rounded-xl bg-background/80 p-5 text-xs leading-relaxed space-y-4 border border-border/50 scrollbar-thin">
              <div className="flex items-center gap-2 mb-2">
                <ScrollText className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="/terms" target="_blank" className="font-semibold text-foreground text-sm hover:text-primary transition-colors underline underline-offset-2">
                  {t("consent.tosTitle")} ↗
                </a>
              </div>
              <p className="text-muted-foreground">{t("consent.tosContent")}</p>

              <div className="border-t border-border/50 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href="/privacy" target="_blank" className="font-semibold text-foreground text-sm hover:text-primary transition-colors underline underline-offset-2">
                    {t("consent.privacyTitle")} ↗
                  </a>
                </div>
                <p className="text-muted-foreground">{t("consent.privacyContent")}</p>
              </div>
            </div>

            {/* Checkboxes with gold accent */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={tosChecked}
                  onCheckedChange={(c) => setTosChecked(!!c)}
                  className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm group-hover:text-foreground transition-colors">{t("consent.agreeTerms")}</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={privacyChecked}
                  onCheckedChange={(c) => setPrivacyChecked(!!c)}
                  className="mt-0.5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm group-hover:text-foreground transition-colors">{t("consent.agreePrivacy")}</span>
              </label>
            </div>

            {/* Accept button with gold gradient */}
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all disabled:opacity-40"
              disabled={!tosChecked || !privacyChecked || submitting}
              onClick={handleAccept}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 me-2" />
                  {t("consent.accept")}
                </>
              )}
            </Button>

            {/* Legal note */}
            <p className="text-center text-[10px] text-muted-foreground/70 leading-relaxed">
              {t("consent.legalNote")}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

ConsentGate.displayName = "ConsentGate";
