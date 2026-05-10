import { buildSynchronizedRuntime } from "@/features/distributed-runtime/runtime/synchronizedRuntime";
import type { DistributedRuntimeInput } from "@/features/distributed-runtime/types/distributedTypes";

export const createDistributedRuntimeSnapshot = (input: DistributedRuntimeInput) => buildSynchronizedRuntime(input);
