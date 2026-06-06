export type NotificationChannel = 'SYSTEM' | 'EMAIL' | 'IN_APP';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NotificationPayload {
  recipientId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  metadata?: {
    dealId?: string;
    shipmentId?: string;
    [key: string]: unknown;
  };
}
