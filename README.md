# D&D 5e Charakter-Manager

Ein selbst gehostetes Live-Dashboard für die eigenen D&D-5e-Charaktere —
gebaut fürs Handy am Spieltisch, nicht als Regelwerk-Datenbank.

HP ändern und einen Zauberplatz verbrauchen sind je ein Tipper. Handy und
Laptop zeigen denselben Stand, ohne dass man neu lädt.

## Einrichten

```bash
npm install
npm run setup     # Datenbank anlegen und SRD-Katalog einlesen
```

`npm run setup` ist einmalig. Danach:

```bash
npm run dev       # nur auf diesem Rechner
npm run lan       # auch fürs Handy im WLAN, gibt die URL aus
```

`npm run lan` zeigt beim Start die Adresse, die du am Handy eintippst
(etwa `http://192.168.1.42:3000`). Beim ersten Mal fragt die macOS-Firewall
nach — erlauben, sonst kommt das Handy nicht durch.

Am Handy lohnt sich „Zum Homescreen hinzufügen“: die App startet dann ohne
Browserleiste.

### Für den Dauerbetrieb

```bash
npm run build
npm start         # läuft auf 0.0.0.0:3000
```

## Deine Daten

Alles liegt in `data/app.db` — eine einzelne SQLite-Datei. Ein Backup ist
ein `cp`:

```bash
cp data/app.db ~/Backups/charaktere-$(date +%F).db
```

Die Datei ist bewusst nicht in der Versionskontrolle. `data/srd/` dagegen
schon, damit die App ohne Internet läuft.

## Die Startseite

Deine Ablage. Ein Tipp auf einen Charakter öffnet ihn — das ist der
Alltagsweg und bleibt frei von Knöpfen.

Der Stern links hebt einen Charakter nach oben zu den **Favoriten**; liegt
er in einem Ordner, steht das in seiner Zeile, damit nichts verschwunden
wirkt. **Edit** oben rechts blendet Umbenennen, Ordner und Löschen
ein — und legt neue Ordner an (flach, eine Ebene, meist eine Kampagne).

Löschen gibt es **nur hier** und nur mit Rückfrage, die den Namen nennt.
Einen Ordner zu löschen lässt seine Charaktere unangetastet; sie liegen
danach lose auf der Startseite.

## Charakterbogen importieren

„Bogen importieren“ auf der Startseite liest ein **ausfüllbares PDF** und
legt daraus einen Charakter an. Unterstützt werden zwei Formate, die die App
selbst erkennt:

- der **offizielle D&D-Charakterbogen** von Wizards of the Coast — das
  Format, das auch Aurora ausgibt
- ein **erweitertes Format** mit `Front_`/`Back_`-Feldern, das zusätzlich
  Expertise, Zauberangriffe und Klassenfeatures mitbringt

Ein Scan oder Ausdruck reicht nicht: der Import liest die Formularfelder,
und die gibt es nur in der ausfüllbaren Fassung.

**Gespeichert wird erst nach deiner Bestätigung.** Der Import zeigt alles
Gefundene zuerst an, zusammen mit einer Liste dessen, was fehlte oder
Aufmerksamkeit braucht — leere Felder, unbekannte Klassen, Werte, die er aus
den Regeln ergänzt hat. Nichts wird geraten: was im Bogen leer ist, bleibt
leer und wird gemeldet. Ausnahme sind Werte, die zwingend aus den Regeln
folgen — die Trefferwürfel etwa ergeben sich aus der Klasse.

Zauberplätze und Klassenressourcen übernimmt der Import bewusst *nicht* aus
dem Bogen, sondern rechnet sie aus Klasse und Level. Zaubernamen werden mit
dem SRD-Katalog abgeglichen; was dort fehlt (Hex etwa steht nur im PHB),
wird als eigener Eintrag angelegt statt verworfen.

### Nur ein Wert geändert? Dann kein neuer Bogen

Für eine reine Attributsverbesserung lohnt der Umweg über Aurora nicht.
Auf der Charakterseite steht über den Attributen **Edit** — sechs
Felder, speichern, fertig. Rettungswürfe, Fertigkeiten, Zauber-DC und das
HP-Maximum rechnen sich mit.

Dasselbe gilt für die **Rüstungsklasse**: ein Tipp auf die Zahl im Schild,
neuer Wert, fertig — das Schild bleibt dabei stehen. Ein leeres Feld heißt
„wieder berechnen“, also zurück auf den Wert aus Rüstung und DEX. Damit ist
auch ein Shield of Faith für drei Runden kein Formularbesuch.

