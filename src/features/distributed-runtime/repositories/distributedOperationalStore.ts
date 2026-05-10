import type {
  DistributedRepositoryProvider,
  DistributedRuntimeQuery,
  DistributedSnapshot,
  ReplicatedEventRecord,
  RuntimeReplica,
} from "@/features/distributed-runtime/types/distributedTypes";

export interface DistributedRuntimeRepository {
  readonly provider: DistributedRepositoryProvider;
  saveRecords(records: ReplicatedEventRecord[]): Promise<ReplicatedEventRecord[]>;
  saveSnapshot(snapshot: DistributedSnapshot): Promise<DistributedSnapshot>;
  listRecords(query?: DistributedRuntimeQuery): Promise<ReplicatedEventRecord[]>;
  listReplicas(): Promise<RuntimeReplica[]>;
  saveReplicas(replicas: RuntimeReplica[]): Promise<RuntimeReplica[]>;
  latestSnapshot(): Promise<DistributedSnapshot | null>;
  clear(): Promise<void>;
}

const sortRecords = (records: ReplicatedEventRecord[]) =>
  [...records].sort((first, second) =>
    first.sequence - second.sequence ||
    new Date(first.message.timestamp).getTime() - new Date(second.message.timestamp).getTime() ||
    first.id.localeCompare(second.id),
  );

const filterRecords = (records: ReplicatedEventRecord[], query: DistributedRuntimeQuery = {}) => {
  const filtered = records.filter((record) => {
    if (query.replicaId && record.replicaId !== query.replicaId) return false;
    if (query.replayKey && record.replayKey !== query.replayKey) return false;
    return true;
  });
  return typeof query.limit === "number" ? filtered.slice(0, query.limit) : filtered;
};

export class LocalDistributedRuntimeRepository implements DistributedRuntimeRepository {
  readonly provider: DistributedRepositoryProvider = "local";
  private records = new Map<string, ReplicatedEventRecord>();
  private replicas = new Map<string, RuntimeReplica>();
  private snapshot: DistributedSnapshot | null = null;

  async saveRecords(records: ReplicatedEventRecord[]) {
    records.forEach((record) => {
      if (!this.records.has(record.replayKey)) {
        this.records.set(record.replayKey, record);
      }
    });
    return this.listRecords();
  }

  async saveSnapshot(snapshot: DistributedSnapshot) {
    this.snapshot = snapshot;
    await this.saveReplicas(snapshot.replicas);
    return snapshot;
  }

  async listRecords(query?: DistributedRuntimeQuery) {
    return filterRecords(sortRecords([...this.records.values()]), query);
  }

  async listReplicas() {
    return [...this.replicas.values()].sort((first, second) => first.replicaId.localeCompare(second.replicaId));
  }

  async saveReplicas(replicas: RuntimeReplica[]) {
    replicas.forEach((replica) => this.replicas.set(replica.replicaId, replica));
    return this.listReplicas();
  }

  async latestSnapshot() {
    return this.snapshot;
  }

  async clear() {
    this.records.clear();
    this.replicas.clear();
    this.snapshot = null;
  }
}

export class SupabaseReadyDistributedRuntimeRepository extends LocalDistributedRuntimeRepository {
  readonly provider: DistributedRepositoryProvider = "supabase_ready";
}
