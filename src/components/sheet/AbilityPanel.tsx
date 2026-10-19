import { AbilityColumn, type AbilityEntry } from "@/components/sheet/AbilityColumn";
import { EditLink, Panel, SectionLabel } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

/**
 * Die Attribute mit allem, was an ihnen hängt — zum Ablesen.
 *
 * Geändert wird im Bogen. Die sechs Zahlen ließen sich einmal hier direkt
 * bearbeiten, weil ein Levelaufstieg oft nur eine einzige davon anhebt; der
 * kurze Weg hat sich aber schlecht mit der übrigen Seite vertragen. Wer beim
 * Aufstieg CHA anhebt, trägt meist im selben Zug auch das neue HP-Maximum
 * und die neue Klassenstufe ein — und die standen ohnehin nur im Bogen. Der
 * Stift führt jetzt genau dorthin.
 */
export async function AbilityPanel({
  abilities,
  editHref,
}: {
  abilities: AbilityEntry[];
  editHref: string;
}) {
  const t = await getT();
  return (
    <Panel>
      <SectionLabel right={<EditLink href={editHref} label={t.common.edit} />}>Attribute</SectionLabel>

      {/* Reihenfolge bleibt STR–DEX–CON–INT–WIS–CHA wie auf jedem gedruckten
          Bogen. CON hat keine Fertigkeiten und wird dadurch von selbst zur
          kürzesten Zeile. */}
      <div className="space-y-4">
        {abilities.map((ability) => (
          <AbilityColumn key={ability.key} ability={ability} />
        ))}
      </div>
    </Panel>
  );
}
