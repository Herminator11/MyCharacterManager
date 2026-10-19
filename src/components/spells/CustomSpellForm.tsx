import { Button, Field, inputClass, Panel } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

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
export async function CustomSpellForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = await getT();
  return (
    <Panel>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="label">{t.spells.customTitle}</span>
          <span
            aria-hidden
            className="text-lg leading-none text-mute transition-transform group-open:rotate-45"
          >
            +
          </span>
        </summary>

        <form action={action} className="mt-3 space-y-3">
          <Field label={t.home.name}>
            <input
              name="name"
              required
              placeholder={t.common.example(t.spells.exampleName)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.spells.level}>
              <select name="level" defaultValue="0" className={inputClass}>
                <option value="0">{t.term.cantrip}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                  <option key={level} value={level}>
                    {t.term.spellLevel(level)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.spells.school}>
              <select name="school" defaultValue="" className={inputClass}>
                <option value="">{t.spells.noSchool}</option>
                {SCHOOLS.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.spells.castingTime}>
              <input
                name="castingTime"
                placeholder={t.common.example("1 action")}
                className={inputClass}
              />
            </Field>
            <Field label={t.spells.range}>
              <input name="range" placeholder={t.common.example("60 ft.")} className={inputClass} />
            </Field>

            <Field label={t.spells.components}>
              <input
                name="components"
                placeholder={t.common.example("V, S, M")}
                className={inputClass}
              />
            </Field>
            <Field label={t.spells.durationLong}>
              <input
                name="duration"
                placeholder={t.common.example("Instantaneous")}
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
            {t.term.concentration} — {t.spells.concentrationHint}
          </label>

          <label className="flex min-h-11 items-center gap-2 text-sm text-mute">
            <input
              type="checkbox"
              name="ritual"
              className="size-4 accent-[var(--color-patina)]"
            />
            {t.term.ritual} — {t.spells.ritualHint}
          </label>

          <Field label={t.spells.description}>
            <textarea
              name="description"
              rows={5}
              placeholder={t.spells.descriptionPlaceholder}
              className={textareaClass}
            />
          </Field>

          <Field label={t.spells.higherLevel} hint={t.spells.higherLevelHint}>
            <textarea
              name="higherLevel"
              rows={2}
              placeholder={t.spells.higherLevelPlaceholder}
              className={textareaClass}
            />
          </Field>

          <Button type="submit" variant="solid" size="lg" className="w-full">
            {t.spells.createSpell}
          </Button>
        </form>
      </details>
    </Panel>
  );
}
