import { isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce, supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { recordNotificationReadiness } from "@/domain/notifications/readiness";

export type OfficialConversationSenderType = "customer" | "admin" | "system";

export type OfficialOrderConversation = {
  id: string;
  requestId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  assignedAdminId?: string | null;
  status: string;
  conversationType: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type OfficialConversationMessage = {
  id: string;
  conversationId: string;
  senderId?: string | null;
  senderType: OfficialConversationSenderType;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

export type OfficialConversationThread = {
  conversation: OfficialOrderConversation | null;
  messages: OfficialConversationMessage[];
  unavailable: boolean;
};

type ConversationRow = {
  id: string;
  request_id?: string | null;
  deal_id?: string | null;
  customer_id?: string | null;
  assigned_admin_id?: string | null;
  status?: string | null;
  conversation_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id?: string | null;
  sender_type: OfficialConversationSenderType;
  message: string;
  read_at?: string | null;
  created_at?: string | null;
};

export const OFFICIAL_ORDER_CONVERSATION_TYPE = "official_order_conversation";

const systemMessage = {
  ar: "تم قبول طلبك وفتح محادثة رسمية لمتابعة التفاصيل.",
  en: "Your request has been accepted and an official conversation has been opened for follow-up.",
};

export const isOfficialConversationEligibleStatus = (status?: string | null) =>
  ["ready_for_conversion", "transfer_proof_pending", "in_progress", "completed"].includes(status || "");

const mapConversation = (row: ConversationRow): OfficialOrderConversation => ({
  id: row.id,
  requestId: row.request_id,
  dealId: row.deal_id,
  customerId: row.customer_id,
  assignedAdminId: row.assigned_admin_id,
  status: row.status || "open",
  conversationType: row.conversation_type || OFFICIAL_ORDER_CONVERSATION_TYPE,
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at,
});

const mapMessage = (row: MessageRow): OfficialConversationMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  senderType: row.sender_type,
  message: row.message,
  readAt: row.read_at,
  createdAt: row.created_at || new Date().toISOString(),
});

export const getOfficialOrderConversation = async (input: {
  requestId?: string | null;
  dealId?: string | null;
}): Promise<OfficialConversationThread> => {
  if (!input.requestId && !input.dealId) {
    return { conversation: null, messages: [], unavailable: false };
  }

  try {
    let query = supabase
      .from("support_conversations")
      .select("*")
      .eq("conversation_type", OFFICIAL_ORDER_CONVERSATION_TYPE)
      .order("created_at", { ascending: false })
      .limit(1);

    query = input.requestId ? query.eq("request_id", input.requestId) : query.eq("deal_id", input.dealId);

    const { data, error } = await query;
    if (error) throw error;

    const conversationRow = (data?.[0] as ConversationRow | undefined) || null;
    if (!conversationRow) {
      return { conversation: null, messages: [], unavailable: false };
    }

    const { data: messageRows, error: messageError } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationRow.id)
      .order("created_at", { ascending: true });

    if (messageError) throw messageError;

    return {
      conversation: mapConversation(conversationRow),
      messages: ((messageRows || []) as MessageRow[]).map(mapMessage),
      unavailable: false,
    };
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("order_conversations", error);
      return { conversation: null, messages: [], unavailable: true };
    }

    throw error;
  }
};

export const ensureOfficialOrderConversation = async (input: {
  requestId: string;
  requestNumber?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  assignedAdminId?: string | null;
  lang?: Lang;
}) => {
  try {
    const existing = await getOfficialOrderConversation({ requestId: input.requestId, dealId: input.dealId });
    if (existing.conversation) return existing.conversation;
    if (existing.unavailable) return null;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        name: "Official order conversation",
        contact: input.requestNumber || input.requestId,
        message: systemMessage[input.lang || "en"],
        related_reference: input.requestNumber || input.requestId,
        source: "official_order_conversation",
        status: "open",
        conversation_type: OFFICIAL_ORDER_CONVERSATION_TYPE,
        request_id: input.requestId,
        deal_id: input.dealId || null,
        customer_id: input.customerId || null,
        assigned_admin_id: input.assignedAdminId || null,
        opened_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) throw error;
    const conversation = mapConversation(data as ConversationRow);

    await supabase.from("conversation_messages").insert({
      conversation_id: conversation.id,
      request_id: input.requestId,
      deal_id: input.dealId || null,
      customer_id: input.customerId || null,
      sender_id: input.assignedAdminId || null,
      sender_type: "system",
      message: systemMessage[input.lang || "en"],
      created_at: now,
    });

    try {
      await recordNotificationReadiness({
        eventType: "official_conversation_opened",
        customerId: input.customerId,
        orderId: input.dealId,
        channelHint: "both",
        metadata: {
          request_id: input.requestId,
          request_number: input.requestNumber,
          conversation_id: conversation.id,
        },
      });
    } catch (notificationError) {
      logOperationalError("official_order_conversation_notification_log", notificationError, {
        requestId: input.requestId,
        dealId: input.dealId,
      });
    }

    return conversation;
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("order_conversations", error);
      return null;
    }

    logOperationalError("official_order_conversation_ensure", error, {
      requestId: input.requestId,
      dealId: input.dealId,
    });
    return null;
  }
};

export const sendOfficialConversationMessage = async (input: {
  conversationId: string;
  senderId?: string | null;
  senderType: Exclude<OfficialConversationSenderType, "system">;
  message: string;
  requestId?: string | null;
  customerId?: string | null;
  dealId?: string | null;
}) => {
  const cleanMessage = input.message.trim();
  if (cleanMessage.length < 1) {
    return { message: null, error: new Error("Message is required.") };
  }

  try {
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: input.conversationId,
        request_id: input.requestId || null,
        deal_id: input.dealId || null,
        customer_id: input.customerId || null,
        sender_id: input.senderId || null,
        sender_type: input.senderType,
        message: cleanMessage,
      })
      .select("*")
      .single();

    if (error) throw error;

    const { error: updateError } = await supabase
      .from("support_conversations")
      .update({ updated_at: new Date().toISOString(), status: "open" })
      .eq("id", input.conversationId);

    if (updateError && !isOptionalBackendUnavailable(updateError)) {
      logOperationalError("official_order_conversation_touch", updateError, {
        conversationId: input.conversationId,
      });
    }

    try {
      await recordNotificationReadiness({
        eventType: "official_conversation_message",
        customerId: input.customerId,
        orderId: input.dealId,
        channelHint: "both",
        metadata: {
          conversation_id: input.conversationId,
          sender_type: input.senderType,
        },
      });
    } catch (notificationError) {
      logOperationalError("official_order_conversation_message_notification_log", notificationError, {
        conversationId: input.conversationId,
      });
    }

    return { message: mapMessage(data as MessageRow), error: null };
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("conversation_messages", error);
    } else {
      logOperationalError("official_order_conversation_message_send", error, {
        conversationId: input.conversationId,
      });
    }

    return { message: null, error };
  }
};

export const markOfficialConversationRead = async (input: {
  conversationId: string;
  viewerType: "customer" | "admin";
}) => {
  const unreadSenderTypes =
    input.viewerType === "customer"
      ? ["admin", "system"]
      : ["customer"];

  try {
    const { error } = await supabase
      .from("conversation_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", input.conversationId)
      .is("read_at", null)
      .in("sender_type", unreadSenderTypes);

    if (error) throw error;
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("conversation_messages", error);
      return;
    }

    logOperationalError("official_order_conversation_mark_read", error, {
      conversationId: input.conversationId,
    });
  }
};
