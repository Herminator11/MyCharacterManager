/**
 * Die Regelbegriffe — getrennt von den übrigen Texten der Oberfläche.
 *
 * Diese Trennung ist der Kern der drei Sprachmodi. An deutschen Tischen
 * sagt man oft "AC", "Spell DC" und "Saving Throw", auch wenn sonst
 * deutsch gesprochen wird; die Begriffe stehen so auf den englischen
 * Bögen, aus denen importiert wird, und im SRD. "Deutsch mit englischen
 * Regelbegriffen" ist deshalb keine dritte Übersetzung, sondern deutsche
 * Bedienung (Speichern, Hinzufügen, Übersicht) plus dieses Glossar auf
 * Englisch.
 *
 * Was hier hineingehört: Wörter, die eine Spielregel benennen und die
 * Spieler am Tisch laut sagen. Was nicht: Inhalte aus dem SRD (Zauber-,
 * Klassen-, Zustandsnamen) — die bleiben in jedem Modus englisch, weil es
 * für sie keine frei verwendbare deutsche Fassung gibt.
 *
 * Deutsch nach dem deutschen Spielerhandbuch. Ohne `as const`: die Werte
 * sollen als `string` typisiert sein, damit die englische Fassung
 * denselben Typ erfüllen muss, ohne dieselben Wörter zu enthalten.
 */
export const termsDe = {
  armorClass: "Rüstungsklasse",
  armorClassShort: "RK",
  initiative: "Initiative",
  initiativeShort: "Init.",
  speed: "Bewegung",
  speedShort: "Bew.",
  passivePerception: "Wahrnehmung (passiv)",
  passivePerceptionShort: "Wahrn.",
  passiveInsight: "Motiv erkennen (passiv)",
  proficiencyBonus: "Übungsbonus",
  spellSaveDc: "Zauber-SG",
  /** Mit dem Attributskürzel, aus dem der Bonus stammt: "Zauberangriff (INT)". */
  spellAttack: (ability: string) => `Zauberangriff (${ability})`,
  spellAttackShort: "Zauberangriff",
  experience: "EP",
  hitPoints: "Trefferpunkte",
  hitPointsShort: "TP",
  hitDice: "Trefferwürfel",
  deathSaves: "Todesrettungswürfe",
  deathSave: "Todesrettungswurf",
  savingThrow: "Rettungswurf",
  conditions: "Zustände",
  cantrip: "Zaubertrick",
  cantrips: "Zaubertricks",
  spellLevel: (level: number) => `Grad ${level}`,
  spellSlots: "Zauberplätze",
  pactMagic: "Paktmagie",
  castingTime: "Wirkzeit",
  action: "Aktion",
  bonusAction: "Bonusaktion",
  reaction: "Reaktion",
  longerAction: "Länger",
  inspiration: "Inspiration",
  concentration: "Konzentration",
  concentrationMark: "K",
  ritual: "Ritual",
  ritualMark: "R",
  shortRest: "Kurze Rast",
  longRest: "Lange Rast",
  traits: "Merkmale",
  attunement: "Einstimmung",
  /** Münzen nach dem deutschen Spielerhandbuch — "EP" wäre hier Elektrum
   *  und Erfahrungspunkte zugleich. */
  coins: {
    pp: { short: "PM", name: "Platin" },
    gp: { short: "GM", name: "Gold" },
    ep: { short: "EM", name: "Elektrum" },
    sp: { short: "SM", name: "Silber" },
    cp: { short: "KM", name: "Kupfer" },
  },
  abilities: {
    str: "Stärke",
    dex: "Geschicklichkeit",
    con: "Konstitution",
    int: "Intelligenz",
    wis: "Weisheit",
    cha: "Charisma",
  },
};

export type Terms = typeof termsDe;

export const termsEn: Terms = {
  armorClass: "Armor Class",
  armorClassShort: "AC",
  initiative: "Initiative",
  initiativeShort: "Init",
  speed: "Speed",
  speedShort: "Speed",
  passivePerception: "Passive Perception",
  passivePerceptionShort: "PP",
  passiveInsight: "Passive Insight",
  proficiencyBonus: "Proficiency",
  spellSaveDc: "Spell DC",
  spellAttack: (ability) => `Spell Attack (${ability})`,
  spellAttackShort: "Spell Attack",
  experience: "XP",
  hitPoints: "Hit Points",
  hitPointsShort: "HP",
  hitDice: "Hit Dice",
  deathSaves: "Death Saves",
  deathSave: "Death Save",
  savingThrow: "Saving Throw",
  conditions: "Conditions",
  cantrip: "Cantrip",
  cantrips: "Cantrips",
  spellLevel: (level) => `Level ${level}`,
  spellSlots: "Spell Slots",
  pactMagic: "Pact Magic",
  castingTime: "Casting Time",
  action: "Action",
  bonusAction: "Bonus Action",
  reaction: "Reaction",
  longerAction: "Longer",
  inspiration: "Inspiration",
  concentration: "Concentration",
  concentrationMark: "C",
  ritual: "Ritual",
  ritualMark: "R",
  shortRest: "Short Rest",
  longRest: "Long Rest",
  traits: "Traits",
  attunement: "Attunement",
  coins: {
    pp: { short: "PP", name: "Platinum" },
    gp: { short: "GP", name: "Gold" },
    ep: { short: "EP", name: "Electrum" },
    sp: { short: "SP", name: "Silver" },
    cp: { short: "CP", name: "Copper" },
  },
  abilities: {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma",
  },
};
