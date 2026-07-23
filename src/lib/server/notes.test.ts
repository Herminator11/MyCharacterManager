import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { notes } from "@/db/schema";

import { createCharacter, deleteCharacter, getNotes, getPins, listCharacters } from "./characters";

/**
 * Notizseiten und Vermerke liegen in derselben Tabelle und dürfen sich
 * trotzdem nie ins Gehege kommen — sonst taucht ein Vermerk zwischen den
 * Hintergrundtexten auf.
 */

let id: number;

const add = (kind: "page" | "pin", title: string, body = "") =>
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
  it("hält Seiten und Vermerke getrennt", () => {
    add("page", "Vorgeschichte");
    add("pin", "Fluch der Krähe");

    expect(getNotes(id).map((n) => n.title)).toEqual(["Vorgeschichte"]);
    expect(getPins(id).map((n) => n.title)).toEqual(["Fluch der Krähe"]);
  });

  it("gibt neu angelegten Notizen die Art „page“", () => {
    db.insert(notes).values({ characterId: id, title: "Ohne Art" }).run();
    expect(getNotes(id).map((n) => n.title)).toContain("Ohne Art");
  });
});
