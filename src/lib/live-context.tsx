"use client";

import { createContext, useContext } from "react";

import type { LiveMutation, LiveState } from "./live-types";
import { useLiveState } from "./useLiveState";

/**
 * Ein Live-Zustand für die ganze Charakterseite.
 *
 * Profilkopf und Kampfblock sind im Layout weit auseinander, zeigen aber
 * teils dieselben Werte — Inspiration steht oben, die Zauberplätze unten.
 * Jede Komponente ihren eigenen `useLiveState` geben zu lassen wäre die
 * naheliegende Lösung und die falsche: das öffnet pro Bauteil einen
 * eigenen SSE-Stream auf denselben Charakter.
 *
 * Also einer für alle, oben an der Seite verankert.
 */
type Live = {
  state: LiveState;
  /**
   * Auflösung erst, wenn der Server geantwortet hat. Meist ignoriert man
   * das — die Vorhersage hat die Anzeige längst umgestellt. Wer aber gleich
   * danach die Seite wechselt, muss warten: sonst rendert der Server die
   * neue Seite noch mit dem alten Stand.
   */
  send: (mutation: LiveMutation) => Promise<void>;
  connected: boolean;
};

const LiveContext = createContext<Live | null>(null);

export function LiveProvider({
  initial,
  children,
}: {
  initial: LiveState;
  children: React.ReactNode;
}) {
  const live = useLiveState(initial);
  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export function useLive(): Live {
  const live = useContext(LiveContext);
  if (!live) {
    throw new Error("useLive braucht einen LiveProvider darüber.");
  }
  return live;
}
