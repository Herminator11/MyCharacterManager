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

/* ------------------------------------------------------------------ *
 * Reiterleiste
 * ------------------------------------------------------------------ */

/** Übersicht: der Charakter selbst. */
export function BustIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.7}>
      <path d="M12 4a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z" />
      <path d="M4.5 20.5c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7" />
    </Icon>
  );
}

/** Zauber: der Funke. Vier Spitzen, weil fünf schon ein Stern wären — und
    der Stern markiert auf der Startseite Favoriten. */
export function SparkIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M12 2.5c1.3 5.4 2.8 6.9 8.2 8.2-5.4 1.3-6.9 2.8-8.2 8.2-1.3-5.4-2.8-6.9-8.2-8.2 5.4-1.3 6.9-2.8 8.2-8.2z" />
      <path d="M18.6 16.4c.5 2 1 2.5 3 3-2 .5-2.5 1-3 3-.5-2-1-2.5-3-3 2-.5 2.5-1 3-3z" />
    </Icon>
  );
}

/**
 * Angriffe: eine Klinge, senkrecht.
 *
 * Der erste Versuch lag diagonal, mit Spitze aus zwei Strichen — bei 18 px
 * war das ein Pfeil. Aufrecht mit Parierstange und Knauf ist die Silhouette
 * eindeutig, weil kein anderes Zeichen dieses Kreuz unten trägt.
 */
export function SwordIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M12 2 14.3 6.4V13.2H9.7V6.4z" />
      <path d="M6.5 14.2h11M12 14.2v5.4" />
      <path d="M12 19.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z" />
    </Icon>
  );
}

/**
 * Der Kampf: zwei Klingen, die sich kreuzen.
 *
 * Steht auf „Roll Initiative…“ statt des W20 — der gehört der Marke oben
 * links, und zweimal dasselbe Zeichen auf einer Seite liest sich als
 * Versehen.
 */
export function CrossedSwordsIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.7}>
      {/* Klinge von links unten nach rechts oben, mit Spitze … */}
      <path d="M14.6 9.4 20.8 3.2M17.6 3.2h3.2v3.2M3.2 20.8l3.4-3.4M6.6 14.2l3.2 3.2" />
      {/* … und die Gegenklinge. */}
      <path d="M9.4 9.4 3.2 3.2M6.4 3.2H3.2v3.2M20.8 20.8l-3.4-3.4M17.4 14.2l-3.2 3.2" />
      <path d="M9.4 9.4 14.6 14.6M14.6 9.4 9.4 14.6" />
    </Icon>
  );
}

/** Gepäck: der Rucksack. */
export function BackpackIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M5 10.5a4.5 4.5 0 0 1 4.5-4.5h5A4.5 4.5 0 0 1 19 10.5V20.5H5z" />
      <path d="M9.5 6V5a2.5 2.5 0 0 1 5 0v1" />
      <path d="M8.5 13.5h7v4h-7z" />
    </Icon>
  );
}

/** Bogen: das Blatt mit den Werten. */
export function SheetIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M4.5 3.5h15v17h-15z" />
      <path d="M8.5 7.8a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z" />
      <path d="M13 8.4h3M13 11h3M8 15.5h8M8 18h5" opacity="0.8" />
    </Icon>
  );
}

/** Notizen: das Buch, in dem alles landet, was bleiben soll. */
export function BookIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M5 4.2c0-.9.8-1.7 1.7-1.7H19v19H6.7c-.9 0-1.7-.8-1.7-1.7z" />
      <path d="M5 17.5h14" />
      <path d="M9 6.5h6" opacity="0.8" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ *
 * Rast, Würfel, Tod
 * ------------------------------------------------------------------ */

/** Kurze Rast: das Lagerfeuer. Die Scheite unterscheiden es von der
    Inspirationsflamme, die allein steht. */
export function CampfireIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M12 2.8c2.4 2.2 3.9 4 3.9 6.3a3.9 3.9 0 1 1-7.8 0c0-1.2.5-2.3 1.3-3.3.2.7.6 1.3 1.2 1.6.4-1.9.7-3.3 1.4-4.6z" />
      <path d="M3.5 17 20.5 21M20.5 17 3.5 21" />
    </Icon>
  );
}

