import { notFound } from "next/navigation";

import {
  Button,
  cx,
  EmptyState,
  Field,
  inputClass,
  Panel,
  SectionLabel,
} from "@/components/ui";
import { copperToGold, totalCopper } from "@/lib/rules/derive";
import { getCharacter, getInventory } from "@/lib/server/characters";

import {
  addItemAction,
  removeItemAction,
  savePurseAction,
  setItemQtyAction,
  toggleEquippedAction,
} from "./actions";

export const dynamic = "force-dynamic";

const COINS = [
  { key: "pp", label: "PP", name: "Platin" },
  { key: "gp", label: "GP", name: "Gold" },
  { key: "ep", label: "EP", name: "Elektrum" },
  { key: "sp", label: "SP", name: "Silber" },
  { key: "cp", label: "CP", name: "Kupfer" },
] as const;

export default async function InventoryPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = Number(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const items = getInventory(characterId);
  const carried = items.reduce((sum, item) => sum + item.weight * item.qty, 0);
  const purseGold = copperToGold(totalCopper(character));

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Panel>
        <SectionLabel
          right={
            <span className="text-xs text-mute">
              {purseGold.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              gp gesamt
            </span>
          }
        >
          Geldbeutel
        </SectionLabel>

        <form
          action={async (formData: FormData) => {
            "use server";
            await savePurseAction(characterId, formData);
          }}
        >
          <div className="grid grid-cols-5 gap-2">
            {COINS.map((coin) => (
              <label key={coin.key} className="block">
                <span className="label">{coin.label}</span>
                <input
                  name={coin.key}
                  type="number"
                  min={0}
                  defaultValue={character[coin.key]}
                  aria-label={coin.name}
                  className="mt-1 w-full min-h-12 rounded-md border border-edge bg-ink px-1 text-center focus:border-patina focus:outline-none"
                />
              </label>
            ))}
          </div>
          <Button type="submit" className="mt-3 w-full">
            Geld speichern
          </Button>
        </form>
      </Panel>

      {items.length === 0 ? (
        <EmptyState title="Das Gepäck ist leer.">
          Trag unten ein, was du mit dir herumschleppst.
        </EmptyState>
      ) : (
        <Panel>
          <SectionLabel
            right={
              <span className="text-xs text-mute">
                {carried.toLocaleString("de-DE", {
                  maximumFractionDigits: 1,
                })}{" "}
                lb
              </span>
            }
          >
            Gepäck
          </SectionLabel>

          <ul className="divide-y divide-edge">
            {items.map((item) => (
              <li key={item.id} className="py-2">
                <div className="flex items-center gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await toggleEquippedAction(
                        characterId,
                        item.id,
                        !item.equipped,
                      );
                    }}
                  >
                    <button
                      type="submit"
                      aria-pressed={item.equipped}
                      aria-label={`${item.name} anlegen`}
                      title={item.equipped ? "Angelegt" : "Nicht angelegt"}
                      className={cx(
                        "size-3 shrink-0 rounded-full border transition-colors",
                        item.equipped
                          ? "border-patina bg-patina"
                          : "border-edge-bright",
                      )}
                    />
                  </form>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-xs text-faint">
                      {[
                        item.weight > 0 ? `${item.weight} lb` : "",
                        item.valueCp > 0
                          ? `${copperToGold(item.valueCp)} gp`
                          : "",
                        item.description,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await setItemQtyAction(
                        characterId,
                        item.id,
                        Number(formData.get("qty")),
                      );
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
                      await removeItemAction(characterId, item.id);
                    }}
                  >
                    <button
                      type="submit"
                      aria-label={`${item.name} entfernen`}
                      className="min-h-11 px-1 text-faint transition-colors hover:text-ember"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-faint">
            Menge auf 0 setzen entfernt den Eintrag. Der Punkt links schaltet
            „angelegt“ um.
          </p>
        </Panel>
      )}

      <Panel>
        <SectionLabel>Gegenstand hinzufügen</SectionLabel>
        <form
          action={async (formData: FormData) => {
            "use server";
            await addItemAction(characterId, formData);
          }}
          className="space-y-3"
        >
          <Field label="Name">
            <input
              name="name"
              required
              placeholder="Rationen (1 Tag)"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Menge">
              <input
                name="qty"
                type="number"
                min={1}
                defaultValue={1}
                className={inputClass}
              />
            </Field>
            <Field label="Gewicht">
              <input
                name="weight"
                type="number"
                min={0}
                step="0.1"
                defaultValue={0}
                aria-label="Gewicht in Pfund"
                placeholder="lb"
                className={inputClass}
              />
            </Field>
            <Field label="Wert">
              <input
                name="valueGp"
                type="number"
                min={0}
                step="0.01"
                defaultValue={0}
                aria-label="Wert in Gold"
                placeholder="gp"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Beschreibung">
            <input
              name="description"
              placeholder="Optional"
              className={inputClass}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-mute">
            <input
              type="checkbox"
              name="equipped"
              className="size-4 accent-[var(--color-patina)]"
            />
            Angelegt
          </label>

          <Button type="submit" variant="solid" className="w-full">
            Hinzufügen
          </Button>
        </form>
      </Panel>
    </div>
  );
}
