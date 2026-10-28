import {
  EVENT_AOI_ENTERED,
  EVENT_AOI_LEFT,
  EVENT_NEIGHBORS,
  EVENT_RAW,
} from '@tik-choco/mistlib-web';

const PRESENCE_EVENT_TYPES = new Set<number>([EVENT_NEIGHBORS, EVENT_AOI_ENTERED, EVENT_AOI_LEFT]);

export function createManualSyncEventHandler(handlers: {
  onRaw: (fromId: string, payload: Uint8Array) => void;
  onPresence: () => void;
  onNeighbors: () => void;
}) {
  return (eventType: number, fromId: string, payload: unknown) => {
    if (eventType === EVENT_RAW) {
      handlers.onRaw(fromId, payload as Uint8Array);
      return;
    }

    if (PRESENCE_EVENT_TYPES.has(eventType)) {
      handlers.onPresence();
      if (eventType === EVENT_NEIGHBORS) handlers.onNeighbors();
    }
  };
}