Der volle Re-Import bleibt für alles, was mehr als Zahlen verschiebt: neue
Klassenstufen, neue Zauber, neue Angriffe.

### Levelaufstieg: denselben Charakter aktualisieren

Nach einem Levelaufstieg exportierst du in Aurora neu und lädst den Bogen
wieder hoch — diesmal wählst du beim Import *diesen Charakter aktualisieren*
statt „neu anlegen“. Die Aufteilung dahinter:

**Der Bogen bestimmt den Bauplan.** Klassen und Level, Attribute,
Proficiencies, Zauberliste, Angriffe, maximale Trefferpunkte, AC.

**Der Manager behält den Spielstand.** Aktuelle und temporäre HP, verbrauchte
Zauberplätze, Ressourcen und Trefferwürfel, Conditions, Konzentration,
Inventar, Geldbeutel, Notizen, Portrait — und alles, was du selbst angelegt
hast.

Vor dem Übernehmen siehst du einen Vergleich: was sich ändert, welche Zauber
dazukommen und was unangetastet bleibt. Steigt das HP-Maximum von 46 auf 52,
wachsen die aktuellen HP um dieselben 6 mit — aus 31/46 wird 37/52, keine
geschenkte Heilung. Verbrauchte Zauberplätze bleiben verbraucht.

Das ist auch der Grund, warum die App Tasha's oder Xanathar's nicht kennen
muss: Aurora entscheidet, die App führt mit. Ressourcen aus Subklassen —
Hexblade's Curse etwa — legst du einmal von Hand an; sie überstehen jeden
weiteren Import.

Wenn ein Bogen nicht erkannt wird, zeigt dir dieses Werkzeug, was drinsteht:

```bash
npx tsx scripts/inspect-pdf.ts ~/Pfad/zum/bogen.pdf
```

Es listet alle Formularfelder mit Namen und Werten sowie die Textebene mit
Koordinaten — die Grundlage, um ein weiteres Format zu ergänzen.

## Wie es aufgebaut ist

**Stack:** Next.js 16 (App Router) · SQLite über Drizzle · Tailwind v4.
Ein einziger Node-Prozess, keine externen Dienste.

### Live-State und Charakterbogen sind getrennt

Werte, die sich mitten im Kampf ständig ändern — HP, Zauberplätze,
Ressourcen, Conditions, Konzentration — laufen über `src/lib/live-types.ts`
als eigenes, kleines Objekt. Es wird bei jeder Änderung komplett per
Server-Sent Events an alle verbundenen Geräte geschickt
(`src/app/api/live/[id]/route.ts`). Der Browser sagt das Ergebnis vorab
lokal voraus (`src/lib/predict.ts`), damit ein Tipper ohne Wartezeit
sichtbar wird; die Serverantwort korrigiert es Millisekunden später.

Alles andere — Attribute, Fertigkeiten, Inventar, Notizen — läuft über
Server Actions mit `revalidatePath`. Das ändert man zwischen den Sessions,
nicht im Kampf.

### Zauberplätze sind Pools, keine Tabelle

`spell_pools` erlaubt beliebig viele voneinander unabhängige Pools mit je
eigener Erholungsregel. Bei einem Sorcerer/Warlock gibt es dadurch
„Zauberplätze“ (lange Rast) und „Pact Magic“ (kurze Rast) nebeneinander —
beide können Grad 2 anbieten, und der Cast-Dialog fragt, welcher benutzt
werden soll. Nichts davon ist auf Warlock hartcodiert; du kannst weitere
Pools von Hand anlegen.

Die Ableitung sitzt in `src/lib/rules/`. Der Fallstrick dabei: bei
Multiclassing sind die Zauberplätze **nicht** die Summe der Einzeltabellen,
sondern ein kombinierter Caster-Level in einer gemeinsamen Tabelle — und
Warlock ist davon ausgenommen. Ein einzelner Halbcaster benutzt dagegen
weiter seine eigene Tabelle. `src/lib/rules/multiclass.test.ts` hält beide
Fälle fest.

### Zeichen

