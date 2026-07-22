# Projektkontext

Kurzfassung für den nächsten Worktree: was diese App ist, wie sie denkt,
was zuletzt passiert ist und wo die Fallstricke liegen. Das README
beschreibt die App aus Sicht des Benutzers — hier steht, was man wissen
muss, bevor man Code anfasst.

Stand: 22. Juli 2026, Commit `752fb88`, 283 Tests in 16 Dateien, 106
Quelldateien.

---

## 1. Worum es geht

Ein selbst gehostetes Live-Dashboard für die eigenen D&D-5e-Charaktere.
Läuft auf dem Mac des Besitzers, das Handy kommt per LAN-IP dazu. Kein
Login, keine Cloud, kein Internet nötig.

**Der Maßstab ist der Spieltisch**: einhändig, bei schlechtem Licht, neben
einem Würfelbecher. HP ändern und einen Zauberplatz verbrauchen sind je
ein Tipper.

**Was die App nicht tut** — jedes Mal eine bewusste Entscheidung, keine
Lücke:

- Sie **würfelt nicht**. Trefferwürfel gibt man aus, indem man einträgt,
  was der echte Würfel zeigt; den CON-Modifikator zählt sie dazu.
- Sie **sperrt nicht**. Kein freier Zauberplatz? Der Knopf wird blass,
  bleibt aber tippbar — sie weiß nichts von Action Surge oder DM-Ausnahmen.
- Sie **rechnet keine Regeln aus, die vom Gegner abhängen**. Conditions
  sind Merkzettel mit Regeltext, sie verändern keinen Wurf.
- Sie **ist kein Regelwerk**. Aurora entscheidet beim Import, die App führt
  mit.

Sie zählt, sie entscheidet nicht.

---

## 2. Betrieb

```bash
npm run setup     # einmalig: Migrationen + SRD-Seed
npm run dev       # nur dieser Rechner
npm run lan       # 0.0.0.0, gibt die LAN-URL aus
npm test          # Vitest
npm run typecheck # next typegen + tsc --noEmit
npm run db:generate && npm run db:migrate   # nach Schemaänderung
```

Daten: `data/app.db` (SQLite, nicht in der Versionskontrolle).
`data/srd/` **ist** eingecheckt, damit die App ohne Netz startet.

---

## 3. Architektur

**Stack:** Next.js 16 (App Router, async `params`, `PageProps<>`-Typen aus
`next typegen`) · React 19 · SQLite via better-sqlite3 + Drizzle ·
Tailwind v4. Ein Node-Prozess, keine externen Dienste.

> Achtung: Next.js 16 weicht an vielen Stellen von älteren Versionen ab.
> `node_modules/next/dist/docs/` ist die Quelle, nicht das Gedächtnis.

### Die zentrale Naht: Live-State vs. Sheet-Data

| | Live-State | Sheet-Data |
|---|---|---|
| Was | HP, Temp-HP, Death Saves, Zauberplätze, Ressourcen, Conditions, Konzentration, Zug, Runde, Kampflog | Name, Attribute, Fertigkeiten, Inventar, Zauberliste, Notizen |
| Wann | ständig, mitten im Kampf | selten, zwischen Sessions |
| Weg | Client → `POST /api/live/[id]/mutate` → SSE-Broadcast | Server Action + `revalidatePath` |

Der komplette Live-State (< 2 KB) geht bei **jeder** Änderung an alle
Geräte — Patches lohnen sich nicht, Merge-Bugs schon gar nicht.

Drei Dateien, die zusammenpassen müssen:

- `src/lib/live-types.ts` — `LiveState` und `LiveMutation`. Kein
  `@/db`-Runtime-Import, die Datei läuft im Browser.
- `src/lib/server/live.ts` — `applyMutation`, autoritativ, in einer
  Transaktion.
- `src/lib/predict.ts` — dieselbe Semantik im Browser für die sofortige
  Anzeige. **Läuft sie auseinander, flackert die Anzeige.**

Die kniffligen Regeln teilen sich beide über `src/lib/rules/hp.ts`.

`src/lib/live-context.tsx` hält **einen** `useLiveState` für die ganze
Seite. Ohne ihn öffnet jede Komponente ihren eigenen SSE-Stream.

### Weitere Regelmodule (`src/lib/rules/`, alle rein und getestet)

