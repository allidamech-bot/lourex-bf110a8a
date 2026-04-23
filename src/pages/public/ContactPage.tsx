import { SEO } from "@/components/seo/SEO";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";
import {
  Clock3,
  Globe,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  SendHorizonal,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContactInquiry } from "@/domain/public/inquiries";
import { publicContactInfo } from "@/lib/contactInfo";
import { useI18n } from "@/lib/i18n";
import { logOperationalError, trackEvent } from "@/lib/monitoring";

type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
};

type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((value) => value === "" || /^[0-9+()\-\s]+$/.test(value), {
      message: "phone",
    }),
  company: z.string().trim().max(100),
  message: z.string().trim().min(10).max(1000),
});

const logDevError = (message: string, details: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, details);
  }
};

export default function ContactPage() {
  const { dir, t } = useI18n();
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);

  const fieldErrors = useMemo(
    () => ({
      name: t("contact.errors.name"),
      email: t("contact.errors.email"),
      phone: t("contact.errors.phone"),
      company: t("contact.errors.company"),
      message: t("contact.errors.message"),
    }),
    [t],
  );

  const cards = useMemo(
    () => [
      { icon: Mail, label: t("contact.labels.email"), value: publicContactInfo.email },
      { icon: Phone, label: t("contact.labels.phone"), value: publicContactInfo.phone },
      { icon: Globe, label: t("contact.labels.website"), value: publicContactInfo.website },
      {
        icon: MapPin,
        label: t("contact.labels.location"),
        value: dir === "rtl" ? publicContactInfo.location.ar : publicContactInfo.location.en,
      },
      {
        icon: MessageSquareText,
        label: t("contact.labels.operationsDesk"),
        value: dir === "rtl" ? publicContactInfo.operationsDesk.ar : publicContactInfo.operationsDesk.en,
      },
      {
        icon: Clock3,
        label: t("contact.labels.businessHours"),
        value: dir === "rtl" ? publicContactInfo.businessHours.ar : publicContactInfo.businessHours.en,
      },
    ],
    [dir, t],
  );

  const updateValue =
    (field: keyof ContactFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;

      setValues((current) => ({ ...current, [field]: nextValue }));
      setSubmitSucceeded(false);

      if (errors[field]) {
        setErrors((current) => {
          const nextErrors = { ...current };
          delete nextErrors[field];
          return nextErrors;
        });
      }
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const result = contactSchema.safeParse(values);

    if (!result.success) {
      const nextErrors: ContactFormErrors = {};

      for (const issue of result.error.issues) {
        const field = issue.path[0];

        if (typeof field === "string" && field in fieldErrors) {
          const typedField = field as keyof ContactFormValues;
          nextErrors[typedField] = fieldErrors[typedField];
        }
      }

      setErrors(nextErrors);
      toast.error(t("contact.failureTitle"), {
        description: t("contact.validationToast"),
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || null,
      company: result.data.company || null,
      message: result.data.message,
    };

    try {
      const { data, error } = await submitContactInquiry(payload);

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.success === false) {
        throw new Error(data.message || t("contact.failureDescription"));
      }

      setValues(initialValues);
      setErrors({});
      setSubmitSucceeded(true);
      trackEvent("contact_submitted", {
        hasPhone: Boolean(payload.phone),
        hasCompany: Boolean(payload.company),
      });
      toast.success(t("contact.successTitle"), {
        description: t("contact.successDescription"),
      });
    } catch (error: any) {
      logDevError("Contact inquiry submission failed.", error);
      logOperationalError("contact_submit", error, { hasEmail: Boolean(payload.email) });
      const message = error?.message || t("contact.failureDescription");
      toast.error(t("contact.failureTitle"), {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={t("nav.contact")}
        description={
          dir === "rtl"
            ? "تواصل مع Lourex للاستفسارات المتعلقة بالتوريد الدولي والخدمات اللوجستية والعمليات التجارية."
            : "Contact Lourex for inquiries about international sourcing, logistics, and trade operations."
        }
      />
      <SiteHeader />

      <main className="container mx-auto px-4 py-12 md:px-8">
        <div className="rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,hsla(var(--card)/0.96),hsla(var(--card)/0.88))] p-6 shadow-[0_28px_80px_-52px_rgba(0,0,0,0.7)] md:p-10">
          <SectionHeading
            eyebrow={t("contact.eyebrow")}
            title={t("contact.title")}
            description={t("contact.description")}
          />

          <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="rounded-[1.75rem] border border-primary/15 bg-secondary/10 p-6 md:p-8">
              <div className="max-w-2xl">
                <h2 className="font-serif text-2xl font-semibold">{t("contact.formTitle")}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t("contact.formDescription")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate dir={dir}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Input
                      value={values.name}
                      onChange={updateValue("name")}
                      placeholder={t("contact.placeholders.name")}
                      maxLength={100}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="email"
                      value={values.email}
                      onChange={updateValue("email")}
                      placeholder={t("contact.placeholders.email")}
                      maxLength={255}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Input
                      value={values.phone}
                      onChange={updateValue("phone")}
                      placeholder={t("contact.placeholders.phone")}
                      maxLength={40}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={values.company}
                      onChange={updateValue("company")}
                      placeholder={t("contact.placeholders.company")}
                      maxLength={100}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.company)}
                    />
                    {errors.company ? <p className="text-sm text-destructive">{errors.company}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={values.message}
                    onChange={updateValue("message")}
                    placeholder={t("contact.placeholders.message")}
                    rows={7}
                    maxLength={1000}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.message)}
                  />
                  {errors.message ? <p className="text-sm text-destructive">{errors.message}</p> : null}
                </div>

                <Button type="submit" variant="gold" className="w-full md:w-auto" disabled={isSubmitting}>
                  <SendHorizonal className="me-2 h-4 w-4" />
                  {isSubmitting ? t("contact.submitting") : t("contact.submit")}
                </Button>
                {submitSucceeded ? (
                  <p className="text-sm text-primary" role="status">
                    {t("contact.successDescription")}
                  </p>
                ) : null}
              </form>
            </section>

            <section className="space-y-4">
              {cards.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-[1.6rem] border border-border/60 bg-card/90 p-5 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      {item.label === t("contact.labels.website") ? (
                        <a
                          href={publicContactInfo.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-all font-medium text-primary hover:underline"
                        >
                          {item.value}
                        </a>
                      ) : item.label === t("contact.labels.email") ? (
                        <a
                          href={`mailto:${publicContactInfo.email}`}
                          className="mt-2 block break-all font-medium text-primary hover:underline"
                        >
                          {item.value}
                        </a>
                      ) : item.label === t("contact.labels.phone") ? (
                        <a
                          href={`tel:${publicContactInfo.phone.replace(/[^+\d]/g, "")}`}
                          className="mt-2 block font-medium text-primary hover:underline"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="mt-2 font-medium">{item.value}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
