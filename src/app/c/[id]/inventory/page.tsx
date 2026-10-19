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
import { characterIdFromParam } from "@/lib/characterUrl";
import { copperToGold, totalCopper } from "@/lib/rules/derive";
import { getT } from "@/lib/i18n/server";
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

const COINS = ["pp", "gp", "ep", "sp", "cp"] as const;

export default async function InventoryPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const items = getInventory(characterId);
  const t = await getT();
  const purseGold = copperToGold(totalCopper(character));

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Panel>
        <SectionLabel
          right={
            <span className="text-xs text-mute">
              {t.inventory.purseTotal(
                t.number(purseGold, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                t.term.coins.gp.short,
              )}
            </span>
          }
        >
          {t.inventory.purse}
        </SectionLabel>

        <form
          action={async (formData: FormData) => {
            "use server";
            await savePurseAction(characterId, formData);
          }}
        >
          <div className="grid grid-cols-5 gap-2">
            {COINS.map((coin) => (
              <label key={coin} className="block">
                <span className="label">{t.term.coins[coin].short}</span>
                <input
                  name={coin}
                  type="number"
                  min={0}
                  defaultValue={character[coin]}
                  aria-label={t.term.coins[coin].name}
                  className="mt-1 w-full min-h-12 rounded-md border border-edge bg-ink px-1 text-center focus:border-patina focus:outline-none"
                />
              </label>
            ))}
          </div>
          <Button type="submit" className="mt-3 w-full">
            {t.inventory.savePurse}
          </Button>
        </form>
      </Panel>

      {items.length === 0 ? (
        <EmptyState title={t.inventory.emptyTitle}>{t.inventory.emptyBody}</EmptyState>
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
        <SectionLabel>{t.inventory.addTitle}</SectionLabel>
        <form
          action={async (formData: FormData) => {
            "use server";
            await addItemAction(characterId, formData);
          }}
          className="space-y-3"
        >
          <Field label={t.home.name}>
            <input
              name="name"
              required
              placeholder={t.common.example(t.mode === "en" ? "Rations (1 day)" : "Rationen (1 Tag)")}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t.inventory.qty}>
              <input
                name="qty"
                type="number"
                min={1}
                defaultValue={1}
                className={inputClass}
              />
            </Field>
            <Field label={t.inventory.weight}>
              <input
                name="weight"
                type="number"
                min={0}
                step="0.1"
                defaultValue={0}
                aria-label={t.inventory.weightLabel}
                placeholder="lb"
                className={inputClass}
              />
            </Field>
            <Field label={t.inventory.value}>
              <input
                name="valueGp"
                type="number"
                min={0}
                step="0.01"
                defaultValue={0}
                aria-label={t.inventory.valueLabel}
                placeholder={t.term.coins.gp.short.toLowerCase()}
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label={t.inventory.effect}
            hint={t.inventory.effectHint}
          >
            <textarea
              name="description"
              rows={2}
              placeholder={t.common.optional}
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
              {t.inventory.equipped}
            </label>
            <label className="flex items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                name="requiresAttunement"
                className="size-4 accent-[var(--color-brass)]"
              />
              {t.inventory.requiresAttunement}
            </label>
          </div>

          <Button type="submit" variant="solid" className="w-full">
            {t.common.add}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
