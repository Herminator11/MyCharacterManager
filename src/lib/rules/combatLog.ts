import type { CombatLogKind } from "@/db/schema";
import type { LiveLogEntry, LiveMutation, LiveState } from "@/lib/live-types";

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
/**
 * Derselbe Eintrag als Schlüssel mit Werten statt als fertiger Satz.
 *
 * `text`/`detail` bleiben daneben bestehen, auf Deutsch: Einträge aus der
 * Zeit vor dieser Spalte haben nur sie, und ein Satz, der mitgespeichert
 * ist, stimmt auch dann noch, wenn sich eine Übersetzung später ändert.
 * Angezeigt wird aber die Meldung, in der Sprache des Geräts (siehe
 * lib/i18n/log). Namen — Zauber, Ressource, Pool — stehen als Text darin,
 * aus demselben Grund wie in `text`: sie sollen stimmen, auch wenn der
 * Zauber später aus der Liste fliegt.
 */
export type LogMessage =
  | { key: "damage"; params: { amount: number; from: number; to: number; absorbed: number } }
  | { key: "heal"; params: { amount: number; from: number; to: number } }
  | { key: "hpCorrected"; params: { from: number; to: number } }
  | { key: "tempHp"; params: { value: number } }
  | { key: "tempHpGone"; params: Record<string, never> }
  | { key: "hitDie"; params: { die: number; healed: number; from: number; to: number } }
  | { key: "cast"; params: { spell: string; level: number; pool: string; poolAutoKey: string } }
  | { key: "condition"; params: { condition: string; active: boolean } }
  | { key: "concentration"; params: { label: string } }
  | { key: "concentrationLost"; params: { label: string } }
  | { key: "stabilized"; params: Record<string, never> }
  | { key: "died"; params: Record<string, never> }
  | { key: "deathSave"; params: { successes: number; failures: number } }
  | { key: "resource"; params: { name: string; spent: boolean; current: number; max: number } }
  | { key: "inspiration"; params: { gained: boolean } }
  | { key: "shortRest"; params: Record<string, never> }
  | { key: "longRest"; params: Record<string, never> };

export type CombatLogLine = {
  kind: CombatLogKind;
  text: string;
  detail: string;
  message: LogMessage;
  /**
   * Nur bei `kind: "cast"` gesetzt — steuert Kreis (Aktion) oder Dreieck
   * (Bonusaktion/Reaktion) in der Anzeige, statt das Wort im Text zu
   * wiederholen.
   */
  actionCost: ActionCost | null;
  /** Schaden bzw. geheilte HP, sonst 0 — nur für die Zusammenfassung. */
  amount: number;
};

/**
 * Liest die gespeicherte Meldung zurück. Was sich nicht lesen lässt — eine
 * leere Spalte bei alten Einträgen, ein kaputtes JSON —, wird `null`, und
 * die Anzeige fällt auf den gespeicherten Text zurück, statt zu scheitern.
 */
