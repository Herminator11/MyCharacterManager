import { ClassIcon } from "@/components/icons";
import { CombatStats } from "@/components/profile/CombatStats";
import { KeyStats } from "@/components/profile/KeyStat";
import { PortraitUpload } from "@/components/profile/PortraitUpload";
import { Panel } from "@/components/ui";
import { className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import type { SheetView } from "@/lib/server/characters";

/**
 * Derselbe Blick wie im Profilkopf der Übersicht, jetzt oben auf dem Bogen:
 * was gerade gilt, bevor man in die Abschnitte springt, um es zu ändern.
 *
 * Reine Anzeige, wie auf der Übersicht auch — jeder Teil verlinkt auf den
 * Abschnitt, der ihn ändert, statt hier ein zweites Formular für dieselbe
 * Zahl zu öffnen. Live-Werte (Inspiration, Vermerke) fehlen bewusst: die
 * entstehen im Kampf und gehören auf die Übersicht, nicht in den Bogen.
 * Das Portrait ist die eine Ausnahme, die direkt hier wechselbar ist —
 * dafür braucht es unten im Bogen keinen eigenen Abschnitt mehr.
 */
export function SheetSummary({
  sheet,
  uploadPortrait,
}: {
  sheet: NonNullable<SheetView>;
  uploadPortrait: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const { character } = sheet;

  const subtitle = [
    sheet.species?.name || character.race,
    character.background,
    character.alignment,
  ].filter(Boolean);

  return (
    // Dasselbe Raster wie im Profilkopf der Übersicht (siehe dort):
    // Portrait und Name nebeneinander, Kennzahlen und Instrumente darunter
    // über die volle Breite, ab lg die Instrumente rechts.
    <Panel className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="lg:row-span-2">
        <PortraitUpload
          characterId={character.id}
          name={character.name}
          hasPortrait={Boolean(character.portraitFile)}
          upload={uploadPortrait}
        />
      </div>

      <div className="min-w-0 self-center">
        <h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">
          {character.name}
        </h1>
        <a
          href="#klassen"
          className="mt-0.5 block text-sm text-patina hover:underline lg:truncate"
        >
          {sheet.classes.length > 0
            ? sheet.classes.map((c, i) => (
                <span key={`${c.classKey}-${i}`}>
                  {i > 0 ? " / " : ""}
                  <ClassIcon
                    classKey={c.classKey}
                    className="mr-1 inline-block size-3.5 align-text-bottom text-patina/70"
                  />
                  {classLabel(c.classKey)} {c.level}
                  {c.subclass ? ` (${c.subclass})` : ""}
                </span>
              ))
            : "Ohne Klasse — antippen zum Ergänzen"}
        </a>
        {subtitle.length > 0 ? (
          <a
            href="#spezies"
            className="mt-0.5 block text-xs text-faint transition-colors hover:text-patina lg:truncate"
          >
            {subtitle.join(" · ")}
          </a>
        ) : null}
      </div>

      <a
        href="#grunddaten"
        className="col-span-2 block hover:opacity-80 lg:col-span-1 lg:col-start-2"
      >
        <KeyStats sheet={sheet} className="lg:grid-cols-2" />
      </a>

      <a
        href="#werte"
        className="col-span-2 block transition-opacity hover:opacity-80 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1"
        aria-label="Zum Abschnitt Werte"
      >
        <CombatStats
          armorClass={sheet.armorClass}
          initiative={formatModifier(sheet.initiative)}
          speed={character.speed}
        />
      </a>
    </Panel>
  );
}
