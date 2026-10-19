"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { AddIcon, ChevronDownIcon, TrashIcon } from "@/components/icons";
import { Portrait } from "@/components/profile/Portrait";
import { characterPath } from "@/lib/characterUrl";
import { useT } from "@/lib/i18n/client";

import { Button, cx, EditToggle, EmptyState, inputClass, TEXT_ACTION } from "@/components/ui";

export type LibraryCharacter = {
  id: number;
  name: string;
  race: string;
  classLine: string;
  hasPortrait: boolean;
  favorite: boolean;
  folderId: number | null;
};

export type LibraryFolder = { id: number; name: string };

export type LibraryActions = {
  setFavorite: (characterId: number, favorite: boolean) => Promise<void>;
  rename: (characterId: number, name: string) => Promise<void>;
  move: (characterId: number, folderId: number | null) => Promise<void>;
  remove: (characterId: number) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  renameFolder: (folderId: number, name: string) => Promise<void>;
  deleteFolder: (folderId: number) => Promise<void>;
};

/**
 * Die Startseite als Ablage.
 *
 * Zwei Zustände: normal liest man nur und tippt einen Charakter an, im
 * Bearbeiten-Modus kommen Umbenennen, Verschieben und Löschen dazu. Das
 * hält den Alltagsweg — Seite auf, Charakter antippen — frei von Knöpfen,
 * die man einmal im Monat braucht und versehentlich trifft.
 */
export function CharacterLibrary({
  characters,
  folders,
  actions,
}: {
  characters: LibraryCharacter[];
  folders: LibraryFolder[];
  actions: LibraryActions;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);

  const favorites = characters.filter((c) => c.favorite);
  const loose = characters.filter((c) => !c.favorite && c.folderId === null);
  const folderName = (id: number | null) =>
    folders.find((f) => f.id === id)?.name ?? "";

  if (characters.length === 0 && folders.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState title={t.library.emptyTitle}>{t.library.emptyBody}</EmptyState>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label">
          {t.library.count(characters.length)}
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAddingFolder((value) => !value)}
            aria-pressed={addingFolder}
            className={TEXT_ACTION}
          >
            <AddIcon />
            {t.library.folder}
          </button>
          <EditToggle editing={editing} onClick={() => setEditing(!editing)} />
        </div>
      </div>

      {addingFolder ? (
        <NewFolder
          create={actions.createFolder}
          onDone={() => setAddingFolder(false)}
        />
      ) : null}

      <div className="mt-3 space-y-5">
        {favorites.length > 0 ? (
          <Group title={t.library.favorites}>
            {favorites.map((character) => (
              <Row
                key={character.id}
                character={character}
                folders={folders}
                actions={actions}
                editing={editing}
                // Favoriten stehen oben statt in ihrem Ordner — der Hinweis
                // sagt, wo sie liegen, damit nichts verschwunden wirkt.
                location={folderName(character.folderId)}
              />
            ))}
          </Group>
        ) : null}

        {loose.length > 0 ? (
          <Group title={folders.length > 0 ? t.library.noFolder : t.library.all}>
            {loose.map((character) => (
              <Row
                key={character.id}
                character={character}
                folders={folders}
                actions={actions}
                editing={editing}
              />
            ))}
          </Group>
        ) : null}

        {folders.map((folder) => {
          const all = characters.filter((c) => c.folderId === folder.id);
          const inside = all.filter((c) => !c.favorite);

          return (
            <Group
              key={folder.id}
              title={folder.name}
              folder={folder}
              actions={actions}
              editing={editing}
              count={all.length}
            >
              {inside.length === 0 ? (
                <p className="px-1 py-2 text-sm text-faint">
                  {/* Zählt der Ordner Charaktere, stehen sie als Favoriten
                      oben — „nichts drin“ wäre dann schlicht gelogen. */}
                  {all.length === 0
                    ? t.library.folderEmpty
                    : all.length === 1
                      ? t.library.folderOneFavorite
                      : t.library.folderAllFavorites}
                </p>
              ) : (
                inside.map((character) => (
                  <Row
                    key={character.id}
                    character={character}
                    folders={folders}
                    actions={actions}
                    editing={editing}
                  />
                ))
              )}
            </Group>
          );
        })}
      </div>
    </div>
  );
}

