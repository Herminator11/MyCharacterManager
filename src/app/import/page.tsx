import Link from "next/link";

import { ImportScreen } from "@/components/import/ImportScreen";
import { className as classLabel } from "@/lib/rules/classes";
import { listCharacters } from "@/lib/server/characters";

import {
  commitImportAction,
  commitReimportAction,
  planReimportAction,
  readSheetAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const targets = listCharacters().map((character) => ({
    id: character.id,
    name: character.name,
    summary:
      character.classes
        .map((c) => `${classLabel(c.classKey)} ${c.level}`)
        .join(" / ") || "Ohne Klasse",
  }));

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10">
      <header className="mb-6">
        <Link href="/" className="label transition-colors hover:text-patina">
          ← Charaktere
        </Link>
        <h1 className="mt-2 text-[2rem] leading-none font-semibold tracking-tight">
          Bogen importieren
        </h1>
      </header>

      <ImportScreen
        read={readSheetAction}
        commit={commitImportAction}
        targets={targets}
        plan={planReimportAction}
        commitUpdate={commitReimportAction}
      />
    </main>
  );
}
