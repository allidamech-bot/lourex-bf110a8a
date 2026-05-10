import type {
  EventPipelineResult,
  EventTimelineItem,
  NotificationAudience,
  NotificationPriority,
  NotificationRoute,
  OperationalEntityReference,
  OperationalEvent,
  OperationalEventSeverity,
} from "@/features/event-system/types/eventTypes";

export type RuntimeLanguage = "ar" | "en";

export type RuntimePersistenceAdapter = "memory" | "local_storage" | "future_supabase";

export type PersistentEventRecord = Readonly<{
  id: string;
  event: OperationalEvent;
  replayKey: string;
  dedupeKey: string;
  persistedAt: string;
  version: 1;
  immutable: true;
}>;

export type EventHistoryFilter = {
  entityId?: string;
  entityType?: OperationalEntityReference["entityType"];
  severity?: OperationalEventSeverity;
  sourceModule?: OperationalEvent["sourceModule"];
  limit?: number;
};

export type EventSnapshot = Readonly<{
  id: string;
  createdAt: string;
  eventCount: number;
  latestEventAt?: string;
  replayKeys: string[];
  severityCounts: Record<OperationalEventSeverity, number>;
}>;

export type RuntimeRecoveryState = Readonly<{
  restoredEvents: PersistentEventRecord[];
  snapshot: EventSnapshot;
  replayKeys: string[];
  timeline: EventTimelineItem[];
  restoredAt: string;
}>;

export type DeliveryChannel = "in_app" | "email_ready" | "sms_ready" | "partner_alert" | "executive_alert";

export type DeliveryStatus = "queued" | "delivered" | "failed" | "retry_scheduled" | "acknowledged" | "mocked";

export type DeliveryPolicy = Readonly<{
  priority: NotificationPriority;
  maxAttempts: number;
  retryAfterMinutes: number;
  channels: DeliveryChannel[];
}>;

export type NotificationTemplate = Readonly<{
  id: string;
  audience: NotificationAudience;
  priority: NotificationPriority;
  subject: string;
  body: string;
}>;

export type NotificationQueueItem = Readonly<{
  id: string;
  route: NotificationRoute;
  event?: OperationalEvent;
  priority: NotificationPriority;
  channels: DeliveryChannel[];
  attempts: number;
  status: DeliveryStatus;
  queuedAt: string;
  nextAttemptAt?: string;
  acknowledgedAt?: string;
}>;

export type NotificationDeliveryRecord = Readonly<{
  id: string;
  queueItemId: string;
  routeId: string;
  status: DeliveryStatus;
  channel: DeliveryChannel;
  attemptedAt: string;
  attempts: number;
  message: string;
  recommendationOnly: boolean;
}>;

export type RuntimeSnapshot = Readonly<{
  eventSnapshot: EventSnapshot;
  deliveryQueue: NotificationQueueItem[];
  deliveryHistory: NotificationDeliveryRecord[];
  timeline: EventTimelineItem[];
}>;

export type RuntimeBootstrapResult = Readonly<{
  pipeline: EventPipelineResult;
  persistedEvents: PersistentEventRecord[];
  deliveryQueue: NotificationQueueItem[];
  deliveryHistory: NotificationDeliveryRecord[];
  recovery: RuntimeRecoveryState;
}>;
