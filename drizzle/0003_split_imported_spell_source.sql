-- Import-Platzhalter von den handgemachten Zaubern trennen.
--
-- Bis hierher bekamen beide source='custom' und waren nicht auseinander-
-- zuhalten. Der Index-Schlüssel verrät die Herkunft trotzdem: der Import
-- vergibt 'import-…', das Zauberformular 'custom-…'.
UPDATE `spells`
SET `source` = 'imported'
WHERE `source` = 'custom' AND `index_key` LIKE 'import-%';
--> statement-breakpoint
-- Was sich davon bereits angesammelt hat und kein Charakter mehr führt,
-- fällt jetzt weg — genau die Karteileichen, die die Katalogsuche zumüllten.
-- Ab hier räumt deleteCharacter beim Löschen selbst ab.
DELETE FROM `spells`
WHERE `source` = 'imported'
  AND `id` NOT IN (SELECT `spell_id` FROM `character_spells`);
