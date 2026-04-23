import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

import { WizardProgress } from "./WizardProgress";
import { Step1Account } from "./steps/Step1Account";
import { Step2Company, type CompanyBasics } from "./steps/Step2Company";
import { Step3Profile, type BusinessProfile } from "./steps/Step3Profile";
import { Step4Documents, type DocumentsPayload } from "./steps/Step4Documents";

const STEPS = [
  { label: "Account" },
  { label: "Company" },
  { label: "Profile" },
  { label: "Documents" },
];

export const SupplierWizard = () => {
  const navigate = useNavigate();
  const [bootLoading, setBootLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [account, setAccount] = useState<{ userId: string; email: string; contactName: string; phone: string } | null>(null);
  const [company, setCompany] = useState<CompanyBasics | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  // Boot: detect existing user / draft application to resume
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("factory_applications")
          .select("id, status, contact_name, phone, company_name, cr_number, tax_id, location")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setAccount({
          userId: user.id,
          email: user.email ?? "",
          contactName: existing?.contact_name ?? "",
          phone: existing?.phone ?? "",
        });

        if (existing?.status === "pending" || existing?.status === "approved") {
          // Already submitted — bounce out (the page wrapper handles this state)
          setBootLoading(false);
          return;
        }

        // Allow resuming from step 2 if we have an account
        setStep(2);
      }
      setBootLoading(false);
    })();
  }, []);

  const handleStep1 = (data: { userId: string; email: string; contactName: string; phone: string }) => {
    setAccount(data);
    setStep(2);
  };

  const handleStep2 = (data: CompanyBasics) => {
    setCompany(data);
    setStep(3);
  };

  const handleStep3 = (data: BusinessProfile) => {
    setProfile(data);
    setStep(4);
  };

  const handleStep4 = async (docs: DocumentsPayload) => {
    if (!account || !company || !profile) {
      toast.error("Some steps are missing — please go back.");
      return;
    }
    setSubmitting(true);
    try {
      const userId = account.userId;

      // 1) Upload CR doc → kyc_documents
      const uploadDoc = async (file: File, doc_type: string) => {
        const path = `${userId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("verification-docs").upload(path, file);
        if (error) throw error;
        await supabase.from("kyc_documents").insert({
          user_id: userId,
          doc_type,
          file_url: path,
          status: "pending",
        });
        return path;
      };

      if (docs.crDoc) await uploadDoc(docs.crDoc, "commercial_registration");
      if (docs.taxDoc) await uploadDoc(docs.taxDoc, "tax_certificate");

      // 2) Upload branding to company-assets bucket (public)
      const uploadAsset = async (file: File, kind: string) => {
        const path = `${userId}/${kind}_${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
        return data.publicUrl;
      };

      const logoUrl = docs.logo ? await uploadAsset(docs.logo, "logo") : "";
      const coverUrl = docs.cover ? await uploadAsset(docs.cover, "cover") : "";

      // 3) Insert factory_application
      const { error: appError } = await supabase.from("factory_applications").insert({
        user_id: userId,
        email: account.email,
        contact_name: account.contactName,
        phone: account.phone,
        company_name: company.company_name,
        cr_number: company.cr_number,
        tax_id: company.tax_id,
        location: company.location,
      });
      if (appError) throw appError;

      // 4) Stash the rich profile data + branding URLs in localStorage,
      //    keyed by user. Admin approval creates the factory; on first
      //    post-approval visit we'll create the company_profile row using this data.
      try {
        localStorage.setItem(
          `lourex:pending_profile:${userId}`,
          JSON.stringify({
            business_type: profile.business_type,
            categories: profile.categories,
            description: profile.description,
            website: company.website,
            year_established: profile.year_established,
            employee_count: profile.employee_count,
            logo_url: logoUrl,
            cover_url: coverUrl,
          })
        );
      } catch {
        // localStorage may be unavailable; not critical
      }

      toast.success("Application submitted! We'll review it within 24–48 hours.");
      navigate("/factory-dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gradient-gold tracking-wider mb-2">
            Become a LOUREX Supplier
          </h1>
          <p className="text-sm text-muted-foreground">A guided 4-step setup to verify and activate your business.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8">
          <WizardProgress currentStep={step} steps={STEPS} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <Step1Account
                  onComplete={handleStep1}
                  initialEmail={account?.email}
                  alreadyAuthenticated={!!account}
                  initialContactName={account?.contactName}
                  initialPhone={account?.phone}
                />
              )}
              {step === 2 && (
                <Step2Company
                  onComplete={handleStep2}
                  onBack={() => setStep(1)}
                  initial={company ?? undefined}
                />
              )}
              {step === 3 && (
                <Step3Profile
                  onComplete={handleStep3}
                  onBack={() => setStep(2)}
                  initial={profile ?? undefined}
                />
              )}
              {step === 4 && (
                <Step4Documents
                  onComplete={handleStep4}
                  onBack={() => setStep(3)}
                  loading={submitting}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <button onClick={() => navigate("/auth")} className="text-primary hover:underline">Sign in</button>
        </p>
      </div>
    </div>
  );
};
