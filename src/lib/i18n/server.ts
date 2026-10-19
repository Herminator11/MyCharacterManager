import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { getMessages, type Messages } from "./messages";
import { MODE_COOKIE, resolveMode, type Mode } from "./modes";

/**
 * Der Modus dieser Anfrage. `cache`, weil Layout, Seite und jede
 * Server-Komponente darunter ihn einzeln erfragen — einmal pro Anfrage
 * Cookie und Header lesen genügt.
 */
export const getMode = cache(async (): Promise<Mode> => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveMode(cookieStore.get(MODE_COOKIE)?.value, headerList.get("accept-language"));
});

export async function getT(): Promise<Messages> {
  return getMessages(await getMode());
}