/** Lange Rast: der Mond. */
export function MoonIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.7}>
      <path d="M20.5 15.2A8.8 8.8 0 0 1 9.3 3.8a9.2 9.2 0 1 0 11.2 11.4z" />
    </Icon>
  );
}

/** Trefferwürfel. Bewusst ein Pöppelwürfel und kein W20 — der steht für
    den Kampf, und hier wird nur gerastet. */
export function DieIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M4.5 7.2c0-1.5 1.2-2.7 2.7-2.7h9.6c1.5 0 2.7 1.2 2.7 2.7v9.6c0 1.5-1.2 2.7-2.7 2.7H7.2a2.7 2.7 0 0 1-2.7-2.7z" />
      <path
        d="M8.6 7.4a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM12 10.7a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM15.4 14a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  );
}

/** Death Saves. Das einzige Zeichen der App, das nichts beschönigt. */
export function SkullIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={1.6}>
      <path d="M12 2.8a8.2 8.2 0 0 0-8.2 8.2v3.4c0 .9.6 1.6 1.4 1.8l1.3.3v4h11v-4l1.3-.3c.8-.2 1.4-.9 1.4-1.8V11A8.2 8.2 0 0 0 12 2.8z" />
      <path
        d="M8.9 9.8a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM15.1 9.8a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M10 16.4v4M14 16.4v4" opacity="0.7" />
    </Icon>
  );
}

/* ------------------------------------------------------------------ *
 * Conditions
 * ------------------------------------------------------------------ */

/**
 * Ein Zeichen je Condition.
 *
 * Der schwierigste Satz der App: fünfzehn Begriffe, die sich inhaltlich
 * überschneiden (Paralyzed, Stunned, Incapacitated sind Abstufungen
 * desselben Gedankens), auf fünfzehn unterscheidbare Formen. Deshalb
 * steht der Name weiter neben dem Chip — das Zeichen hilft beim
 * Wiederfinden, es ersetzt das Wort nicht.
 *
 * Unbekannte Keys bekommen nichts: eine selbst angelegte Condition soll
 * lieber ohne Zeichen dastehen als mit einem falschen.
 */
export function ConditionIcon({
  conditionKey,
  className,
}: IconProps & { conditionKey: string }) {
  const draw = CONDITION_PATHS[conditionKey];
  if (!draw) return null;

  return (
    <Icon className={className} strokeWidth={1.6}>
      {draw}
    </Icon>
  );
}

