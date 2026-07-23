import { ABILITIES, type Ability } from "@/db/schema";
import { SKILLS } from "@/lib/rules/skills";

import {
  buildClass,
  checked,
  clean,
  noteDerivedHitDice,
  number,
  text,
} from "../fields";
import type {
  FieldMap,
  ImportedAttack,
  ImportedCharacter,
  ImportedResource,
} from "../types";

/**
 * Das erweiterte Bogenformat mit den Präfixen `Front_` und `Back_`.
 *
 * Gegenüber dem offiziellen Bogen hat es benannte Proficiency-Kästchen,
 * eigene Kästchen für Expertise und getrennte Felder für Zauberangriffe —
 * dadurch lässt sich daraus mehr übernehmen.
 */

/** Erkennt das Format an seinen charakteristischen Feldern. */
export function isCustomSheet(fields: FieldMap): boolean {
  return "Front_Character Name" in fields && "Front_Class Name" in fields;
}

const SAVE_FIELD: Record<Ability, string> = {
  str: "Front_Save Str",
  dex: "Front_Save Dex",
  con: "Front_Save Con",
  int: "Front_Save Int",
  wis: "Front_Save Wis",
  cha: "Front_Save Cha",
};

const SCORE_FIELD: Record<Ability, string> = {
  str: "Front_Str Score",
  dex: "Front_Dex Score",
  con: "Front_Con Score",
  int: "Front_Int Score",
  wis: "Front_Wis Score",
  cha: "Front_Cha Score",
};

