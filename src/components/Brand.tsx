import Link from "next/link";

import { getT } from "@/lib/i18n/server";

import { D20Icon } from "./icons";
import { cx } from "./ui";

/**
 * Die Marke: ein W20.
 *
 * Kein Schild und kein Schwert — das Schild ist schon die AC im
 * Profilkopf, und zwei Wappenformen nebeneinander lesen sich als eine.
 * Der W20 ist außerdem das einzige Ding, das an jedem D&D-Tisch liegt.
 *
 * Bewusst als Inline-SVG: die App muss ohne Internet starten, also keine
 * Icon-Schrift und kein CDN.
 */
export function BrandMark({ className }: { className?: string }) {
  return <D20Icon className={cx("size-6", className)} />;
}

/**
 * Der Weg zurück zur Ablage.
 *
 * Steht links oben, weil dort jede App ihr Logo hat — und weil man einen
 * Ausweg nicht sucht, sondern erwartet. Die Trefferfläche ist größer als
 * das Zeichen: am Spieltisch trifft man mit dem Daumen ungenau.
 */
export async function HomeLink({ className }: { className?: string }) {
  const t = await getT();
  return (
    <Link
      href="/"
      title={t.header.home}
      aria-label={t.header.home}
      className={cx(
        "-m-2 shrink-0 p-2 text-patina transition-colors hover:text-fg",
        className,
      )}
    >
      <BrandMark />
    </Link>
  );
}