function Group({
  title,
  count,
  folder,
  actions,
  editing,
  children,
}: {
  title: string;
  count?: number;
  folder?: LibraryFolder;
  actions?: LibraryActions;
  editing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h3 className="label">
          {title}
          {typeof count === "number" ? (
            <span className="ml-2 font-normal tracking-normal normal-case text-faint">
              {count}
            </span>
          ) : null}
        </h3>
        {folder && actions && editing ? (
          <FolderControls folder={folder} actions={actions} />
        ) : null}
      </div>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Row({
  character,
  folders,
  actions,
  editing,
  location,
}: {
  character: LibraryCharacter;
  folders: LibraryFolder[];
  actions: LibraryActions;
  editing: boolean;
  location?: string;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(character.name);

  const commitRename = () => {
    setRenaming(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== character.name) {
      run(() => actions.rename(character.id, trimmed));
    }
  };

  const classAndLocation = (
    <span className="mt-1 block truncate text-sm text-mute">
      {character.race ? `${character.race} · ` : ""}
      {character.classLine}
      {location ? <span className="text-faint"> · {t.library.inFolder(location)}</span> : null}
    </span>
  );

  const portrait = (
    <Portrait
      characterId={character.id}
      name={character.name}
      hasPortrait={character.hasPortrait}
      className="my-auto ml-0.5 size-12 shrink-0"
    />
  );

  return (
    <li
      className={cx(
        "rounded-lg border border-edge bg-panel transition-opacity",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-stretch">
        <Star
          on={character.favorite}
          name={character.name}
          onToggle={() =>
            run(() => actions.setFavorite(character.id, !character.favorite))
          }
        />

        {portrait}

        {/* Im Bearbeiten-Modus per Doppelklick auf den Namen umbenennen —
            Enter oder Rausklicken speichert sofort, ohne eigenen Knopf.
            Solange umbenannt wird, ist die Zeile bewusst kein Link mehr:
            ein Eingabefeld in einem <a> ist weder gültiges HTML noch
            verlässlich bedienbar. */}
        {renaming ? (
          <div className="min-w-0 flex-1 py-3.5 pr-4 pl-3">
            <input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitRename();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraftName(character.name);
                  setRenaming(false);
                }
              }}
              aria-label={t.library.nameOf(character.name)}
              className="w-full rounded-md border border-patina bg-ink px-2 py-1 text-lg font-semibold tracking-tight focus:outline-none"
            />
            {classAndLocation}
          </div>
        ) : (
          <Link
            href={characterPath(character.id, character.name)}
            className="min-w-0 flex-1 py-3.5 pr-4 pl-3 transition-colors hover:text-patina"
          >
            <span
              className="block truncate text-lg font-semibold tracking-tight"
              onDoubleClick={(event) => {
                if (!editing) return;
                event.preventDefault();
                setDraftName(character.name);
                setRenaming(true);
              }}
              onClick={(event) => {
                // Verhindert, dass der erste Klick eines Doppelklicks
                // schon zur Charakterseite navigiert, bevor der zweite
                // ankommt — Next.js' Link prüft defaultPrevented.
                if (editing) event.preventDefault();
              }}
            >
              {character.name}
            </span>
            {classAndLocation}
          </Link>
        )}
      </div>

      {editing ? (
        <RowEditor
          character={character}
          folders={folders}
          actions={actions}
          run={run}
        />
      ) : null}
    </li>
  );
}

function RowEditor({
  character,
  folders,
  actions,
  run,
}: {
  character: LibraryCharacter;
  folders: LibraryFolder[];
  actions: LibraryActions;
  run: (fn: () => Promise<void>) => void;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="border-t border-ember-dim bg-ember-deep/40 px-4 py-3">
        <p className="text-sm text-ember">
          <span className="font-semibold">{character.name}</span>{" "}
          {t.library.confirmDelete}
        </p>
        <p className="mt-0.5 text-xs text-mute">
          {t.library.confirmDeleteHint}
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => setConfirming(false)}>
            {t.common.cancel}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => run(() => actions.remove(character.id))}
          >
            {t.library.deleteForever}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 border-t border-edge px-4 py-3">
      <div className="relative flex-1">
        <select
          value={character.folderId ?? ""}
          onChange={(event) =>
            run(() =>
              actions.move(
                character.id,
                event.target.value === "" ? null : Number(event.target.value),
              ),
            )
          }
          aria-label={t.library.folderOf(character.name)}
          // appearance-none statt des nativen Pfeils: der saß ohne Abstand
          // am rechten Rand. Der eigene Pfeil bekommt seinen Platz über
          // pr-9 und pointer-events-none, damit er die Klickfläche nicht
          // stiehlt.
          className={`${inputClass} w-full appearance-none pr-9`}
        >
          <option value="">{t.library.noFolder}</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
      </div>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={t.library.deleteOf(character.name)}
        className="flex w-11 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:text-ember"
      >
        <TrashIcon className="size-4" />
      </button>
    </div>
  );
}

