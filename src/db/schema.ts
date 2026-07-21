import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

/* ------------------------------------------------------------------ *
 * Hilfstypen
 * ------------------------------------------------------------------ */

/** Erholungsregel — steuert, was "Kurze Rast" bzw. "Lange Rast" zurücksetzt. */
export type Recovery = "short" | "long" | "none";

/** Woher stammt die Konfiguration: aus der Klassen-Progression oder von Hand? */
export type ConfigSource = "auto" | "manual";

/**
 * Woher ein Katalog-Zauber stammt — entscheidet, wem er gehört.
 *
 * 'srd'      — aus dem Seed. Gehört dem Katalog und wird nie gelöscht.
 * 'custom'   — von Hand über das Zauberformular angelegt. Gehört ebenfalls dem
 *              Katalog: wer ihn tippt, will ihn behalten, auch wenn ihn gerade
 *              kein Charakter führt.
 * 'imported' — beim PDF-Import als Platzhalter angelegt, weil der Bogen einen
 *              Namen nannte, den der Katalog nicht kennt (etwa "Hex", das nur
 *              im PHB steht). Gehört dem Charakter, nicht dem Katalog — fällt
 *              der letzte Nutzer weg, verschwindet auch der Eintrag.
 */
export type SpellSource = "srd" | "custom" | "imported";

/** Wozu ein Notizeintrag da ist — siehe Kommentar an der Spalte `kind`. */
export type NoteKind = "page" | "log" | "pin";

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

const now = sql`(unixepoch())`;

/* ------------------------------------------------------------------ *
 * Charakter
 * ------------------------------------------------------------------ */

export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  race: text("race").notNull().default(""),
  background: text("background").notNull().default(""),
  alignment: text("alignment").notNull().default(""),
  xp: integer("xp").notNull().default(0),
  /**
   * Dateiname des Portraits unter data/portraits/ — nicht der volle Pfad,
   * damit ein Kopieren des data-Ordners auf einen anderen Rechner reicht.
   */
  portraitFile: text("portrait_file").notNull().default(""),

  // Attribute (Basiswerte, Modifikatoren werden abgeleitet)
  str: integer("str").notNull().default(10),
  dex: integer("dex").notNull().default(10),
  con: integer("con").notNull().default(10),
  int: integer("int").notNull().default(10),
  wis: integer("wis").notNull().default(10),
  cha: integer("cha").notNull().default(10),

  // Live-Werte
  hpCurrent: integer("hp_current").notNull().default(0),
  hpTemp: integer("hp_temp").notNull().default(0),
  deathSaveSuccesses: integer("death_save_successes").notNull().default(0),
  deathSaveFailures: integer("death_save_failures").notNull().default(0),
  inspiration: integer("inspiration", { mode: "boolean" })
    .notNull()
    .default(false),

  /**
   * Aktionsökonomie des laufenden Zuges.
   *
   * Die App zählt mit, sie entscheidet nicht: sie weiß nicht, was am Tisch
   * gerade passiert. "Zug beenden" setzt alle vier zurück.
   */
  actionUsed: integer("action_used", { mode: "boolean" })
    .notNull()
    .default(false),
  bonusActionUsed: integer("bonus_action_used", { mode: "boolean" })
    .notNull()
    .default(false),
  reactionUsed: integer("reaction_used", { mode: "boolean" })
    .notNull()
    .default(false),
  /** Schon gegangene Fuß im laufenden Zug. */
  movementUsed: integer("movement_used").notNull().default(0),

  // Abgeleitete Werte — null bedeutet "automatisch berechnen"
  hpMaxOverride: integer("hp_max_override"),
  /**
   * Das HP-Maximum beim letzten Abgleich. Steigt es (Levelaufstieg, besserer
   * CON), wachsen die aktuellen HP um dieselbe Differenz mit — sonst stünde
   * man nach dem Aufstieg als angeschlagen da, ohne Schaden bekommen zu haben.
   */
  hpMaxSeen: integer("hp_max_seen").notNull().default(0),
  acOverride: integer("ac_override"),
  initiativeOverride: integer("initiative_override"),
  passivePerceptionOverride: integer("passive_perception_override"),
  passiveInsightOverride: integer("passive_insight_override"),
  /**
   * Zauber-DC und -Angriffsbonus lassen sich überschreiben, weil magische
   * Foki sie anheben: Kaels Bogen nennt DC 19, aus Attribut und Proficiency
   * ergäben sich 17 — die Differenz kommt von einem Blood Vial +2.
   */
  spellSaveDcOverride: integer("spell_save_dc_override"),
  spellAttackOverride: integer("spell_attack_override"),
  speed: integer("speed").notNull().default(30),

  // Hintergrund (Freitext)
  personality: text("personality").notNull().default(""),
  ideals: text("ideals").notNull().default(""),
  bonds: text("bonds").notNull().default(""),
  flaws: text("flaws").notNull().default(""),
  backstory: text("backstory").notNull().default(""),

  // Geldbeutel
  cp: integer("cp").notNull().default(0),
  sp: integer("sp").notNull().default(0),
  ep: integer("ep").notNull().default(0),
  gp: integer("gp").notNull().default(0),
  pp: integer("pp").notNull().default(0),

  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

