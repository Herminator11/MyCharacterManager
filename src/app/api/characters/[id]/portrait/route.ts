import fs from "node:fs";
import { NextResponse } from "next/server";

import { getCharacter } from "@/lib/server/characters";
import { contentTypeOf, resolvePortrait } from "@/lib/server/portraits";

/**
 * Liefert das Portrait aus data/portraits/ aus. Der Ordner liegt außerhalb
 * von public/, damit das gesamte data-Verzeichnis eine Backup-Einheit bleibt.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/characters/[id]/portrait">,
) {
  const { id } = await context.params;

  const character = getCharacter(Number(id));
  if (!character?.portraitFile) {
    return new NextResponse(null, { status: 404 });
  }

  const full = resolvePortrait(character.portraitFile);
  if (!full) return new NextResponse(null, { status: 404 });

  return new NextResponse(fs.readFileSync(full), {
    headers: {
      "Content-Type": contentTypeOf(character.portraitFile),
      // Der Dateiname enthält den Inhalts-Hash, also ändert er sich bei
      // jedem neuen Bild — dauerhaft cachen ist damit gefahrlos.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
