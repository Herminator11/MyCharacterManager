import { Button, cx, Panel, SectionLabel } from "@/components/ui";
import { copperToGold } from "@/lib/rules/derive";

export type Item = {
  id: number;
  name: string;
  qty: number;
  weight: number;
  valueCp: number;
  equipped: boolean;
  attuned: boolean;
  requiresAttunement: boolean;
  description: string;
};

export type ItemActions = {
  toggleEquipped: (itemId: number, equipped: boolean) => Promise<void>;
  toggleAttuned: (itemId: number, attuned: boolean) => Promise<void>;
  saveDescription: (itemId: number, description: string) => Promise<void>;
  setQty: (itemId: number, qty: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
};

/** Mehr als drei eingestimmte Gegenstände erlaubt 5e nur mit Sondermerkmal. */
const ATTUNEMENT_LIMIT = 3;

/**
 * Das Gepäck, getrennt nach am Körper und im Rucksack.
 *
 * Die Trennung ist keine Kosmetik: im Kampf zählt nur, was angelegt ist,
 * und eine Liste aus vierzig Zeilen Seil, Fackeln und Rationen macht genau
 * die drei Zeilen unsichtbar, auf die es ankommt.
 */
export function ItemList({
  items,
  actions,
}: {
  items: Item[];
  actions: ItemActions;
}) {
  const worn = items.filter((item) => item.equipped);
  const packed = items.filter((item) => !item.equipped);
  const attunedCount = items.filter((item) => item.attuned).length;
  const carried = items.reduce((sum, i) => sum + i.weight * i.qty, 0);

  return (
    <Panel>
      <SectionLabel
        right={
          <span className="text-xs text-mute">
            {carried.toLocaleString("de-DE", { maximumFractionDigits: 1 })} lb
          </span>
        }
      >
        Gepäck
      </SectionLabel>

      <Group
        title="Am Körper"
        items={worn}
        actions={actions}
        empty="Nichts angelegt."
        note={
          attunedCount > 0 || items.some((i) => i.requiresAttunement) ? (
            <span
              className={cx(
                "text-xs",
                attunedCount > ATTUNEMENT_LIMIT ? "text-ember" : "text-faint",
              )}
            >
              Attunement {attunedCount} / {ATTUNEMENT_LIMIT}
            </span>
          ) : null
        }
      />

      <div className="mt-4">
        <Group
          title="Im Rucksack"
          items={packed}
          actions={actions}
          empty="Der Rucksack ist leer."
        />
      </div>

      <p className="mt-3 text-xs text-faint">
        Der Punkt links legt an und ab. Menge auf 0 entfernt den Eintrag.
      </p>
    </Panel>
  );
}

function Group({
  title,
  items,
  actions,
  empty,
  note,
}: {
  title: string;
  items: Item[];
  actions: ItemActions;
  empty: string;
  note?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="label">{title}</h3>
        {note}
      </div>

      {items.length === 0 ? (
        <p className="py-1.5 text-sm text-faint">{empty}</p>
      ) : (
        <ul className="divide-y divide-edge">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} actions={actions} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemRow({ item, actions }: { item: Item; actions: ItemActions }) {
  const meta = [
    item.weight > 0 ? `${item.weight} lb` : "",
    item.valueCp > 0 ? `${copperToGold(item.valueCp)} gp` : "",
  ].filter(Boolean);

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <form
          action={async () => {
            "use server";
            await actions.toggleEquipped(item.id, !item.equipped);
          }}
        >
          <button
            type="submit"
            aria-pressed={item.equipped}
            aria-label={item.equipped ? `${item.name} ablegen` : `${item.name} anlegen`}
            // Der Punkt bleibt klein, die Tippfläche nicht: 12 px trifft am
            // Spieltisch niemand zuverlässig. Der Ring in mute statt
            // edge-bright erreicht die 3:1 für Bedienelemente.
            className="-m-4 flex size-11 shrink-0 items-center justify-center"
          >
            <span
              aria-hidden
              className={cx(
                "size-3 rounded-full border transition-colors",
                item.equipped ? "border-patina bg-patina" : "border-mute",
              )}
            />
          </button>
        </form>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {item.name}
            {item.attuned ? (
              <span className="ml-2 text-xs font-normal text-brass">
                eingestimmt
              </span>
            ) : null}
          </p>
          {meta.length > 0 ? (
            <p className="truncate text-xs text-faint">{meta.join(" · ")}</p>
          ) : null}
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await actions.setQty(item.id, Number(formData.get("qty")));
          }}
          className="shrink-0"
        >
          <input
            name="qty"
            type="number"
            min={0}
            defaultValue={item.qty}
            aria-label={`Menge ${item.name}`}
            className="min-h-11 w-16 rounded-md border border-edge bg-ink px-1 text-center focus:border-patina focus:outline-none"
          />
          <button type="submit" className="sr-only">
            Menge speichern
          </button>
        </form>

        <form
          action={async () => {
            "use server";
            await actions.remove(item.id);
          }}
        >
          <button
            type="submit"
            aria-label={`${item.name} entfernen`}
            className="min-h-11 min-w-11 text-faint transition-colors hover:text-ember"
          >
            ✕
          </button>
        </form>
      </div>

      {/* Die Wirkung steht eingeklappt darunter: Homebrew braucht Platz zum
          Schreiben, aber nicht jeden Tag Platz auf dem Bildschirm. */}
      <details className="mt-1">
        <summary className="cursor-pointer list-none pl-5 text-xs text-faint transition-colors hover:text-patina">
          {item.description
            ? truncate(item.description)
            : "Wirkung eintragen"}
        </summary>

        <div className="mt-2 space-y-2 pl-5">
          <form
            action={async (formData: FormData) => {
              "use server";
              await actions.saveDescription(
                item.id,
                String(formData.get("description") ?? ""),
              );
            }}
            className="space-y-2"
          >
            <textarea
              name="description"
              rows={3}
              defaultValue={item.description}
              placeholder="Was bewirkt der Gegenstand? Auch Hausregeln gehören hierher."
              aria-label={`Wirkung von ${item.name}`}
              className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-patina focus:outline-none"
            />
            <Button type="submit" size="sm">
              Wirkung speichern
            </Button>
          </form>

          {item.requiresAttunement ? (
            <form
              action={async () => {
                "use server";
                await actions.toggleAttuned(item.id, !item.attuned);
              }}
            >
              <button
                type="submit"
                className={cx(
                  "min-h-11 rounded-md border px-3 text-sm transition-colors",
                  item.attuned
                    ? "border-brass bg-brass/10 text-brass"
                    : "border-edge bg-panel-2 text-mute hover:border-edge-bright",
                )}
              >
                {item.attuned ? "Einstimmung lösen" : "Einstimmen"}
              </button>
            </form>
          ) : null}
        </div>
      </details>
    </li>
  );
}

function truncate(text: string): string {
  const line = text.split("\n")[0];
  return line.length > 60 ? `${line.slice(0, 59)}…` : line;
}
