import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCharacter, deleteCharacter, getCharacter, listCharacters } from "./characters";
import {
  clearPortrait,
  PORTRAIT_DIR,
  PortraitError,
  resolvePortrait,
  savePortrait,
} from "./portraits";

/** Ein winziges, gültiges PNG (1×1 Pixel). */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const png = (bytes: Buffer = PNG_BYTES) =>
  new File([new Uint8Array(bytes)], "portrait.png", { type: "image/png" });

let id: number;

beforeEach(() => {
  for (const character of listCharacters()) deleteCharacter(character.id);
  id = createCharacter({ name: "Vex", classKey: "sorcerer", classLevel: 1 });
});

afterEach(() => {
  fs.rmSync(PORTRAIT_DIR, { recursive: true, force: true });
});

describe("savePortrait", () => {
  it("legt die Datei ab und merkt sie am Charakter", async () => {
    const filename = await savePortrait(id, png());

    expect(getCharacter(id)?.portraitFile).toBe(filename);
    expect(fs.existsSync(path.join(PORTRAIT_DIR, filename))).toBe(true);
  });

  it("benennt nach Inhalt, nicht nach hochgeladenem Dateinamen", async () => {
    const filename = await savePortrait(id, png());
    // Der Name des Uploads darf nicht durchschlagen.
    expect(filename).not.toContain("portrait.png");
    expect(filename).toMatch(/^\d+-[0-9a-f]{16}\.png$/);
  });

  it("räumt das vorherige Bild weg", async () => {
    const first = await savePortrait(id, png());

    // Anderer Inhalt → anderer Hash → andere Datei.
    const other = Buffer.concat([PNG_BYTES, Buffer.from([0])]);
    const second = await savePortrait(id, png(other));

    expect(second).not.toBe(first);
    expect(fs.existsSync(path.join(PORTRAIT_DIR, first))).toBe(false);
    expect(fs.existsSync(path.join(PORTRAIT_DIR, second))).toBe(true);
  });

  it("lässt dasselbe Bild zweimal zu, ohne es zu löschen", async () => {
    const first = await savePortrait(id, png());
    const second = await savePortrait(id, png());

    expect(second).toBe(first);
    expect(fs.existsSync(path.join(PORTRAIT_DIR, first))).toBe(true);
  });

  it("weist fremde Dateitypen ab", async () => {
    const pdf = new File([new Uint8Array([1, 2, 3])], "sheet.pdf", {
      type: "application/pdf",
    });
    await expect(savePortrait(id, pdf)).rejects.toBeInstanceOf(PortraitError);
    expect(getCharacter(id)?.portraitFile).toBe("");
  });

  it("weist zu große Bilder ab", async () => {
    const huge = new File([new Uint8Array(9 * 1024 * 1024)], "gross.png", {
      type: "image/png",
    });
    // Die Art statt des Satzes: der Text entsteht erst in der Sprache des
    // Geräts, in der Server Action.
    await expect(savePortrait(id, huge)).rejects.toMatchObject({
      kind: "tooLarge",
      megabytes: 9,
    });
  });

  it("weist leere Dateien ab", async () => {
    const empty = new File([], "leer.png", { type: "image/png" });
    await expect(savePortrait(id, empty)).rejects.toBeInstanceOf(PortraitError);
  });
});

describe("resolvePortrait", () => {
  it("findet ein abgelegtes Bild", async () => {
    const filename = await savePortrait(id, png());
    expect(resolvePortrait(filename)).toBe(path.join(PORTRAIT_DIR, filename));
  });

  it("gibt null für einen leeren Namen", () => {
    expect(resolvePortrait("")).toBeNull();
  });

  it("lässt sich nicht aus dem Portrait-Ordner herausführen", () => {
    // Der Name kommt normalerweise aus savePortrait, aber die Datenbank
    // ist eine Datei, die man von Hand bearbeiten kann.
    expect(resolvePortrait("../app.db")).toBeNull();
    expect(resolvePortrait("../../etc/passwd")).toBeNull();
    expect(resolvePortrait("/etc/passwd")).toBeNull();
  });
});

describe("clearPortrait", () => {
  it("entfernt Eintrag und Datei", async () => {
    const filename = await savePortrait(id, png());
    clearPortrait(id);

    expect(getCharacter(id)?.portraitFile).toBe("");
    expect(fs.existsSync(path.join(PORTRAIT_DIR, filename))).toBe(false);
  });
});
