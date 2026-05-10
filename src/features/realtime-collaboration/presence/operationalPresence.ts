import type { OperationalPresence, OperationalSession, SynchronizationPolicyConfig } from "@/features/realtime-collaboration/types/collaborationTypes";

const SECOND_MS = 1_000;

export const buildOperationalPresence = (
  sessions: OperationalSession[],
  policies: SynchronizationPolicyConfig,
  now: Date = new Date(),
): OperationalPresence[] =>
  sessions.map((session) => {
    const heartbeatAgeSeconds = Math.max(0, Math.floor((now.getTime() - new Date(session.lastHeartbeatAt).getTime()) / SECOND_MS));
    return Object.freeze({
      sessionId: session.sessionId,
      operatorId: session.operatorId,
      operatorName: session.operatorName,
      role: session.role,
      activity: session.activity,
      activeEntityLabel: session.activeEntity?.label,
      heartbeatAgeSeconds,
      stale: heartbeatAgeSeconds > policies.staleSessionSeconds,
    });
  }).sort((first, second) =>
    Number(first.stale) - Number(second.stale) ||
    first.operatorName.localeCompare(second.operatorName) ||
    first.sessionId.localeCompare(second.sessionId),
  );

export const activeSessions = (
  sessions: OperationalSession[],
  policies: SynchronizationPolicyConfig,
  now: Date = new Date(),
) => {
  const presence = buildOperationalPresence(sessions, policies, now);
  const activeIds = new Set(presence.filter((item) => !item.stale).map((item) => item.sessionId));
  return sessions.filter((session) => activeIds.has(session.sessionId));
};
