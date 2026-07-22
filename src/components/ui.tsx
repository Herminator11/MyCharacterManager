import type { ComponentProps, ReactNode } from "react";

/** Zusammenfügen von Klassen — kürzer als jedes Mal filter/join zu schreiben. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Abgesetzte Fläche für einen zusammengehörigen Block. */
export function Panel({
  className,
  children,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      className={cx(
        "rounded-lg border border-edge bg-panel px-4 py-3.5",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="label">{children}</h2>
      {right}
    </div>
  );
}

/**
 * Der Stift — überall dort, wo aus Ablesen Ändern wird.
 *
 * Zeichnet sich mit `currentColor`, damit er den Zustand des Knopfes
 * mitmacht, statt eine zweite Farbe in die Zeile zu bringen.
 */
export function PenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cx("size-3.5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Spitze unten links, Feder oben rechts — die Richtung, in der eine
          rechtshändige Hand schreibt. */}
      <path d="M11.2 1.9 14.1 4.8 5.4 13.5 2 14l.5-3.4z" />
      <path d="M9.6 3.5 12.5 6.4" />
    </svg>
  );
}

/**
 * Der Umschalter in den Bearbeiten-Modus.
 *
 * Heißt überall gleich und trägt überall denselben Stift: „Edit“ ist an
 * genug Stellen dasselbe Versprechen, dass es sich lohnt, es nicht jedes
 * Mal neu zu formulieren. Im aktiven Zustand steht dort „Fertig“ — ohne
 * Stift, denn dann ist nichts mehr zu öffnen.
 */
export function EditToggle({
  editing,
  onClick,
  className,
}: {
  editing: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={editing}
      className={cx(
        "inline-flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-patina",
        className,
      )}
    >
      {editing ? null : <PenIcon />}
      {editing ? "Fertig" : "Edit"}
    </button>
  );
}

/**
 * Verbraucht von Vorrat — Zauberplätze, Ressourcen, Trefferwürfel.
 *
 * Der Schrägstrich bekommt Luft nach beiden Seiten und bleibt matt: er
 * trennt zwei Zahlen, er ist keine. Ohne diesen Abstand verschmelzen
 * "2/2" und "5/5" aus Armlänge zu einem einzigen Zeichenklumpen.
 */
export function Ratio({
  current,
  total,
  className,
}: {
  current: ReactNode;
  total: ReactNode;
  /** Farbe des vorderen Werts — der hintere bleibt immer zurückgenommen. */
  className?: string;
}) {
  return (
    <span className="tabular-nums whitespace-nowrap">
      <span className={className}>{current}</span>
      <span className="mx-[0.2em] text-faint">/</span>
      <span className="text-faint">{total}</span>
    </span>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "solid" | "outline" | "ghost" | "danger" | "heal";
  size?: "sm" | "md" | "lg";
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  solid: "bg-patina text-ink font-semibold hover:bg-patina/90",
  outline:
    "border border-edge-bright bg-panel-2 text-fg hover:border-patina hover:text-patina",
  ghost: "text-mute hover:text-fg",
  danger:
    "border border-ember-dim bg-ember-deep text-ember hover:border-ember",
  // Spiegelbild zu danger: gleiche Form, gegenteilige Farbe. Schaden und
  // Heilung stehen nebeneinander und müssen ohne Lesen unterscheidbar sein.
  heal: "border border-patina-dim bg-patina-deep text-patina hover:border-patina",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  // Alle Größen bleiben über 44 px hoch — Fingerbedienung am Spieltisch.
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-12 px-4 text-[0.9375rem]",
  lg: "min-h-14 px-5 text-base",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md transition-colors",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}

/** Kompakte Kennzahl für die Statusleiste: großer Wert, kleines Label. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xl leading-none font-semibold">{value}</span>
      <span className="label">{label}</span>
      {hint ? <span className="text-[0.625rem] text-faint">{hint}</span> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-edge px-5 py-8 text-center">
      <p className="text-sm font-medium text-mute">{title}</p>
      {children ? (
        <div className="mt-3 text-sm text-faint">{children}</div>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </label>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-md border border-edge bg-ink px-3 text-fg " +
  "placeholder:text-faint focus:border-patina focus:outline-none";
