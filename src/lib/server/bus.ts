import "server-only";

import { EventEmitter } from "node:events";

import type { LiveState } from "@/lib/live-types";

/**
 * Verteilt Live-Änderungen an alle verbundenen Geräte.
 *
 * Ein einfacher EventEmitter im Prozess reicht, weil die App genau einen
 * Node-Prozess hat. Handy und Laptop hängen beide an dessen SSE-Stream.
 *
 * Am globalThis gecacht, damit der Dev-Server beim Hot-Reload nicht die
 * bestehenden Verbindungen verwaist zurücklässt.
 */

export type LiveEvent = {
  state: LiveState;
  /** Gerät, das die Änderung ausgelöst hat — bekommt kein eigenes Echo. */
  originId: string;
};

const globalForBus = globalThis as unknown as { __liveBus?: EventEmitter };

const bus = (globalForBus.__liveBus ??= new EventEmitter());

// Bei vielen offenen Tabs sonst die Node-Warnung ab 11 Listenern.
bus.setMaxListeners(100);

const channel = (characterId: number) => `character:${characterId}`;

export function publish(event: LiveEvent) {
  bus.emit(channel(event.state.characterId), event);
}

export function subscribe(
  characterId: number,
  listener: (event: LiveEvent) => void,
): () => void {
  bus.on(channel(characterId), listener);
  return () => bus.off(channel(characterId), listener);
}
