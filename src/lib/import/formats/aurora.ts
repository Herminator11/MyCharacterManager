import { ABILITIES, type Ability } from "@/db/schema";
import { SKILLS } from "@/lib/rules/skills";

import {
  buildClass,
  checked,
  clean,
  noteDerivedHitDice,
  number,
  resolveClassKey,
  text,
} from "../fields";
import type {
  FieldMap,
  ImportedAttack,
  ImportedCharacter,
  ImportedClass,
  ImportedSpell,
} from "../types";

/**
 * Auroras eigener, ausfüllbarer Charakterbogen — das Format mit den
 * `details_`-, `equipment_page_`-, `spellcasting_`- und `card_`-Feldern.
 *
 * Nicht zu verwechseln mit dem offiziellen WOTC-Bogen (`formats/official`),
 * den Aurora ebenfalls ausgeben kann: dieser hier ist Auroras hauseigenes
 * Layout in der Fassung, die pro Wert ein eigenes Formularfeld trägt. Genau
 * das macht ihn zur ergiebigsten der drei Quellen — jeder Wert steht benannt
 * da, nichts muss aus der Geometrie erraten werden.
 *
 * Zwei Fallstricke, teuer erkannt und deshalb hier vermerkt:
 *
 * 1. `details_<attr>_score` und `details_<attr>_modifier` sind vertauscht:
 *    unter `_score` steht der Modifikator (z. B. „-1“), unter `_modifier` der
 *    eigentliche Attributwert (z. B. „8“). Der Attributwert kommt deshalb aus
 *    `_modifier`.
 *
 * 2. Klasse, Rasse und Level stehen nur zusammengefasst in `details_build`
 *    („Level 5 Custom Lineage Wizard, School of Necromancy“). Es gibt keine
 *    Einzelfelder dafür — siehe `parseBuild`.
 */

const SCORE_FIELD: Record<Ability, string> = {
  str: "details_str_modifier",
  dex: "details_dex_modifier",
  con: "details_con_modifier",
  int: "details_int_modifier",
  wis: "details_wis_modifier",
  cha: "details_cha_modifier",
};

const SAVE_FIELD: Record<Ability, string> = {
  str: "details_str_save_proficiency",
  dex: "details_dex_save_proficiency",
  con: "details_con_save_proficiency",
  int: "details_int_save_proficiency",
  wis: "details_wis_save_proficiency",
  cha: "details_cha_save_proficiency",
};

/** Feldkürzel einer Fertigkeit: Name klein, ohne Leer- und Sonderzeichen. */
const skillToken = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

/** Erkennt das Format an Feldern, die es nur hier gibt. */
export function isAuroraSheet(fields: FieldMap): boolean {
  return "details_build" in fields && "details_character_name" in fields;
}

