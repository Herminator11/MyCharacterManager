"use client";

import { createContext, useContext, useMemo } from "react";

import { getMessages, type Messages } from "./messages";
import type { Mode } from "./modes";

/**
 * Nur der Modus wandert vom Server in den Browser, nicht die Texte: das
 * Wörterbuch enthält Funktionen ("Grad 3"), und die lassen sich nicht
 * über die Server/Client-Grenze reichen. Der Browser baut dieselben
 * Texte aus demselben Modul selbst — es ist klein genug.
 */
const ModeContext = createContext<Mode>("de");

export function I18nProvider({
  mode,
  children,
}: {
  mode: Mode;
  children: React.ReactNode;
}) {
  return <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>;
}

export function useT(): Messages {
  const mode = useContext(ModeContext);
  return useMemo(() => getMessages(mode), [mode]);
}
