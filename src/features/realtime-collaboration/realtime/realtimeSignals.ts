import type { CollaborationSignal, SharedOperationalSnapshot } from "@/features/realtime-collaboration/types/collaborationTypes";

export const buildCollaborationSignals = (
  snapshot: SharedOperationalSnapshot,
  now: Date = new Date(),
): CollaborationSignal[] => {
  const editing = snapshot.sessions.filter((session) => session.activity === "editing_draft");
  const escalationOwners = snapshot.workflows.filter((workflow) => workflow.owner && (workflow.severity === "high" || workflow.severity === "critical"));
  const stale = snapshot.presence.filter((presence) => presence.stale);
  const activeOperators = snapshot.presence.filter((presence) => !presence.stale);
  const unsyncedCritical = snapshot.workflows.filter((workflow) => workflow.severity === "critical" && !workflow.owner);

  const signals: Array<CollaborationSignal | null> = [
    activeOperators.length > 1 ? {
      id: "collaboration:multi_user_awareness",
      type: "multi_user_awareness",
      severity: "low",
      label: "Multiple active operators",
      count: activeOperators.length,
      updatedAt: now.toISOString(),
    } : null,
    editing.length ? {
      id: "collaboration:active_workflow_editing",
      type: "active_workflow_editing",
      severity: "medium",
      label: "Active workflow edits",
      count: editing.length,
      updatedAt: now.toISOString(),
    } : null,
    escalationOwners.length ? {
      id: "collaboration:escalation_coordination",
      type: "escalation_coordination",
      severity: "high",
      label: "Escalations with active owners",
      count: escalationOwners.length,
      updatedAt: now.toISOString(),
    } : null,
    stale.length ? {
      id: "collaboration:stale_session",
      type: "stale_session",
      severity: "medium",
      label: "Stale operator sessions",
      count: stale.length,
      updatedAt: now.toISOString(),
    } : null,
    unsyncedCritical.length ? {
      id: "collaboration:synchronization_required",
      type: "synchronization_required",
      severity: "critical",
      label: "Critical workflows need ownership",
      count: unsyncedCritical.length,
      updatedAt: now.toISOString(),
    } : null,
  ];

  return signals.filter((signal): signal is CollaborationSignal => Boolean(signal));
};