- `derive.ts` — Modifikatoren, Saves, AC, Passives, Zauber-DC
- `multiclass.ts` — kombinierter Caster-Level; **Warlock ist ausgenommen**
- `hp.ts` — Schaden/Heilung/Temp-HP + `deathStatus()`
- `actions.ts` — `parseActionCost()` aus der Wirkzeit
- `combatLog.ts` — `describeMutation(mutation, before, after)` → Satz
- `progression.generated.ts` — aus dem SRD-Seed erzeugt, nicht von Hand

### Zauberplätze sind Pools

`spell_pools` + `spell_pool_slots`: beliebig viele unabhängige Pools mit
eigener Erholungsregel. Sorlock = „Zauberplätze" (lange Rast) + „Pact
Magic" (kurze Rast), beide bieten Grad 2 an, der Cast-Dialog fragt. Nichts
ist auf Warlock hartcodiert.

---

## 4. Gestaltung

Tokens in `src/app/globals.css` („Instrumententafel"): matte Graphitflächen,
**Patina** (grün) = verfügbar, **Ember** (rotorange) = HP und Gefahr,
**Brass** (messing) = Aufmerksamkeit, **Arcane** (hellblau) = Magie.
Signaturelement ist der Sockel (`.socket`) für alles Verbrauchbare.

**Alle Icons liegen in `src/components/icons.tsx`** — Inline-SVG,
`currentColor`, 24er-Raster. Sie werden bei 14–24 px gelesen; was dabei
zum Fleck zerfällt, ist Dekoration. (Der Schuh brauchte zwei Anläufe, die
Klinge steht senkrecht, weil sie diagonal wie ein Pfeil aussah.)

**Formensprache aus Baldur's Gate**, bewusst übernommen:
grüner Kreis = Aktion, oranges Dreieck = Bonusaktion, messingfarbene Raute
= Reaktion (die BG3 selbst nicht zeichnet), hellblaue Quadrate mit
römischer Ziffer = Zauberplätze. Volle Form = frei, Umriss = verbraucht.
Dieselbe Marke sitzt in der Zugleiste **und** am Zauberknopf; beide kommen
aus `ActionShape`, damit sie nicht auseinanderlaufen.

Sprache: **deutsche UI, englische Spielbegriffe** (Saving Throw, Poisoned,
Pact Magic). Bearbeiten-Modi heißen überall **„Edit"** mit Stift
(`EditToggle`) — Ausnahme: das AC-Schild trägt keinen Stift, damit die
Silhouette die einzige Form bleibt, die man aus zwei Metern findet.

---

## 5. Was in dieser Sitzung entstand

Chronologisch, jüngste zuerst:

| Commit | Was |
|---|---|
| `752fb88` | BG3-Formensprache: Kreis/Dreieck/Raute, blaue Slots mit römischer Ziffer |
| `0f1cedb` | Kopfleiste zeigt Werte erst ohne Profilkopf; **stabil** und **tot** bei 0 HP |
| `7b760bd` | Kein Stift am AC-Schild |
| `a2b023b` | Icons: Reiterleiste, Rast, Würfel, Totenkopf, 15 Conditions, gekreuzte Klingen |
| `fae9e48` | Vermerk-Zettel in den Profilkopf; Herz, Einschlag, Plus, Schuh, W20 |
| `71e5419` | AC im Schild änderbar (leer = wieder berechnen) |
| `37ed4ac` | „Edit" + Stift überall |
| `712a1c6` | W20 oben links führt nach Hause; Kampf startet nur auf Tippen |
| `69caf38` | Kampflog: schreibt sich aus den Mutationen selbst |
| `0bd60d0` | Kampfmodus hinter „Roll Initiative…", Bewegung raus |

Die drei größeren Brocken im Detail:

**Kampflog** (`combat_log`, `characters.encounter_round`). Niemand führt
mitten im Kampf Protokoll, also fällt es ab: `applyMutation` vergleicht den
Zustand davor und danach und lässt `describeMutation` daraus einen Satz
machen. Aus dem Vergleich, nicht aus der Absicht — ein Cast ohne freien
Slot findet nicht statt und taucht deshalb auch nicht auf. Geschrieben wird
nur zwischen `battle.start` und `battle.end`; „Zug beenden" zählt die
Runde hoch; das Kampfende hinterlässt eine Zusammenfassung im Logbuch.

**Death Saves** (`characters.stabilized`). Drei Zustände statt sechs
Kreisen: `dying` / `stable` / `dead`, abgeleitet in `deathStatus()`. Drei
Erfolge stabilisieren und **löschen die Häkchen** (deshalb das eigene
Feld), drei Fehlschläge töten. Schaden bei 0 HP hebt die Stabilisierung
auf, Heilung über 0 setzt alles zurück (das ist der Revivify-Fall).

**Kopfleiste** (`StickyStats` + `PROFILE_ANCHOR_ID`). Ein
IntersectionObserver auf den Instrumentenblock im Profilkopf; solange der
im Bild ist, hält die klebende Leiste ihre Zahlen zurück. Kein Anker
gefunden (alle anderen Reiter) → immer sichtbar.

---

## 6. Fallstricke (teuer gelernt)

- **Vorher-Nachher-Vergleiche sehen nicht alles.** Schaden auf jemanden mit
  0 HP ändert keine Zahl — die Stabilisierung wäre stehengeblieben. Absicht
  ausdrücklich mitgeben, nicht aus dem Ergebnis raten. (`changeHp(…, damage)`)
- **Nach einer Mutation nicht sofort navigieren.** Die Zielseite rendert auf
  dem Server und sähe den alten Stand. `await send(…)`, dann `router.push`.
- **Kein Seiteneffekt beim Seitenaufruf.** Der Kampf startete einmal beim
  Laden von `/battle` — damit löschte jeder Blick ins Log des letzten
  Kampfes genau das, wofür man gekommen war.
- **Drizzle-Migrationen tragen bei `ADD COLUMN` kein `ON DELETE`.** Bei
  `foreign_keys = ON` scheitert das Löschen sonst. `deleteFolder()` hängt
  die Charaktere deshalb erst ab, in einer Transaktion.
- **Zwei konkurrierende `size-*` in Tailwind v4** entscheiden sich nach der
  Reihenfolge im erzeugten Stylesheet, nicht im Klassenstring. `Icon` setzt
  die Standardgröße nur, wenn keine mitkommt.
- **Formulare, die nicht alle Felder zeigen, dürfen sie nicht schreiben.**
  `saveBackgroundAction` hätte die importierten Charakterzüge bei jedem
  Speichern geleert.
- **Tests laufen gegen temporäre DBs, Browser-Prüfungen nicht.** Wer im
  Browser testet, schreibt in `data/app.db` — hinterher zurücksetzen
  (HP 33/37, `ac_override` NULL, `encounter_round` 0, Slots und
  Trefferwürfel voll, keine Pins/Log-Einträge).
- **Browser-Harness:** `computer type`/`key` erreichen kontrollierte
  React-Inputs nicht zuverlässig; `form_input` oder ein echtes
  `input`-Event über den nativen Setter tun es. Screenshots direkt nach
  einer Aktion zeigen manchmal noch die Übergangsphase.

---

## 7. Offene Fäden

Angeboten, aber (noch) nicht gebaut:

- **Wurf-Suche** — ein Feld über alle Modifikatoren, deutsch und englisch.
  Der ursprüngliche Anlass: „ich weiß nie, was ich addieren muss."
- **Exhaustion als Stufenzähler** statt als Condition-Chip.
- **Automatischer Fehlschlag bei Schaden auf 0 HP** (regelkonform, aber die
  App kennt keine kritischen Treffer — bewusst dem Spieler überlassen).
- **Initiative und Speed direkt änderbar** wie die AC.
- **Zauber direkt aus dem Kampfmodus favorisieren** (geht bisher nur auf
  der Zauberseite).
- Der **Würfel bei „Ausgeben"** ist das schwächste der neuen Zeichen.

---

## 8. Konventionen

- **Jede Änderung wird sofort committet.** Stehende Anweisung des Besitzers.
  Commit-Nachrichten auf Deutsch, Betreff als Aussage, Rumpf erklärt das
  *Warum* und nennt Verworfenes.
- **Kommentare erklären Entscheidungen, nicht Syntax.** Wo eine Regel
  überrascht (Warlock-Ausnahme, gelöschte Death-Save-Häkchen, warme Pact-
  Magic-Sockel), steht der Grund daneben.
- **Regeln bekommen Tests.** `src/lib/rules/*.test.ts` rein,
  `src/lib/server/live.test.ts` gegen eine echte SQLite-Datei.
- **Vor jedem Commit:** `npm test` und `npm run typecheck`.
- Neue UI-Zeichen gehören nach `src/components/icons.tsx`, nichts wird
  nachgeladen.
