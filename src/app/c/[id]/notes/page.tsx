import { notFound } from "next/navigation";

import { Button, Field, inputClass, Panel, SectionLabel } from "@/components/ui";
import { getCharacter, getNotes } from "@/lib/server/characters";

import {
  addNoteAction,
  removeNoteAction,
  saveBackgroundAction,
  saveNoteAction,
} from "./actions";

export const dynamic = "force-dynamic";

const textareaClass =
  "w-full rounded-md border border-edge bg-ink px-3 py-2.5 text-fg " +
  "placeholder:text-faint focus:border-patina focus:outline-none";

const TRAITS = [
  {
    key: "personality",
    label: "Persönlichkeitsmerkmale",
    placeholder: "Wie tritt dein Charakter auf?",
  },
  { key: "ideals", label: "Ideale", placeholder: "Woran glaubt er?" },
  { key: "bonds", label: "Bindungen", placeholder: "Woran hängt sein Herz?" },
  { key: "flaws", label: "Makel", placeholder: "Was bringt ihn zu Fall?" },
] as const;

export default async function NotesPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = Number(id);

  const character = getCharacter(characterId);
  if (!character) notFound();

  const pages = getNotes(characterId);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <form
        action={async (formData: FormData) => {
          "use server";
          await saveBackgroundAction(characterId, formData);
        }}
        className="space-y-3"
      >
        <Panel className="space-y-3">
          <SectionLabel>Charakterzüge</SectionLabel>
          {TRAITS.map((trait) => (
            <Field key={trait.key} label={trait.label}>
              <textarea
                name={trait.key}
                rows={2}
                defaultValue={character[trait.key]}
                placeholder={trait.placeholder}
                className={textareaClass}
              />
            </Field>
          ))}
        </Panel>

        <Panel>
          <SectionLabel>Vorgeschichte</SectionLabel>
          <textarea
            name="backstory"
            rows={8}
            defaultValue={character.backstory}
            placeholder="Woher kommt dein Charakter?"
            className={textareaClass}
          />
        </Panel>

        <Button type="submit" variant="solid" size="lg" className="w-full">
          Hintergrund speichern
        </Button>
      </form>

      <div className="pt-2">
        <SectionLabel
          right={
            <form
              action={async () => {
                "use server";
                await addNoteAction(characterId);
              }}
            >
              <button
                type="submit"
                className="text-xs text-patina underline-offset-4 hover:underline"
              >
                Neue Seite
              </button>
            </form>
          }
        >
          Notizseiten
        </SectionLabel>

        {pages.length === 0 ? (
          <p className="text-sm text-faint">
            Noch keine Notizen. „Neue Seite“ legt eine an — gut für
            Session-Zusammenfassungen.
          </p>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <Panel key={page.id}>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await saveNoteAction(characterId, formData);
                  }}
                  className="space-y-2.5"
                >
                  <input type="hidden" name="noteId" value={page.id} />
                  <input
                    name="title"
                    defaultValue={page.title}
                    aria-label="Titel der Notiz"
                    className={`${inputClass} font-semibold`}
                  />
                  <textarea
                    name="body"
                    rows={10}
                    defaultValue={page.body}
                    placeholder="Markdown ist willkommen — gespeichert wird der Rohtext."
                    aria-label="Inhalt der Notiz"
                    className={`${textareaClass} font-mono text-sm`}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Speichern
                    </Button>
                  </div>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await removeNoteAction(characterId, page.id);
                  }}
                  className="mt-2"
                >
                  <button
                    type="submit"
                    className="text-xs text-faint underline-offset-4 hover:text-ember hover:underline"
                  >
                    Diese Seite löschen
                  </button>
                </form>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
