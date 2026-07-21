import { notFound } from "next/navigation";

import { ItemList } from "@/components/inventory/ItemList";
import {
  Button,
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
  saveItemDescriptionAction,
  savePurseAction,
  setItemQtyAction,
  toggleAttunedAction,
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
        <ItemList
          items={items}
          actions={{
            toggleEquipped: async (itemId: number, equipped: boolean) => {
              "use server";
              await toggleEquippedAction(characterId, itemId, equipped);
            },
            toggleAttuned: async (itemId: number, attuned: boolean) => {
              "use server";
              await toggleAttunedAction(characterId, itemId, attuned);
            },
            saveDescription: async (itemId: number, description: string) => {
              "use server";
              await saveItemDescriptionAction(characterId, itemId, description);
            },
            setQty: async (itemId: number, qty: number) => {
              "use server";
              await setItemQtyAction(characterId, itemId, qty);
            },
            remove: async (itemId: number) => {
              "use server";
              await removeItemAction(characterId, itemId);
            },
          }}
        />
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

          <Field
            label="Wirkung"
            hint="Auch Hausregeln und Abwandlungen gehören hierher — später jederzeit änderbar."
          >
            <textarea
              name="description"
              rows={2}
              placeholder="Optional"
              className="w-full rounded-md border border-edge bg-ink px-3 py-2.5 text-fg placeholder:text-faint focus:border-patina focus:outline-none"
            />
          </Field>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                name="equipped"
                className="size-4 accent-[var(--color-patina)]"
              />
              Angelegt
            </label>
            <label className="flex items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                name="requiresAttunement"
                className="size-4 accent-[var(--color-brass)]"
              />
              Braucht Einstimmung
            </label>
          </div>

          <Button type="submit" variant="solid" className="w-full">
            Hinzufügen
          </Button>
        </form>
      </Panel>
    </div>
  );
}
