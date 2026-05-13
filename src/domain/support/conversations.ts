import { supabase, isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce } from "@/integrations/supabase/client";
import { publicContactInfo } from "@/lib/contactInfo";
import type { Lang } from "@/lib/i18n";

export type SupportConversationInput = {
  name: string;
  contact: string;
  message: string;
  relatedReference?: string;
};

export const getSupportReceivedMessage = (lang: Lang) =>
  lang === "ar"
    ? "تم استلام رسالتك، سيقوم أحد المشرفين أو المسؤولين بالرد عليك قريباً."
    : "Your message has been received. A supervisor or manager will reply soon.";

export const submitSupportConversation = async (input: SupportConversationInput, lang: Lang) => {
  const normalized = {
    name: input.name.trim(),
    contact: input.contact.trim(),
    message: input.message.trim(),
    related_reference: input.relatedReference?.trim() || null,
    source: "customer_support_widget",
    status: "new",
  };

  if (normalized.name.length < 2 || normalized.contact.length < 3 || normalized.message.length < 5) {
    return {
      stored: false,
      message:
        lang === "ar"
          ? "يرجى إدخال الاسم ووسيلة التواصل والرسالة."
          : "Please enter your name, contact detail, and message.",
      error: new Error("Invalid support conversation input"),
    };
  }

  try {
    const { error } = await supabase.from("support_conversations").insert(normalized);
    if (error) throw error;
    return { stored: true, message: getSupportReceivedMessage(lang), error: null };
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("support_conversations", error);
      return { stored: false, message: getSupportReceivedMessage(lang), error: null };
    }

    return {
      stored: false,
      message: getSupportReceivedMessage(lang),
      error,
    };
  }
};

export const getSupportFallbackCopy = (lang: Lang) =>
  lang === "ar"
    ? `يمكنك التواصل مباشرة عبر واتساب/هاتف ${publicContactInfo.phone} أو البريد ${publicContactInfo.email}.`
    : `You can also contact us directly on WhatsApp/phone ${publicContactInfo.phone} or email ${publicContactInfo.email}.`;
