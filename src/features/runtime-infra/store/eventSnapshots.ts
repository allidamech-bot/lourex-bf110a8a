import type { EventRepository } from "@/features/runtime-infra/repositories/eventRepository";

export const hydrateEventSnapshot = async (repository: EventRepository) => repository.snapshot();

export const getPersistedReplayKeys = async (repository: EventRepository) => repository.getReplayKeys();