/* ------------------------------------------------------------------ *
 * Klassen (Multiclassing)
 * ------------------------------------------------------------------ */

export const characterClasses = sqliteTable(
  "character_classes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    /** SRD-Key wie 'sorcerer' | 'warlock', oder Freitext für Homebrew. */
    classKey: text("class_key").notNull(),
    subclass: text("subclass").notNull().default(""),
    level: integer("level").notNull().default(1),
    /** Trefferwürfel-Größe: 6, 8, 10 oder 12. */
    hitDie: integer("hit_die").notNull().default(8),
    hitDiceUsed: integer("hit_dice_used").notNull().default(0),
    /** Erste Klasse = Ursprungsklasse (relevant für Startproficiencies). */
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_classes_character").on(t.characterId)],
);

/* ------------------------------------------------------------------ *
 * Proficiencies (Rettungswürfe + Fertigkeiten)
 * ------------------------------------------------------------------ */

export const proficiencies = sqliteTable(
  "proficiencies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    /** 'save' → key ist eine Ability; 'skill' → key ist ein Skill-Key. */
    kind: text("kind").$type<"save" | "skill">().notNull(),
    key: text("key").notNull(),
    /** 0 = keine, 1 = proficient, 2 = expertise. */
    level: integer("level").notNull().default(0),
    miscBonus: integer("misc_bonus").notNull().default(0),
  },
  (t) => [
    index("idx_prof_character").on(t.characterId),
    unique("uq_prof").on(t.characterId, t.kind, t.key),
  ],
);

/* ------------------------------------------------------------------ *
 * Zauberplatz-Pools — beliebig viele, voneinander unabhängig
 * ------------------------------------------------------------------ */

export const spellPools = sqliteTable(
  "spell_pools",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /**
     * Stabiler Schlüssel für die Auto-Ableitung ('spellcasting', 'pact-magic').
     * Bei manuell angelegten Pools leer.
     */
    autoKey: text("auto_key").notNull().default(""),
    recovery: text("recovery").$type<Recovery>().notNull().default("long"),
    spellcastingAbility: text("spellcasting_ability")
      .$type<Ability>()
      .notNull()
      .default("int"),
    source: text("source").$type<ConfigSource>().notNull().default("auto"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_pool_character").on(t.characterId)],
);

export const spellPoolSlots = sqliteTable(
  "spell_pool_slots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    poolId: integer("pool_id")
      .notNull()
      .references(() => spellPools.id, { onDelete: "cascade" }),
    /** Zaubergrad 1–9. */
    level: integer("level").notNull(),
    total: integer("total").notNull().default(0),
    used: integer("used").notNull().default(0),
  },
  (t) => [unique("uq_pool_slot").on(t.poolId, t.level)],
);

/* ------------------------------------------------------------------ *
 * Generische Ressourcen (Rage, Ki, Sorcery Points, Channel Divinity …)
 * ------------------------------------------------------------------ */

