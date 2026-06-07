import { telemetry } from "@/domain/telemetry/telemetryService";
import type { NotificationPayload } from "../types";

/**
 * Abstract Gateway for External Email Delivery (e.g. SendGrid, AWS SES)
 * This securely processes and structures the outbound payload without
 * breaking domain rules on failure.
 */
export const dispatchEmailPayload = async (payload: NotificationPayload): Promise<boolean> => {
  try {
    // 1. Structure the outbound provider payload
    const outboundMessage = {
      personalizations: [
        {
          to: [{ email: payload.recipientId }], // RecipientID should be an email here
          subject: payload.title,
        }
      ],
      from: { email: "no-reply@lourex.com", name: "Lourex Operations" },
      content: [{ type: "text/plain", value: payload.body }],
      custom_args: {
        dealId: payload.metadata?.dealNumber,
        priority: payload.priority
      }
    };

    // 2. Simulate API Network Latency
    await new Promise(resolve => setTimeout(resolve, 300));

    // 3. Simulate external API HTTP request (Mock)
    console.log("[SendGrid Simulation] Successfully dispatched Email:", outboundMessage.personalizations[0].subject);

    telemetry.trackMetric("SYSTEM_EVENT", "INFO", "External Email Dispatched Successfully", {
      recipient: payload.recipientId,
      channel: "EMAIL",
    });

    return true;
  } catch (error: any) {
    // 4. Trap external failures so they do not crash the internal operations pipeline
    telemetry.captureException(error, "External Email Gateway failed to dispatch", {
      recipient: payload.recipientId,
      channel: "EMAIL",
    });
    return false;
  }
};
