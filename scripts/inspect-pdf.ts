/**
 * Zeigt, was in einem Character-Sheet-PDF tatsächlich drinsteckt.
 *
 *   npx tsx scripts/inspect-pdf.ts ~/Pfad/zu/sheet.pdf
 *
 * Grundlage, um den Import-Parser zu schreiben: erst wissen, ob die Werte
 * als Formularfelder vorliegen (dann ist der Import trivial und exakt) oder
 * nur als positionierter Text (dann brauchen wir Ankerpunkte).
 *
 * Liest ausschließlich, schreibt nichts.
 */
import fs from "node:fs";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

const file = process.argv[2];

if (!file) {
  console.error("Aufruf: npx tsx scripts/inspect-pdf.ts <datei.pdf>");
  process.exit(1);
}

const full = path.resolve(file.replace(/^~/, process.env.HOME ?? "~"));

if (!fs.existsSync(full)) {
  console.error(`Datei nicht gefunden: ${full}`);
  process.exit(1);
}

const bytes = new Uint8Array(fs.readFileSync(full));

/* ------------------------------------------------------------------ *
 * 1. Formularfelder
 * ------------------------------------------------------------------ */

async function dumpFormFields() {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const fields = doc.getForm().getFields();

  console.log("═".repeat(72));
  console.log(`FORMULARFELDER — ${fields.length} gefunden`);
  console.log("═".repeat(72));

  if (fields.length === 0) {
    console.log(
      "Keine. Die Werte stehen dann nur in der Textebene — siehe unten.\n",
    );
    return 0;
  }

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name.replace("PDF", "");

    let value = "";
    try {
      // getText/isChecked gibt es nur auf den jeweiligen Feldtypen.
      const anyField = field as unknown as {
        getText?: () => string | undefined;
        isChecked?: () => boolean;
        getSelected?: () => string[];
      };
      if (anyField.getText) value = anyField.getText() ?? "";
      else if (anyField.isChecked) value = anyField.isChecked() ? "✓" : "☐";
      else if (anyField.getSelected)
        value = (anyField.getSelected() ?? []).join(", ");
    } catch {
      value = "<nicht lesbar>";
    }

    console.log(
      `${name.padEnd(34).slice(0, 34)} ${type.padEnd(14)} ${JSON.stringify(value)}`,
    );
  }

  console.log("");
  return fields.length;
}

/* ------------------------------------------------------------------ *
 * 2. Textebene mit Positionen
 * ------------------------------------------------------------------ */

async function dumpTextLayer() {
  // pdfjs ist ein ESM-Modul mit Browser-Defaults; die Legacy-Variante läuft
  // ohne Worker und ohne DOM in Node.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
  }).promise;

  console.log("═".repeat(72));
  console.log(`TEXTEBENE — ${doc.numPages} Seite(n)`);
  console.log("═".repeat(72));

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    console.log(
      `\n── Seite ${pageNumber} (${Math.round(viewport.width)}×${Math.round(viewport.height)} pt) ──\n`,
    );

    const items = content.items
      .filter((item): item is typeof item & { str: string; transform: number[] } =>
        "str" in item && typeof (item as { str: unknown }).str === "string",
      )
      .map((item) => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        // Von unten-links auf oben-links umrechnen — so liest es sich wie
        // das Blatt vor einem liegt.
        y: Math.round(viewport.height - item.transform[5]),
      }))
      .filter((item) => item.text.length > 0);

    // Nach Zeilen gruppieren: alles innerhalb von 3 pt gilt als dieselbe.
    const rows = new Map<number, typeof items>();
    for (const item of items) {
      const key = [...rows.keys()].find((y) => Math.abs(y - item.y) <= 3);
      const bucket = rows.get(key ?? item.y) ?? [];
      bucket.push(item);
      rows.set(key ?? item.y, bucket);
    }

    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const row = rows.get(y)!.sort((a, b) => a.x - b.x);
      const rendered = row.map((i) => `${i.text}@${i.x}`).join("  ");
      console.log(`y=${String(y).padStart(4)}  ${rendered}`);
    }
  }

  console.log("");
}

/* ------------------------------------------------------------------ *
 * Lauf
 * ------------------------------------------------------------------ */

async function main() {
  console.log(`\nDatei: ${full}`);
  console.log(`Größe: ${(bytes.length / 1024).toFixed(0)} KB\n`);

  const fieldCount = await dumpFormFields();
  await dumpTextLayer();

  console.log("═".repeat(72));
  console.log(
    fieldCount > 0
      ? "FAZIT: Das PDF hat Formularfelder. Der Import kann sie direkt lesen —\n" +
          "exakt, ohne Raten. Schick mir die Feldnamen oben, dann schreibe ich\n" +
          "das Mapping."
      : "FAZIT: Keine Formularfelder, nur Textebene. Der Import muss über\n" +
          "Ankerpunkte gehen (Beschriftung suchen, Wert daneben lesen). Schick\n" +
          "mir die Ausgabe oben, dann bestimme ich die Anker.",
  );
  console.log("═".repeat(72) + "\n");
}

main().catch((error) => {
  console.error("\nFehlgeschlagen:", error instanceof Error ? error.message : error);
  console.error(
    "\nFalls das PDF passwortgeschützt ist oder nur ein Scan: dann gibt es\n" +
      "keine Textebene und der Import bräuchte OCR.",
  );
  process.exit(1);
});