export const resources = sqliteTable(
  "resources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Stabiler Schlüssel der Auto-Ableitung, z.B. 'sorcerer:sorcery_points'. */
    autoKey: text("auto_key").notNull().default(""),
    current: integer("current").notNull().default(0),
    max: integer("max").notNull().default(0),
    recovery: text("recovery").$type<Recovery>().notNull().default("long"),
    /** 'pips' für wenige Ladungen zum Antippen, 'counter' für große Zahlen. */
    display: text("display").$type<"pips" | "counter">().notNull().default("pips"),
    note: text("note").notNull().default(""),
    source: text("source").$type<ConfigSource>().notNull().default("auto"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_resource_character").on(t.characterId)],
);

/* ------------------------------------------------------------------ *
 * Zauber-Katalog (SRD-geseedet + eigene) und Charakter-Zauberliste
 * ------------------------------------------------------------------ */

export const spells = sqliteTable(
  "spells",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** SRD-Index wie 'misty-step'; bei eigenen Zaubern leer. */
    indexKey: text("index_key").notNull().default(""),
    name: text("name").notNull(),
    /** 0 = Cantrip. */
    level: integer("level").notNull(),
    school: text("school").notNull().default(""),
    castingTime: text("casting_time").notNull().default(""),
    range: text("range").notNull().default(""),
    /** Komponenten als "V,S,M". */
    components: text("components").notNull().default(""),
    material: text("material").notNull().default(""),
    duration: text("duration").notNull().default(""),
    concentration: integer("concentration", { mode: "boolean" })
      .notNull()
      .default(false),
    ritual: integer("ritual", { mode: "boolean" }).notNull().default(false),
    attackType: text("attack_type").notNull().default(""),
    /** Rettungswurf-Attribut, z.B. 'dex'. Leer, wenn kein Save. */
    saveAbility: text("save_ability").notNull().default(""),
    /** 'half' | 'none' | 'other' — Effekt bei bestandenem Save. */
    saveSuccess: text("save_success").notNull().default(""),
    description: text("description").notNull().default(""),
    higherLevel: text("higher_level").notNull().default(""),
    /** JSON: { "3": "8d6", "4": "9d6", … } */
    damageAtSlotLevel: text("damage_at_slot_level").notNull().default(""),
    damageType: text("damage_type").notNull().default(""),
    /** JSON-Array der Klassen-Keys, für die Katalog-Filterung. */
    classes: text("classes").notNull().default("[]"),
    source: text("source").$type<SpellSource>().notNull().default("srd"),
  },
  (t) => [
    unique("uq_spell_index").on(t.indexKey, t.source),
    index("idx_spell_level").on(t.level),
    index("idx_spell_name").on(t.name),
  ],
);

export const characterSpells = sqliteTable(
  "character_spells",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    spellId: integer("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    prepared: integer("prepared", { mode: "boolean" }).notNull().default(false),
    /** Domänen-/Pakt-Zauber: zählen nicht gegen das Vorbereitungslimit. */
    alwaysPrepared: integer("always_prepared", { mode: "boolean" })
      .notNull()
      .default(false),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    /** Bevorzugter Pool im Cast-Dialog; null = keine Vorauswahl. */
    defaultPoolId: integer("default_pool_id").references(() => spellPools.id, {
      onDelete: "set null",
    }),
    notes: text("notes").notNull().default(""),
  },
  (t) => [
    index("idx_cspell_character").on(t.characterId),
    unique("uq_character_spell").on(t.characterId, t.spellId),
  ],
);

/* ------------------------------------------------------------------ *
 * Kampf
 * ------------------------------------------------------------------ */

export const attacks = sqliteTable(
  "attacks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ability: text("ability").$type<Ability>().notNull().default("str"),
    proficient: integer("proficient", { mode: "boolean" })
      .notNull()
      .default(true),
    /** null = aus Ability + Proficiency berechnen. */
    attackBonusOverride: integer("attack_bonus_override"),
    damageDice: text("damage_dice").notNull().default(""),
    damageType: text("damage_type").notNull().default(""),
    /** null = Ability-Modifikator verwenden. */
    damageBonusOverride: integer("damage_bonus_override"),
    range: text("range").notNull().default(""),
    notes: text("notes").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_attack_character").on(t.characterId)],
);

/* ------------------------------------------------------------------ *
 * Ausrüstung
 * ------------------------------------------------------------------ */

export const inventoryItems = sqliteTable(
  "inventory_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    qty: integer("qty").notNull().default(1),
    /** Gewicht pro Stück in Pfund. */
    weight: real("weight").notNull().default(0),
    /** Wert pro Stück in Kupfer, damit die Summe ganzzahlig bleibt. */
    valueCp: integer("value_cp").notNull().default(0),
    equipped: integer("equipped", { mode: "boolean" }).notNull().default(false),
    /**
     * Eingestimmt. Getrennt von `equipped`, weil beides unabhängig ist: man
     * kann einen Umhang tragen, ohne auf ihn eingestimmt zu sein. Drei
     * gleichzeitig sind das Limit — die App zählt, sperrt aber nicht.
     */
    attuned: integer("attuned", { mode: "boolean" }).notNull().default(false),
    /** Braucht der Gegenstand überhaupt Einstimmung? Sonst kein Häkchen. */
    requiresAttunement: integer("requires_attunement", { mode: "boolean" })
      .notNull()
      .default(false),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_item_character").on(t.characterId)],
);