Alle Icons liegen in `src/components/icons.tsx` — Inline-SVG, `currentColor`,
ein gemeinsames 24er-Raster. Sie werden bei 14 bis 24 Pixeln gelesen, oft aus
Armlänge neben einem Würfelbecher; was dabei zum Fleck zerfällt, ist kein
Icon, sondern Dekoration. Der Schuh für Speed hat deshalb zwei Anläufe
gebraucht, und die Klinge für Angriffe steht senkrecht, weil sie diagonal
wie ein Pfeil aussah.

Zwei Zeichen bedeuten dasselbe an zwei Orten und sind trotzdem nicht
doppelt: der W20 ist die Marke oben links und führt nach Hause, die
gekreuzten Klingen stehen für den Kampf. Die Conditions tragen ihr Zeichen
neben dem Wort, nicht statt seiner — Paralyzed, Stunned und Incapacitated
sind Abstufungen desselben Gedankens und wären als Form allein zu nah
beieinander.

### Am Tisch

**Die klebende Leiste** zeigt AC, Initiative, Speed und Passive Perception
erst, wenn der Profilkopf aus dem Bild gescrollt ist — auf der Übersicht
stünden sie sonst zweimal auf demselben Schirm. Auf allen anderen Reitern
gibt es keinen Profilkopf, dort stehen sie durchgehend.

**Der Kampfmodus.** „Roll Initiative…“ auf der Übersicht öffnet die Seite,
die während einer Begegnung offen bleibt: oben der Zug — Aktion,
Bonusaktion, Reaktion; antippen verbraucht, „Zug beenden“ setzt zurück —
darunter deine favorisierten Zauber als Knöpfe.

Die Formensprache stammt aus Baldur's Gate, weil sie dort funktioniert:
**grüner Kreis** = Aktion, **oranges Dreieck** = Bonusaktion, dazu die
messingfarbene **Raute** für die Reaktion, die BG3 selbst nicht eigens
zeichnet. Volle Form heißt frei, Umriss heißt verbraucht. Dieselbe Marke
sitzt am Zauberknopf und sagt, was ein Tipp kostet; ist das Konto weg oder
kein Zauberplatz mehr frei, wird der Knopf blass, bleibt aber tippbar —
die App zeigt an, sie verbietet nicht. Wirkst du einen Zauber, hakt sich
das passende Konto von selbst ab.

**Zauberplätze** sind hellblaue Quadrate mit römischer Ziffer, ebenfalls
nach BG3: eine eigene Farbe, weil sie weder „verfügbar“ noch „Gefahr“
bedeuten, sondern Magie. Ein Pool mit kurzer Rast (Pact Magic) bleibt warm
— zwei Reihen blauer Quadrate mit derselben Ziffer wären im Kampf nicht
auseinanderzuhalten, und genau das unterscheidet die Pools.

Favoriten kürst du mit dem Stern auf der Zauberseite. Bewegung zählt die
App bewusst nicht mit — Fuß für Fuß nachzutippen wäre Buchhaltung, und
die Battlemap zeigt es ohnehin.

**Das Kampflog** steht unten und schreibt sich selbst: Schaden mit dem Weg
der HP (und wie viel die temporären geschluckt haben), Heilung, gewirkte
Zauber mit Grad, Pool und Kosten, Trefferwürfel, Ressourcen, Conditions.
Niemand führt mitten im Kampf Protokoll — also fällt es aus dem ab, was du
ohnehin eintippst. „Zug beenden“ zählt die Runde hoch und gliedert das Log
danach.

Getippt wird nichts, und mitgeschrieben nur zwischen „Roll Initiative…“ und
„Kampf beenden“: außerhalb einer Begegnung ist eine HP-Änderung Buchhaltung,
kein Ereignis. Bloße Korrekturen am Zähler — einzelne Zauberplätze, die drei
Zugkonten — stehen ebenfalls nicht drin.

Beim Kampfende wandert eine Zeile ins Logbuch („Kampf: 3 Runden · 14 Schaden
genommen · 9 HP geheilt · 4 Zauber gewirkt“), das Log selbst bleibt bis zum
nächsten „Roll Initiative…“ stehen. Der Kampf beginnt nur auf ausdrückliches
Tippen, nie dadurch, dass die Seite geladen wird — sonst löschte jeder Blick
zurück ins Log genau das, wofür man gekommen ist.

### Der Weg zurück

Oben links steht der W20 und führt zur Charakterliste. Er sitzt auf jeder
Seite an derselben Stelle, weil man einen Ausweg nicht sucht, sondern
erwartet. Innerhalb eines Charakters navigiert die Leiste am unteren Rand —
dort, wo der Daumen liegt.

