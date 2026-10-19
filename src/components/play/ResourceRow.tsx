"use client";

import { Button, cx, Ratio } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import type { LiveResource } from "@/lib/live-types";

const RECOVERY_LABEL: Record<string, (t: Messages) => string> = {
  short: (t) => t.play.shortRecovery,
  long: (t) => t.play.longRecovery,
  none: (t) => t.play.noRecovery,
};

/**
 * Eine Klassenressource.
 *
 * Wenige Ladungen werden zu antippbaren Sockeln, viele zu einem Zähler mit
 * Plus/Minus — 15 Ki-Punkte als Sockelreihe wären am Handy unbedienbar.
 */
export function ResourceRow({
  resource,
  onChange,
}: {
  resource: LiveResource;
  onChange: (current: number) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{resource.name}</p>
        <p className="truncate text-xs text-faint">
          {resource.note ? `${resource.note} · ` : ""}
          {RECOVERY_LABEL[resource.recovery]?.(t) ?? resource.recovery}
        </p>
      </div>

      {resource.display === "pips" && resource.max <= 8 ? (
        <div className="flex gap-1.5">
          {Array.from({ length: resource.max }, (_, index) => {
            const filled = index < resource.current;
            return (
              <button
                key={index}
                type="button"
                onClick={() =>
                  onChange(filled ? resource.current - 1 : index + 1)
                }
                aria-label={`${resource.name} ${index + 1}`}
                className={cx(
                  "socket socket-brass",
                  filled ? "socket-full" : "socket-spent",
                )}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="w-11 px-0"
            onClick={() => onChange(resource.current - 1)}
            disabled={resource.current <= 0}
            aria-label={t.play.decrease(resource.name)}
          >
            −
          </Button>
          <span className="w-16 text-center text-sm">
            <Ratio
              current={resource.current}
              total={resource.max}
              className={
                resource.current > 0 ? "font-semibold text-brass" : "text-faint"
              }
            />
          </span>
          <Button
            size="sm"
            className="w-11 px-0"
            onClick={() => onChange(resource.current + 1)}
            disabled={resource.current >= resource.max}
            aria-label={t.play.increase(resource.name)}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
}
