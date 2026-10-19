"use server";

import { cookies } from "next/headers";

import { isMode, MODE_COOKIE, MODE_COOKIE_MAX_AGE } from "@/lib/i18n/modes";

/**
 * Setzt den Sprachmodus für dieses Gerät. Als Server Action, weil
 * Server-Komponenten beim Rendern keine Cookies schreiben dürfen; der
 * Aufrufer lädt danach neu, damit die Seite in der neuen Sprache kommt.
 */
export async function setModeAction(mode: string) {
  if (!isMode(mode)) return;
  const store = await cookies();
  store.set(MODE_COOKIE, mode, {
    maxAge: MODE_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
}
