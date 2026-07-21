/**
 * Trefferpunkt-Arithmetik.
 *
 * Bewusst eine eigene, reine Funktion: Server und Browser rechnen beide
 * damit — der Server autoritativ, der Browser für die sofortige Anzeige.
 * Zwei getrennte Implementierungen würden früher oder später auseinander-
 * laufen, und ausgerechnet bei HP fällt das mitten im Kampf am meisten auf.
 */

export type HpState = {
  hpCurrent: number;
  hpTemp: number;
};

export type HpChange = HpState & {
  /** Death Saves werden zurückgesetzt, sobald man wieder über 0 ist. */
  clearDeathSaves: boolean;
};

/**
 * Wendet Schaden (negativ) oder Heilung (positiv) an.
 *
 * Schaden zehrt zuerst die temporären Trefferpunkte auf, Heilung nie —
 * das ist die Regel, die beim schnellen Tippen am ehesten untergeht.
 */
export function applyHpDelta(
  state: HpState,
  hpMax: number,
  amount: number,
): HpChange {
  const delta = Math.round(amount);

  if (delta >= 0) {
    return setHp(state, hpMax, state.hpCurrent + delta);
  }

  let remaining = -delta;
  const absorbed = Math.min(state.hpTemp, remaining);
  remaining -= absorbed;

  const next = setHp(state, hpMax, state.hpCurrent - remaining);
  return { ...next, hpTemp: state.hpTemp - absorbed };
}

/** Setzt die aktuellen HP auf einen festen Wert, begrenzt auf 0…Maximum. */
export function setHp(state: HpState, hpMax: number, value: number): HpChange {
  const hpCurrent = Math.min(Math.max(Math.round(value), 0), Math.max(hpMax, 0));
  return {
    hpCurrent,
    hpTemp: state.hpTemp,
    clearDeathSaves: hpCurrent > 0,
  };
}
