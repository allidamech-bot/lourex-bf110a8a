import type {
  EventHistoryFilter,
  EventSnapshot,
  PersistentEventRecord,
  RuntimePersistenceAdapter,
} from "@/features/runtime-infra/types/runtimeTypes";

export interface EventRepository {
  readonly adapter: RuntimePersistenceAdapter;
  saveMany(records: PersistentEventRecord[]): Promise<PersistentEventRecord[]>;
  list(filter?: EventHistoryFilter): Promise<PersistentEventRecord[]>;
  getReplayKeys(): Promise<string[]>;
  snapshot(): Promise<EventSnapshot>;
  clear(): Promise<void>;
}

const sortRecords = (records: PersistentEventRecord[]) =>
  [...records].sort((first, second) =>
    new Date(second.event.occurredAt).getTime() - new Date(first.event.occurredAt).getTime() ||
    first.id.localeCompare(second.id),
  );

const applyFilter = (records: PersistentEventRecord[], filter: EventHistoryFilter = {}) => {
  const filtered = records.filter((record) => {
    if (filter.entityId && record.event.entity.entityId !== filter.entityId) return false;
    if (filter.entityType && record.event.entity.entityType !== filter.entityType) return false;
    if (filter.severity && record.event.severity !== filter.severity) return false;
    if (filter.sourceModule && record.event.sourceModule !== filter.sourceModule) return false;
    return true;
  });

  return typeof filter.limit === "number" ? filtered.slice(0, filter.limit) : filtered;
};

export class InMemoryEventRepository implements EventRepository {
  readonly adapter: RuntimePersistenceAdapter = "memory";
  private records = new Map<string, PersistentEventRecord>();

  async saveMany(records: PersistentEventRecord[]) {
    records.forEach((record) => {
      if (!this.records.has(record.replayKey)) {
        this.records.set(record.replayKey, record);
      }
    });
    return this.list();
  }

  async list(filter?: EventHistoryFilter) {
    return applyFilter(sortRecords([...this.records.values()]), filter);
  }

  async getReplayKeys() {
    return [...this.records.keys()].sort();
  }

  async snapshot() {
    const records = await this.list();
    return buildEventSnapshot(records);
  }

  async clear() {
    this.records.clear();
  }
}

export class LocalStorageEventRepository implements EventRepository {
  readonly adapter: RuntimePersistenceAdapter = "local_storage";

  constructor(private readonly storageKey = "lourex.runtime.events") {}

  async saveMany(records: PersistentEventRecord[]) {
    const current = await this.list();
    const byReplayKey = new Map(current.map((record) => [record.replayKey, record]));
    records.forEach((record) => {
      if (!byReplayKey.has(record.replayKey)) {
        byReplayKey.set(record.replayKey, record);
      }
    });
    this.write([...byReplayKey.values()]);
    return this.list();
  }

  async list(filter?: EventHistoryFilter) {
    return applyFilter(sortRecords(this.read()), filter);
  }

  async getReplayKeys() {
    return this.read().map((record) => record.replayKey).sort();
  }

  async snapshot() {
    return buildEventSnapshot(await this.list());
  }

  async clear() {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  private read(): PersistentEventRecord[] {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) as PersistentEventRecord[] : [];
    } catch {
      return [];
    }
  }

  private write(records: PersistentEventRecord[]) {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(this.storageKey, JSON.stringify(records));
    }
  }
}

export const buildEventSnapshot = (records: PersistentEventRecord[]): EventSnapshot => {
  const severityCounts = records.reduce<EventSnapshot["severityCounts"]>((counts, record) => {
    counts[record.event.severity] += 1;
    return counts;
  }, { low: 0, medium: 0, high: 0, critical: 0 });

  return Object.freeze({
    id: `snapshot:${records.length}:${records[0]?.event.occurredAt || "empty"}`,
    createdAt: new Date().toISOString(),
    eventCount: records.length,
    latestEventAt: records[0]?.event.occurredAt,
    replayKeys: records.map((record) => record.replayKey).sort(),
    severityCounts,
  });
};
