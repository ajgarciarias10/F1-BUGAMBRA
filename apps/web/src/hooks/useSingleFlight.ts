import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Guarda de "un solo vuelo" para acciones de escritura.
 *
 * El flag se marca de forma SÍNCRONA, así que un segundo clic en el mismo tick
 * (antes de que React re-renderice y aplique `disabled`) es un no-op.
 */
export function createSingleFlight(onChange?: (pending: boolean) => void) {
  let inFlight = false;

  async function run<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
    if (inFlight) return undefined;
    inFlight = true;
    onChange?.(true);
    try {
      return await fn();
    } finally {
      inFlight = false;
      onChange?.(false);
    }
  }

  function guard<A extends unknown[], T>(fn: (...args: A) => Promise<T> | T) {
    return (...args: A): Promise<T | undefined> => run(() => fn(...args));
  }

  return { run, guard, isPending: () => inFlight };
}

/** Hook: `run(fn)` / `guard(fn)` ignoran llamadas mientras haya una en curso; `pending` es para la UI. */
export function useSingleFlight() {
  const [pending, setPending] = useState(false);
  const setPendingRef = useRef(setPending);
  setPendingRef.current = setPending;
  const flight = useMemo(() => createSingleFlight(value => setPendingRef.current(value)), []);
  const run = useCallback(flight.run, [flight]);
  const guard = useCallback(flight.guard, [flight]);
  return { run, guard, pending };
}
