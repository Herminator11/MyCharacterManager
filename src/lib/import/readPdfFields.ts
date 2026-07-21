import "server-only";

import { PDFDocument } from "pdf-lib";

import type { FieldMap } from "./parseSheet";

export class SheetReadError extends Error {}

/**
 * Liest die Formularfelder eines Character-Sheet-PDFs aus.
 *
 * Bewusst getrennt vom Parser: hier steckt die Abhängigkeit zu pdf-lib und
 * zum Dateiformat, dort die Regelkunde. Dadurch kommt der Parser in den
 * Tests ohne PDF aus.
 */
export async function readPdfFields(bytes: Uint8Array): Promise<FieldMap> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    throw new SheetReadError(
      "Die Datei lässt sich nicht als PDF lesen. Ist es wirklich ein PDF?",
    );
  }

  const fields = doc.getForm().getFields();

  if (fields.length === 0) {
    throw new SheetReadError(
      "Dieses PDF hat keine Formularfelder. Der Import braucht einen " +
        "ausfüllbaren Bogen — ein Scan oder Ausdruck reicht nicht.",
    );
  }

  const map: FieldMap = {};

  for (const field of fields) {
    const accessor = field as unknown as {
      getText?: () => string | undefined;
      isChecked?: () => boolean;
      getSelected?: () => string[];
    };

    try {
      if (accessor.getText) map[field.getName()] = accessor.getText() ?? "";
      else if (accessor.isChecked)
        map[field.getName()] = accessor.isChecked();
      else if (accessor.getSelected)
        map[field.getName()] = (accessor.getSelected() ?? []).join(", ");
    } catch {
      // Einzelne unlesbare Felder sollen den ganzen Import nicht kippen.
    }
  }

  return map;
}
