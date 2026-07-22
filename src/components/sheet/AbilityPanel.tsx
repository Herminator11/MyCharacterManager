import { AbilityColumn, type AbilityEntry } from "@/components/sheet/AbilityColumn";
import { EditLink, Panel, SectionLabel } from "@/components/ui";

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
export function AbilityPanel({
  abilities,
  editHref,
}: {
  abilities: AbilityEntry[];
  editHref: string;
}) {
  return (
    <Panel>
      <SectionLabel right={<EditLink href={editHref} />}>Attribute</SectionLabel>

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
