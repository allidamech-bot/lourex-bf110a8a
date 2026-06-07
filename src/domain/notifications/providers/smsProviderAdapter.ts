import { telemetry } from "@/domain/telemetry/telemetryService";
import type { NotificationPayload } from "../types";

/**
 * Abstract Gateway for External SMS Delivery (e.g. Twilio, MessageBird)
 * Securely structures SMS payloads for immediate operational delivery alerts.
 */
export const dispatchSmsPayload = async (payload: NotificationPayload): Promise<boolean> => {
  try {
    // 1. Structure the outbound provider payload
    const outboundSms = {
      to: payload.recipientId, // Should be an E.164 formatted phone number
      from: "+1234567890", // Lourex verified sender
      body: `Lourex Alert: ${payload.title}\n${payload.body}`,
      statusCallback: "https://api.lourex.com/webhooks/sms/status"
    };

    // 2. Simulate API Network Latency
    await new Promise(resolve => setTimeout(resolve, 200));

    // 3. Simulate external API HTTP request (Mock)
    console.log("[Twilio Simulation] Successfully dispatched SMS to:", outboundSms.to);

    telemetry.trackMetric("SYSTEM_EVENT", "INFO", "External SMS Dispatched Successfully", {
      recipient: payload.recipientId,
      channel: "SMS",
    });

    return true;
  } catch (error: any) {
    // 4. Trap external failures so they do not crash the internal operations pipeline
    telemetry.captureException(error, "External SMS Gateway failed to dispatch", {
      recipient: payload.recipientId,
      channel: "SMS",
    });
    return false;
  }
};
