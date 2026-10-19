import Link from "next/link";

import { BrandMark } from "@/components/Brand";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { CharacterLibrary } from "@/components/library/CharacterLibrary";
import { Button, Field, inputClass, Panel } from "@/components/ui";
import { CLASSES, className as classLabel } from "@/lib/rules/classes";
import { listCharacters } from "@/lib/server/characters";
import { listFolders } from "@/lib/server/library";
import { getT } from "@/lib/i18n/server";

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

export default async function Page() {
  const characters = listCharacters();
  const t = await getT();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
      {/* Hier ist die Marke kein Weg, sondern ein Absender: die Startseite
          ist schon das Ziel, auf das sie überall sonst zeigt. */}
      <header className="flex items-center gap-3">
        <BrandMark className="size-9 text-patina" />
        <div>
          <p className="label">{t.home.kicker}</p>
          <h1 className="mt-1 font-display text-[2rem] leading-none font-semibold tracking-wide">
            {t.home.title}
          </h1>
        </div>
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
              : t.header.noClass,
          hasPortrait: Boolean(character.portraitFile),
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
        className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-dashed border-edge-bright px-4 py-4 transition-colors hover:border-patina hover:bg-panel"
      >
        <span>
          <span className="block text-sm font-semibold">
            {t.home.importTitle}
          </span>
          <span className="mt-0.5 block text-xs text-faint">
            {t.home.importHint}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-patina">
          →
        </span>
      </Link>

      <Panel className="mt-3">
        <h2 className="label">{t.home.newCharacter}</h2>
        <form action={createCharacterAction} className="mt-4 space-y-4">
          <Field label={t.home.name}>
            <input
              name="name"
              required
              autoComplete="off"
              placeholder={t.common.example("Vex")}
              className={inputClass}
            />
          </Field>

          <Field label={t.home.race} hint={t.home.raceHint}>
            <input
              name="race"
              autoComplete="off"
              placeholder={t.common.example("Tiefling")}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <Field label={t.home.class}>
              <select name="classKey" className={inputClass} defaultValue="">
                <option value="" disabled>
                  {t.home.choose}
                </option>
                {CLASSES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.home.level}>
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
            {t.home.submit}
          </Button>
          <p className="text-xs text-faint">{t.home.multiclassHint}</p>
        </form>
      </Panel>

      {/* Ganz unten: die Sprache stellt man einmal pro Gerät ein, danach
          ist sie im Weg, wenn sie weiter oben stünde. */}
      <Panel className="mt-6">
        <LanguageSwitch />
      </Panel>
    </main>
  );
}
