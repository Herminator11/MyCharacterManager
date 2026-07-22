/**
 * Alle Zeichen der App an einem Ort.
 *
 * Durchweg Inline-SVG: die App muss ohne Netz starten, also keine
 * Icon-Schrift und kein CDN. Durchweg `currentColor` und `viewBox="0 0 24
 * 24"`, damit ein Icon die Farbe seines Knopfes erbt und überall gleich
 * groß wirkt.
 *
 * Maßstab: Diese Dinger werden bei 14 bis 24 Pixeln gelesen, oft aus
 * Armlänge auf einem Handy neben einem Würfelbecher. Was bei 14 px zum
 * Fleck zerfällt, ist kein Icon, sondern Dekoration.
 */

type IconProps = { className?: string };

/**
 * Eigener Klassen-Zusammenbau statt `cx` aus `ui`: sonst hinge die
 * Icon-Datei an der UI-Datei, die ihrerseits Icons benutzt.
 */
function join(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function Icon({
  children,
  className,
  fill = "none",
  strokeWidth = 1.7,
}: IconProps & {
  children: React.ReactNode;
  fill?: string;
  strokeWidth?: number;
}) {
  // Die Standardgröße nur setzen, wenn der Aufrufer keine mitbringt: zwei
  // konkurrierende `size-*` würden sich danach entscheiden, welche im
  // erzeugten Stylesheet weiter unten steht — und das ist nichts, worauf
  // man ein Layout bauen sollte.
  const sized = /\bsize-/.test(className ?? "");

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={join(!sized && "size-3.5", "shrink-0", className)}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Der Stift — überall dort, wo aus Ablesen Ändern wird. */
export function PenIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.9}>
      {/* Spitze unten links, Feder oben rechts — die Richtung, in der eine
          rechtshändige Hand schreibt. */}
      <path d="M16.8 2.9 21.1 7.2 8.1 20.2 2.9 21.1 3.8 15.9z" />
      <path d="M14.4 5.3 18.7 9.6" />
    </Icon>
  );
}

/**
 * Der W20.
 *
 * Trägt die App als Marke und den Kampf als Knopf — beides ist derselbe
 * Gedanke: hier wird gewürfelt. Die innere Fläche ist die, auf der bei
 * einem echten Würfel die Zahl steht.
 */
export function D20Icon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.4}>
      <path d="M12 1.8 20.8 6.9 20.8 17.1 12 22.2 3.2 17.1 3.2 6.9z" />
      <path d="M12 6.4 17.6 16 6.4 16z" />
      <path d="M12 6.4V1.8M17.6 16 20.8 17.1M6.4 16 3.2 17.1" />
    </Icon>
  );
}

/**
 * Ein Schuh in Fahrt.
 *
 * Als Fläche gezeichnet, nicht als Umriss. Der erste Versuch war ein
 * Umriss mit Schnürung und Sohle — bei 14 px wurde daraus ein Wölkchen.
 * Eine geschlossene Silhouette übersteht jede Verkleinerung, weil sie
 * keine Innenkanten hat, die zusammenlaufen können.
 *
 * Die drei Fahrtlinien davor tragen das Tempo. Sie sind derselbe Griff,
 * den vorher der Pfeil benutzt hat — nur jetzt an einem Schuh.
 */
export function ShoeIcon({ className }: IconProps) {
  return (
    <Icon className={join("size-[1.15rem]", className)} strokeWidth={1.6}>
      <path
        d="M6.6 9.2h3.4l2.7 3.4 5.2 1.6c2.2.7 3.4 1.7 3.4 3v1.6H6.6z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M1.2 10h3.4M1.2 14.2h2.6M1.2 18.4h3.2" opacity="0.7" />
    </Icon>
  );
}

/** Trefferpunkte. Das Herz braucht keine Beschriftung. */
export function HeartIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.8}>
      <path d="M12 20.5 4.2 12.9a4.6 4.6 0 0 1 0-6.6 4.9 4.9 0 0 1 6.8 0l1 1 1-1a4.9 4.9 0 0 1 6.8 0 4.6 4.6 0 0 1 0 6.6z" />
    </Icon>
  );
}

/**
 * Schaden: der Einschlag.
 *
 * Kein Schwert und kein Blitz — beides gibt es hier schon (Angriffe, die
 * Initiative). Die geborstene Zacke ist das, was zurückbleibt, egal ob
 * der Schlag von einer Klinge oder einem Feuerball kam.
 */
export function BurstIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.5}>
      <path d="M12 1.9 14.4 7.6 20.1 5.4 18.2 11.2 23.4 14 17.6 15.4 18.6 21.3 13.4 18.3 10 23.1 8.2 17.5 2.4 18.2 5.6 13.3 1 9.7 6.8 8.9z" />
    </Icon>
  );
}

/** Heilung. Das Plus ist so eindeutig, dass jede Verzierung schadet. */
export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

/**
 * Ein Zettel mit Eselsohr — für den Vermerk, der über die Sitzung hinaus
 * gilt. Das umgeknickte Eck unterscheidet ihn von jedem anderen Rechteck
 * auf der Seite.
 */
export function NoteIcon({ className }: IconProps) {
  return (
    <Icon className={join("size-6", className)} strokeWidth={1.6}>
      <path d="M5.5 3.2h8.1l4.9 4.9v12.7H5.5z" />
      <path d="M13.6 3.2v4.9h4.9" />
      <path d="M8.8 12.4h6.4M8.8 16.1h4.2" opacity="0.75" />
    </Icon>
  );
}
