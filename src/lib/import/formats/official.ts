import { ABILITIES, type Ability } from "@/db/schema";
import { SKILLS } from "@/lib/rules/skills";

import SPELL_LAYOUT from "../official-spell-layout.json";
import {
  checked,
  clean,
  noteDerivedHitDice,
  noteMissingExpertise,
  number,
  parseClassLevelString,
  text,
} from "../fields";
import type { FieldMap, ImportedCharacter, ImportedSpell } from "../types";

/**
 * Der offizielle Bogen von Wizards of the Coast — das Format, das Aurora
 * und die meisten anderen Generatoren ausgeben.
 *
 * Besonderheit: die Proficiency-Kästchen heißen dort nur „Check Box 11“ bis
 * „Check Box 40“, ohne jede Semantik. Welche Nummer zu welchem Wurf gehört,
 * wurde aus der Geometrie des Originalbogens bestimmt (Kästchen bei x≈101,
 * zugehöriges Wertefeld bei x≈112 auf derselben Zeile) und ist in
 * `official-sheet-geometry.json` festgehalten, damit ein Test die Zuordnung
 * nachprüfen kann statt sie zu glauben.
 */

/** Kästchen der Rettungswürfe, von oben nach unten auf dem Bogen. */
const SAVE_CHECKBOXES: Record<Ability, string> = {
  str: "Check Box 11",
  dex: "Check Box 18",
  con: "Check Box 19",
  int: "Check Box 20",
  wis: "Check Box 21",
  cha: "Check Box 22",
};

/**
 * Kästchen der Fertigkeiten: „Check Box 23“ bis „Check Box 40“, alphabetisch
 * wie auf dem Bogen. Unsere SKILLS-Liste ist ebenfalls alphabetisch, deshalb
 * genügt der Index.
 */
const FIRST_SKILL_CHECKBOX = 23;

const skillCheckbox = (index: number) =>
  `Check Box ${FIRST_SKILL_CHECKBOX + index}`;

const DEATH_SAVE_SUCCESS = ["Check Box 12", "Check Box 13", "Check Box 14"];
const DEATH_SAVE_FAILURE = ["Check Box 15", "Check Box 16", "Check Box 17"];

/** Erkennt den offiziellen Bogen an Feldern, die es nur dort gibt. */
export function isOfficialSheet(fields: FieldMap): boolean {
  return (
    "ClassLevel" in fields && "ProfBonus" in fields && "Check Box 11" in fields
  );
}

