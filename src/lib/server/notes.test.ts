import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { notes } from "@/db/schema";

import {
  createCharacter,
  deleteCharacter,
  getCampaignLog,
  getFeatures,
  getPins,
  listCharacters,
} from "./characters";

/**
 * Vermerke, Fähigkeiten und Kampagnen-Log liegen in derselben Tabelle und
 * dürfen sich trotzdem nie ins Gehege kommen — sonst taucht ein Vermerk
 * zwischen den Fähigkeiten auf oder eine Fähigkeit im Log.
 */

let id: number;

const add = (kind: "pin" | "feature" | "log", title: string, body = "") =>
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
  it("hält Vermerke, Fähigkeiten und Log getrennt", () => {
    add("pin", "Fluch der Krähe");
    add("feature", "Sneak Attack", "3d6 einmal pro Zug");
    add("log", "", "Turm gefunden");

    expect(getPins(id).map((n) => n.title)).toEqual(["Fluch der Krähe"]);
    expect(getFeatures(id).map((n) => n.title)).toEqual(["Sneak Attack"]);
    expect(getCampaignLog(id).map((n) => n.body)).toEqual(["Turm gefunden"]);
  });

  it("zeigt den jüngsten Log-Eintrag zuerst", () => {
    const first = add("log", "", "zuerst");
    const later = add("log", "", "danach");

    db.update(notes).set({ createdAt: 1000 }).where(eq(notes.id, first)).run();
    db.update(notes).set({ createdAt: 1000 }).where(eq(notes.id, later)).run();

    expect(getCampaignLog(id).map((n) => n.body)).toEqual(["danach", "zuerst"]);
  });
});
