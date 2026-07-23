<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wie diese App denkt

Ein selbst gehostetes Live-Dashboard für die eigenen D&D-5e-Charaktere.
Der Maßstab ist der Spieltisch: einhändig, bei schlechtem Licht, neben
einem Würfelbecher. **Sie zählt, sie entscheidet nicht** — sie würfelt
nicht, sperrt nichts (ein Knopf ohne Ressource wird blass, bleibt aber
tippbar), und rechnet keine Regeln aus, die vom Gegner abhängen. Was die
App aus Nutzersicht tut, steht ausführlich in README.md — hier steht nur,
was man wissen muss, bevor man Code anfasst.

## Die zentrale Naht: Live-State vs. Sheet-Data

Drei Dateien, die semantisch deckungsgleich bleiben müssen:

- `src/lib/live-types.ts` — `LiveState` und `LiveMutation`. Kein
  `@/db`-Runtime-Import, die Datei läuft im Browser.
- `src/lib/server/live.ts` — `applyMutation`, autoritativ, in einer
  Transaktion.
- `src/lib/predict.ts` — dieselbe Semantik im Browser für die sofortige
  Anzeige. **Läuft sie auseinander, flackert die Anzeige.**

Die kniffligen Regeln (temporäre HP, Death Saves) teilen sich beide über
`src/lib/rules/hp.ts`. `src/lib/live-context.tsx` hält **einen**
`useLiveState` für die ganze Seite — ohne ihn öffnet jede Komponente ihren
eigenen SSE-Stream.

## Fallstricke (teuer gelernt)

- **Vorher-Nachher-Vergleiche sehen nicht alles.** Schaden auf jemanden mit
  0 HP ändert keine Zahl — die Stabilisierung wäre stehengeblieben. Absicht
  ausdrücklich mitgeben, nicht aus dem Ergebnis raten (`changeHp(…, damage)`).
  Derselbe Fehler kann sich hinter jeder abgeleiteten Zahl verstecken, die
  sich zufällig nicht bewegt.
- **Nach einer Mutation nicht sofort navigieren.** Die Zielseite rendert auf
  dem Server und sähe den alten Stand. `await send(…)`, dann `router.push`.
- **Kein Seiteneffekt beim Seitenaufruf.** Der Kampf startete einmal beim
  Laden von `/battle` — damit löschte jeder Blick ins Log des letzten
  Kampfes genau das, wofür man gekommen war. Dieselbe Regel gilt fürs
  Zuordnen einer Spezies aus einem Freitext: die App schlägt vor, sie
  verknüpft nicht von selbst.
- **Drizzle-Migrationen tragen bei `ADD COLUMN` kein `ON DELETE`.** Bei
  `foreign_keys = ON` scheitert das Löschen sonst. `deleteFolder()` hängt
  die Charaktere deshalb erst ab, in einer Transaktion. Deshalb tragen
  `characters.species_key` und `character_classes.class_key` bewusst
  keinen Fremdschlüssel — Homebrew darf ins Leere laufen, und eine
  gelöschte eigene Spezies hinterlässt eine tote Verknüpfung statt eines
  Migrationsproblems.
- **Ein Knopf, der zweimal gedrückt werden kann, muss wissen, ob er das
  schon war.** "Boni übernehmen" hätte beim zweiten Drücken doppelt
  addiert, ohne dass man es dem Charakter hinterher ansieht. Lösung: ein
  Feld, das festhält, wovon die aktuellen Werte abstammen
  (`species_bonuses_from`), und die Umkehrfunktion dazu.
- **Zwei konkurrierende `size-*` in Tailwind v4** entscheiden sich nach der
  Reihenfolge im erzeugten Stylesheet, nicht im Klassenstring. `Icon` setzt
  die Standardgröße nur, wenn keine mitkommt.
- **Formulare, die nicht alle Felder zeigen, dürfen sie nicht schreiben.**
  `saveBackgroundAction` hätte die importierten Charakterzüge bei jedem
  Speichern geleert.
- **Tests laufen gegen temporäre DBs, Browser-Prüfungen nicht.** Wer im
  Browser testet, schreibt in `data/app.db` — hinterher zurücksetzen
  (HP 33/37, `ac_override` NULL, `encounter_round` 0, Slots und
  Trefferwürfel voll, keine Pins/Log-Einträge, `species_key` leer).
- **Browser-Harness:** `computer type`/`key` erreichen kontrollierte
  React-Inputs nicht zuverlässig; `form_input` oder ein echtes
  `input`-Event über den nativen Setter tun es. `computer key Return` löst
  in einem Textfeld kein implizites Formular-Submit aus — `form.requestSubmit()`
  über `javascript_tool` schon. Screenshot-Koordinaten sind auf den
  Screenshot-Maßstab bezogen, nicht auf die Viewport-Größe; bei einem
  1280×900-Fenster kommt oft ein 800px-breiter Screenshot zurück (Faktor
  0,625) — vor dem Klicken umrechnen oder die Zielkoordinaten direkt aus
  `getBoundingClientRect()` in CSS-Pixeln holen und dann skalieren.

## Konventionen

- **Jede Änderung wird sofort committet.** Stehende Anweisung des Besitzers.
  Commit-Nachrichten auf Deutsch, Betreff als Aussage, Rumpf erklärt das
  *Warum* und nennt Verworfenes.
- **Kommentare erklären Entscheidungen, nicht Syntax.** Wo eine Regel
  überrascht (Warlock-Ausnahme, gelöschte Death-Save-Häkchen, warme Pact-
  Magic-Sockel, Boni die nicht automatisch aufgerechnet werden), steht der
  Grund daneben.
- **Regeln bekommen Tests.** `src/lib/rules/*.test.ts` rein,
  `src/lib/server/live.test.ts` gegen eine echte SQLite-Datei. Eine neue
  Regel, die für mehrere Klassen gilt, bekommt einen Test über alle
  betroffenen Klassen, nicht nur über die des Seed-Charakters.
- **Vor jedem Commit:** `npm test` und `npm run typecheck`.
- Neue UI-Zeichen gehören nach `src/components/icons.tsx`, nichts wird
  nachgeladen.
- **Geändert wird im Bogen** (`/c/[id]/sheet`), die Übersicht
  (`/c/[id]`) zeigt nur an — mit Ausnahme der Live-Werte (HP, Slots,
  Conditions, Zug) sowie Vermerken, die im Kampf selbst entstehen. Was
  zum Charakter gehört (Fähigkeiten, Vorgeschichte), steht im Bogen; was
  in der Kampagne passiert (Notizseiten, Kampagnen-Log), steht unter
  Notizen.
