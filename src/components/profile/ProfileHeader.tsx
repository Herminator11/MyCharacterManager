import { ClassIcon } from "@/components/icons";
import { PinButton } from "@/components/notes/PinButton";
import { PROFILE_ANCHOR_ID } from "@/components/StickyStats";
import { CombatStats } from "@/components/profile/CombatStats";
import { InspirationToggle } from "@/components/profile/InspirationToggle";
import { KeyStats } from "@/components/profile/KeyStat";
import { PortraitUpload } from "@/components/profile/PortraitUpload";
import { Panel } from "@/components/ui";
import { className as classLabel } from "@/lib/rules/classes";
import { getT } from "@/lib/i18n/server";
import { formatModifier } from "@/lib/rules/derive";
import type { SheetView } from "@/lib/server/characters";

/**
 * Der Kopf der Charakterseite: wer das ist und was dauerhaft für ihn gilt.
 *
 * Rechts stehen die drei Werte, die im Kampf laut genannt werden — AC,
 * Initiative, Speed — als eigene Instrumente. Die klebende Leiste darüber
 * zeigt dieselben Zahlen noch einmal klein; das ist keine Dopplung, sondern
 * Arbeitsteilung: hier liest man sie, dort behält man sie beim Scrollen.
 *
 * Nichts davon ist hier änderbar. Was zum Charakter gehört, wird im Bogen
 * geändert; auf dieser Seite ändert sich nur, was der Kampf ändert.
 * Ausgenommen bleiben die Vermerke — das sind Notizen, keine Werte, und sie
 * entstehen mitten im Spiel — und das Portrait, das an keinem anderen Wert
 * hängt und deshalb hier wie im Bogen direkt wechselbar ist.
 */
export async function ProfileHeader({
  sheet,
  pinCount,
  addPin,
  uploadPortrait,
}: {
  sheet: NonNullable<SheetView>;
  pinCount: number;
  addPin: (formData: FormData) => Promise<void>;
  uploadPortrait: (formData: FormData) => Promise<{ error?: string } | void>;
}) {
  const { character } = sheet;
  const t = await getT();

  const subtitle = [
    // Der Katalogname gewinnt, wenn eine Spezies verknüpft ist: er ist der,
    // unter dem auch die Traits darunter stehen. Ohne Verknüpfung bleibt der
    // Text vom importierten Bogen — „Variant Human (Custom)" sagt mehr als
    // gar nichts.
    sheet.species?.name || character.race,
    character.background,
    character.alignment,
  ].filter(Boolean);

  return (
    // Ein Raster statt flex-wrap: am Handy rutschte die Namensspalte
    // (min. 15rem) unter das Portrait und ließ daneben eine leere Fläche;
    // die Kennzahlen standen 3 + 1 und die Instrumente füllten zwei
    // Drittel der Breite. Jetzt: Portrait und Name nebeneinander,
    // darunter Kennzahlen und Instrumente jeweils über die volle Breite.
    // Ab lg wieder die alte Anordnung mit den Instrumenten rechts.
    <Panel className="relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:pr-20">
      <div className="lg:row-span-2">
        <PortraitUpload
          characterId={character.id}
          name={character.name}
          hasPortrait={Boolean(character.portraitFile)}
          upload={uploadPortrait}
        />
      </div>

      {/* pr-16 hält am Handy die Ecke für Vermerk und Inspiration frei;
          ab lg übernimmt das Panel den Rand. */}
      <div className="min-w-0 self-center pr-16 lg:pr-0">
        <h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">
          {character.name}
        </h1>
        {/* Darf am Handy umbrechen: neben dem Portrait ist die Zeile
            schmal, und "Wizard 5 (School of Evocation)" abgeschnitten
            verschweigt genau die Subklasse. */}
        <p className="mt-0.5 text-sm text-patina lg:truncate">
          {/* Subklasse in Klammern hinter dem Level: sie beantwortet die
              Frage „was für ein Warlock", und die stellt am Tisch jeder
              zuerst. Fehlt sie, fehlt nur die Klammer. Das Icon davor
              ist reine Wiedererkennung — der Text bleibt die Quelle der
              Wahrheit, unbekannte Klassen bekommen einfach keins. */}
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
            : t.header.noClass}
        </p>
        {subtitle.length > 0 ? (
          <p className="mt-0.5 text-xs text-faint lg:truncate">
            {subtitle.join(" · ")}
          </p>
        ) : null}
      </div>

      <KeyStats sheet={sheet} className="col-span-2 lg:col-span-1 lg:col-start-2" />

      {/* Anker für die klebende Leiste: solange dieser Block sichtbar
          ist, hält sie ihre Zahlen zurück. */}
      <div
        id={PROFILE_ANCHOR_ID}
        className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1"
      >
        <CombatStats
          armorClass={sheet.armorClass}
          initiative={formatModifier(sheet.initiative)}
          speed={character.speed}
        />
      </div>

      {/* Vermerk und Inspiration teilen sich die Ecke, beide mit Wort
          unter dem Zeichen: ein Blatt und eine Flamme sind keine
          Konventionen wie Papierkorb oder Stift, und ein Tooltip kommt
          auf dem Handy nie an. Die Flamme stand früher neben dem Namen —
          dort fraß sie die Breite, die der Name neben dem Portrait jetzt
          braucht. */}
      <div className="absolute top-2 right-2 flex flex-col items-center">
        <PinButton count={pinCount} add={addPin} />
        <InspirationToggle />
      </div>
    </Panel>
  );
}
