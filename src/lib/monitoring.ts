type MonitoringPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: MonitoringPayload[];
  }
}

const sanitizePayload = (payload: MonitoringPayload = {}) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value !== "undefined"),
  ) as MonitoringPayload;

export const trackEvent = (eventName: string, payload: MonitoringPayload = {}) => {
  const event = {
    event: eventName,
    ...sanitizePayload(payload),
  };

  if (typeof window !== "undefined") {
    window.dataLayer?.push(event);
    window.dispatchEvent(new CustomEvent("lourex:analytics", { detail: event }));
  }

  if (import.meta.env.DEV) {
    console.info("[analytics]", eventName, sanitizePayload(payload));
  }
};

export const logOperationalError = (
  area: string,
  error: unknown,
  context: MonitoringPayload = {},
) => {
  const message = error instanceof Error && error.message ? error.message : "Unknown error";
  const payload = sanitizePayload({ area, message, ...context });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lourex:error", { detail: payload }));
  }

  console.error("[lourex:error]", area, payload, error);
};
