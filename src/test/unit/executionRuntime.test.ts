import { describe, expect, it } from "vitest";
import { buildSynchronizedRuntime } from "@/features/distributed-runtime/runtime/synchronizedRuntime";
import { buildAgentActions } from "@/features/execution-runtime/agents/operationalAgents";
import { approveExecutionRequest } from "@/features/execution-runtime/approval/approvalWorkflow";
import { buildExecutionAuditTrail } from "@/features/execution-runtime/execution/executionAudit";
import { executeGuardedQueue } from "@/features/execution-runtime/execution/guardedExecution";
import { createExecutionQueue, isolateStaleQueueItems } from "@/features/execution-runtime/queue/executionQueue";
import { recoverExecutionQueue } from "@/features/execution-runtime/recovery/executionRecovery";
import { buildExecutionRuntime } from "@/features/execution-runtime/services/executionRuntimeService";
import { createApprovalRequests } from "@/features/execution-runtime/approval/approvalWorkflow";
import type {
  OperationsDeal,
  OperationsFinancialEditRequest,
  OperationsFinancialEntry,
  OperationsRequest,
  OperationsShipment,
} from "@/domain/operations/types";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";

const now = new Date("2026-05-10T09:00:00.000Z");

const shipment = (suffix: string, overrides: Partial<OperationsShipment> = {}): OperationsShipment => ({
  id: `shipment-${suffix}`,
  trackingId: `TRK-${suffix}`,
  clientName: "Customer A",
  destination: "Riyadh",
  pallets: 2,
  weight: 500,
  dealId: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  stage: "in_transit",
  updatedAt: "2026-04-24T09:00:00.000Z",
  customerVisibleNote: "",
  timeline: [],
  ...overrides,
});

const deal = (suffix: string, overrides: Partial<OperationsDeal> = {}): OperationsDeal => ({
  id: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  operationTitle: "Industrial shipment",
  customerId: `customer-${suffix}`,
  customerName: "Customer A",
  status: "active",
  operationalStatus: "in_transit",
  stage: "in_transit",
  shipmentId: `shipment-${suffix}`,
  trackingId: `TRK-${suffix}`,
  totalValue: 90_000,
  currency: "SAR",
  createdAt: "2026-04-01T09:00:00.000Z",
  notes: "Customer raised dispute on delay",
  attachments: [],
  trackingUpdates: [],
  accountingSummary: { income: 10_000, expense: 0, net: 10_000, entriesCount: 1 },
  ...overrides,
});

const entry = (suffix: string, overrides: Partial<OperationsFinancialEntry> = {}): OperationsFinancialEntry => ({
  id: `entry-${suffix}`,
  entryNumber: `FE-${suffix}`,
  scope: "deal",
  relationType: "deal_linked",
  dealId: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  customerId: `customer-${suffix}`,
  customerName: "Customer A",
  type: "income",
  amount: 10_000,
  currency: "SAR",
  locked: true,
  createdBy: "user-1",
  createdAt: "2026-04-02T09:00:00.000Z",
  entryDate: "2026-04-02",
  method: "Bank",
  counterparty: "Customer A",
  category: "Payment",
  note: "Deposit",
  ...overrides,
});

const editRequest = (suffix: string, overrides: Partial<OperationsFinancialEditRequest> = {}): OperationsFinancialEditRequest => ({
  id: `edit-${suffix}`,
  financialEntryId: `entry-${suffix}`,
  targetEntryNumber: `FE-${suffix}`,
  dealId: `deal-${suffix}`,
  dealNumber: `DL-${suffix}`,
  customerId: `customer-${suffix}`,
  customerName: "Customer A",
  requestedBy: "Ops",
  reason: "Dispute requires audit review",
  status: "pending",
  submittedAt: "2026-05-01T09:00:00.000Z",
  ...overrides,
});

