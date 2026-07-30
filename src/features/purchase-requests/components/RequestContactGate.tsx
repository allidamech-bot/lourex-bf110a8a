import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { supabase } from "@/integrations/supabase/client";
import { logOperationalError } from "@/lib/monitoring";

type RequestContactGateProps = {
  children: ReactNode;
  lang: "ar" | "en";
};

type ContactState = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
};

const emptyContact: ContactState = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
};

const normalize = (value: string | null | undefined) => value?.trim() || "";
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value: string) => value.replace(/\D/g, "").length >= 7;

export const RequestContactGate = ({ children, lang }: RequestContactGateProps) => {
  const { user, profile, loading, refreshProfile } = useAuthSession();
  const [contact, setContact] = useState<ContactState>(emptyContact);
  const [saving, setSaving] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const isArabic = lang === "ar";

  useEffect(() => {
    const nextContact = {
      fullName:
        normalize(profile?.fullName) ||
        normalize(user?.user_metadata?.full_name) ||
        normalize(user?.user_metadata?.name),
      email: normalize(user?.email) || normalize(profile?.email),
      phone: normalize(profile?.phone),
      country: normalize(profile?.country),
    };

    setContact(nextContact);
    setUnlocked(
      Boolean(
        nextContact.fullName &&
          isValidEmail(nextContact.email) &&
          isValidPhone(nextContact.phone) &&
          nextContact.country,
      ),
    );
  }, [profile, user]);

  const validation = useMemo(
    () => ({
      fullName: Boolean(contact.fullName.trim()),
      email: isValidEmail(contact.email),
      phone: isValidPhone(contact.phone),
      country: Boolean(contact.country.trim()),
    }),
    [contact],
  );

  const isComplete = Object.values(validation).every(Boolean);

  const labels = isArabic
    ? {
        title: "بيانات التواصل الإلزامية",
        description:
          "أدخل هذه البيانات واحفظها أولًا. بعدها سيفتح نموذج الطلب، وستُربط المعلومات تلقائيًا بالطلب.",
        fullName: "الاسم الكامل",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف مع رمز الدولة",
        country: "الدولة",
        save: "حفظ البيانات والمتابعة",
        saving: "جارٍ الحفظ...",
        ready: "بيانات التواصل مكتملة ويمكنك متابعة الطلب.",
        blocked: "لن يفتح نموذج الطلب قبل استكمال الاسم والبريد والهاتف والدولة.",
        invalidPhone: "أدخل رقم هاتف صحيحًا يحتوي على 7 أرقام على الأقل.",
        emailHint: "هذا هو البريد المرتبط بحسابك وتسجيل دخولك.",
        success: "تم حفظ بيانات التواصل.",
        error: "تعذر حفظ بيانات التواصل. حاول مرة أخرى.",
        customerOnly: "إرسال طلبات الشراء متاح لحسابات العملاء فقط.",
      }
    : {
        title: "Required contact details",
        description:
          "Enter and save these details first. The request form will then open and link them to the request automatically.",
        fullName: "Full name",
        email: "Email address",
        phone: "Phone number with country code",
        country: "Country",
        save: "Save details and continue",
        saving: "Saving...",
        ready: "Your contact details are complete. You can continue with the request.",
        blocked: "The request form remains locked until name, email, phone, and country are complete.",
        invalidPhone: "Enter a valid phone number containing at least 7 digits.",
        emailHint: "This is the email linked to your account and sign-in.",
        success: "Contact details saved.",
        error: "Unable to save contact details. Please try again.",
        customerOnly: "Purchase requests are available to customer accounts only.",
      };

  const updateField = (field: keyof ContactState, value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
    setUnlocked(false);
  };

  const handleSave = async () => {
    if (!user || !isComplete || saving) return;

    if (profile && profile.role !== "customer") {
      toast.error(labels.customerOnly);
      return;
    }

    setSaving(true);

    try {
      const normalizedContact = {
        fullName: contact.fullName.trim(),
        email: contact.email.trim().toLowerCase(),
        phone: contact.phone.trim(),
        country: contact.country.trim(),
      };

      const { error: customerError } = await supabase.rpc("upsert_current_customer_record", {
        p_full_name: normalizedContact.fullName,
        p_email: normalizedContact.email,
        p_phone: normalizedContact.phone,
        p_country: normalizedContact.country,
        p_city: normalize(profile?.city),
      });

      if (customerError) throw customerError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: normalizedContact.fullName,
          email: normalizedContact.email,
          phone: normalizedContact.phone,
          country: normalizedContact.country,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      setContact(normalizedContact);
      setUnlocked(true);
      toast.success(labels.success);
    } catch (error) {
      logOperationalError("purchase_request_contact_gate_save", error, {
        userId: user.id,
      });
      toast.error(labels.error);
      setUnlocked(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <>{children}</>;
  }

  if (profile && profile.role !== "customer") {
    return (
      <div className="rounded-[1.8rem] border border-destructive/25 bg-destructive/10 p-6 text-sm text-destructive">
        {labels.customerOnly}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-primary/25 bg-card/90 p-6 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.45)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">{labels.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{labels.description}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="request-contact-full-name">{labels.fullName} *</Label>
            <Input
              id="request-contact-full-name"
              value={contact.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              aria-invalid={!validation.fullName}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="request-contact-email">{labels.email} *</Label>
            <Input
              id="request-contact-email"
              type="email"
              value={contact.email}
              disabled
              dir="ltr"
              className="mt-2 opacity-75"
              aria-invalid={!validation.email}
            />
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{labels.emailHint}</p>
          </div>

          <div>
            <Label htmlFor="request-contact-phone">{labels.phone} *</Label>
            <Input
              id="request-contact-phone"
              type="tel"
              inputMode="tel"
              value={contact.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              aria-invalid={!validation.phone}
              dir="ltr"
              className="mt-2"
              placeholder="+90 5xx xxx xx xx"
            />
            {contact.phone && !validation.phone ? (
              <p className="mt-2 text-xs font-medium text-destructive">{labels.invalidPhone}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="request-contact-country">{labels.country} *</Label>
            <Input
              id="request-contact-country"
              value={contact.country}
              onChange={(event) => updateField("country", event.target.value)}
              aria-invalid={!validation.country}
              className="mt-2"
              placeholder={isArabic ? "مثال: تركيا" : "Example: Türkiye"}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`flex items-start gap-2 text-sm ${unlocked ? "text-emerald-400" : "text-amber-300"}`}>
            {unlocked ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{unlocked ? labels.ready : labels.blocked}</span>
          </div>

          <Button type="button" variant="gold" onClick={() => void handleSave()} disabled={!isComplete || saving}>
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </section>

      {unlocked ? children : null}
    </div>
  );
};