export function parseAuroraSheet(fields: FieldMap): ImportedCharacter {
  const warnings: string[] = [];

  /* --- Attribute --- */

  const scores = {} as Record<Ability, number>;
  for (const ability of ABILITIES) {
    // Achtung: der eigentliche Wert steht im _modifier-Feld (siehe oben).
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
    const token = skillToken(skill.name);
    const proficient = checked(fields, `details_${token}_proficiency`);
    const expertise = checked(fields, `details_${token}_expertise`);
    skills[skill.key] = expertise ? 2 : proficient ? 1 : 0;
  }

  /* --- Klassen und Rasse --- */

  const { race, classes } = parseBuild(text(fields, "details_build"), warnings);

  if (classes.length === 0) {
    warnings.push(
      "Im Bogen steht keine Klasse. Ohne Klasse gibt es keine Zauberplätze und keine Trefferwürfel — bitte unten ergänzen.",
    );
  }

  noteDerivedHitDice(classes, text(fields, "details_hd"), warnings);

  /* --- Angriffe --- */

  const attacks: ImportedAttack[] = [];
  for (const slot of [1, 2, 3, 4]) {
    const name = text(fields, `details_attack${slot}_weapon`);
    if (!name) continue;
    attacks.push({
      name,
      attackBonus: number(fields, `details_attack${slot}_attack`),
      damage: text(fields, `details_attack${slot}_damage`),
      range: text(fields, `details_attack${slot}_range`),
      notes: text(fields, `details_attack${slot}_description`),
    });
  }

  if (attacks.length === 0) {
    warnings.push(
      "Im Bogen stand keine Waffe. Angriffe lassen sich später unter „Angriffe“ nachtragen.",
    );
  }

  /* --- Zauber --- */

  const spells = collectSpells(fields);

  const usedSlots = Object.keys(fields).filter(
    (key) => /^slot\d/.test(key) && fields[key] === true,
  ).length;
  if (usedSlots > 0) {
    warnings.push(
      `Im Bogen sind ${usedSlots} Zauberplätze als verbraucht markiert. Welcher Pool gemeint ist, geht daraus nicht hervor — der Import startet deshalb mit vollen Plätzen.`,
    );
  }

  /* --- Todesrettungswürfe --- */

  const deathChecked = Object.keys(fields).filter(
    (key) => key.startsWith("details_death_save_") && fields[key] === true,
  ).length;
  if (deathChecked > 0) {
    warnings.push(
      "Im Bogen sind Death Saves angekreuzt. Die gelten nur für einen laufenden Kampf und werden nicht übernommen.",
    );
  }

  /* --- Notizen --- */

  const notes: { title: string; body: string }[] = [];

  const features = collectFeatures(fields);
  if (features) notes.push({ title: "Merkmale & Fähigkeiten", body: features });

  const looks = describeAppearance(fields);
  if (looks) notes.push({ title: "Äußeres", body: looks });

  /* --- Ausrüstung --- */

  const items = collectItems(fields);

  /* --- Trefferpunkte --- */

  const maxHp = number(fields, "details_hp_max");
  const currentHp = number(fields, "details_hp_current");
  if (currentHp === null && maxHp !== null) {
    warnings.push(
      "Die aktuellen Trefferpunkte waren leer; der Charakter startet mit vollen HP.",
    );
  }

  return {
    format: "aurora",

    name: text(fields, "details_character_name") || "Namenlos",
    race,
    background: text(fields, "details_background"),
    alignment: text(fields, "details_alignment"),
    xp: number(fields, "details_xp") ?? 0,

    scores,
    saves,
    skills,
    classes,

    acOverride: number(fields, "details_armor_class"),
    initiativeOverride: number(fields, "details_initiative"),
    speed: number(fields, "details_speed_walking") ?? 30,
    passivePerceptionOverride: number(fields, "details_passive_perception_total"),
    passiveInsightOverride: null,
    spellSaveDcOverride: primarySpellStat(fields, "save"),
    spellAttackOverride: primarySpellStat(fields, "bonus"),

    hpMaxOverride: maxHp,
    hpCurrent: currentHp,
    hpTemp: number(fields, "details_hp_temp") ?? 0,
    inspiration: text(fields, "details_inspiration").length > 0,

    attacks,
    // Ressourcen leitet die App aus Klasse und Level ab; der Bogen hat dafür
    // kein eigenes Feld.
    resources: [],
    spells,

    currency: {
      cp: number(fields, "equipment_page_coins_cp") ?? 0,
      sp: number(fields, "equipment_page_coins_sp") ?? 0,
      ep: number(fields, "equipment_page_coins_ep") ?? 0,
      gp: number(fields, "equipment_page_coins_gp") ?? 0,
      pp: number(fields, "equipment_page_coins_pp") ?? 0,
    },
    items,

    // Dieses Format hat keine eigenen Felder für Persönlichkeit, Ideale,
    // Bindungen und Makel — nur die Hintergrundgeschichte.
    personality: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: clean(text(fields, "background_story")),

    notes,
    warnings,
  };
}

/* ------------------------------------------------------------------ *
 * details_build zerlegen
 * ------------------------------------------------------------------ */

/**
 * „Level 5 Custom Lineage Wizard, School of Necromancy“ in Rasse, Klasse,
 * Level und Subklasse zerlegen.
 *
 * Die Klasse ist das am weitesten rechts stehende Wort vor dem Komma, das
 * eine bekannte Klasse benennt — alles davor ist die Rasse (kann mehrere
 * Wörter haben: „Custom Lineage“, „Hill Dwarf“), alles nach dem Komma die
 * Subklasse. Von rechts gesucht, damit ein klassenähnliches Wort im
 * Rassennamen nicht fälschlich die Klasse wird.
 */
function parseBuild(
  build: string,
  warnings: string[],
): { race: string; classes: ImportedClass[] } {
  const match = build.match(/^level\s+(\d+)\s+(.+)$/i);
  if (!match) {
    if (build.trim()) {
      warnings.push(
        `Die Zeile „${build}“ ließ sich nicht in Rasse, Klasse und Level zerlegen — bitte unten prüfen.`,
      );
    }
    return { race: "", classes: [] };
  }

  const level = Number(match[1]);
  const [classPartRaw, ...subclassParts] = match[2].split(/,\s*/);
  const subclass = subclassParts.join(", ").trim();

  const tokens = classPartRaw.trim().split(/\s+/);
  let classIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (resolveClassKey(tokens[i])) {
      classIndex = i;
      break;
    }
  }

  if (classIndex === -1) {
    // Keine bekannte Klasse gefunden: den ganzen Rest als Klassennamen
    // melden (buildClass hängt die Warnung an), Rasse bleibt leer.
    return {
      race: "",
      classes: [buildClass(classPartRaw.trim(), level, subclass, warnings)],
    };
  }

  const race = tokens.slice(0, classIndex).join(" ");
  const className = tokens[classIndex];
  return {
    race,
    classes: [buildClass(className, level, subclass, warnings)],
  };
}