const CONDITION_PATHS: Record<string, React.ReactNode> = {
  // Auge mit Strich — und das geschlossene Auge steht bei unconscious.
  blinded: (
    <>
      <path d="M2.5 12S6.3 6 12 6s9.5 6 9.5 6-3.8 6-9.5 6-9.5-6-9.5-6z" />
      <path d="M12 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z" />
      <path d="M4 20 20 4" />
    </>
  ),
  charmed: (
    <>
      <path d="M12 20 5.2 13.2a4.1 4.1 0 0 1 0-5.9 4.4 4.4 0 0 1 6.1 0l.7.7.7-.7a4.4 4.4 0 0 1 6.1 0 4.1 4.1 0 0 1 0 5.9z" />
      <path d="M19.5 2.5v3M18 4h3" opacity="0.8" />
    </>
  ),
  // Stummer Lautsprecher — eine Ohrmuschel zerfällt bei 14 px.
  deafened: (
    <>
      <path d="M4 9.5h3.5L12 6v12L7.5 14.5H4z" />
      <path d="M15.5 9 21 14.5M21 9l-5.5 5.5" />
    </>
  ),
  exhaustion: (
    <>
      <path d="M6 3.5h12M6 20.5h12" />
      <path d="M7.5 3.5c0 4 4.5 6 4.5 8.5s-4.5 4.5-4.5 8.5M16.5 3.5c0 4-4.5 6-4.5 8.5s4.5 4.5 4.5 8.5" />
    </>
  ),
  frightened: (
    <>
      <path d="M12 3.2 22 20.4H2z" />
      <path d="M12 9.5v4.2M12 17h.01" />
    </>
  ),
  // Zwei Pfeile, die von beiden Seiten zupacken.
  grappled: (
    <>
      <path d="M2.5 12h5.5M5.5 9 8.5 12l-3 3M21.5 12H16M18.5 9 15.5 12l3 3" />
      <path d="M12 9.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z" />
    </>
  ),
  incapacitated: (
    <>
      <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z" />
      <path d="M5.6 5.6 18.4 18.4" />
    </>
  ),
  // Gestrichelter Umriss: da ist jemand, man sieht ihn nur nicht.
  invisible: (
    <>
      <path
        d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z"
        strokeDasharray="3 3.2"
      />
    </>
  ),
  paralyzed: (
    <>
      <path d="M5.5 11h13v9.5h-13z" />
      <path d="M8.5 11V7.8a3.5 3.5 0 0 1 7 0V11" />
    </>
  ),
  petrified: (
    <>
      <path d="M3.5 16.5 7 8l5.5-3.5 8 4.5-1.5 7.5-6 4z" />
      <path d="M7 8l5 4.5 6.5-3.5M12 12.5l1 8" opacity="0.75" />
    </>
  ),
  poisoned: (
    <>
      <path d="M12 2.8s6.2 6.8 6.2 10.9a6.2 6.2 0 0 1-12.4 0C5.8 9.6 12 2.8 12 2.8z" />
    </>
  ),
  prone: (
    <>
      <path d="M12 3v10.5M7.8 9.8 12 14l4.2-4.2" />
      <path d="M3.5 20h17" />
    </>
  ),
  // Zwei Kettenglieder.
  restrained: (
    <>
      <path d="M9 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM15 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" />
    </>
  ),
  stunned: (
    <>
      <path d="M8 3.5c.7 2.9 1.5 3.7 4.4 4.4-2.9.7-3.7 1.5-4.4 4.4-.7-2.9-1.5-3.7-4.4-4.4C6.5 7.2 7.3 6.4 8 3.5z" />
      <path d="M17 10c.5 2 1 2.5 3 3-2 .5-2.5 1-3 3-.5-2-1-2.5-3-3 2-.5 2.5-1 3-3z" />
      <path d="M10 18.5c.3 1.2.6 1.5 1.8 1.8-1.2.3-1.5.6-1.8 1.8-.3-1.2-.6-1.5-1.8-1.8 1.2-.3 1.5-.6 1.8-1.8z" />
    </>
  ),
  // Geschlossenes Auge.
  unconscious: (
    <>
      <path d="M3 10c3.2 4.4 14.8 4.4 18 0" />
      <path d="M5.6 14.2 4.2 16.6M12 15.6V18.4M18.4 14.2l1.4 2.4" />
    </>
  ),
};

/* ------------------------------------------------------------------ *
 * Aktionsökonomie
 * ------------------------------------------------------------------ */

/**
 * Die drei Konten eines Zuges als Form: Kreis, Dreieck, Raute.
 *
 * Aus Baldur's Gate übernommen, weil es dort funktioniert: Der grüne
 * Kreis ist die Aktion, das orange Dreieck die Bonusaktion. Die Farbe
 * gehört zur Form dazu — grün heißt „das Große geht noch“, orange „nur
 * noch das Kleine“. Die Reaktion hat in BG3 kein eigenes Zeichen; hier
 * bekommt sie die Raute in Messing, weil sie zwischen den Zügen liegt
 * und zu keinem der beiden gehört.
 *
 * `filled` unterscheidet frei von verbraucht: eine volle Form ist da,
 * ein Umriss ist die Erinnerung daran, dass sie es einmal war.
 */
export function ActionShape({
  kind,
  filled = true,
  className,
}: IconProps & {
  kind: "action" | "bonus" | "reaction";
  filled?: boolean;
}) {
  const path =
    kind === "action"
      ? "M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8z"
      : kind === "bonus"
        ? "M12 3.4 21.2 20.2H2.8z"
        : "M12 2.8 21.2 12 12 21.2 2.8 12z";

  return (
    <Icon className={className} strokeWidth={filled ? 1.4 : 1.8}>
      <path d={path} fill={filled ? "currentColor" : "none"} />
    </Icon>
  );
}
