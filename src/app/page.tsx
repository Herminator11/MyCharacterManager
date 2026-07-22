import Link from "next/link";

import { CharacterLibrary } from "@/components/library/CharacterLibrary";
import { Button, Field, inputClass, Panel } from "@/components/ui";
import { CLASSES, className as classLabel } from "@/lib/rules/classes";
import { listCharacters } from "@/lib/server/characters";
import { listFolders } from "@/lib/server/library";

import {
  createCharacterAction,
  createFolderAction,
  deleteCharacterAction,
  deleteFolderAction,
  moveCharacterAction,
  renameCharacterAction,
  renameFolderAction,
  setFavoriteAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default function Page() {
  const characters = listCharacters();

  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
      <header>
        <p className="label">D&amp;D 5e</p>
        <h1 className="mt-1.5 text-[2rem] leading-none font-semibold tracking-tight">
          Charaktere
        </h1>
      </header>

      <CharacterLibrary
        characters={characters.map((character) => ({
          id: character.id,
          name: character.name,
          race: character.race,
          classLine:
            character.classes.length > 0
              ? character.classes
                  .map((c) => `${classLabel(c.classKey)} ${c.level}`)
                  .join(" / ")
              : "Ohne Klasse",
          hpCurrent: character.hpCurrent,
          hpMax: character.hpMax,
          favorite: character.favorite,
          folderId: character.folderId,
        }))}
        folders={listFolders().map((folder) => ({
          id: folder.id,
          name: folder.name,
        }))}
        actions={{
          setFavorite: async (characterId: number, favorite: boolean) => {
            "use server";
            await setFavoriteAction(characterId, favorite);
          },
          rename: async (characterId: number, name: string) => {
            "use server";
            await renameCharacterAction(characterId, name);
          },
          move: async (characterId: number, folderId: number | null) => {
            "use server";
            await moveCharacterAction(characterId, folderId);
          },
          remove: async (characterId: number) => {
            "use server";
            await deleteCharacterAction(characterId);
          },
          createFolder: async (name: string) => {
            "use server";
            await createFolderAction(name);
          },
          renameFolder: async (folderId: number, name: string) => {
            "use server";
            await renameFolderAction(folderId, name);
          },
          deleteFolder: async (folderId: number) => {
            "use server";
            await deleteFolderAction(folderId);
          },
        }}
      />

      <Link
        href="/import"
        className="mt-10 flex items-center justify-between gap-4 rounded-lg border border-dashed border-edge-bright px-4 py-4 transition-colors hover:border-patina hover:bg-panel"
      >
        <span>
          <span className="block text-sm font-semibold">
            Charakterbogen importieren
          </span>
          <span className="mt-0.5 block text-xs text-faint">
            Ausfüllbares PDF im offiziellen D&amp;D-Format — etwa aus Aurora.
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-patina">
          →
        </span>
      </Link>

      <Panel className="mt-3">
        <h2 className="label">Neuer Charakter</h2>
        <form action={createCharacterAction} className="mt-4 space-y-4">
          <Field label="Name">
            <input
              name="name"
              required
              autoComplete="off"
              placeholder="Vex"
              className={inputClass}
            />
          </Field>

          <Field label="Rasse" hint="Optional — reine Anzeige.">
            <input
              name="race"
              autoComplete="off"
              placeholder="Tiefling"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <Field label="Klasse">
              <select name="classKey" className={inputClass} defaultValue="">
                <option value="" disabled>
                  Wählen…
                </option>
                {CLASSES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Level">
              <input
                name="level"
                type="number"
                min={1}
                max={20}
                defaultValue={1}
                className={inputClass}
              />
            </Field>
          </div>

          <Button type="submit" variant="solid" size="lg" className="w-full">
            Charakter anlegen
          </Button>
          <p className="text-xs text-faint">
            Weitere Klassen fürs Multiclassing kommen später im Charakterbogen
            dazu.
          </p>
        </form>
      </Panel>
    </main>
  );
}
