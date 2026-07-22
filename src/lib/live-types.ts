import type { Recovery } from "@/db/schema";
import type { ActionCost, ActionSlot } from "@/lib/rules/actions";

/**
 * Der Teil des Charakters, der sich mitten im Kampf ständig ändert.
 *
 * Bewusst getrennt vom restlichen Charakterbogen: dieses Objekt wird bei
 * jeder Änderung komplett an alle verbundenen Geräte gesendet. Es ist klein
 * genug (unter 2 KB), dass sich Patches und deren Merge-Fehler nicht lohnen.
 *
 * Enthält keine Imports aus `@/db` — die Datei wird auch im Browser geladen.
 */

export type LiveHitDice = {
  classId: number;
  classKey: string;
  hitDie: number;
  total: number;
  used: number;
};

export type LiveSlot = {
  level: number;
  total: number;
  used: number;
};

export type LivePool = {
  id: number;
  name: string;
  recovery: Recovery;
  slots: LiveSlot[];
};

export type LiveResource = {
  id: number;
  name: string;
  current: number;
  max: number;
  recovery: Recovery;
  display: "pips" | "counter";
  note: string;
};

/**
 * Die drei Konten eines Zuges. Bewegung fehlt mit Absicht: sie Fuß für
 * Fuß nachzutippen wäre Buchhaltung, keine Hilfe.
 */
export type LiveTurn = {
  action: boolean;
  bonus: boolean;
  reaction: boolean;
};

export type LiveConcentration = {
  spellId: number | null;
  label: string;
  castAtLevel: number;
};

export type LiveState = {
  characterId: number;
  hpCurrent: number;
  hpTemp: number;
  hpMax: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  inspiration: boolean;
  hitDice: LiveHitDice[];
  /** CON-Modifikator — geht in jeden ausgegebenen Trefferwürfel ein. */
  conModifier: number;
  turn: LiveTurn;
  pools: LivePool[];
  resources: LiveResource[];
  /** Keys der aktiven Conditions. */
  conditions: string[];
  concentration: LiveConcentration | null;
  /** Steigt bei jeder Änderung — erkennt veraltete Antworten. */
  rev: number;
};

/**
 * Alle Aktionen, die den Live-State ändern können.
 *
 * Absolute Werte statt Deltas, wo es geht: wenn zwei Geräte gleichzeitig
 * tippen, ist "setze auf 3" vorhersehbar, "ziehe 1 ab" nicht. Nur bei HP
 * ist das Delta die ehrlichere Beschreibung — dort zählt, wie viel Schaden
 * eingesteckt wurde, und temporäre HP müssen zuerst aufgezehrt werden.
 */
export type LiveMutation =
  | { type: "hp.delta"; amount: number }
  | { type: "hp.set"; value: number }
  | { type: "hp.temp"; value: number }
  | { type: "death.set"; successes: number; failures: number }
  | { type: "inspiration.set"; value: boolean }
  | { type: "hitdice.set"; classId: number; used: number }
  /**
   * Trefferwürfel ausgeben und dafür heilen. `roll` ist das, was der Spieler
   * tatsächlich gewürfelt hat — die App würfelt bewusst nicht selbst; der
   * CON-Modifikator kommt serverseitig dazu.
   */
  | { type: "hitdice.spend"; classId: number; roll: number }
  | { type: "turn.set"; slot: ActionSlot; used: boolean }
  | { type: "turn.end" }
  | { type: "slot.set"; poolId: number; level: number; used: number }
  | { type: "resource.set"; resourceId: number; current: number }
  | { type: "condition.set"; key: string; active: boolean }
  | {
      type: "concentration.set";
      spellId: number | null;
      label: string;
      castAtLevel: number;
    }
  | { type: "concentration.clear" }
  | {
      type: "cast";
      /** null = Cantrip oder Zauber ohne Slot-Verbrauch. */
      poolId: number | null;
      level: number;
      spellId: number | null;
      spellName: string;
      concentration: boolean;
      /**
       * Was das Wirken im Zug kostet, aus der Wirkzeit abgeleitet. Der Slot
       * hakt sich dadurch beim Wirken von selbst ab — sonst müsste man
       * jeden Zauber zweimal buchen und würde es beim zweiten Mal vergessen.
       */
      cost: ActionCost;
    }
  | { type: "rest.short" }
  | { type: "rest.long" };
