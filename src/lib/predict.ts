import type { LiveMutation, LiveState } from "./live-types";
import { isSlotCost } from "./rules/actions";
import { applyHpDelta, setHp } from "./rules/hp";

/** Ein unverbrauchter Zug. */
const FRESH_TURN = {
  action: false,
  bonus: false,
  reaction: false,
} as const;

/**
 * Sagt vorher, wie der Live-Zustand nach einer Aktion aussehen wird.
 *
 * Läuft im Browser, damit ein Tipper sofort sichtbar wird, statt erst nach
 * der Serverantwort. Der Server bleibt die Wahrheit — seine Antwort ersetzt
 * die Vorhersage wenige Millisekunden später. Die Vorhersage darf also
 * daneben liegen, ohne dass Daten kaputtgehen; sie soll nur nicht flackern.
 *
 * Die kniffligen Regeln (temporäre HP, Death Saves) teilt sie sich mit dem
 * Server über `rules/hp`.
 */
export function predict(state: LiveState, mutation: LiveMutation): LiveState {
  switch (mutation.type) {
    case "hp.delta":
      return withHp(
        state,
        applyHpDelta(state, state.hpMax, mutation.amount),
        mutation.amount < 0,
      );

    case "hp.set":
      return withHp(state, setHp(state, state.hpMax, mutation.value));

    case "hp.temp":
      return { ...state, hpTemp: Math.max(0, Math.round(mutation.value)) };

    case "death.set": {
      const successes = clamp(mutation.successes, 0, 3);
      const stable = successes >= 3;
      return {
        ...state,
        deathSaveSuccesses: stable ? 0 : successes,
        deathSaveFailures: stable ? 0 : clamp(mutation.failures, 0, 3),
        stabilized: stable,
      };
    }

    case "inspiration.set":
      return { ...state, inspiration: mutation.value };

    case "hitdice.set":
      return {
        ...state,
        hitDice: state.hitDice.map((entry) =>
          entry.classId === mutation.classId
            ? { ...entry, used: clamp(mutation.used, 0, entry.total) }
            : entry,
        ),
      };

    case "hitdice.spend": {
      const entry = state.hitDice.find((h) => h.classId === mutation.classId);
      if (!entry || entry.used >= entry.total) return state;

      const healed = Math.max(0, Math.round(mutation.roll) + state.conModifier);
      return withHp(
        {
          ...state,
          hitDice: state.hitDice.map((h) =>
            h.classId === mutation.classId ? { ...h, used: h.used + 1 } : h,
          ),
        },
        applyHpDelta(state, state.hpMax, healed),
      );
    }

    case "turn.set":
      return { ...state, turn: { ...state.turn, [mutation.slot]: mutation.used } };

    case "turn.end":
      return {
        ...state,
        turn: { ...FRESH_TURN },
        round: state.round > 0 ? state.round + 1 : 0,
      };

    // Die Log-Zeilen selbst sagt der Browser bewusst nicht vorher: sie
    // entstehen aus dem Vergleich zweier Serverzustände und wären hier nur
    // geraten. Sie erscheinen mit der Serverantwort — Millisekunden später,
    // und niemand tippt zweimal hintereinander auf dieselbe Zeile.
    case "battle.start":
      return { ...state, round: 1, turn: { ...FRESH_TURN }, log: [] };

    case "battle.end":
      return { ...state, round: 0, turn: { ...FRESH_TURN } };

    case "slot.set":
      return mapSlot(state, mutation.poolId, mutation.level, (slot) => ({
        ...slot,
        used: clamp(mutation.used, 0, slot.total),
      }));

    case "resource.set":
      return {
        ...state,
        resources: state.resources.map((resource) =>
          resource.id === mutation.resourceId
            ? {
                ...resource,
                current: clamp(mutation.current, 0, resource.max),
              }
            : resource,
        ),
      };

    case "condition.set":
      return {
        ...state,
        conditions: mutation.active
          ? Array.from(new Set([...state.conditions, mutation.key]))
          : state.conditions.filter((key) => key !== mutation.key),
      };

    case "concentration.set":
      return {
        ...state,
        concentration: {
          spellId: mutation.spellId,
          label: mutation.label,
          castAtLevel: mutation.castAtLevel,
        },
      };

    case "concentration.clear":
      return { ...state, concentration: null };

    case "cast": {
      let next = state;

      if (mutation.poolId !== null && mutation.level > 0) {
        const slot = findSlot(state, mutation.poolId, mutation.level);
        // Kein freier Slot: der Server lehnt ab, also auch hier nichts tun.
        if (!slot || slot.used >= slot.total) return state;

        next = mapSlot(next, mutation.poolId, mutation.level, (s) => ({
          ...s,
          used: s.used + 1,
        }));
      }

      if (mutation.concentration) {
        next = {
          ...next,
          concentration: {
            spellId: mutation.spellId,
            label: mutation.spellName,
            castAtLevel: mutation.level,
          },
        };
      }

      if (isSlotCost(mutation.cost)) {
        next = { ...next, turn: { ...next.turn, [mutation.cost]: true } };
      }

      return next;
    }

    case "rest.short":
      return rest(state, "short");

    case "rest.long":
      return rest(state, "long");
  }
}

