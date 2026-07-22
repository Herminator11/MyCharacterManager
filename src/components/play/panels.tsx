"use client";

import { Panel, SectionLabel } from "@/components/ui";
import type { LiveMutation, LiveState } from "@/lib/live-types";

import { ResourceRow } from "./ResourceRow";
import { SlotRail } from "./SlotRail";

/**
 * Zauberplätze und Ressourcen als eigenständige Panels.
 *
 * Übersicht und Kampfmodus zeigen beide dieselben Pools — herausgelöst,
 * damit die zwei Seiten nicht zwei Kopien derselben Sockelreihen pflegen.
 */

export function PoolsPanel({
  state,
  send,
}: {
  state: LiveState;
  send: (mutation: LiveMutation) => void;
}) {
  if (state.pools.length === 0) return null;

  return (
    <Panel>
      <div className="space-y-5">
        {state.pools.map((pool) => (
          <div key={pool.id}>
            <SectionLabel
              right={
                <span className="text-[0.6875rem] text-faint">
                  {pool.recovery === "short" ? "kurze Rast" : "lange Rast"}
                </span>
              }
            >
              {pool.name}
            </SectionLabel>
            <div className="space-y-2">
              {pool.slots.map((slot) => (
                <SlotRail
                  key={slot.level}
                  level={slot.level}
                  total={slot.total}
                  used={slot.used}
                  // Pact Magic bleibt warm: zwei Reihen blauer Quadrate mit
                  // derselben Ziffer wären im Kampf nicht auseinander-
                  // zuhalten, und genau das unterscheidet die Pools.
                  tone={pool.recovery === "short" ? "ember" : "arcane"}
                  onChange={(used) =>
                    send({ type: "slot.set", poolId: pool.id, level: slot.level, used })
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ResourcesPanel({
  state,
  send,
}: {
  state: LiveState;
  send: (mutation: LiveMutation) => void;
}) {
  if (state.resources.length === 0) return null;

  return (
    <Panel>
      <SectionLabel>Ressourcen</SectionLabel>
      <div className="divide-y divide-edge">
        {state.resources.map((resource) => (
          <ResourceRow
            key={resource.id}
            resource={resource}
            onChange={(current) =>
              send({ type: "resource.set", resourceId: resource.id, current })
            }
          />
        ))}
      </div>
    </Panel>
  );
}