/* ------------------------------------------------------------------ *
 * Conditions
 * ------------------------------------------------------------------ */

export const srdConditions = sqliteTable("srd_conditions", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const activeConditions = sqliteTable(
  "active_conditions",
  {
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    conditionKey: text("condition_key")
      .notNull()
      .references(() => srdConditions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.conditionKey] })],
);

/* ------------------------------------------------------------------ *
 * Konzentration — maximal eine Zeile pro Charakter
 * ------------------------------------------------------------------ */

export const concentration = sqliteTable("concentration", {
  characterId: integer("character_id")
    .primaryKey()
    .references(() => characters.id, { onDelete: "cascade" }),
  spellId: integer("spell_id").references(() => spells.id, {
    onDelete: "cascade",
  }),
  /** Freitext, falls die Konzentration nicht von einem Listen-Zauber kommt. */
  label: text("label").notNull().default(""),
  /** Grad, mit dem gewirkt wurde (für Upcast-Erinnerung). */
  castAtLevel: integer("cast_at_level").notNull().default(0),
  startedAt: integer("started_at").notNull().default(now),
});

/* ------------------------------------------------------------------ *
 * Notizen
 * ------------------------------------------------------------------ */

export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Neue Notiz"),
    body: text("body").notNull().default(""),
    /**
     * Wozu der Eintrag da ist — drei Dinge mit sehr verschiedenem Lebenslauf:
     *
     * `page` — ausformulierte Seite, wird überarbeitet.
     * `log`  — was passiert ist. Chronologisch, wächst an, darf ins Archiv.
     * `pin`  — was gerade gilt: Fluch, Pakt, Segen. Muss sichtbar sein,
     *          nicht auffindbar, und steht deshalb auf der Charakterseite.
     */
    kind: text("kind").$type<NoteKind>().notNull().default("page"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [index("idx_note_character").on(t.characterId)],
);

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

export const charactersRelations = relations(characters, ({ many, one }) => ({
  classes: many(characterClasses),
  proficiencies: many(proficiencies),
  spellPools: many(spellPools),
  resources: many(resources),
  spells: many(characterSpells),
  attacks: many(attacks),
  inventory: many(inventoryItems),
  conditions: many(activeConditions),
  notes: many(notes),
  concentration: one(concentration),
}));

export const characterClassesRelations = relations(
  characterClasses,
  ({ one }) => ({
    character: one(characters, {
      fields: [characterClasses.characterId],
      references: [characters.id],
    }),
  }),
);

export const spellPoolsRelations = relations(spellPools, ({ one, many }) => ({
  character: one(characters, {
    fields: [spellPools.characterId],
    references: [characters.id],
  }),
  slots: many(spellPoolSlots),
}));

export const spellPoolSlotsRelations = relations(spellPoolSlots, ({ one }) => ({
  pool: one(spellPools, {
    fields: [spellPoolSlots.poolId],
    references: [spellPools.id],
  }),
}));

export const characterSpellsRelations = relations(
  characterSpells,
  ({ one }) => ({
    character: one(characters, {
      fields: [characterSpells.characterId],
      references: [characters.id],
    }),
    spell: one(spells, {
      fields: [characterSpells.spellId],
      references: [spells.id],
    }),
  }),
);

export const activeConditionsRelations = relations(
  activeConditions,
  ({ one }) => ({
    condition: one(srdConditions, {
      fields: [activeConditions.conditionKey],
      references: [srdConditions.key],
    }),
  }),
);

export const concentrationRelations = relations(concentration, ({ one }) => ({
  spell: one(spells, {
    fields: [concentration.spellId],
    references: [spells.id],
  }),
}));

/* ------------------------------------------------------------------ *
 * Abgeleitete Typen
 * ------------------------------------------------------------------ */

export type Character = typeof characters.$inferSelect;
export type CharacterClass = typeof characterClasses.$inferSelect;
export type Proficiency = typeof proficiencies.$inferSelect;
export type SpellPool = typeof spellPools.$inferSelect;
export type SpellPoolSlot = typeof spellPoolSlots.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Spell = typeof spells.$inferSelect;
export type CharacterSpell = typeof characterSpells.$inferSelect;
export type Attack = typeof attacks.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type SrdCondition = typeof srdConditions.$inferSelect;
export type Note = typeof notes.$inferSelect;
