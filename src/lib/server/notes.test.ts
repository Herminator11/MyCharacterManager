import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { notes } from "@/db/schema";

import {
  createCharacter,
  deleteCharacter,
  getLogEntries,
  getNotes,
  getPins,
  listCharacters,
} from "./characters";

/**
 * Notizseiten, Logbuch und Vermerke liegen in derselben Tabelle und dürfen
 * sich trotzdem nie ins Gehege kommen — sonst taucht ein hingeworfener Satz
 * zwischen den Hintergrundtexten auf oder ein Fluch verschwindet im Archiv.
 */

let id: number;

const add = (kind: "page" | "log" | "pin", title: string, body = "") =>
  db
    .insert(notes)
    .values({ characterId: id, kind, title, body })
    .returning({ id: notes.id })
    .get().id;

beforeEach(() => {
  for (const character of listCharacters()) deleteCharacter(character.id);
  id = createCharacter({ name: "Testfigur", classKey: "rogue", classLevel: 3 });
});

describe("Notizarten auseinanderhalten", () => {
  it("hält Seiten, Logbuch und Vermerke getrennt", () => {
    add("page", "Vorgeschichte");
    add("log", "", "Turm gefunden");
    add("pin", "Fluch der Krähe");

    expect(getNotes(id).map((n) => n.title)).toEqual(["Vorgeschichte"]);
    expect(getLogEntries(id).map((n) => n.body)).toEqual(["Turm gefunden"]);
    expect(getPins(id).map((n) => n.title)).toEqual(["Fluch der Krähe"]);
  });

  it("zeigt den jüngsten Logbucheintrag zuerst", () => {
    const first = add("log", "", "zuerst");
    const later = add("log", "", "danach");

    // Beide bekommen denselben Zeitstempel, wenn sie in derselben Sekunde
    // entstehen — dann muss die ID entscheiden.
    db.update(notes)
      .set({ createdAt: 1000 })
      .where(eq(notes.id, first))
      .run();
    db.update(notes)
      .set({ createdAt: 1000 })
      .where(eq(notes.id, later))
      .run();

    expect(getLogEntries(id).map((n) => n.body)).toEqual(["danach", "zuerst"]);
  });

  it("begrenzt das Logbuch auf Wunsch", () => {
    for (let i = 0; i < 5; i++) add("log", "", `Eintrag ${i}`);
    expect(getLogEntries(id, 3)).toHaveLength(3);
    expect(getLogEntries(id)).toHaveLength(5);
  });

  it("gibt neu angelegten Notizen die Art „page“", () => {
    db.insert(notes).values({ characterId: id, title: "Ohne Art" }).run();
    expect(getNotes(id).map((n) => n.title)).toContain("Ohne Art");
  });
});