export function parseLogMessage(json: string | null): LogMessage | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as LogMessage;
    return value && typeof value.key === "string" && value.params ? value : null;
  } catch {
    return null;
  }
}

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
          message: {
            key: "damage",
            params: { amount: -amount, from: before.hpCurrent, to: after.hpCurrent, absorbed },
          },
          actionCost: null,
          amount: -amount,
        };
      }
      return {
        kind: "heal",
        text: `${amount} geheilt`,
        detail: range,
        message: {
          key: "heal",
          params: { amount, from: before.hpCurrent, to: after.hpCurrent },
        },
        actionCost: null,
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
        message: { key: "hpCorrected", params: { from: before.hpCurrent, to: after.hpCurrent } },
        actionCost: null,
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
        message:
          after.hpTemp > 0
            ? { key: "tempHp", params: { value: after.hpTemp } }
            : { key: "tempHpGone", params: {} },
        actionCost: null,
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
        message: {
          key: "hitDie",
          params: { die: die?.hitDie ?? 0, healed, from: before.hpCurrent, to: after.hpCurrent },
        },
        actionCost: null,
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
      const detail =
        mutation.level === 0
          ? "Zaubertrick"
          : `Grad ${mutation.level}${pool ? ` · ${pool.name}` : ""}`;

      return {
        kind: "cast",
        text: mutation.spellName || "Zauber gewirkt",
        detail,
        message: {
          key: "cast",
          params: {
            spell: mutation.spellName,
            level: mutation.level,
            pool: pool?.name ?? "",
            poolAutoKey: pool?.autoKey ?? "",
          },
        },
        // "long" (z.B. Rituale mit langer Wirkzeit) bekommt keine eigene
        // Form — die Unterscheidung Aktion/Bonusaktion/Reaktion lohnt sich
        // nur, wenn sie auch ein Zugkonto belastet hat.
        actionCost: mutation.cost === "long" ? null : mutation.cost,
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
        message: {
          key: "condition",
          params: { condition: conditionLabel(mutation.key), active: isActive },
        },
        actionCost: null,
        amount: 0,
      };
    }

    case "concentration.set":
      if (!after.concentration) return null;
      return {
        kind: "state",
        text: `Konzentration: ${after.concentration.label || "aktiv"}`,
        detail: "",
        message: { key: "concentration", params: { label: after.concentration.label } },
        actionCost: null,
        amount: 0,
      };

    case "concentration.clear":
      if (!before.concentration) return null;
      return {
        kind: "state",
        text: "Konzentration verloren",
        detail: before.concentration.label,
        message: { key: "concentrationLost", params: { label: before.concentration.label } },
        actionCost: null,
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
          message: { key: "stabilized", params: {} },
          actionCost: null,
          amount: 0,
        };
      }
      if (after.deathSaveFailures >= 3 && before.deathSaveFailures < 3) {
        return {
          kind: "damage",
          text: "Gestorben",
          detail: "drei Fehlschläge",
          message: { key: "died", params: {} },
          actionCost: null,
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
        message: {
          key: "deathSave",
          params: { successes: after.deathSaveSuccesses, failures: after.deathSaveFailures },
        },
        actionCost: null,
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
        message: {
          key: "resource",
          params: { name: is.name, spent: is.current < was.current, current: is.current, max: is.max },
        },
        actionCost: null,
        amount: 0,
      };
    }

    case "inspiration.set":
      if (after.inspiration === before.inspiration) return null;
      return {
        kind: "resource",
        text: after.inspiration ? "Inspiration erhalten" : "Inspiration eingesetzt",
        detail: "",
        message: { key: "inspiration", params: { gained: after.inspiration } },
        actionCost: null,
        amount: 0,
      };

    case "rest.short":
      return {
        kind: "rest",
        text: "Kurze Rast",
        detail: "",
        message: { key: "shortRest", params: {} },
        actionCost: null,
        amount: 0,
      };

    case "rest.long":
      return {
        kind: "rest",
        text: "Lange Rast",
        detail: "",
        message: { key: "longRest", params: {} },
        actionCost: null,
        amount: 0,
      };

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

/**
 * Nach Runden gruppieren, jüngste zuerst. Der Server liefert schon in
 * dieser Reihenfolge — hier wird nur gebündelt, nicht sortiert.
 *
 * Steht hier statt in `CombatLog.tsx`, weil das eine Client-Komponente ist
 * und Server Components wie das Kampagnen-Log keine Funktionen aus einem
 * "use client"-Modul aufrufen dürfen — auch keine reinen Hilfsfunktionen.
 */
export function groupByRound(log: LiveLogEntry[]): [number, LiveLogEntry[]][] {
  const groups: [number, LiveLogEntry[]][] = [];

  for (const entry of log) {
    const last = groups[groups.length - 1];
    if (last && last[0] === entry.round) last[1].push(entry);
    else groups.push([entry.round, [entry]]);
  }

  return groups;
}

/** 'poisoned' → 'Poisoned'. Die Chips tragen den englischen Regelbegriff. */
function conditionLabel(key: string): string {
  return key
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
