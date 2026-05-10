import type { CollaborationActivity, CollaborationEntityType, OperationalSession } from "@/features/realtime-collaboration/types/collaborationTypes";

export const createOperationalSession = (input: {
  sessionId: string;
  operatorId: string;
  operatorName: string;
  role: OperationalSession["role"];
  now?: Date;
  activeEntity?: { entityType: CollaborationEntityType; entityId: string; label: string };
  activity?: CollaborationActivity;
}): OperationalSession => {
  const timestamp = (input.now || new Date()).toISOString();
  return Object.freeze({
    sessionId: input.sessionId,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    role: input.role,
    startedAt: timestamp,
    lastHeartbeatAt: timestamp,
    activeEntity: input.activeEntity,
    activity: input.activity || "viewing",
  });
};

export const heartbeatSession = (
  session: OperationalSession,
  now: Date = new Date(),
  activity: CollaborationActivity = session.activity,
): OperationalSession => Object.freeze({
  ...session,
  lastHeartbeatAt: now.toISOString(),
  activity,
});
