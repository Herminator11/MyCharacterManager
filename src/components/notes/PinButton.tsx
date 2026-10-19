"use client";

import { useEffect, useRef, useState } from "react";

import { NoteIcon } from "@/components/icons";
import { Button, cx, inputClass, Tooltip } from "@/components/ui";

/**
 * „Aktuell gilt für dich" — anlegen, wo man es anlegen will: oben in der Ecke.
 *
 * Ein Vermerk ist eine Randnotiz, kein Kampfwert wie AC oder Speed — er
 * stand früher als gleichrangige Kachel neben ihnen und konkurrierte damit
 * um Aufmerksamkeit, die er nicht braucht. Jetzt sitzt er klein und
 * unauffällig oben rechts im Profilkopf: da, wo die Hand hinfindet, wenn
 * der Gedanke da ist, ohne dass er beim schnellen Blick auf die Werte
 * mitgezählt wird.
 *
 * Der Zähler an der Ecke sagt, dass etwas gilt, ohne dass die Vermerke
 * selbst hier Platz kosten; gelesen werden sie im Kasten darunter.
 */
export function PinButton({
  count,
  add,
}: {
  count: number;
  add: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Danebentippen schließt — ein Formular, das offen stehen bleibt,
  // verdeckt genau die Werte, für die man hergekommen ist.
  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-label="Vermerk anlegen"
      className={cx(
        "relative flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 transition-colors",
        open || count > 0 ? "text-brass" : "text-faint hover:text-fg",
      )}
    >
      <NoteIcon className="size-5" />
      {/* Ein Blatt ist keine Konvention wie Papierkorb oder Stift — das
          Wort steht deshalb sichtbar darunter, nicht nur im Tooltip, der
          auf dem Handy nie erscheint. */}
      <span className="text-[0.625rem] leading-none font-medium">Vermerk</span>
      {count > 0 ? (
        <span className="absolute top-0.5 right-2 flex size-3.5 items-center justify-center rounded-full bg-brass text-[0.55rem] leading-none font-semibold text-ink tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );

  return (
    <div ref={box} className="relative">
      {/* Kein Tooltip, solange das Formular offen ist — beide sitzen an
          derselben Stelle unter dem Knopf und würden sich sonst
          überlappen. Das Formular erklärt sich dann ohnehin selbst. */}
      {open ? (
        trigger
      ) : (
        <Tooltip label="Vermerk anlegen — was ab jetzt für dich gilt" align="end">
          {trigger}
        </Tooltip>
      )}

      {open ? (
        <div className="absolute top-full right-0 z-30 mt-2 w-72 rounded-lg border border-edge-bright bg-panel p-3 shadow-lg shadow-black/40">
          <form
            action={add}
            onSubmit={() => setOpen(false)}
            className="space-y-2"
          >
            <input
              autoFocus
              name="title"
              required
              placeholder="Woran musst du denken?"
              aria-label="Vermerk"
              className={inputClass}
            />
            <input
              name="body"
              placeholder="Was bewirkt es? (optional)"
              aria-label="Wirkung des Vermerks"
              className={inputClass}
            />
            <Button type="submit" size="sm" variant="solid" className="w-full">
              Anheften
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