const request = (suffix: string, overrides: Partial<OperationsRequest> = {}): OperationsRequest => ({
  id: `request-${suffix}`,
  requestNumber: `REQ-${suffix}`,
  status: "awaiting_clarification",
  customer: {
    id: `customer-${suffix}`,
    fullName: "Customer A",
    phone: "123",
    email: "customer@example.com",
    country: "SA",
    city: "Riyadh",
  },
  productName: "Machine part",
  productDescription: "Part",
  quantity: 10,
  sizeDimensions: "",
  color: "",
  material: "",
  technicalSpecs: "",
  preferredShippingMethod: "",
  deliveryNotes: "",
  imageUrls: [],
  createdAt: "2026-04-20T09:00:00.000Z",
  internalNotes: "",
  reviewedAt: "2026-04-25T09:00:00.000Z",
  attachments: [],
  isReadyMade: false,
  hasPreviousSample: false,
  destination: "Riyadh",
  isFullSourcing: true,
  trackingCode: "",
  ...overrides,
});

const dataset = (suffix: string): EventSystemDataset => ({
  requests: [request(suffix)],
  shipments: [shipment(suffix)],
  deals: [deal(suffix)],
  financialEntries: [entry(suffix)],
  financialEditRequests: [editRequest(suffix)],
  settlements: [],
  now,
});

describe("execution runtime", () => {
  it("orders execution queue by priority deterministically", async () => {
    const distributed = await buildSynchronizedRuntime({ dataset: dataset("ordering"), now });
    const actions = buildAgentActions(distributed, now);
    const queue = createExecutionQueue(actions, now);

    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0].action.priority).toBe("critical");
    expect(queue.every((item) => item.action.immutable)).toBe(true);
  });

  it("gates critical execution until approval is granted", async () => {
    const distributed = await buildSynchronizedRuntime({ dataset: dataset("approval"), now });
    const queue = createExecutionQueue(buildAgentActions(distributed, now), now);
    const approvals = createApprovalRequests(queue, now);
    const blocked = executeGuardedQueue(queue.slice(0, 1), approvals, now);
    const approved = approvals[0] ? [approveExecutionRequest(approvals[0], "Lead", now.toISOString())] : [];
    const executed = executeGuardedQueue(queue.slice(0, 1), approved, now);

    expect(blocked[0].applied).toBe(false);
    expect(executed[0].applied).toBe(true);
    expect(executed[0].rollbackPrepared).toBe(true);
  });

  it("recovers replayed executions and skips duplicate application", async () => {
    const distributed = await buildSynchronizedRuntime({ dataset: dataset("replay"), now });
    const queue = createExecutionQueue(buildAgentActions(distributed, now), now);
    const approvals = createApprovalRequests(queue, now).map((approval) => approveExecutionRequest(approval, "Lead", now.toISOString()));
    const records = executeGuardedQueue(queue, approvals, now);
    const replay = executeGuardedQueue(queue, approvals, now, records.filter((record) => record.applied).map((record) => record.replayKey));
    const recovery = recoverExecutionQueue(queue, records, now);

    expect(replay.some((record) => record.applied === false && record.message.includes("skipped"))).toBe(true);
    expect(recovery.replayKeys.length).toBeGreaterThan(0);
    expect(recovery.restoredQueue.some((item) => item.status === "executed")).toBe(true);
  });

  it("isolates stale execution items", async () => {
    const distributed = await buildSynchronizedRuntime({ dataset: dataset("stale"), now });
    const queue = createExecutionQueue(buildAgentActions(distributed, now), now);
    const stale = isolateStaleQueueItems(queue, new Date("2026-05-10T12:00:00.000Z"));

    expect(stale.some((item) => item.status === "stale_isolated")).toBe(true);
  });

  it("generates audit history and full execution runtime reconciliation", async () => {
    const runtime = await buildExecutionRuntime({ dataset: dataset("runtime"), now });
    const audit = buildExecutionAuditTrail(runtime.queue, runtime.approvals, runtime.executionRecords, now);

    expect(runtime.agents.length).toBeGreaterThanOrEqual(6);
    expect(runtime.queue.length).toBe(runtime.actions.length);
    expect(audit.length).toBeGreaterThan(runtime.queue.length);
    expect(runtime.recovery.restoredQueue.length).toBe(runtime.queue.length);
  });
});
