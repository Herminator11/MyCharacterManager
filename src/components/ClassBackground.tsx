import { resolveBackground, type ClassTheme } from "@/lib/rules/class-themes";

/**
 * Der Seitenhintergrund aus den Klassenbildern des Charakters.
 *
 * Rein dekorativ, deshalb `fixed` und `-z-10`: außerhalb des Dokumentflusses,
 * kein Layout-Shift, keine Interaktion. Ohne hinterlegte Bilder (Manifest
 * noch leer oder Klasse unbekannt) rendert die Komponente nichts, und die
 * Seite sieht aus wie zuvor.
 */
export function ClassBackground({
  enabled,
  classes,
}: {
  enabled: boolean;
  classes: readonly { classKey: string; level: number }[];
}) {
  if (!enabled) return null;

  const resolved = resolveBackground(classes);
  if (resolved.kind === "none") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {resolved.kind === "single" ? (
        <Layer theme={resolved.theme} clipPath={undefined} />
      ) : (
        <>
          <Layer theme={resolved.primary} clipPath="polygon(0 0, 65% 0, 35% 100%, 0 100%)" />
          <Layer theme={resolved.secondary} clipPath="polygon(65% 0, 100% 0, 100% 100%, 35% 100%)" />
        </>
      )}
    </div>
  );
}

function Layer({
  theme,
  clipPath,
}: {
  theme: ClassTheme;
  clipPath: string | undefined;
}) {
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{
        clipPath,
        backgroundImage: [
          // Scrim: dunkelt das Bild ab, damit Fließtext darüber lesbar
          // bleibt — Pflicht am Spieltisch bei schlechtem Licht. Ein
          // Verlauf statt einer Flächen-Deckfarbe, damit die Bildmitte
          // noch erkennbar bleibt.
          "linear-gradient(180deg, rgba(14,17,19,0.55) 0%, rgba(14,17,19,0.8) 100%)",
          `url(${theme.image})`,
        ].join(", "),
      }}
    />
  );
}
