import type { ActionCost } from "@/lib/rules/actions";

import { localeOf, termLanguage, uiLanguage, type Mode } from "./modes";
import { termsDe, termsEn, type Terms } from "./terms";
import { uiDe, uiEn, type Ui } from "./ui";

export type Messages = Ui & {
  mode: Mode;
  term: Terms;
  /** Zahlen im Format der Bedienung: 6.500 auf Deutsch, 6,500 auf Englisch. */
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  /**
   * Fertigkeiten heißen im SRD englisch, im Spielerhandbuch deutsch. Die
   * jeweils andere Fassung bleibt als Hinweis daneben stehen — außer im
   * rein englischen Modus, wo sie niemand braucht.
   */
  skill: (en: string, de: string) => { label: string; hint?: string };
  /**
   * Abgeleitete Pools tragen ihren Standardnamen fest in der DB
   * ("Zauberplätze", "Pact Magic"). Nur solange er unverändert ist, zeigt
   * die App ihn in der gewählten Sprache — einen selbst vergebenen Namen
   * übersetzt sie nicht.
   */
  poolName: (pool: { name: string; autoKey: string }) => string;
  /** Was eine Wirkzeit kostet, als Regelbegriff: Aktion / Action … */
  actionCost: (cost: ActionCost) => string;
};

/**
 * Bedienung und Glossar unabhängig voneinander gewählt — daraus ergeben
 * sich die drei Modi, ohne dass irgendein Text dreimal geschrieben wird.
 *
 * Rein und ohne Server-Abhängigkeit: der Server ruft sie mit dem Modus aus
 * dem Cookie auf, der Browser mit demselben Modus aus dem Provider. Beide
 * kommen so zwingend auf dieselben Wörter — sonst gäbe es beim Hydrieren
 * eine Abweichung zwischen Server-HTML und Client.
 */
export function getMessages(mode: Mode): Messages {
  const locale = localeOf(mode);
  return {
    ...(uiLanguage(mode) === "en" ? uiEn : uiDe),
    mode,
    term: termLanguage(mode) === "en" ? termsEn : termsDe,
    number: (value, options) => value.toLocaleString(locale, options),
    skill: (en, de) =>
      mode === "de"
        ? { label: de, hint: en }
        : mode === "de-en"
          ? { label: en, hint: de }
          : { label: en },
    poolName: (pool) => {
      const term = termLanguage(mode) === "en" ? termsEn : termsDe;
      if (pool.autoKey === "spellcasting" && pool.name === "Zauberplätze") return term.spellSlots;
      if (pool.autoKey === "pact-magic" && pool.name === "Pact Magic") return term.pactMagic;
      return pool.name;
    },
    actionCost: (cost) => {
      const term = termLanguage(mode) === "en" ? termsEn : termsDe;
      return {
        action: term.action,
        bonus: term.bonusAction,
        reaction: term.reaction,
        long: term.longerAction,
      }[cost];
    },
  };
}
