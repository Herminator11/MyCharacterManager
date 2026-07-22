import { Button, Field, inputClass } from "@/components/ui";
import { ABILITIES } from "@/db/schema";
import { ABILITY_LABELS } from "@/lib/rules/skills";

const textareaClass =
  "w-full rounded-md border border-edge bg-ink px-3 py-2.5 text-fg " +
  "placeholder:text-faint focus:border-patina focus:outline-none";

/**
 * Spezies von Hand anlegen — für alles außerhalb des SRD.
 *
 * Das SRD kennt neun Spezies und vier Subrassen. Aasimar, Goliath und jede
 * Hausregel entstehen hier. Eingeklappt, weil der Regelfall die Auswahl
 * darüber ist; die Action kommt fertig gebunden von der Seite.
 */
export function CustomSpeciesForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <details className="group mt-3 border-t border-edge pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="label">Eigene Spezies anlegen</span>
        <span
          aria-hidden
          className="text-lg leading-none text-mute transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>

      <form action={action} className="mt-3 space-y-3">
        <Field label="Name">
          <input
            name="name"
            required
            placeholder="Aasimar"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bewegungsrate" hint="in Fuß">
            <input
              name="speed"
              type="number"
              min={0}
              defaultValue={30}
              className={inputClass}
            />
          </Field>
          <Field label="Größe">
            <select name="size" defaultValue="Medium" className={inputClass}>
              {["Tiny", "Small", "Medium", "Large"].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <span className="label">Attributsboni</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2.5">
            {ABILITIES.map((ability) => (
              <label key={ability} className="block">
                <span className="label text-[0.5625rem]">
                  {ABILITY_LABELS[ability].name}
                </span>
                <input
                  name={`bonus_${ability}`}
                  type="number"
                  defaultValue={0}
                  className="mt-1 min-h-12 w-full rounded-md border border-edge bg-ink px-2 text-center text-lg font-semibold tabular-nums focus:border-patina focus:outline-none"
                />
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-faint">
            0 heißt „kein Bonus". Sie werden nicht automatisch aufgerechnet —
            dafür ist der Knopf oben da.
          </p>
        </div>

        <Field
          label="Traits"
          hint="Ein Trait je Absatz, Name und Text mit — getrennt."
        >
          <textarea
            name="traits"
            rows={5}
            placeholder={
              "Darkvision — Du siehst 60 Fuß weit im Dunkeln wie im Dämmerlicht.\n\nHealing Hands — Einmal je langer Rast heilst du Trefferpunkte in Höhe deines Levels."
            }
            className={textareaClass}
          />
        </Field>

        <Field
          label="Offene Wahl"
          hint="Was das Regelwerk dem Spieler überlässt. Bleibt ein Merkzettel."
        >
          <input
            name="choiceNote"
            placeholder="Dazu 2 × +1 auf frei gewählte Attribute."
            className={inputClass}
          />
        </Field>

        <Button type="submit" variant="solid" className="w-full">
          Anlegen und auswählen
        </Button>
      </form>
    </details>
  );
}
