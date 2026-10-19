import { renderImportWarning } from "@/lib/i18n/importWarnings";
import { getMessages } from "@/lib/i18n/messages";
import type { ImportWarning } from "@/lib/import/types";

/**
 * Die Import-Hinweise als deutsche Sätze — so, wie sie in der Prüfansicht
 * stehen. Die Format-Tests prüfen damit weiter, was der Nutzer liest, und
 * nicht nur, welcher Schlüssel gesetzt ist.
 */
export function germanWarnings(result: { warnings: ImportWarning[] }): string[] {
  const t = getMessages("de");
  return result.warnings.map((warning) => renderImportWarning(t, warning));
}
