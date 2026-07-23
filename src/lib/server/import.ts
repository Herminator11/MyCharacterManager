import "server-only";

import { eq } from "drizzle-orm";

import { db, sqlite } from "@/db";
import {
  attacks,
  characterClasses,
  characters,
  characterSpells,
  inventoryItems,
  notes,
  proficiencies,
  resources,
  spells,
  type Ability,
} from "@/db/schema";
import type { ImportedCharacter } from "@/lib/import/parseSheet";

import { getLiveState, refreshDerived } from "./characters";
import { findSpeciesByName } from "./species";

/**
 * Legt aus einem bestätigten Entwurf einen Charakter an.
 *
 * Läuft in einer Transaktion: ein halb importierter Charakter wäre
 * schlimmer als gar keiner, weil man ihm nicht ansieht, was fehlt.
 */
export function importCharacter(draft: ImportedCharacter): number {
  const create = sqlite.transaction(() => {
    const id = db
      .insert(characters)
      .values({
        name: draft.name,
        race: draft.race,
        // Der Bogen nennt nur einen Text. Trifft er eine Spezies im Katalog,
        // wird sie verknüpft — sonst bleibt es beim Text. Geraten wird
        // nicht: eine falsche Spezies behauptete Boni, die der Charakter
        // nie hatte, und die Werte auf dem Bogen sind bereits Endwerte.
        speciesKey: findSpeciesByName(draft.race)?.key ?? "",
        background: draft.background,
        alignment: draft.alignment,
        xp: draft.xp,

        str: draft.scores.str,
        dex: draft.scores.dex,
        con: draft.scores.con,
        int: draft.scores.int,
        wis: draft.scores.wis,
        cha: draft.scores.cha,

        acOverride: draft.acOverride,
        initiativeOverride: draft.initiativeOverride,
        speed: draft.speed,
        passivePerceptionOverride: draft.passivePerceptionOverride,
        passiveInsightOverride: draft.passiveInsightOverride,
        spellSaveDcOverride: draft.spellSaveDcOverride,
        spellAttackOverride: draft.spellAttackOverride,
        hpMaxOverride: draft.hpMaxOverride,
        hpTemp: draft.hpTemp,
        inspiration: draft.inspiration,

        cp: draft.currency.cp,
        sp: draft.currency.sp,
        ep: draft.currency.ep,
        gp: draft.currency.gp,
        pp: draft.currency.pp,

        personality: draft.personality,
        ideals: draft.ideals,
        bonds: draft.bonds,
        flaws: draft.flaws,
        backstory: draft.backstory,
      })
      .returning({ id: characters.id })
      .get().id;

    draft.classes
      .filter((entry) => entry.classKey)
      .forEach((entry, index) => {
        db.insert(characterClasses)
          .values({
            characterId: id,
            classKey: entry.classKey,
            subclass: entry.subclass,
            level: entry.level,
            hitDie: entry.hitDie,
            isPrimary: index === 0,
            sortOrder: index,
          })
          .run();
      });

    for (const [ability, level] of Object.entries(draft.saves)) {
      if (level > 0) {
        db.insert(proficiencies)
          .values({
            characterId: id,
            kind: "save",
            key: ability as Ability,
            level,
          })
          .run();
      }
    }

    for (const [skill, level] of Object.entries(draft.skills)) {
      if (level > 0) {
        db.insert(proficiencies)
          .values({ characterId: id, kind: "skill", key: skill, level })
          .run();
      }
    }

    draft.attacks.forEach((attack, index) => {
      db.insert(attacks)
        .values({
          characterId: id,
          name: attack.name,
          // Der Bogen nennt den fertigen Bonus, ohne zu verraten, aus
          // welchem Attribut er stammt — deshalb als Override übernehmen.
          attackBonusOverride: attack.attackBonus,
          damageDice: attack.damage,
          range: attack.range,
          notes: attack.notes,
          proficient: true,
          sortOrder: index,
        })
        .run();
    });

    draft.items.forEach((item, index) => {
      db.insert(inventoryItems)
        .values({
          characterId: id,
          name: item.name,
          description: item.description,
          sortOrder: index,
        })
        .run();
    });

    draft.notes.forEach((note) => {
      db.insert(notes)
        .values({ characterId: id, title: note.title, body: note.body })
        .run();
    });

    draft.features.forEach((feature) => {
      db.insert(notes)
        .values({
          characterId: id,
          kind: "feature",
          title: feature.name,
          body: feature.description,
        })
        .run();
    });

    linkSpellsFromCatalog(id, draft);

    // Erst jetzt ableiten: Zauberplätze und Klassenressourcen brauchen die
    // Klassen, und die HP-Logik braucht das Maximum.
    refreshDerived(id);

    addUncoveredResources(id, draft);

    if (draft.hpCurrent !== null) {
      const live = getLiveState(id);
      db.update(characters)
        .set({
          hpCurrent: Math.min(Math.max(draft.hpCurrent, 0), live?.hpMax ?? 0),
        })
        .where(eq(characters.id, id))
        .run();
    }

    return id;
  });

  return create();
}

