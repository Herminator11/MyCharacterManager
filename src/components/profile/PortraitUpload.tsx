"use client";

import { useRef, useState, useTransition } from "react";

import { Portrait } from "@/components/profile/Portrait";
import { cx } from "@/components/ui";

/**
 * Portrait mit Klick-zum-Wechseln — steht im Kurzüberblick von Übersicht
 * und Bogen.
 *
 * Bewusste Ausnahme von "geändert wird im Bogen": das Bild ist an keine
 * andere Eingabe gekoppelt und sein Ergebnis sieht man nur an sich selbst
 * — anders als bei AC oder Attributen gibt es keinen Wert, der aus ihm
 * abgeleitet würde. Ein zweiter Weg dorthin kostet hier keine Konsistenz.
 *
 * Speichert sofort statt über einen Speichern-Knopf. Eine Datei
 * auszuwählen ist bereits die Bestätigung — ein zweiter Schritt für etwas,
 * das man am Ergebnis sofort sieht, wäre nur eine Falle.
 */
export function PortraitUpload({
  characterId,
  name,
  hasPortrait,
  upload,
}: {
  characterId: number;
  name: string;
  hasPortrait: boolean;
  upload: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        aria-label={hasPortrait ? "Portrait wechseln" : "Portrait hochladen"}
        className={cx(
          "group relative block rounded-lg transition-opacity",
          pending && "opacity-50",
        )}
      >
        <Portrait
          characterId={characterId}
          name={name}
          hasPortrait={hasPortrait}
          version={version}
          className="transition-colors group-hover:border-patina"
        />

        <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-1 text-[0.625rem] font-semibold tracking-wide uppercase text-mute opacity-0 transition-opacity group-hover:opacity-100">
          {pending ? "lädt…" : "Bild wählen"}
        </span>
      </button>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          const formData = new FormData();
          formData.set("portrait", file);
          setError(null);

          startTransition(async () => {
            const result = await upload(formData);
            if (result?.error) setError(result.error);
            else setVersion((v) => v + 1);
          });

          // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
          event.target.value = "";
        }}
      />

      {error ? (
        <p className="mt-1.5 max-w-24 text-xs text-ember sm:max-w-28">{error}</p>
      ) : null}
    </div>
  );
}
