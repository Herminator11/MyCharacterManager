import { Button, Field, inputClass, Panel } from "@/components/ui";

/** Die acht SRD-Schulen — als Auswahl, damit die Filterleiste der
 *  Zauberliste eigene Zauber mit den Katalogzaubern zusammenfasst. */
const SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

const textareaClass =
  "w-full rounded-md border border-edge bg-ink px-3 py-2.5 text-fg " +
  "placeholder:text-faint focus:border-patina focus:outline-none";

/**
 * Zauber von Hand anlegen — für alles, was nicht im SRD-Katalog steht.
 *
 * Eingeklappt, weil der Regelfall die Katalogsuche darüber ist. Die Action
 * kommt fertig gebunden von der Seite herein, damit das Formular selbst
 * nichts über den Charakter wissen muss.
 */
export function CustomSpellForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Panel>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="label">Eigenen Zauber von Hand anlegen</span>
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
              placeholder="z. B. Flammender Krähenruf"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Grad">
              <select name="level" defaultValue="0" className={inputClass}>
                <option value="0">Cantrip</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                  <option key={level} value={level}>
                    Grad {level}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Schule">
              <select name="school" defaultValue="" className={inputClass}>
                <option value="">— keine —</option>
                {SCHOOLS.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Casting Time">
              <input
                name="castingTime"
                placeholder="z. B. 1 action"
                className={inputClass}
              />
            </Field>
            <Field label="Reichweite">
              <input name="range" placeholder="z. B. 60 ft." className={inputClass} />
            </Field>

            <Field label="Komponenten">
              <input
                name="components"
                placeholder="z. B. V, S, M"
                className={inputClass}
              />
            </Field>
            <Field label="Wirkungsdauer">
              <input
                name="duration"
                placeholder="z. B. Instantaneous"
                className={inputClass}
              />
            </Field>
          </div>

          <label className="flex min-h-11 items-center gap-2 text-sm text-mute">
            <input
              type="checkbox"
              name="concentration"
              className="size-4 accent-[var(--color-patina)]"
            />
            Concentration — nur ein solcher Zauber gleichzeitig
          </label>

          <label className="flex min-h-11 items-center gap-2 text-sm text-mute">
            <input
              type="checkbox"
              name="ritual"
              className="size-4 accent-[var(--color-patina)]"
            />
            Ritual — auch ohne Slot wirkbar, +10 Minuten
          </label>

          <Field label="Beschreibung">
            <textarea
              name="description"
              rows={5}
              placeholder="Was der Zauber bewirkt — Würfe, Saves, Schaden."
              className={textareaClass}
            />
          </Field>

          <Field label="Auf höherem Grad" hint="At Higher Levels — optional">
            <textarea
              name="higherLevel"
              rows={2}
              placeholder="Je Grad über dem ersten +1d6 Schaden."
              className={textareaClass}
            />
          </Field>

          <Button type="submit" variant="solid" size="lg" className="w-full">
            Zauber anlegen
          </Button>
        </form>
      </details>
    </Panel>
  );
}
