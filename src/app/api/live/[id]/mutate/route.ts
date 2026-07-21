import { NextResponse, type NextRequest } from "next/server";

import type { LiveMutation } from "@/lib/live-types";
import { publish } from "@/lib/server/bus";
import { applyMutation } from "@/lib/server/live";

export const dynamic = "force-dynamic";

/**
 * Nimmt eine Live-Aktion entgegen, schreibt sie und verteilt den neuen
 * Zustand an die anderen Geräte.
 *
 * Der Aufrufer schickt seine `X-Client-Id` mit und bekommt die Antwort
 * direkt zurück; im Broadcast ist dieselbe Id als `originId` vermerkt,
 * damit das auslösende Gerät sein eigenes Echo verwerfen kann und seine
 * optimistische Anzeige nicht kurz zurückspringt.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/live/[id]/mutate">,
) {
  const { id } = await context.params;
  const characterId = Number(id);

  let mutation: LiveMutation;
  try {
    mutation = (await request.json()) as LiveMutation;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  if (!mutation || typeof mutation.type !== "string") {
    return NextResponse.json(
      { error: "Aktion ohne Typ" },
      { status: 400 },
    );
  }

  const state = applyMutation(characterId, mutation);
  if (!state) {
    return NextResponse.json(
      { error: "Charakter nicht gefunden" },
      { status: 404 },
    );
  }

  publish({ state, originId: request.headers.get("X-Client-Id") ?? "" });

  return NextResponse.json(state);
}
