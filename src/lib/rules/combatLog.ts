import type { CombatLogKind } from "@/db/schema";
import type { LiveMutation, LiveState } from "@/lib/live-types";

import type { ActionCost } from "./actions";

/**
 * Was aus einer Live-Änderung als Kampflog-Zeile wird.
 *
 * Der Kern des Kampflogs ist, dass niemand es führt: Wer mitten im Kampf
 * mitschreiben soll, schreibt nicht mit. Also wird jede Änderung, die
 * ohnehin durch `applyMutation` läuft, hier in einen Satz übersetzt —
 * aus dem Zustand davor und danach, nicht aus der Absicht. Damit steht im
 * Log, was wirklich passiert ist: ein Cast ohne freien Slot findet nicht
 * statt und taucht deshalb auch nicht auf.
 *
 * `null` heißt „nicht erwähnenswert“. Das ist die häufigste Antwort und
 * soll es bleiben — ein Log, das jede Korrektur mitschreibt, liest keiner.
 */
export type CombatLogLine = {
  kind: CombatLogKind;
  text: string;
  detail: string;
  /** Schaden bzw. geheilte HP, sonst 0 — nur für die Zusammenfassung. */
  amount: number;
};

const COST_LABEL: Record<ActionCost, string> = {
  action: "Aktion",
  bonus: "Bonusaktion",
  reaction: "Reaktion",
  long: "",
};

export function describeMutation(
  mutation: LiveMutation,
  before: LiveState,
  after: LiveState,
): CombatLogLine | null {
  switch (mutation.type) {
    case "hp.delta": {
      const amount = Math.round(mutation.amount);
      if (amount === 0) return null;

      // Was die temporären HP geschluckt haben, ist die Information, die
      // man hinterher sucht: "warum bin ich nur um 3 gefallen?"
      const absorbed = Math.max(0, before.hpTemp - after.hpTemp);
      const range = `${before.hpCurrent} → ${after.hpCurrent}`;

      if (amount < 0) {
        return {
          kind: "damage",
          text: `${-amount} Schaden`,
          detail: absorbed > 0 ? `${range} · ${absorbed} über temporäre HP` : range,
          amount: -amount,
        };
      }
      return {
        kind: "heal",
        text: `${amount} geheilt`,
        detail: range,
        amount: after.hpCurrent - before.hpCurrent,
      };
    }

    case "hp.set": {
      if (after.hpCurrent === before.hpCurrent) return null;
      const up = after.hpCurrent > before.hpCurrent;
      return {
        kind: up ? "heal" : "damage",
        text: "HP korrigiert",
        detail: `${before.hpCurrent} → ${after.hpCurrent}`,
        amount: 0,
      };
    }

    case "hp.temp":
      if (after.hpTemp === before.hpTemp) return null;
      return {
        kind: "state",
        text:
          after.hpTemp > 0
            ? `${after.hpTemp} temporäre HP`
            : "Temporäre HP weg",
        detail: "",
        amount: 0,
      };

    case "hitdice.spend": {
      const wasSpent = countHitDiceUsed(after) > countHitDiceUsed(before);
      if (!wasSpent) return null;

      const healed = after.hpCurrent - before.hpCurrent;
      const die = before.hitDice.find((h) => h.classId === mutation.classId);
      return {
        kind: "heal",
        text: `Trefferwürfel${die ? ` d${die.hitDie}` : ""}`,
        detail: `+${healed} HP · ${before.hpCurrent} → ${after.hpCurrent}`,
        amount: healed,
      };
    }

    case "cast": {
      // Kein Slot verbraucht, obwohl einer fällig war: der Cast ist am
      // Server gescheitert (anderes Gerät war schneller).
      if (mutation.poolId !== null && mutation.level > 0) {
        const wasUsed = slotUsed(before, mutation.poolId, mutation.level);
        const isUsed = slotUsed(after, mutation.poolId, mutation.level);
        if (wasUsed === null || isUsed === null || isUsed === wasUsed) {
          return null;
        }
      }

      const pool = after.pools.find((p) => p.id === mutation.poolId);
      const parts = [
        mutation.level === 0
          ? "Zaubertrick"
          : `Grad ${mutation.level}${pool ? ` · ${pool.name}` : ""}`,
        COST_LABEL[mutation.cost],
      ].filter(Boolean);

      return {
        kind: "cast",
        text: mutation.spellName || "Zauber gewirkt",
        detail: parts.join(" · "),
        amount: 0,
      };
    }

    case "condition.set": {
      const isActive = after.conditions.includes(mutation.key);
      if (isActive === before.conditions.includes(mutation.key)) return null;
      return {
        kind: "condition",
        text: isActive
          ? conditionLabel(mutation.key)
          : `${conditionLabel(mutation.key)} beendet`,
        detail: "",
        amount: 0,
      };
    }

    case "concentration.set":
      if (!after.concentration) return null;
      return {
        kind: "state",
        text: `Konzentration: ${after.concentration.label || "aktiv"}`,
        detail: "",
        amount: 0,
      };

    case "concentration.clear":
      if (!before.concentration) return null;
      return {
        kind: "state",
        text: "Konzentration verloren",
        detail: before.concentration.label,
        amount: 0,
      };

    case "death.set": {
      // Die beiden Ausgänge stehen für sich: sie beenden die Würfelei und
      // sind das, was man hinterher im Log sucht.
      if (after.stabilized && !before.stabilized) {
        return {
          kind: "heal",
          text: "Stabilisiert",
          detail: "keine Würfe mehr, weiter bei 0 HP",
          amount: 0,
        };
      }
      if (after.deathSaveFailures >= 3 && before.deathSaveFailures < 3) {
        return {
          kind: "damage",
          text: "Gestorben",
          detail: "drei Fehlschläge",
          amount: 0,
        };
      }

      if (
        after.deathSaveSuccesses === before.deathSaveSuccesses &&
        after.deathSaveFailures === before.deathSaveFailures
      ) {
        return null;
      }
      return {
        kind: "damage",
        text: "Todesrettungswurf",
        detail: `${after.deathSaveSuccesses} Erfolge · ${after.deathSaveFailures} Fehlschläge`,
        amount: 0,
      };
    }

    case "resource.set": {
      const was = before.resources.find((r) => r.id === mutation.resourceId);
      const is = after.resources.find((r) => r.id === mutation.resourceId);
      if (!was || !is || was.current === is.current) return null;
      return {
        kind: "resource",
        text:
          is.current < was.current
            ? `${is.name} eingesetzt`
            : `${is.name} zurückgelegt`,
        detail: `${is.current}/${is.max}`,
        amount: 0,
      };
    }

    case "inspiration.set":
      if (after.inspiration === before.inspiration) return null;
      return {
        kind: "resource",
        text: after.inspiration ? "Inspiration erhalten" : "Inspiration eingesetzt",
        detail: "",
        amount: 0,
      };

    case "rest.short":
      return { kind: "rest", text: "Kurze Rast", detail: "", amount: 0 };

    case "rest.long":
      return { kind: "rest", text: "Lange Rast", detail: "", amount: 0 };

    // Bewusst still: die Zugkonten und einzelne Slots sind Korrekturen am
    // Zähler, keine Ereignisse. Der Rundenwechsel steht als Überschrift im
    // Log, nicht als Zeile darin.
    case "turn.set":
    case "turn.end":
    case "slot.set":
    case "hitdice.set":
    case "battle.start":
    case "battle.end":
      return null;
  }
}

