import { describe, expect, it } from "vitest";

import { isSlotCost, parseActionCost } from "./actions";

/**
 * Die Wirkzeit steht im SRD als Freitext. Der Parser muss die Schreibweisen
 * treffen, die dort tatsächlich vorkommen — vor allem die Falle, dass
 * "1 bonus action" das Wort "action" enthält.
 */
describe("parseActionCost", () => {
  it("erkennt die volle Aktion", () => {
    expect(parseActionCost("1 action")).toBe("action");
  });

  it("hält Bonusaktion und Aktion auseinander", () => {
    expect(parseActionCost("1 bonus action")).toBe("bonus");
  });

  it("erkennt Reaktionen samt ihrer Erläuterung", () => {
    expect(
      parseActionCost(
        "1 reaction, which you take when you are hit by an attack",
      ),
    ).toBe("reaction");
  });

  it("wirft alles über eine Runde hinaus in einen Topf", () => {
    expect(parseActionCost("1 minute")).toBe("long");
    expect(parseActionCost("10 minutes")).toBe("long");
    expect(parseActionCost("8 hours")).toBe("long");
  });

  it("kommt mit leerer und deutscher Angabe zurecht", () => {
    expect(parseActionCost("")).toBe("long");
    expect(parseActionCost("1 Aktion")).toBe("action");
    expect(parseActionCost("1 Reaktion")).toBe("reaction");
  });
});

describe("isSlotCost", () => {
  it("zählt nur, was ein Konto im Zug belastet", () => {
    expect(isSlotCost("action")).toBe(true);
    expect(isSlotCost("bonus")).toBe(true);
    expect(isSlotCost("reaction")).toBe(true);
    expect(isSlotCost("long")).toBe(false);
  });
});
