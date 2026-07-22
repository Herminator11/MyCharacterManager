import { beforeEach, describe, expect, it } from "vitest";

import { createCharacter, deleteCharacter, listCharacters } from "./characters";
import {
  createFolder,
  deleteFolder,
  listFolders,
  moveCharacter,
  renameCharacter,
  renameFolder,
  setFavorite,
} from "./library";

/**
 * Die Ablage der Startseite. Der Fall, der wirklich weh täte: einen Ordner
 * zu löschen und die Charaktere mitzureißen.
 */

let vex: number;
let kael: number;

const byName = (name: string) =>
  listCharacters().find((c) => c.name === name)!;

beforeEach(() => {
  for (const character of listCharacters()) deleteCharacter(character.id);
  for (const folder of listFolders()) deleteFolder(folder.id);

  vex = createCharacter({ name: "Vex", classKey: "warlock", classLevel: 3 });
  kael = createCharacter({ name: "Kael", classKey: "wizard", classLevel: 5 });
});

describe("Ordner", () => {
  it("legt an, benennt um und listet sortiert", () => {
    const id = createFolder("Waterdeep")!;
    renameFolder(id, "Waterdeep — Kampagne");

    expect(listFolders().map((f) => f.name)).toEqual(["Waterdeep — Kampagne"]);
  });

  it("legt keinen Ordner ohne Namen an", () => {
    expect(createFolder("   ")).toBeNull();
    expect(listFolders()).toHaveLength(0);
  });

  it("löst beim Löschen die Charaktere, statt sie mitzunehmen", () => {
    const id = createFolder("Archiv")!;
    moveCharacter(vex, id);
    expect(byName("Vex").folderId).toBe(id);

    deleteFolder(id);

    expect(listFolders()).toHaveLength(0);
    expect(listCharacters()).toHaveLength(2);
    expect(byName("Vex").folderId).toBeNull();
  });
});

describe("Charaktere ablegen", () => {
  it("verschiebt in einen Ordner und wieder heraus", () => {
    const id = createFolder("Waterdeep")!;

    moveCharacter(kael, id);
    expect(byName("Kael").folderId).toBe(id);

    moveCharacter(kael, null);
    expect(byName("Kael").folderId).toBeNull();
  });

  it("legt lose ab, wenn der Zielordner nicht existiert", () => {
    // Sonst scheiterte die Aktion am Fremdschlüssel — lieber sichtbar
    // lose liegen als mit einem Fehler abbrechen.
    moveCharacter(vex, 9999);
    expect(byName("Vex").folderId).toBeNull();
  });

  it("sortiert Favoriten nach oben", () => {
    // Alphabetisch käme Kael zuerst.
    expect(listCharacters().map((c) => c.name)).toEqual(["Kael", "Vex"]);

    setFavorite(vex, true);
    expect(listCharacters().map((c) => c.name)).toEqual(["Vex", "Kael"]);
    expect(byName("Vex").favorite).toBe(true);

    setFavorite(vex, false);
    expect(listCharacters().map((c) => c.name)).toEqual(["Kael", "Vex"]);
  });

  it("benennt um, aber nie auf einen leeren Namen", () => {
    renameCharacter(vex, "  Vex'ahlia  ");
    expect(byName("Vex'ahlia")).toBeTruthy();

    renameCharacter(vex, "   ");
    expect(byName("Vex'ahlia")).toBeTruthy();
  });
});
