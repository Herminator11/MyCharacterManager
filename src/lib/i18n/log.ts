import type { LiveLogEntry } from "@/lib/live-types";

import type { Messages } from "./messages";

/**
 * Baut eine Kampflog-Zeile in der Sprache des Geräts.
 *
 * Aus der gespeicherten Meldung, wenn es eine gibt. Einträge aus der Zeit
 * vor der `message`-Spalte haben keine; sie zeigen ihren gespeicherten
 * deutschen Satz — lieber unübersetzt als geraten.
 *
 * Regelbegriffe (TP/HP, Grad/Level, Zaubertrick, Rast, Todesrettungswurf)
 * kommen aus dem Glossar, damit der gemischte Modus auch im Log "HP" sagt.
 */
export function renderLogLine(
  t: Messages,
  entry: Pick<LiveLogEntry, "text" | "detail" | "message">,
): { text: string; detail: string } {
  const message = entry.message;
  if (!message) return { text: entry.text, detail: entry.detail };

  const hp = t.term.hitPointsShort;
  const range = (from: number, to: number) => `${from} → ${to}`;

  switch (message.key) {
    case "damage": {
      const { amount, from, to, absorbed } = message.params;
      return {
        text: t.log.damage(amount),
        detail:
          absorbed > 0
            ? `${range(from, to)} · ${t.log.absorbed(absorbed, hp)}`
            : range(from, to),
      };
    }
    case "heal":
      return {
        text: t.log.healed(message.params.amount),
        detail: range(message.params.from, message.params.to),
      };
    case "hpCorrected":
      return {
        text: t.log.hpCorrected(hp),
        detail: range(message.params.from, message.params.to),
      };
    case "tempHp":
      return { text: t.log.tempHp(message.params.value, hp), detail: "" };
    case "tempHpGone":
      return { text: t.log.tempHpGone(hp), detail: "" };
    case "hitDie": {
      const { die, healed, from, to } = message.params;
      return {
        text: die > 0 ? `${t.term.hitDice} d${die}` : t.term.hitDice,
        detail: `+${healed} ${hp} · ${range(from, to)}`,
      };
    }
    case "cast": {
      const { spell, level, pool, poolAutoKey } = message.params;
      return {
        text: spell || t.log.spellCast,
        detail:
          level === 0
            ? t.term.cantrip
            : [t.term.spellLevel(level), pool ? t.poolName({ name: pool, autoKey: poolAutoKey }) : ""]
                .filter(Boolean)
                .join(" · "),
      };
    }
    case "condition":
      return {
        text: message.params.active
          ? message.params.condition
          : t.log.conditionEnded(message.params.condition),
        detail: "",
      };
    case "concentration":
      return {
        text: t.log.concentrationOn(message.params.label || t.log.active),
        detail: "",
      };
    case "concentrationLost":
      return { text: t.log.concentrationLost, detail: message.params.label };
    case "stabilized":
      return { text: t.log.stabilized, detail: t.log.stabilizedDetail(hp) };
    case "died":
      return { text: t.log.died, detail: t.log.diedDetail };
    case "deathSave":
      return {
        text: t.term.deathSave,
        detail: t.log.deathSaveDetail(message.params.successes, message.params.failures),
      };
    case "resource": {
      const { name, spent, current, max } = message.params;
      return {
        text: spent ? t.log.resourceSpent(name) : t.log.resourceReturned(name),
        detail: `${current}/${max}`,
      };
    }
    case "inspiration":
      return {
        text: message.params.gained
          ? t.log.inspirationGained(t.term.inspiration)
          : t.log.inspirationSpent(t.term.inspiration),
        detail: "",
      };
    case "shortRest":
      return { text: t.term.shortRest, detail: "" };
    case "longRest":
      return { text: t.term.longRest, detail: "" };
  }
}
