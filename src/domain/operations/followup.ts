import { isOptionalBackendUnavailable, logOptionalBackendUnavailableOnce, supabase } from "@/integrations/supabase/client";
import { recordNotificationReadiness } from "@/domain/notifications/readiness";
import { logOperationalError } from "@/lib/monitoring";

export type OrderFollowupVisibility = "internal_only" | "customer_visible";

export type OrderFollowup = {
  id: string;
  requestId: string;
  dealId?: string | null;
  customerId: string;
  stageCode: string;
  stageTitle: string;
  adminNote: string;
  customerNote: string;
  visibility: OrderFollowupVisibility;
  createdBy?: string | null;
  createdAt: string;
};

type OrderFollowupRow = {
  id: string;
  request_id: string;
  deal_id?: string | null;
  customer_id: string;
  stage_code: string;
  stage_title: string;
  admin_note?: string | null;
  customer_note?: string | null;
  visibility: OrderFollowupVisibility;
  created_by?: string | null;
  created_at: string;
};

export const orderFollowupStages = [
  { code: "order_received", ar: "استلمنا الطلب", en: "Order received" },
  { code: "factory_preparation", ar: "الطلب قيد التجهيز في المصنع", en: "Factory preparation" },
  { code: "prepared", ar: "تم تجهيز الطلب", en: "Order prepared" },
  { code: "handover_shipping", ar: "تم تسليم الطلب لشركة الشحن", en: "Handed to carrier" },
  { code: "departed_turkey", ar: "غادر من تركيا", en: "Departed Turkey" },
  { code: "arrived_customer_country", ar: "وصل إلى بلد العميل", en: "Arrived in customer country" },
  { code: "delivered", ar: "تم التسليم", en: "Delivered" },
] as const;

const mapFollowup = (row: OrderFollowupRow): OrderFollowup => ({
  id: row.id,
  requestId: row.request_id,
  dealId: row.deal_id,
  customerId: row.customer_id,
  stageCode: row.stage_code,
  stageTitle: row.stage_title,
  adminNote: row.admin_note || "",
  customerNote: row.customer_note || "",
  visibility: row.visibility,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

export const loadOrderFollowups = async (input: {
  requestId?: string | null;
  dealId?: string | null;
  customerVisibleOnly?: boolean;
}) => {
  if (!input.requestId && !input.dealId) return [];

  try {
    let query = supabase.from("order_followups").select("*").order("created_at", { ascending: true });
    query = input.requestId ? query.eq("request_id", input.requestId) : query.eq("deal_id", input.dealId);
    if (input.customerVisibleOnly) query = query.eq("visibility", "customer_visible");

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as OrderFollowupRow[]).map(mapFollowup);
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("order_followups", error);
      return [];
    }

    throw error;
  }
};

export const createOrderFollowup = async (input: {
  requestId: string;
  dealId?: string | null;
  customerId: string;
  stageCode: string;
  stageTitle: string;
  adminNote?: string;
  customerNote?: string;
  visibility: OrderFollowupVisibility;
  createdBy?: string | null;
}) => {
  try {
    const { data, error } = await supabase
      .from("order_followups")
      .insert({
        request_id: input.requestId,
        deal_id: input.dealId || null,
        customer_id: input.customerId,
        stage_code: input.stageCode,
        stage_title: input.stageTitle,
        admin_note: input.adminNote || "",
        customer_note: input.customerNote || "",
        visibility: input.visibility,
        created_by: input.createdBy || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    if (input.visibility === "customer_visible") {
      try {
        await recordNotificationReadiness({
          eventType: "order_followup_added",
          customerId: input.customerId,
          orderId: input.dealId,
          channelHint: "both",
          metadata: {
            request_id: input.requestId,
            stage_code: input.stageCode,
          },
        });
      } catch (notificationError) {
        logOperationalError("order_followup_notification_log", notificationError, {
          requestId: input.requestId,
        });
      }
    }

    return { data: mapFollowup(data as OrderFollowupRow), error: null };
  } catch (error) {
    if (isOptionalBackendUnavailable(error)) {
      logOptionalBackendUnavailableOnce("order_followups", error);
    } else {
      logOperationalError("order_followup_create", error, { requestId: input.requestId });
    }

    return { data: null, error };
  }
};
