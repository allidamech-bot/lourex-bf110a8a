import Footer from "@/components/Footer";
import { SEO } from "@/components/seo/SEO";
import { SupportConversationWidget } from "@/components/SupportConversationWidget";
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

const isSubmitInquiryResponse = (
  value: unknown,
): value is { success?: boolean; message?: string } =>
  typeof value === "object" &&
  value !== null &&
  (!("success" in value) || typeof value.success === "boolean") &&
  (!("message" in value) || typeof value.message === "string");

export default function ContactPage() {
  const { dir, t, lang } = useI18n();
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
        label: dir === "rtl" ? "السجل التجاري" : "Commercial Registration",
        value: dir === "rtl" ? publicContactInfo.commercialRegistration.ar : publicContactInfo.commercialRegistration.en,
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

      if (isSubmitInquiryResponse(data) && data.success === false) {
        throw new Error(data.message || t("contact.failureDescription"));
      }

      setValues(initialValues);
      setErrors({});
      setSubmitSucceeded(true);
      trackEvent("contact_submitted", {
        flow: "contact",
        hasPhone: Boolean(payload.phone),
        hasCompany: Boolean(payload.company),
      });
      toast.success(t("contact.successTitle"), {
        description: t("contact.successDescription"),
      });
    } catch (error: unknown) {
      logDevError("Contact inquiry submission failed.", error);
      logOperationalError("contact_submit", error, { flow: "contact", hasEmail: Boolean(payload.email) });
      const message = error instanceof Error ? error.message : t("contact.failureDescription");
      toast.error(t("contact.failureTitle"), {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lourex-public lourex-contact min-h-screen bg-background text-foreground">
      <SEO 
        title={t("nav.contact")}
        description={
          dir === "rtl"
            ? "تواصل مع Lourex للاستفسارات المتعلقة بالتوريد الدولي والخدمات اللوجستية والعمليات التجارية."
            : "Contact Lourex for inquiries about international sourcing, logistics, and trade operations."
        }
        url="https://www.lou-rex.com/contact"
      />
      <SiteHeader />

      <main className="container mx-auto px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="lrx-contact-shell relative overflow-hidden rounded-[2.25rem] border border-border/70 bg-card/60 p-5 shadow-soft sm:p-8 lg:p-12">
          <SectionHeading
            as="h1"
            eyebrow={t("contact.eyebrow")}
            title={t("contact.title")}
            description={t("contact.description")}
          />

          <div className="mt-10 grid items-start gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,0.8fr)] xl:gap-10">
            <section className="lrx-contact-form rounded-[1.75rem] border border-border/70 bg-background p-6 shadow-soft md:p-9">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-heading">{t("contact.formTitle")}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t("contact.formDescription")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate dir={dir}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="block text-sm font-semibold leading-6 text-heading">{t("contact.placeholders.name")}</label>
                    <Input
                      id="contact-name"
                      value={values.name}
                      onChange={updateValue("name")}
                      aria-label={t("contact.placeholders.name")}
                      autoComplete="name"
                      placeholder={t("contact.placeholders.name")}
                      maxLength={100}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.name)}
                      className="min-h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/25"
                    />
                    {errors.name ? <p className="text-sm text-red-400">{errors.name}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="block text-sm font-semibold leading-6 text-heading">{t("contact.placeholders.email")}</label>
                    <Input
                      type="email"
                      id="contact-email"
                      value={values.email}
                      onChange={updateValue("email")}
                      aria-label={t("contact.placeholders.email")}
                      autoComplete="email"
                      placeholder={t("contact.placeholders.email")}
                      maxLength={255}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.email)}
                      className="min-h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/25"
                    />
                    {errors.email ? <p className="text-sm text-red-400">{errors.email}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-phone" className="block text-sm font-semibold leading-6 text-heading">{t("contact.placeholders.phone")}</label>
                    <Input
                      id="contact-phone"
                      value={values.phone}
                      onChange={updateValue("phone")}
                      aria-label={t("contact.placeholders.phone")}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder={t("contact.placeholders.phone")}
                      maxLength={40}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.phone)}
                      className="min-h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/25"
                    />
                    {errors.phone ? <p className="text-sm text-red-400">{errors.phone}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="contact-company" className="block text-sm font-semibold leading-6 text-heading">{t("contact.placeholders.company")}</label>
                    <Input
                      id="contact-company"
                      value={values.company}
                      onChange={updateValue("company")}
                      aria-label={t("contact.placeholders.company")}
                      autoComplete="organization"
                      placeholder={t("contact.placeholders.company")}
                      maxLength={100}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.company)}
                      className="min-h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/25"
                    />
                    {errors.company ? <p className="text-sm text-red-400">{errors.company}</p> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-message" className="block text-sm font-semibold leading-6 text-heading">{t("contact.placeholders.message")}</label>
                  <Textarea
                    id="contact-message"
                    value={values.message}
                    onChange={updateValue("message")}
                    aria-label={t("contact.placeholders.message")}
                    placeholder={t("contact.placeholders.message")}
                    rows={7}
                    maxLength={1000}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.message)}
                    className="min-h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/25"
                  />
                  {errors.message ? <p className="text-sm text-red-400">{errors.message}</p> : null}
                </div>

                <Button type="submit" className="min-h-12 w-full rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-soft transition hover:opacity-90 md:w-auto" disabled={isSubmitting}>
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

            <section className="lrx-contact-details" aria-label={lang === "ar" ? "بيانات التواصل" : "Contact details"}>
              {cards.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="lrx-contact-detail"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      {item.label === t("contact.labels.website") ? (
                        <a
                          href={publicContactInfo.websiteUrl}
                          dir="ltr"
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-words font-medium text-primary [overflow-wrap:anywhere] hover:underline"
                        >
                          {item.value}
                        </a>
                      ) : item.label === t("contact.labels.email") ? (
                        <a
                          href={`mailto:${publicContactInfo.email}`}
                          dir="ltr"
                          className="mt-2 block break-words font-medium text-primary [overflow-wrap:anywhere] hover:underline"
                        >
                          {item.value}
                        </a>
                      ) : item.label === t("contact.labels.phone") ? (
                        <a
                          href={`tel:${publicContactInfo.phoneTel}`}
                          dir="ltr"
                          className="mt-2 block whitespace-nowrap font-medium text-primary hover:underline [unicode-bidi:isolate]"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="mt-2 font-medium text-heading">{item.value}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>

        <details className="lrx-contact-support mt-8">
          <summary>{lang === "ar" ? "تحتاج مساعدة في متابعة طلب؟" : "Need help following up a request?"}</summary>
          <div className="pt-4"><SupportConversationWidget /></div>
        </details>
      </main>
      <Footer />
    </div>
  );
}
