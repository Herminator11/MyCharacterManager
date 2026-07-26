"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/** Freitext, der automatisch speichert — kein Knopf. */
export function BackgroundEditor({
  defaultValue,
  save,
  placeholder = "Woher kommt dein Charakter?",
  ariaLabel = "Vorgeschichte",
}: {
  defaultValue: string;
  save: (value: string) => Promise<void>;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const saved = useRef(defaultValue);
  const [, startTransition] = useTransition();

  const flush = () => {
    if (value === saved.current) return;
    saved.current = value;
    startTransition(() => save(value));
  };

  useEffect(() => {
    const timer = setTimeout(flush, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <textarea
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={flush}
      rows={8}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full rounded-md border border-edge bg-ink px-3 py-2.5 text-fg placeholder:text-faint focus:border-patina focus:outline-none"
    />
  );
}
