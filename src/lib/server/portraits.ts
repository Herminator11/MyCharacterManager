import "server-only";

import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { db } from "@/db";
import { characters } from "@/db/schema";

/**
 * Charakter-Portraits liegen als Dateien unter data/portraits/ statt als
 * Blob in der Datenbank — so bleibt „Backup ist ein cp des data-Ordners“
 * wahr, und die Datenbank bleibt klein genug, um sie schnell zu kopieren.
 */

/**
 * Über DATA_DIR umlenkbar — die Tests zeigen damit auf ein temporäres
 * Verzeichnis, statt den echten Portrait-Ordner anzufassen.
 */
export const PORTRAIT_DIR = path.join(
  process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
  "portraits",
);

/** Erlaubte Bildformate mit ihrer Dateiendung. */
const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Erwartbare Ablehnung eines Uploads. Trägt die Art statt eines fertigen
 * Satzes: der Text entsteht erst in der Server Action, die die Sprache des
 * Geräts kennt.
 */
export class PortraitError extends Error {
  constructor(
    readonly kind: "empty" | "tooLarge" | "type",
    readonly megabytes = 0,
  ) {
    super(kind);
  }
}

export async function savePortrait(characterId: number, file: File) {
  if (file.size === 0) throw new PortraitError("empty");
  if (file.size > MAX_BYTES) {
    throw new PortraitError("tooLarge", file.size / 1024 / 1024);
  }

  const extension = ALLOWED.get(file.type);
  if (!extension) {
    throw new PortraitError("type");
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Inhaltsbasierter Name: dasselbe Bild landet nicht mehrfach auf der
  // Platte, und der Dateiname verrät nichts über die hochgeladene Datei.
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  const filename = `${characterId}-${digest.slice(0, 16)}.${extension}`;

  fs.mkdirSync(PORTRAIT_DIR, { recursive: true });
  fs.writeFileSync(path.join(PORTRAIT_DIR, filename), bytes);

  const previous = db
    .select({ portraitFile: characters.portraitFile })
    .from(characters)
    .where(eq(characters.id, characterId))
    .get()?.portraitFile;

  db.update(characters)
    .set({ portraitFile: filename })
    .where(eq(characters.id, characterId))
    .run();

  if (previous && previous !== filename) removeFile(previous);

  return filename;
}

export function clearPortrait(characterId: number) {
  const current = db
    .select({ portraitFile: characters.portraitFile })
    .from(characters)
    .where(eq(characters.id, characterId))
    .get()?.portraitFile;

  db.update(characters)
    .set({ portraitFile: "" })
    .where(eq(characters.id, characterId))
    .run();

  if (current) removeFile(current);
}

/**
 * Löst einen gespeicherten Dateinamen zu einem Pfad auf.
 * Gibt null zurück, wenn der Name aus dem Portrait-Ordner herauszeigt.
 */
export function resolvePortrait(filename: string): string | null {
  if (!filename) return null;

  const full = path.join(PORTRAIT_DIR, filename);
  // Schutz gegen "../"-Namen, falls je etwas anderes als savePortrait schreibt.
  if (path.dirname(path.resolve(full)) !== path.resolve(PORTRAIT_DIR)) {
    return null;
  }
  return fs.existsSync(full) ? full : null;
}

export function contentTypeOf(filename: string): string {
  const extension = path.extname(filename).slice(1).toLowerCase();
  for (const [type, ext] of ALLOWED) if (ext === extension) return type;
  return "application/octet-stream";
}

function removeFile(filename: string) {
  const full = resolvePortrait(filename);
  if (full) fs.rmSync(full, { force: true });
}
