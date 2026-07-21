"use client";

import { useRef, useState, useTransition } from "react";

import { cx } from "@/components/ui";

/**
 * Portrait mit Klick-zum-Wechseln.
 *
 * Ohne Bild steht hier die Initiale statt eines leeren Kastens — so hat
 * die Charakterkarte auch vor dem ersten Upload eine erkennbare Form.
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
  /** Steigt nach jedem Upload und bricht den Bild-Cache des Browsers auf. */
  const [version, setVersion] = useState(0);

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const showImage = hasPortrait || version > 0;

  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        aria-label={hasPortrait ? "Portrait wechseln" : "Portrait hochladen"}
        className={cx(
          "group relative size-24 overflow-hidden rounded-lg border border-edge bg-panel-2 transition-colors hover:border-patina sm:size-28",
          pending && "opacity-50",
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- Die Datei
          // liegt außerhalb von public/ und wird über einen Route Handler
          // ausgeliefert; next/image bringt hier keinen Vorteil.
          <img
            src={`/api/characters/${characterId}/portrait?v=${version}`}
            alt={`Portrait von ${name}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-4xl font-semibold text-faint">
            {initial}
          </span>
        )}

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
