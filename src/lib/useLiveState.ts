"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LiveMutation, LiveState } from "./live-types";
import { predict } from "./predict";

/**
 * Hält den Live-Zustand eines Charakters aktuell — über alle Geräte hinweg.
 *
 * Ablauf beim Antippen:
 *  1. Der Zustand wird sofort lokal vorhergesagt (`predict`), damit die
 *     Anzeige ohne Wartezeit reagiert.
 *  2. Die Aktion geht an den Server, dessen Antwort die Vorhersage ersetzt.
 *  3. Andere Geräte bekommen denselben Zustand über den SSE-Stream.
 *
 * Antworten werden verworfen, wenn inzwischen eine neuere Aktion läuft —
 * sonst überschreibt eine langsame Antwort einen frischeren Tipper.
 */
export function useLiveState(initial: LiveState) {
  const [state, setState] = useState(initial);
  const [connected, setConnected] = useState(false);

  const characterId = initial.characterId;

  // Stabile Kennung dieses Geräts für die Echo-Unterdrückung.
  const clientId = useRef<string>("");
  if (!clientId.current) {
    clientId.current =
      globalThis.crypto?.randomUUID?.() ?? String(Math.random()).slice(2);
  }

  /** Zähler der abgeschickten Aktionen — höher gewinnt. */
  const sequence = useRef(0);
  const lastApplied = useRef(0);

  useEffect(() => {
    const source = new EventSource(
      `/api/live/${characterId}?clientId=${encodeURIComponent(clientId.current)}`,
    );

    source.addEventListener("open", () => setConnected(true));

    source.addEventListener("state", (event) => {
      // Solange eigene Aktionen unterwegs sind, hat die lokale Vorhersage
      // Vorrang — der Broadcast wäre sonst der Stand von vor dem Tippen.
      if (sequence.current !== lastApplied.current) return;
      setState(JSON.parse((event as MessageEvent).data) as LiveState);
      setConnected(true);
    });

    source.addEventListener("error", () => setConnected(false));

    return () => source.close();
  }, [characterId]);

  const send = useCallback(
    async (mutation: LiveMutation) => {
      const ticket = ++sequence.current;

      setState((current) => predict(current, mutation));

      try {
        const response = await fetch(`/api/live/${characterId}/mutate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client-Id": clientId.current,
          },
          body: JSON.stringify(mutation),
        });

        if (!response.ok) throw new Error(String(response.status));

        const fresh = (await response.json()) as LiveState;
        // Nur übernehmen, wenn seitdem nichts Neueres losgeschickt wurde.
        if (ticket === sequence.current) setState(fresh);
      } catch {
        setConnected(false);
      } finally {
        if (ticket > lastApplied.current) lastApplied.current = ticket;
      }
    },
    [characterId],
  );

  return { state, send, connected };
}