/**
 * Was am Kampfende ins Logbuch wandert — oder null, wenn nichts passiert
 * ist. Ein Kampf, der aus einem Fehltipper bestand, soll keine Notiz
 * hinterlassen.
 */
export function summarize(
  rounds: number,
  lines: Pick<CombatLogLine, "kind" | "amount">[],
): string | null {
  if (lines.length === 0) return null;

  const sum = (kind: CombatLogKind) =>
    lines.filter((l) => l.kind === kind).reduce((total, l) => total + l.amount, 0);

  const damage = sum("damage");
  const healed = sum("heal");
  const casts = lines.filter((l) => l.kind === "cast").length;

  const parts = [
    `${rounds} ${rounds === 1 ? "Runde" : "Runden"}`,
    damage > 0 ? `${damage} Schaden genommen` : "",
    healed > 0 ? `${healed} HP geheilt` : "",
    casts > 0 ? `${casts} ${casts === 1 ? "Zauber" : "Zauber"} gewirkt` : "",
  ].filter(Boolean);

  return `Kampf: ${parts.join(" · ")}`;
}

function countHitDiceUsed(state: LiveState): number {
  return state.hitDice.reduce((total, entry) => total + entry.used, 0);
}

function slotUsed(
  state: LiveState,
  poolId: number,
  level: number,
): number | null {
  const slot = state.pools
    .find((pool) => pool.id === poolId)
    ?.slots.find((s) => s.level === level);
  return slot ? slot.used : null;
}

/** 'poisoned' → 'Poisoned'. Die Chips tragen den englischen Regelbegriff. */
function conditionLabel(key: string): string {
  return key
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