function Star({
  on,
  name,
  onToggle,
}: {
  on: boolean;
  name: string;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? t.library.unfavorite(name) : t.library.favorite(name)}
      className="flex w-11 shrink-0 items-center justify-center self-stretch text-faint transition-colors hover:text-brass"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-[1.125rem]">
        <path
          d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8 9.4 9z"
          fill={on ? "var(--color-brass)" : "none"}
          stroke={on ? "var(--color-brass)" : "currentColor"}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function FolderControls({
  folder,
  actions,
}: {
  folder: LibraryFolder;
  actions: LibraryActions;
}) {
  const t = useT();
  const [name, setName] = useState(folder.name);
  const [mode, setMode] = useState<"idle" | "rename" | "confirm">("idle");
  const [, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) => startTransition(() => void fn());

  if (mode === "rename") {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMode("idle");
            if (event.key === "Enter" && name.trim()) {
              run(() => actions.renameFolder(folder.id, name));
              setMode("idle");
            }
          }}
          aria-label={t.library.nameOf(folder.name)}
          className="min-h-9 rounded-md border border-edge bg-ink px-2 text-sm focus:border-patina focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            run(() => actions.renameFolder(folder.id, name));
            setMode("idle");
          }}
          className="text-xs text-patina"
        >
          {t.common.save}
        </button>
      </div>
    );
  }

  if (mode === "confirm") {
    return (
      <p className="flex items-center gap-3 text-xs text-ember">
        {t.library.confirmDeleteFolder}
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="text-faint"
        >
          {t.common.no}
        </button>
        <button
          type="button"
          onClick={() => run(() => actions.deleteFolder(folder.id))}
          className="font-semibold"
        >
          {t.common.yes}
        </button>
      </p>
    );
  }

  return (
    <span className="flex gap-3 text-xs text-faint">
      <button
        type="button"
        onClick={() => setMode("rename")}
        className="transition-colors hover:text-patina"
      >
        {t.common.rename}
      </button>
      <button
        type="button"
        onClick={() => setMode("confirm")}
        className="transition-colors hover:text-ember"
      >
        {t.common.delete}
      </button>
    </span>
  );
}

function NewFolder({
  create,
  onDone,
}: {
  create: (name: string) => Promise<void>;
  onDone: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [, startTransition] = useTransition();

  const commit = () => {
    if (!name.trim()) return;
    startTransition(() => void create(name));
    onDone();
  };

  return (
    <div className="mt-3 flex gap-2">
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") onDone();
        }}
        onBlur={() => {
          if (!name.trim()) onDone();
        }}
        placeholder={t.library.newFolderPlaceholder}
        aria-label={t.library.newFolderLabel}
        className={inputClass}
      />
      <Button size="sm" onClick={commit} disabled={!name.trim()}>
        {t.common.create}
      </Button>
    </div>
  );
}
