import { describe, expect, it } from "vitest";

import { deathStatus } from "./hp";

/**
 * Die HP-Arithmetik selbst wird von `live.test.ts` gegen eine echte
 * Datenbank geprüft. Hier steht nur die Ableitung des Zustands bei 0
 * Trefferpunkten — die einzige Stelle, an der drei Felder zu einer
 * Aussage werden.
 */
describe("Zustand bei 0 Trefferpunkten", () => {
  const at = (patch: Partial<Parameters<typeof deathStatus>[0]>) =>
    deathStatus({
      hpCurrent: 0,
      deathSaveFailures: 0,
      stabilized: false,
      ...patch,
    });

  it("nennt jeden über 0 lebendig — auch mit alten Häkchen", () => {
    expect(at({ hpCurrent: 1, deathSaveFailures: 3, stabilized: true })).toBe(
      "alive",
    );
  });

  it("unterscheidet sterbend, stabil und tot", () => {
    expect(at({})).toBe("dying");
    expect(at({ stabilized: true })).toBe("stable");
    expect(at({ deathSaveFailures: 3 })).toBe("dead");
  });

  it("lässt den Tod schwerer wiegen als die Stabilisierung", () => {
    // Der Fall entsteht nur durch Handeingriff, aber die Reihenfolge soll
    // nicht dem Zufall überlassen sein.
    expect(at({ deathSaveFailures: 3, stabilized: true })).toBe("dead");
  });
});
