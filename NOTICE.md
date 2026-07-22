# Verwendete Daten Dritter

Die Dateien unter `data/srd/` — `Spells.json`, `Levels.json`,
`Conditions.json`, `Races.json`, `Subraces.json`, `Traits.json` — und alles,
was daraus erzeugt wird (`src/lib/rules/progression.generated.ts`, der
Zauber-Katalog, die Conditions-Liste und der Spezies-Katalog in der
Datenbank), stammen aus dem **System Reference Document 5.1**.

> System Reference Document 5.1 © Wizards of the Coast LLC.
> Lizenziert unter [Creative Commons Attribution 4.0 International
> (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/legalcode).

Aufbereitet als JSON von [5e-bits/5e-database](https://github.com/5e-bits/5e-database),
Verzeichnis `src/2014/en/`.

Selbst angelegte Spezies und Zauber (`source = 'custom'`) stammen nicht aus
dem SRD und fallen nicht unter diese Lizenz — sie gehören dem, der sie
eingetragen hat.

Diese App steht in keiner Verbindung zu Wizards of the Coast und ist nicht
von ihnen unterstützt.

## Icons

Die Klassen-Icons (`ClassIcon` in `src/components/icons.tsx`) und der
Laufschuh bei Speed (`ShoeIcon`) sind als Pfaddaten aus
[game-icons.net](https://game-icons.net) übernommen, angepasst auf
einfarbige Flächen ohne Hintergrund. Lizenziert unter [Creative Commons
Attribution 3.0 Unported (CC-BY-3.0)](https://creativecommons.org/licenses/by/3.0/).

| Icon | Klasse/Zweck | Autor |
| --- | --- | --- |
| gears | Artificer | Lorc |
| barbarian | Barbarian | Delapouite |
| lyre | Bard | Lorc |
| holy-symbol | Cleric | Lorc |
| holy-oak | Druid | Cathelineau |
| shield | Fighter | sbed |
| fist | Monk | Skoll |
| winged-sword | Paladin | Lorc |
| bow-arrow | Ranger | Delapouite |
| cloak-dagger | Rogue | Lorc |
| magic-swirl | Sorcerer | Lorc |
| warlock-eye | Warlock | Delapouite |
| pointy-hat | Wizard | Lorc |
| running-shoe | Speed (Übersicht) | Delapouite |

Alle Icons stehen unter [game-icons.net](https://game-icons.net), einzeln
verlinkt über `https://game-icons.net/1x1/<autor>/<name>.html`.
