"use client";

import { useEffect, useRef, useState } from "react";

import { NoteIcon } from "@/components/icons";
import { Button, cx, inputClass } from "@/components/ui";

/**
 * „Aktuell gilt für dich" — anlegen, wo man es anlegen will: oben.
 *
 * Der Zettel steht neben AC, Speed und Inspiration, weil ein Vermerk in
 * demselben Moment entsteht wie ein Blick auf diese Werte: der DM sagt
 * etwas, das ab jetzt gilt, und die Hand ist schon oben am Bildschirm.
 * Vorher lag der Weg dorthin in einem aufklappbaren Block weiter unten —
 * drei Tipper von dem Punkt entfernt, an dem der Gedanke da war.
 *
 * Der Zähler an der Ecke sagt, dass etwas gilt, ohne dass die Vermerke
 * selbst hier oben Platz kosten; gelesen werden sie im Kasten darunter.
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

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Vermerk anlegen"
        title="Vermerk anlegen — was ab jetzt für dich gilt"
        className="flex w-[4.5rem] shrink-0 flex-col items-center"
      >
        <span
          className={cx(
            "relative flex h-[3.75rem] w-full items-center justify-center rounded-lg border transition-colors",
            open || count > 0
              ? "border-brass bg-brass/10 text-brass"
              : "border-edge bg-panel-2 text-faint hover:border-edge-bright hover:text-mute",
          )}
        >
          <NoteIcon />
          {count > 0 ? (
            <span className="absolute top-1.5 right-1.5 text-[0.625rem] leading-none font-semibold tabular-nums">
              {count}
            </span>
          ) : null}
        </span>
        <span className={cx("label mt-1 text-[0.5625rem]", count > 0 && "text-brass")}>
          Vermerk
        </span>
      </button>

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
