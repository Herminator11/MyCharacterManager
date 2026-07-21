import { Button, inputClass, Panel, SectionLabel } from "@/components/ui";

export type Pin = { id: number; title: string; body: string };

/**
 * „Aktuell gilt für dich" — Fluch, Pakt, Segen, die Vergiftung über drei
 * Tage.
 *
 * Das sind keine Conditions: die stehen im Regelwerk und haben einen
 * Katalog. Diese hier hat der DM sich ausgedacht, und sie gelten über
 * Sitzungen hinweg. Deshalb stehen sie oben auf der Charakterseite und
 * nicht im Notizarchiv — man muss sie sehen, ohne sie zu suchen.
 *
 * Ohne Vermerke bleibt nur eine dünne Zeile stehen. Ein leerer Kasten mit
 * Überschrift wäre jeden Tag im Weg, an dem nichts gilt.
 */
export function PinnedNotes({
  pins,
  add,
  resolve,
}: {
  pins: Pin[];
  add: (formData: FormData) => Promise<void>;
  resolve: (noteId: number) => Promise<void>;
}) {
  return (
    <Panel>
      <SectionLabel
        right={
          pins.length > 0 ? (
            <span className="text-xs text-brass">{pins.length} aktiv</span>
          ) : null
        }
      >
        Aktuell gilt für dich
      </SectionLabel>

      {pins.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {pins.map((pin) => (
            <li
              key={pin.id}
              className="flex items-start gap-3 rounded-md border border-brass/40 bg-brass/5 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brass">{pin.title}</p>
                {pin.body ? (
                  <p className="mt-0.5 text-xs whitespace-pre-line text-mute">
                    {pin.body}
                  </p>
                ) : null}
              </div>

              <form
                action={async () => {
                  "use server";
                  await resolve(pin.id);
                }}
              >
                <button
                  type="submit"
                  className="min-h-11 px-2 text-xs text-faint transition-colors hover:text-patina"
                >
                  Beenden
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <details className="group">
        <summary className="cursor-pointer list-none text-xs text-faint transition-colors hover:text-patina">
          {pins.length > 0 ? "Weiteren Vermerk anlegen" : "Vermerk anlegen"}
        </summary>

        <form action={add} className="mt-2.5 space-y-2">
          <input
            name="title"
            required
            placeholder="Woran musst du denken?"
            aria-label="Vermerk"
            className={inputClass}
          />
          <input
            name="body"
            placeholder="Was bewirkt es? (optional)"
            aria-label="Wirkung des Vermerks"
            className={inputClass}
          />
          <Button type="submit" size="sm" variant="solid" className="w-full">
            Anheften
          </Button>
        </form>
      </details>
    </Panel>
  );
}
