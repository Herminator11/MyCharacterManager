import { NextResponse, type NextRequest } from "next/server";

import { catalogExcluding } from "@/lib/server/spells";

export const dynamic = "force-dynamic";

/**
 * Tippsuche im Zauber-Katalog. Liefert nur, was der Charakter noch nicht
 * kennt, damit die Trefferliste keine Dubletten anbietet.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/characters/[id]/catalog">,
) {
  const { id } = await context.params;
  const characterId = Number(id);

  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json([]);

  const classKeys =
    params.get("classes")?.split(",").filter(Boolean) ?? [];

  // Ohne Klassenfilter einmal suchen, sonst je Klasse und zusammenführen.
  const results =
    classKeys.length === 0
      ? catalogExcluding(characterId, { query })
      : dedupe(
          classKeys.flatMap((classKey) =>
            catalogExcluding(characterId, { query, classKey }),
          ),
        );

  return NextResponse.json(
    results.slice(0, 40).map((spell) => ({
      id: spell.id,
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.castingTime,
      range: spell.range,
      concentration: spell.concentration,
      ritual: spell.ritual,
    })),
  );
}

/** Zauber mehrerer Klassenlisten zusammenführen, Reihenfolge wie in der DB. */
function dedupe<T extends { id: number; level: number; name: string }>(
  items: T[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...byId.values()].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
  );
}
