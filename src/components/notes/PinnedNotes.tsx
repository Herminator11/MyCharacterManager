import { Panel, SectionLabel } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

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
export async function PinnedNotes({
  pins,
  resolve,
}: {
  pins: Pin[];
  resolve: (noteId: number) => Promise<void>;
}) {
  // Nichts angeheftet, nichts zu zeigen: der Kasten erschiene sonst jeden
  // Tag als leere Überschrift. Angelegt wird oben am Zettel im Profilkopf.
  if (pins.length === 0) return null;
  const t = await getT();

  return (
    <Panel>
      <SectionLabel
        right={<span className="text-xs text-brass">{t.play.activeCount(pins.length)}</span>}
      >
        {t.play.pinsTitle}
      </SectionLabel>

      <ul className="space-y-1.5">
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
                {t.play.end}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
