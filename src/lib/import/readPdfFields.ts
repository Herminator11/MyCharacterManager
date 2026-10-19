import "server-only";

import { PDFDocument } from "pdf-lib";

import type { FieldMap } from "./parseSheet";

/**
 * Das PDF ließ sich nicht auslesen. Trägt die Art statt eines Satzes — den
 * bildet die Server Action in der Sprache des Geräts.
 */
export class SheetReadError extends Error {
  constructor(readonly kind: "notPdf" | "noFields") {
    super(kind);
  }
}

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
    throw new SheetReadError("notPdf");
  }

  const fields = doc.getForm().getFields();

  if (fields.length === 0) {
    throw new SheetReadError("noFields");
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
