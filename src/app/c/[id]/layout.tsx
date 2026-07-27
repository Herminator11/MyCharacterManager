import Link from "next/link";
import { notFound } from "next/navigation";

import { HomeLink } from "@/components/Brand";
import { ClassBackground } from "@/components/ClassBackground";
import { StickyStats } from "@/components/StickyStats";
import { TabBar } from "@/components/TabBar";
import { characterIdFromParam, characterPath } from "@/lib/characterUrl";
import { className as classLabel } from "@/lib/rules/classes";
import { formatModifier } from "@/lib/rules/derive";
import { getSheet } from "@/lib/server/characters";

export const dynamic = "force-dynamic";

export default async function CharacterLayout({
  children,
  params,
}: LayoutProps<"/c/[id]">) {
  const { id } = await params;
  const characterId = characterIdFromParam(id);
  const sheet = getSheet(characterId);
  if (!sheet) notFound();

  const classes = sheet.classes
    .map((c) => `${classLabel(c.classKey)} ${c.level}`)
    .join(" / ");

  return (
    <div className="pb-20">
      <ClassBackground
        enabled={sheet.character.backgroundThemeEnabled}
        classes={sheet.classes}
      />

      {/* Statusleiste: die Werte, die man im Kampf ständig nennt, immer
          sichtbar — sie scrollt bewusst nicht weg. */}
      <header className="sticky top-0 z-20 border-b border-edge bg-ink/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <HomeLink />

            <div className="min-w-0 flex-1">
              <Link
                href={characterPath(characterId, sheet.character.name, "/sheet")}
                className="block truncate text-base leading-tight font-semibold tracking-tight hover:text-patina"
              >
                {sheet.character.name}
              </Link>
              <p className="truncate text-xs text-faint">
                {classes || "Ohne Klasse"}
                {sheet.character.race ? ` · ${sheet.character.race}` : ""}
              </p>
            </div>

            {/* Auf der Übersicht stehen dieselben Zahlen groß im
                Profilkopf. Sie erscheinen hier erst, wenn der aus dem Bild
                gescrollt ist — zweimal dasselbe kostet Aufmerksamkeit und
                fügt nichts hinzu. */}
            <StickyStats>
              <dl className="flex shrink-0 gap-3.5 text-center">
                <MiniStat label="AC" value={sheet.armorClass} />
                <MiniStat
                  label="Init"
                  value={formatModifier(sheet.initiative)}
                />
                <MiniStat label="Speed" value={sheet.character.speed} />
                <MiniStat label="PP" value={sheet.passivePerception} />
              </dl>
            </StickyStats>
          </div>
        </div>
      </header>

      {/*
        Breit genug für zwei Spalten auf der Übersicht. Die Unterseiten
        sind überwiegend Formulare und begrenzen sich selbst — ein
        Textfeld über die volle Breite eines 27-Zöllers liest sich schlecht.
      */}
      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>

      <TabBar characterId={characterId} characterName={sheet.character.name} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dd className="text-base leading-none font-semibold">{value}</dd>
      <dt className="label mt-1 text-[0.5625rem]">{label}</dt>
    </div>
  );
}