export function parseOfficialSheet(fields: FieldMap): ImportedCharacter {
  const warnings: string[] = [];

  /* --- Attribute --- */

  const scores = {} as Record<Ability, number>;
  for (const ability of ABILITIES) {
    const key = ability.toUpperCase();
    const value = number(fields, key);
    if (value === null) {
      warnings.push(
        `Der Attributwert für ${key} fehlt im Bogen; ich habe 10 eingesetzt.`,
      );
    }
    scores[ability] = value ?? 10;
  }

  const saves = {} as Record<Ability, number>;
  for (const ability of ABILITIES) {
    saves[ability] = checked(fields, SAVE_CHECKBOXES[ability]) ? 1 : 0;
  }

  const skills: Record<string, number> = {};
  SKILLS.forEach((skill, index) => {
    // Der offizielle Bogen kennt keine Expertise — daher nur 0 oder 1.
    skills[skill.key] = checked(fields, skillCheckbox(index)) ? 1 : 0;
  });

  /* --- Klassen --- */

  const classLevel = text(fields, "ClassLevel");
  const classes = classLevel ? parseClassLevelString(classLevel, warnings) : [];

  if (classes.length === 0) {
    warnings.push(
      "Im Bogen steht keine Klasse. Ohne Klasse gibt es keine Zauberplätze und keine Trefferwürfel — bitte unten ergänzen.",
    );
  }

  noteDerivedHitDice(classes, text(fields, "HD"), warnings);
  noteMissingExpertise(classes, warnings);

  /* --- Angriffe --- */

  // Die nachgestellten Leerzeichen sind kein Tippfehler: der offizielle
  // Bogen hat sie tatsächlich in den Feldnamen, bei Wpn3 sogar zwei.
  const attacks = [
    { name: "Wpn Name", bonus: "Wpn1 AtkBonus", damage: "Wpn1 Damage" },
    { name: "Wpn Name 2", bonus: "Wpn2 AtkBonus ", damage: "Wpn2 Damage " },
    { name: "Wpn Name 3", bonus: "Wpn3 AtkBonus  ", damage: "Wpn3 Damage " },
  ]
    .map((slot) => ({
      name: text(fields, slot.name),
      attackBonus: number(fields, slot.bonus),
      damage: text(fields, slot.damage),
      range: "",
      notes: "",
    }))
    .filter((attack) => attack.name.length > 0);

  if (attacks.length === 0) {
    warnings.push(
      "Im Bogen stand keine Waffe. Angriffe lassen sich später unter „Angriffe“ nachtragen.",
    );
  }

  /* --- Zauber --- */

  const spells: ImportedSpell[] = [];
  for (const [level, fieldNames] of Object.entries(
    SPELL_LAYOUT as Record<string, string[]>,
  )) {
    for (const fieldName of fieldNames) {
      const name = text(fields, fieldName);
      if (name) spells.push({ name, level: Number(level) });
    }
  }

  /* --- Todesrettungswürfe --- */

  const deathSuccesses = DEATH_SAVE_SUCCESS.filter((key) =>
    checked(fields, key),
  ).length;
  const deathFailures = DEATH_SAVE_FAILURE.filter((key) =>
    checked(fields, key),
  ).length;

  if (deathSuccesses > 0 || deathFailures > 0) {
    warnings.push(
      `Im Bogen sind Death Saves angekreuzt (${deathSuccesses} Erfolge, ${deathFailures} Fehlschläge). Die gelten nur für einen laufenden Kampf und werden nicht übernommen.`,
    );
  }

  /* --- Notizen --- */

  const notes: { title: string; body: string }[] = [];

  const features = clean(text(fields, "Feat+Traits"));
  if (features) notes.push({ title: "Merkmale & Fähigkeiten", body: features });

  const proficiencies = clean(text(fields, "ProficienciesLang"));
  if (proficiencies) {
    notes.push({ title: "Übungen & Sprachen", body: proficiencies });
  }

  const attacksNote = clean(text(fields, "AttacksSpellcasting"));
  if (attacksNote) {
    notes.push({ title: "Angriffe & Zauberwirken", body: attacksNote });
  }

  const allies = clean(text(fields, "Allies"));
  const faction = clean(text(fields, "FactionName"));
  if (allies || faction) {
    notes.push({
      title: "Verbündete & Organisationen",
      body: [faction ? `**${faction}**` : "", allies].filter(Boolean).join("\n\n"),
    });
  }

  /* --- Ausrüstung --- */

  const items: { name: string; description: string }[] = [];
  for (const line of clean(text(fields, "Equipment")).split("\n")) {
    const name = line.trim();
    if (name) items.push({ name, description: "" });
  }

  const treasure = clean(text(fields, "Treasure"));
  if (treasure) {
    for (const line of treasure.split("\n")) {
      const name = line.trim();
      if (name) items.push({ name, description: "Schatz" });
    }
  }

  /* --- Trefferpunkte --- */

  const maxHp = number(fields, "HPMax");
  const currentHp = number(fields, "HPCurrent");
  if (currentHp === null && maxHp !== null) {
    warnings.push(
      "Die aktuellen Trefferpunkte waren leer; der Charakter startet mit vollen HP.",
    );
  }

  return {
    format: "official",

    name: text(fields, "CharacterName") || "Namenlos",
    // Auch hier ein nachgestelltes Leerzeichen im Originalfeld.
    race: text(fields, "Race "),
    background: text(fields, "Background"),
    alignment: text(fields, "Alignment"),
    xp: number(fields, "XP") ?? 0,

    scores,
    saves,
    skills,
    classes,

    acOverride: number(fields, "AC"),
    initiativeOverride: number(fields, "Initiative"),
    speed: number(fields, "Speed") ?? 30,
    passivePerceptionOverride: number(fields, "Passive"),
    passiveInsightOverride: null,
    // Achtung: das Feld heißt im Original mit zwei Leerzeichen.
    spellSaveDcOverride: number(fields, "SpellSaveDC  2"),
    spellAttackOverride: number(fields, "SpellAtkBonus 2"),

    hpMaxOverride: maxHp,
    hpCurrent: currentHp,
    hpTemp: number(fields, "HPTemp") ?? 0,
    inspiration: text(fields, "Inspiration").length > 0,

    attacks,
    // Der offizielle Bogen hat kein Feld für Klassenressourcen; die leitet
    // die App ohnehin aus Klasse und Level ab.
    resources: [],
    spells,

    currency: {
      cp: number(fields, "CP") ?? 0,
      sp: number(fields, "SP") ?? 0,
      ep: number(fields, "EP") ?? 0,
      gp: number(fields, "GP") ?? 0,
      pp: number(fields, "PP") ?? 0,
    },
    items,

    personality: clean(text(fields, "PersonalityTraits ")),
    ideals: clean(text(fields, "Ideals")),
    bonds: clean(text(fields, "Bonds")),
    flaws: clean(text(fields, "Flaws")),
    backstory: clean(text(fields, "Backstory")),

    notes,
    warnings,
  };
}