/* ------------------------------------------------------------------ *
 * Hilfsfunktionen
 * ------------------------------------------------------------------ */

function withHp(
  state: LiveState,
  change: { hpCurrent: number; hpTemp: number; clearDeathSaves: boolean },
  damage = false,
): LiveState {
  // Spiegelt `changeHp` im Server: Schaden bei 0 HP beendet die
  // Stabilisierung, Heilung über 0 setzt alles zurück.
  const tookDamage =
    damage || change.hpCurrent < state.hpCurrent || change.hpTemp < state.hpTemp;

  return {
    ...state,
    hpCurrent: change.hpCurrent,
    hpTemp: change.hpTemp,
    ...(change.clearDeathSaves
      ? { deathSaveSuccesses: 0, deathSaveFailures: 0, stabilized: false }
      : tookDamage
        ? { stabilized: false }
        : {}),
  };
}

function findSlot(state: LiveState, poolId: number, level: number) {
  return state.pools
    .find((pool) => pool.id === poolId)
    ?.slots.find((slot) => slot.level === level);
}

function mapSlot(
  state: LiveState,
  poolId: number,
  level: number,
  update: (slot: LiveState["pools"][number]["slots"][number]) => LiveState["pools"][number]["slots"][number],
): LiveState {
  return {
    ...state,
    pools: state.pools.map((pool) =>
      pool.id === poolId
        ? {
            ...pool,
            slots: pool.slots.map((slot) =>
              slot.level === level ? update(slot) : slot,
            ),
          }
        : pool,
    ),
  };
}

/** Spiegelt `rest()` aus dem Server-Modul. */
function rest(state: LiveState, kind: "short" | "long"): LiveState {
  const recovers = (recovery: string) =>
    kind === "long" ? recovery === "short" || recovery === "long" : recovery === "short";

  const next: LiveState = {
    ...state,
    turn: { ...FRESH_TURN },
    pools: state.pools.map((pool) =>
      recovers(pool.recovery)
        ? { ...pool, slots: pool.slots.map((slot) => ({ ...slot, used: 0 })) }
        : pool,
    ),
    resources: state.resources.map((resource) =>
      recovers(resource.recovery)
        ? { ...resource, current: resource.max }
        : resource,
    ),
  };

  if (kind === "short") return next;

  return {
    ...next,
    hpCurrent: next.hpMax,
    hpTemp: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    stabilized: false,
    concentration: null,
    hitDice: next.hitDice.map((entry) => ({
      ...entry,
      used: Math.max(0, entry.used - Math.max(1, Math.floor(entry.total / 2))),
    })),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}
