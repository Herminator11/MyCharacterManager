import Link from "next/link";

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
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cx("size-6 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    >
      {/* Außenkante des Würfels … */}
      <path d="M12 1.8 L20.8 6.9 V17.1 L12 22.2 L3.2 17.1 V6.9 Z" />
      {/* … und die obenliegende Fläche, auf der die Zahl stünde. */}
      <path d="M12 6.4 L17.6 16 H6.4 Z" />
      <path d="M12 6.4 V1.8 M17.6 16 L20.8 17.1 M6.4 16 L3.2 17.1" />
    </svg>
  );
}

/**
 * Der Weg zurück zur Ablage.
 *
 * Steht links oben, weil dort jede App ihr Logo hat — und weil man einen
 * Ausweg nicht sucht, sondern erwartet. Die Trefferfläche ist größer als
 * das Zeichen: am Spieltisch trifft man mit dem Daumen ungenau.
 */
export function HomeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      title="Zur Charakterliste"
      aria-label="Zur Charakterliste"
      className={cx(
        "-m-2 shrink-0 p-2 text-patina transition-colors hover:text-fg",
        className,
      )}
    >
      <BrandMark />
    </Link>
  );
}
