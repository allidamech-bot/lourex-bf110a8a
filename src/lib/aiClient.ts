import { supabase } from "@/integrations/supabase/client";
import { logOperationalError } from "@/lib/monitoring";
import type { Lang } from "@/lib/i18n";

export const getAiUnavailableMessage = (lang: Lang) =>
  lang === "ar"
    ? "المساعد الذكي غير متاح حالياً، سيتم تحويل طلبك إلى أحد المشرفين."
    : "The AI assistant is currently unavailable. A supervisor will review your request.";

type InvokeLourexAiOptions = {
  body: Record<string, unknown>;
  lang: Lang;
  area: string;
  context?: Record<string, string | number | boolean | null | undefined>;
};

export const invokeLourexAi = async ({ body, lang, area, context = {} }: InvokeLourexAiOptions) => {
  try {
    const { data, error } = await supabase.functions.invoke("lourex-ai-chat", { body });
    if (error) throw error;
    return { data, error: null, unavailableMessage: null };
  } catch (error) {
    logOperationalError(area, error, {
      aiFunction: "lourex-ai-chat",
      ...context,
    });
    return {
      data: null,
      error,
      unavailableMessage: getAiUnavailableMessage(lang),
    };
  }
};

export const getAiReplyText = (data: unknown) => {
  const record = data as {
    reply?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  } | null;

  const reply = typeof record?.reply === "string" ? record.reply.trim() : "";
  if (reply) return reply;

  const choiceReply = record?.choices?.[0]?.message?.content;
  return typeof choiceReply === "string" ? choiceReply.trim() : "";
};
