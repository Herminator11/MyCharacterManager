"use client";

import { useEffect, useRef, useState } from "react";

import { cx } from "./ui";

/**
 * Die Werte in der klebenden Leiste — aber nur, solange man sie dort
 * braucht.
 *
 * Auf der Übersicht stehen AC, Initiative und Speed schon groß im
 * Profilkopf. Beides gleichzeitig zu zeigen ist eine Dopplung, die
 * Aufmerksamkeit kostet und nichts hinzufügt. Sobald der Profilkopf aus
 * dem Bild scrollt, blendet die Leiste die Zahlen ein — dann sind sie das
 * Einzige, was noch da ist.
 *
 * Auf allen anderen Reitern gibt es keinen Profilkopf; dort stehen sie
 * durchgehend. Deshalb sucht die Komponente den Anker und zeigt die Werte,
 * wenn sie keinen findet.
 */
export const PROFILE_ANCHOR_ID = "profil-instrumente";

export function StickyStats({ children }: { children: React.ReactNode }) {
  // Ohne Anker sofort sichtbar: die anderen Reiter sollen nicht erst auf
  // einen Beobachter warten, der nie etwas zu beobachten findet.
  const [visible, setVisible] = useState(true);
  const observed = useRef(false);

  useEffect(() => {
    const anchor = document.getElementById(PROFILE_ANCHOR_ID);
    if (!anchor) {
      setVisible(true);
      return;
    }

    observed.current = true;
    const watcher = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      // Die Leiste selbst verdeckt die obersten Pixel — ohne diesen Rand
      // erschienen die Zahlen erst, wenn der Kopf schon darunter läge.
      { rootMargin: "-56px 0px 0px 0px" },
    );

    watcher.observe(anchor);
    return () => watcher.disconnect();
  }, []);

  return (
    <div
      // Nicht ausblenden, sondern überblenden: der Platz bleibt belegt,
      // damit der Name daneben beim Scrollen nicht springt.
      aria-hidden={!visible}
      className={cx(
        "transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {children}
    </div>
  );
}
