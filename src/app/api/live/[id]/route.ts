import { NextResponse, type NextRequest } from "next/server";

import { getLiveState } from "@/lib/server/characters";
import { subscribe } from "@/lib/server/bus";

export const dynamic = "force-dynamic";

/**
 * SSE-Stream mit dem Live-Zustand eines Charakters.
 *
 * Der erste Frame ist immer der aktuelle Stand, damit ein frisch
 * verbundenes Gerät sofort synchron ist, ohne extra zu laden.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/live/[id]">,
) {
  const { id } = await context.params;
  const characterId = Number(id);

  // Kennung des Geräts, damit es sein eigenes Echo nicht zurückbekommt.
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "";

  const initial = getLiveState(characterId);
  if (!initial) {
    return NextResponse.json(
      { error: "Charakter nicht gefunden" },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let open = true;

      const send = (event: string, data: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Gegenstelle ist weg — beim nächsten abort() wird aufgeräumt.
          open = false;
        }
      };

      send("state", initial);

      const unsubscribe = subscribe(characterId, (event) => {
        // Das auslösende Gerät hat den Zustand schon aus der Antwort auf
        // seine eigene Anfrage — sein Echo würde nur eine überflüssige
        // Neuzeichnung anstoßen.
        if (event.originId && event.originId === clientId) return;
        send("state", event.state);
      });

      // Hält die Verbindung durch Proxies und schlafende WLAN-Adapter offen.
      const keepAlive = setInterval(() => {
        if (open) {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            open = false;
          }
        }
      }, 25_000);

      const close = () => {
        if (!open) return;
        open = false;
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Bereits geschlossen.
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Falls doch mal ein Proxy dazwischen hängt.
      "X-Accel-Buffering": "no",
    },
  });
}
