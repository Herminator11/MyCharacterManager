/**
 * Texte der Bedienung — alles, was keine Spielregel benennt.
 *
 * Bisher nur die Bereiche, die schon umgestellt sind (Reiterleiste,
 * Kopfleiste, Profilkopf, Sprachwahl). Der Rest der App folgt Bereich für
 * Bereich; bis dahin stehen dort die deutschen Texte wie gehabt im
 * Komponentencode.
 *
 * Gruppiert nach Ort in der App, nicht nach Wortart: wer einen Bereich
 * umstellt, findet alle seine Texte an einer Stelle.
 */
export const uiDe = {
  tabs: {
    overview: "Übersicht",
    spells: "Zauber",
    attacks: "Angriffe",
    inventory: "Gepäck",
    sheet: "Bogen",
    notes: "Notizen",
    label: "Charakter-Reiter",
  },
  header: {
    noClass: "Ohne Klasse",
    home: "Zur Charakterliste",
  },
  profile: {
    pin: "Vermerk",
    pinAdd: "Vermerk anlegen",
    pinTooltip: "Vermerk anlegen — was ab jetzt für dich gilt",
    pinTitlePlaceholder: "Woran musst du denken?",
    pinBodyPlaceholder: "Was bewirkt es? (optional)",
    pinBodyLabel: "Wirkung des Vermerks",
    pinSubmit: "Anheften",
    inspirationOn: "Inspiration vorhanden — antippen zum Ausgeben",
    inspirationOff: "Keine Inspiration",
    inspirationSpend: "Inspiration ausgeben",
    inspirationGain: "Inspiration erhalten",
  },
  language: {
    label: "Sprache",
    hint: "Gilt nur für dieses Gerät.",
  },
};

export type Ui = typeof uiDe;

export const uiEn: Ui = {
  tabs: {
    overview: "Overview",
    spells: "Spells",
    attacks: "Attacks",
    inventory: "Gear",
    sheet: "Sheet",
    notes: "Notes",
    label: "Character tabs",
  },
  header: {
    noClass: "No class",
    home: "Back to characters",
  },
  profile: {
    pin: "Note",
    pinAdd: "Add note",
    pinTooltip: "Add a note — what applies to you from now on",
    pinTitlePlaceholder: "What do you need to remember?",
    pinBodyPlaceholder: "What does it do? (optional)",
    pinBodyLabel: "Effect of the note",
    pinSubmit: "Pin",
    inspirationOn: "You have inspiration — tap to spend it",
    inspirationOff: "No inspiration",
    inspirationSpend: "Spend inspiration",
    inspirationGain: "Gain inspiration",
  },
  language: {
    label: "Language",
    hint: "Applies to this device only.",
  },
};