/**
 * Verknüpft die Zaubernamen aus dem Bogen mit dem SRD-Katalog.
 *
 * Nur exakte Namenstreffer (Groß-/Kleinschreibung egal). Ein Zauber, den
 * der Katalog nicht kennt — Homebrew oder eine Quelle außerhalb des SRD —
 * wird als eigener Eintrag angelegt, damit er nicht stillschweigend
 * verschwindet. Der Grad steht ja im Bogen.
 *
 * Solche Platzhalter bekommen source='imported' und nicht 'custom': sie sind
 * ein Nebenprodukt des Imports, kein bewusst gepflegter Katalogeintrag.
 * Verliert einer seinen letzten Nutzer, räumt `pruneImportedSpells` ihn weg.
 */
export function linkSpellsFromCatalog(characterId: number, draft: ImportedCharacter) {
  if (draft.spells.length === 0) return;

  const catalog = new Map(
    db
      .select({ id: spells.id, name: spells.name })
      .from(spells)
      .all()
      .map((row) => [row.name.toLowerCase(), row.id]),
  );

  for (const entry of draft.spells) {
    let spellId = catalog.get(entry.name.toLowerCase());

    if (!spellId) {
      spellId = db
        .insert(spells)
        .values({
          indexKey: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: entry.name,
          level: entry.level,
          description:
            "Aus einem Charakterbogen übernommen — Beschreibung nachtragen.",
          source: "imported",
        })
        .returning({ id: spells.id })
        .get().id;
      catalog.set(entry.name.toLowerCase(), spellId);
    }

    db.insert(characterSpells)
      .values({
        characterId,
        spellId,
        // Wer den Zauber auf dem Bogen stehen hat, hat ihn vorbereitet.
        prepared: true,
      })
      .onConflictDoNothing()
      .run();
  }
}

/**
 * Ressourcen aus dem Bogen ergänzen — aber nur die, die nicht ohnehin aus
 * der Klasse abgeleitet wurden. Sonst stünden „Sorcery Points“ zweimal da,
 * einmal berechnet und einmal abgeschrieben.
 */
function addUncoveredResources(
  characterId: number,
  draft: ImportedCharacter,
) {
  const existing = db
    .select({ name: resources.name })
    .from(resources)
    .where(eq(resources.characterId, characterId))
    .all()
    .map((row) => row.name.toLowerCase());

  draft.resources
    .filter((resource) => !existing.includes(resource.name.toLowerCase()))
    .forEach((resource, index) => {
      db.insert(resources)
        .values({
          characterId,
          name: resource.name,
          current: Math.max(resource.total - resource.used, 0),
          max: resource.total,
          recovery: "long",
          display: resource.total > 8 ? "counter" : "pips",
          note: "aus dem Bogen übernommen",
          source: "manual",
          sortOrder: 100 + index,
        })
        .run();
    });
}
