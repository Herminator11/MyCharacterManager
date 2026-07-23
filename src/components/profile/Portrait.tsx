import { cx } from "@/components/ui";

/**
 * Das Portrait als reine Anzeige.
 *
 * Eigene Komponente, weil es an zwei Stellen mit demselben Aussehen steht:
 * auf der Übersicht nur zum Ansehen, im Bogen als Fläche zum Wechseln. Ein
 * Bild, das je nach Seite anders gerahmt ist, wirkt wie zwei Bilder.
 *
 * Ohne Datei steht hier die Initiale statt eines leeren Kastens — so hat die
 * Charakterkarte auch vor dem ersten Upload eine erkennbare Form.
 */
export function Portrait({
  characterId,
  name,
  hasPortrait,
  /** Steigt nach einem Upload und bricht den Bild-Cache des Browsers auf. */
  version = 0,
  className,
}: {
  characterId: number;
  name: string;
  hasPortrait: boolean;
  version?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  // Zwei konkurrierende size-* in Tailwind v4 entscheiden sich nach der
  // Reihenfolge im erzeugten Stylesheet, nicht im Klassenstring — die
  // Standardgröße greift deshalb nur, wenn der Aufrufer keine mitbringt.
  const sized = /\bsize-/.test(className ?? "");

  return (
    <div
      className={cx(
        !sized && "size-24 sm:size-28",
        "overflow-hidden rounded-lg border border-edge bg-panel-2",
        className,
      )}
    >
      {hasPortrait || version > 0 ? (
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
    </div>
  );
}