**Bei 0 Trefferpunkten** kennt die App die drei Zustände der Regeln.
Sterbend heißt: Erfolge und Fehlschläge antippen. Der dritte Erfolg
**stabilisiert** — bewusstlos bei 0 HP, aber keine Würfe mehr, und die
Häkchen werden gelöscht, weil beim nächsten Absinken wieder bei null
angefangen wird. Der dritte Fehlschlag heißt **tot**; von dort führt nur
noch Revivify, Raise Dead oder ein Wunsch zurück. Schaden auf einen
Stabilisierten wirft ihn zurück ins Sterben, jede Heilung über 0 HP setzt
alles zurück. Beide Ausgänge stehen als eigene Zeile im Kampflog.

**Inspiration** ist die Flamme oben neben AC, Initiative und Speed. Sie
brennt oder sie brennt nicht; antippen schaltet um. Sie steht dort, weil
man Inspiration nicht sucht — man muss an sie erinnert werden, sonst
verfällt sie ungenutzt.

**Festhalten.** Ein Feld auf der Charakterseite, Eingabetaste, fertig. Das
Datum kommt von selbst, das volle Logbuch steht unter Notizen.

**Aktuell gilt für dich.** Fluch, Pakt, Segen — alles, was über die Sitzung
hinaus wirkt und in keinem Regelbuch steht. Angelegt wird es am Zettel im
Profilkopf, neben AC und Inspiration: ein Vermerk entsteht in demselben
Moment, in dem man dorthin schaut. Er bleibt darunter sichtbar, bis du ihn
beendest; dann wandert er ins Logbuch statt gelöscht zu werden.

**Gepäck.** Getrennt nach *am Körper* und *im Rucksack*. Was du angelegt
hast, erscheint mit seinem Wirkungstext auch unter Angriffen — dort, wo du
im Kampf hinschaust. Gegenstände mit Einstimmung bekommen einen Zähler
(drei sind das Limit; die App zählt, sperrt aber nicht).

### Was die App nicht tut

Sie würfelt nicht. Auf einer kurzen Rast gibst du Trefferwürfel aus, indem
du eintippst, was der echte Würfel zeigt; den CON-Modifikator zählt die App
dazu und schreibt die HP hoch. Der Würfel ist auch dann weg, wenn ein
niedriger Wurf nichts einbringt — so steht es in den Regeln.

Conditions sind Merkzettel, keine Mechanik: ein aktives *Poisoned* färbt
den Chip und zeigt den Regeltext, verändert aber keinen Wurf. Die App weiß
nicht, gegen wen du gerade angreifst, und rät deshalb nicht.

Klassenressourcen (Rage, Ki, Sorcery Points, …) kommen aus derselben Quelle
und werden über `src/lib/rules/resourceTemplates.ts` auf konfigurierbare
Zähler abgebildet. Alles Abgeleitete lässt sich überschreiben: Felder leer
lassen heißt „berechnen“, ein Wert darin gewinnt.

## Tests

```bash
npm test
```

Deckt die Rechenregeln (Modifikatoren, Proficiency, Multiclass-Slots,
Ressourcen) und die Live-Logik gegen eine echte SQLite-Datei ab — Schaden
gegen temporäre HP, Zauber wirken, kurze und lange Rast.

## Datenbank ändern

Nach einer Änderung an `src/db/schema.ts`:

```bash
npm run db:generate   # Migration erzeugen
npm run db:migrate    # anwenden
```

`npm run db:reset` wirft die Datenbank weg und baut sie neu auf — löscht
also auch deine Charaktere.

## Herkunft der Spieldaten

Zauber, Conditions und die Klassen-Progression stammen aus dem SRD 5.1
(CC-BY-4.0). Siehe [NOTICE.md](NOTICE.md).

## Rechtlicher Hinweis

Dies ist ein **privates, nicht kommerzielles** Werkzeug für meine eigenen Charaktere. *Dungeons & Dragons* und *D&D* sind Marken von Wizards of the Coast LLC; das Projekt ist inoffiziell und steht in keiner Verbindung zu Wizards of the Coast. Es enthält Material aus dem System Reference Document 5.1 („SRD 5.1“) von Wizards of the Coast LLC (<https://dnd.wizards.com/resources/systems-reference-document>), lizenziert unter der [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/legalcode). Alles darüber hinaus gehört seinen Inhabern; Details in [NOTICE.md](NOTICE.md). Der Code steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE).