export function parseCustomSheet(fields: FieldMap): ImportedCharacter {
  const warnings: string[] = [];

  /* --- Attribute und Proficiencies --- */

  const scores = {} as Record<Ability, number>;
  for (const ability of ABILITIES) {
    const value = number(fields, SCORE_FIELD[ability]);
    if (value === null) {
      warnings.push(
        `Der Attributwert für ${ability.toUpperCase()} fehlt im Bogen; ich habe 10 eingesetzt.`,
      );
    }
    scores[ability] = value ?? 10;
  }

  const saves = {} as Record<Ability, number>;
  for (const ability of ABILITIES) {
    saves[ability] = checked(fields, SAVE_FIELD[ability]) ? 1 : 0;
  }

  const skills: Record<string, number> = {};
  for (const skill of SKILLS) {
    const proficient = checked(fields, `Front_Proficiency ${skill.name}`);
    const expertise = checked(fields, `Front_Expertise ${skill.name}`);
    skills[skill.key] = expertise ? 2 : proficient ? 1 : 0;
  }

  /* --- Klassen --- */

  const rawClasses = text(fields, "Front_Class Name");
  const archetype = text(fields, "Front_Archetype");

  const classes = rawClasses
    ? rawClasses
        .split(/[/,]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((rawName, index) => {
          const level = number(fields, `Front_Level ${index + 1}`);
          if (level === null) {
            warnings.push(
              `Für „${rawName}“ stand kein Level im Bogen; ich habe 1 eingesetzt.`,
            );
          }
          // Der Bogen hat nur ein Archetyp-Feld; bei Multiclass gehört es
          // zur erstgenannten Klasse.
          return buildClass(
            rawName,
            level ?? 1,
            index === 0 ? archetype : "",
            warnings,
          );
        })
    : [];

  if (classes.length === 0) {
    warnings.push(
      "Im Bogen steht keine Klasse. Ohne Klasse gibt es keine Zauberplätze und keine Trefferwürfel — bitte unten ergänzen.",
    );
  }

  noteDerivedHitDice(classes, text(fields, "Front_Total Hit Dice"), warnings);

  /* --- Angriffe --- */

  const attacks: ImportedAttack[] = [];

  for (const slot of [1, 2, 3]) {
    const name = text(fields, `Front_Weapon Name ${slot}`);
    if (!name) continue;
    attacks.push({
      name,
      attackBonus: number(fields, `Front_Weapon Atk Bonus ${slot}`),
      damage: text(fields, `Front_Weapon Damage ${slot}`),
      range: "",
      notes: "",
    });
  }

  // Zauberangriffe stehen im Bogen getrennt von den Waffen, sind aber
  // dasselbe: etwas, womit man im Kampf angreift.
  const spellAttackBonus = number(fields, "Front_Spell Atk");
  for (const slot of [1, 2, 3, 4, 5]) {
    const name = text(fields, `Front_Spell Attack Name ${slot}`);
    if (!name) continue;
    attacks.push({
      name,
      attackBonus: spellAttackBonus,
      damage: text(fields, `Front_Spell Effect ${slot}`),
      range: text(fields, `Front_Spell Range ${slot}`),
      notes: [
        text(fields, `Front_Spell Casting Time ${slot}`),
        text(fields, `Front_Spell Save ${slot}`),
        checked(fields, `Front_Spell Concentration ${slot}`)
          ? "Konzentration"
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  if (attacks.length === 0) {
    warnings.push(
      "Im Bogen stand keine Waffe und kein Zauberangriff. Angriffe lassen sich später unter „Angriffe“ nachtragen.",
    );
  }

  /* --- Ressourcen --- */

  const resources: ImportedResource[] = [];

  const mainResource = text(fields, "Front_Resource Name");
  if (mainResource) {
    resources.push({
      name: mainResource,
      total: number(fields, "Front_Resource Total") ?? 0,
      used: number(fields, "Front_Resource Used") ?? 0,
    });
  }

  for (const slot of [1, 2, 3]) {
    const name = text(fields, `Front_Other Value ${slot} Name`);
    const value = number(fields, `Front_Other Value ${slot}`);
    if (!name || value === null) continue;
    resources.push({ name, total: value, used: 0 });
  }

  /* --- Notizen --- */

  const features: { name: string; description: string }[] = [];
  for (let slot = 1; slot <= 10; slot++) {
    const name = text(fields, `Front_Feature Name ${slot}`);
    const body = text(fields, `Front_Feature ${slot}`);
    // Unbenutzte Zeilen tragen im Bogen den Platzhalter "FEATURE".
    if (!body || name.toUpperCase() === "FEATURE") continue;
    const level = text(fields, `Front_Level Value ${slot}`);
    features.push({
      name: level ? `${name} (Stufe ${level})` : name,
      description: clean(body),
    });
  }

  const notes: { title: string; body: string }[] = [];

  const extraTraits = text(fields, "Back_Additional Features & Traits");
  const racialTraits = text(fields, "Front_Racial Traits");
  const languages = text(fields, "Front_Languages");
  if (extraTraits || racialTraits || languages) {
    notes.push({
      title: "Merkmale & Sprachen",
      body: [
        racialTraits ? `**Rassenmerkmale:** ${clean(racialTraits)}` : "",
        languages ? `**Sprachen:** ${languages}` : "",
        extraTraits ? clean(extraTraits) : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  /* --- Ausrüstung --- */

  const items: { name: string; description: string }[] = [];
  for (let slot = 1; slot <= 12; slot++) {
    const key = String(slot).padStart(2, "0");
    const name = text(fields, `Back_Item Name ${key}`);
    if (!name) continue;
    items.push({
      name,
      description: clean(text(fields, `Back_Item Effect ${key}`)),
    });
  }

  // Der Rucksack ist ein Freitextfeld mit je einem Gegenstand pro Zeile.
  for (const line of clean(text(fields, "Back_Backpack")).split("\n")) {
    const name = line.trim();
    if (name) items.push({ name, description: "" });
  }

  /* --- Zauberplätze und Trefferpunkte --- */

  const usedSlots = Object.keys(fields).filter(
    (key) => key.startsWith("Front_Spell Slot ") && fields[key] === true,
  ).length;

  if (usedSlots > 0) {
    warnings.push(
      `Im Bogen sind ${usedSlots} Zauberplätze als verbraucht markiert. Welcher Pool gemeint ist, geht daraus nicht hervor — der Import startet deshalb mit vollen Plätzen.`,
    );
  }

  const maxHp = number(fields, "Front_Max HP");
  const currentHp = number(fields, "Front_Current HP");
  if (currentHp === null && maxHp !== null) {
    warnings.push(
      "Die aktuellen Trefferpunkte waren leer; der Charakter startet mit vollen HP.",
    );
  }

  return {
    format: "custom",

    name: text(fields, "Front_Character Name") || "Namenlos",
    race: text(fields, "Front_Race"),
    background: text(fields, "Front_Background"),
    alignment: text(fields, "Front_Alignment"),
    xp: number(fields, "Front_XP") ?? 0,

    scores,
    saves,
    skills,
    classes,

    acOverride: number(fields, "Front_AC"),
    initiativeOverride: number(fields, "Front_Initiative"),
    speed: number(fields, "Front_Speed") ?? 30,
    passivePerceptionOverride: number(fields, "Front_Passive Perception"),
    passiveInsightOverride: number(fields, "Front_Passive Insight"),
    spellSaveDcOverride: number(fields, "Front_Spell DC"),
    spellAttackOverride: number(fields, "Front_Spell Atk"),

    hpMaxOverride: maxHp,
    hpCurrent: currentHp,
    hpTemp: number(fields, "Front_Temp HP") ?? 0,
    inspiration: text(fields, "Front_Inspiration").length > 0,

    attacks,
    resources,
    // Dieses Format listet Zauber nicht in einzelnen Feldern auf.
    spells: [],

    currency: {
      cp: number(fields, "Back_CP") ?? 0,
      sp: number(fields, "Back_SP") ?? 0,
      ep: number(fields, "Back_EP") ?? 0,
      gp: number(fields, "Back_GP") ?? 0,
      pp: number(fields, "Back_PP") ?? 0,
    },
    items,

    personality: clean(text(fields, "Back_Personality Traits")),
    ideals: clean(text(fields, "Back_Ideals")),
    bonds: clean(text(fields, "Back_Bonds")),
    flaws: clean(text(fields, "Back_Flaws")),
    backstory: clean(text(fields, "Back_Background")),

    notes,
    features,
    warnings,
  };
}
