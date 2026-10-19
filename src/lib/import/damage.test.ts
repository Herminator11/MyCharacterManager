import { describe, expect, it } from "vitest";

import { parseDamage } from "./damage";

describe("parseDamage", () => {
  it("trennt Würfel, Bonus und Schadensart", () => {
    expect(parseDamage("1d8+3 piercing")).toEqual({
      dice: "1d8",
      bonus: 3,
      type: "piercing",
    });
  });

  it("versteht negative Boni mit Leerzeichen", () => {
    expect(parseDamage("1d6 - 1 bludgeoning")).toEqual({
      dice: "1d6",
      bonus: -1,
      type: "bludgeoning",
    });
  });

  it("versteht ein typografisches Minus", () => {
    expect(parseDamage("1d6−1 bludgeoning").bonus).toBe(-1);
  });

  it("kommt ohne Schadensart aus", () => {
    expect(parseDamage("2d6+4")).toEqual({ dice: "2d6", bonus: 4, type: "" });
  });

  it("nimmt auch deutsche Schadensarten", () => {
    expect(parseDamage("1d4+2 Stich")).toEqual({
      dice: "1d4",
      bonus: 2,
      type: "Stich",
    });
  });

  it("lässt ein nachgestelltes 'damage' weg", () => {
    expect(parseDamage("1d10+2 fire damage")).toEqual({
      dice: "1d10",
      bonus: 2,
      type: "fire",
    });
  });

  it("setzt bei reinen Würfeln den Bonus auf 0, nicht auf das Attribut", () => {
    expect(parseDamage("1d8 slashing")).toEqual({
      dice: "1d8",
      bonus: 0,
      type: "slashing",
    });
  });

  it("gibt für ein leeres Feld nichts und Bonus 0", () => {
    expect(parseDamage("")).toEqual({ dice: "", bonus: 0, type: "" });
    expect(parseDamage("   ")).toEqual({ dice: "", bonus: 0, type: "" });
  });

  it("lässt Freitext ohne Würfel stehen", () => {
    expect(parseDamage("siehe Notizen")).toEqual({
      dice: "siehe Notizen",
      bonus: 0,
      type: "",
    });
  });

  it("rät nicht, wenn nach der Schadensart noch Text folgt", () => {
    expect(parseDamage("2d10 +5 force damage per beam")).toEqual({
      dice: "2d10 +5 force damage per beam",
      bonus: 0,
      type: "",
    });
  });

  it("rät nicht bei mehreren Würfelausdrücken", () => {
    expect(parseDamage("1d8+1d6 piercing").dice).toBe("1d8+1d6 piercing");
    expect(parseDamage("1d8 (1d10) slashing").bonus).toBe(0);
  });
});
