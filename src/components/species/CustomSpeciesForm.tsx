import { Button, Field, inputClass } from "@/components/ui";
import { ABILITIES } from "@/db/schema";
import { getT } from "@/lib/i18n/server";
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
export async function CustomSpeciesForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = await getT();
  return (
    <details className="group mt-3 border-t border-edge pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="label">{t.species.customTitle}</span>
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
            placeholder={t.common.example("Aasimar")}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.term.speed} hint={t.species.speedHint}>
            <input
              name="speed"
              type="number"
              min={0}
              defaultValue={30}
              className={inputClass}
            />
          </Field>
          <Field label={t.species.size}>
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
          <span className="label">{t.species.bonuses}</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2.5">
            {ABILITIES.map((ability) => (
              <label key={ability} className="block">
                <span className="label text-[0.625rem]">
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
            {t.species.bonusesHint}
          </p>
        </div>

        <Field
          label={t.term.traits}
          hint={t.species.traitsHint}
        >
          <textarea
            name="traits"
            rows={5}
            placeholder={t.species.traitsPlaceholder}
            className={textareaClass}
          />
        </Field>

        <Field
          label={t.species.choice}
          hint={t.species.choiceHint}
        >
          <input
            name="choiceNote"
            placeholder={t.species.choicePlaceholder}
            className={inputClass}
          />
        </Field>

        <Button type="submit" variant="solid" className="w-full">
          {t.species.createAndSelect}
        </Button>
      </form>
    </details>
  );
}