/* ------------------------------------------------------------------ *
 * Zauber, Ausrüstung, Merkmale
 * ------------------------------------------------------------------ */

/**
 * Zaubernamen aus `spells_<grad>:<index>_:<liste>:1` sammeln.
 *
 * Der Grad ist die erste Zahl im Feldnamen (0 = Cantrip). Eine nachgestellte
 * Quellenangabe in Klammern — „Inflict Wounds (Shadow Touched)“ — wird
 * abgeschnitten, damit der Name im Katalog gefunden wird; sie beschreibt die
 * Herkunft, nicht den Zauber.
 */
function collectSpells(fields: FieldMap): ImportedSpell[] {
  const spells: ImportedSpell[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const match = key.match(/^spells_(\d+):\d+_:/);
    if (!match || typeof value !== "string") continue;
    const name = value.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (name) spells.push({ name, level: Number(match[1]) });
  }
  return spells;
}

/**
 * Gegenstände aus der Ausrüstungsseite: erst die gewöhnliche Ausrüstung,
 * dann die magischen Gegenstände. Deren Art und Quelle stehen in den
 * „card“-Feldern (Abschnitt 4) und werden als Beschreibung übernommen.
 */
function collectItems(fields: FieldMap): { name: string; description: string }[] {
  const items: { name: string; description: string }[] = [];

  for (let i = 0; i < 40; i++) {
    const name = text(fields, `equipment_page_gear_name.${i}`);
    if (name) items.push({ name, description: "" });
  }

  const cards = collectCards(fields, 4);
  const cardByTitle = new Map(
    cards.map((card) => [
      card.title.toLowerCase(),
      [card.subtitle, card.footerRight].filter(Boolean).join(" · "),
    ]),
  );

  for (let i = 0; i < 20; i++) {
    const name = text(fields, `equipment_page_magic_gear_name.${i}`);
    if (!name) continue;
    items.push({ name, description: cardByTitle.get(name.toLowerCase()) ?? "" });
  }

  return items;
}

/**
 * Merkmale stehen als „cards“ (Abschnitt 5): Titel, Untertitel und Herkunft,
 * aber ohne Wirkungstext — den trägt der Bogen nur in der druckbaren Ebene,
 * nicht als Formularfeld. Der Hintergrund steuert sein eigenes Merkmal bei.
 */
function collectFeatures(fields: FieldMap): string {
  const lines = collectCards(fields, 5).map((card) => {
    const source = card.footerLeft ? ` (${card.footerLeft})` : "";
    return `- **${card.title}** — ${card.subtitle}${source}`;
  });

  const backgroundFeature = text(fields, "background_feature_name");
  const background = text(fields, "details_background");
  if (backgroundFeature) {
    const from = background ? ` (${background})` : "";
    lines.push(`- **${backgroundFeature}** — Hintergrundmerkmal${from}`);
  }

  return lines.join("\n");
}

type Card = {
  title: string;
  subtitle: string;
  footerLeft: string;
  footerRight: string;
};

/** Liest die „card“-Blöcke eines Abschnitts, aufsteigend nach Index. */
function collectCards(fields: FieldMap, section: number): Card[] {
  const indices = Object.keys(fields)
    .map((key) => key.match(new RegExp(`^card_title_${section}:(\\d+)$`)))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);

  return indices
    .map((i) => ({
      title: text(fields, `card_title_${section}:${i}`),
      subtitle: text(fields, `card_subtitle_${section}:${i}`),
      footerLeft: text(fields, `card_footer_left_${section}:${i}`),
      footerRight: text(fields, `card_footer_right_${section}:${i}`),
    }))
    .filter((card) => card.title.length > 0);
}

/** Äußeres, soweit der Bogen etwas hergibt — jede gefüllte Zeile einzeln. */
function describeAppearance(fields: FieldMap): string {
  const rows: [string, string][] = [
    ["Geschlecht", text(fields, "background_gender")],
    ["Alter", text(fields, "background_age")],
    ["Größe", text(fields, "background_height")],
    ["Gewicht", text(fields, "background_weight")],
    ["Augen", text(fields, "background_eyes")],
    ["Haut", text(fields, "background_skin")],
    ["Haare", text(fields, "background_hair")],
  ];

  return rows
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

/**
 * Zauber-DC bzw. -Angriffsbonus der ersten echten Zauberklasse. Die
 * Sammelzeile „Other Spells“ trägt keine eigenen Werte und wird übersprungen.
 */
function primarySpellStat(
  fields: FieldMap,
  kind: "save" | "bonus",
): number | null {
  for (const [key, value] of Object.entries(fields)) {
    if (!key.startsWith(`spellcasting_${kind}:`)) continue;
    if (key.includes(":Other Spells:")) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    const parsed = number(fields, key);
    if (parsed !== null) return parsed;
  }
  return null;
}
