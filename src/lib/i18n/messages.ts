import { localeOf, termLanguage, uiLanguage, type Mode } from "./modes";
import { termsDe, termsEn, type Terms } from "./terms";
import { uiDe, uiEn, type Ui } from "./ui";

export type Messages = Ui & {
  mode: Mode;
  term: Terms;
  /** Zahlen im Format der Bedienung: 6.500 auf Deutsch, 6,500 auf Englisch. */
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
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
  };
}
