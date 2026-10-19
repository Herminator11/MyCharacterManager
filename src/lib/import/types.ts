import type { Ability } from "@/db/schema";

/** Rohe Formularfelder eines PDFs: Textfelder als String, Kästchen als Boolean. */
export type FieldMap = Record<string, string | boolean>;

export type SheetFormat = "official" | "custom" | "aurora";

/**
 * Ein Hinweis des Imports als Schlüssel mit Werten statt als Satz. Der
 * Parser läuft auf dem Server ohne Wissen um die Sprache des Geräts; den
 * Satz bildet erst die Prüfansicht (lib/i18n/importWarnings).
 */
export type ImportWarning =
  | { key: "unknownClass"; params: { name: string } }
  | { key: "missingLevel"; params: { name: string } }
  | { key: "derivedHitDice"; params: { dice: string } }
  | { key: "missingExpertise"; params: { classes: string[] } }
  | { key: "missingScore"; params: { ability: string } }
  | { key: "noClass"; params: Record<string, never> }
  | { key: "noWeapon"; params: Record<string, never> }
  | { key: "noWeaponOrSpellAttack"; params: Record<string, never> }
  | { key: "usedSlots"; params: { count: number } }
  | { key: "deathSaves"; params: Record<string, never> }
  | { key: "deathSavesCounted"; params: { successes: number; failures: number } }
  | { key: "emptyCurrentHp"; params: Record<string, never> }
  | { key: "unparsedClassLine"; params: { line: string } };

export type ImportedClass = {
  classKey: string;
  /** Name so, wie er im Bogen steht — für unbekannte Klassen. */
  rawName: string;
  level: number;
  subclass: string;
  hitDie: number;
  known: boolean;
};

export type ImportedAttack = {
  name: string;
  attackBonus: number | null;
  damage: string;
  range: string;
  notes: string;
};

export type ImportedResource = {
  name: string;
  total: number;
  used: number;
};

/** Ein Zauber aus dem Bogen, noch nicht mit dem Katalog abgeglichen. */
export type ImportedSpell = {
  name: string;
  level: number;
};

export type ImportedCharacter = {
  format: SheetFormat;

  name: string;
  race: string;
  background: string;
  alignment: string;
  xp: number;

  scores: Record<Ability, number>;
  /** 0 = keine, 1 = proficient, 2 = Expertise. */
  saves: Record<Ability, number>;
  skills: Record<string, number>;

  classes: ImportedClass[];

  acOverride: number | null;
  initiativeOverride: number | null;
  speed: number;
  passivePerceptionOverride: number | null;
  passiveInsightOverride: number | null;
  spellSaveDcOverride: number | null;
  spellAttackOverride: number | null;

  hpMaxOverride: number | null;
  hpCurrent: number | null;
  hpTemp: number;
  inspiration: boolean;

  attacks: ImportedAttack[];
  resources: ImportedResource[];
  spells: ImportedSpell[];

  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  items: { name: string; description: string }[];

  /** Größe, Gewicht, Augen-, Haut- und Haarfarbe — soweit der Bogen sie hergibt. */
  appearance: string;
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;

  /** Klassenmerkmale, Rassenmerkmale, Feats — landet im Bogen, nicht bei den Notizen. */
  features: { name: string; description: string }[];

  /** Was der Bogen nicht hergab oder was Aufmerksamkeit braucht. */
  warnings: ImportWarning[];
};
