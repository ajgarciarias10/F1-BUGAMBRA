const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Lo que un fichaje mueve en el presupuesto del equipo que lo hace.
 *
 * Un precio positivo se paga; uno negativo ingresa, porque el piloto se lleva
 * dinero consigo (regla Excel T2/T3). Es el mismo criterio que aplica
 * `ficharPiloto`, y vive aquí para que cobrar y devolver no puedan discrepar.
 */
export function cargoPorPrecio(precio: number): number {
  // Se comprueba `> 0` y no `< 0` para que un precio de 0 devuelva 0 y no -0,
  // que se colaría en la interfaz como «-0M».
  return precio > 0 ? -precio : Math.abs(precio);
}

/**
 * Presupuesto resultante de cambiar el precio de un piloto que ya está en el equipo.
 *
 * Se aplica solo la DIFERENCIA sobre el presupuesto guardado. Recalcularlo como
 * `inicial − coste de la plantilla` cobra dos veces: el inicial es el presupuesto
 * heredado, o sea lo que quedó después de pagar a esa plantilla en el split anterior.
 */
export function presupuestoTrasCambiarPrecio(presupuesto: number, antes: number, despues: number): number {
  return r1(presupuesto + cargoPorPrecio(despues) - cargoPorPrecio(antes));
}

/** Shared preview/validation result for admin transfer-price corrections. */
export function previsualizarAjustePrecio(presupuesto: number, antes: number, despues: number) {
  const saldo = r1(presupuesto);
  const presupuestoNuevo = presupuestoTrasCambiarPrecio(saldo, antes, despues);
  const delta = r1(presupuestoNuevo - saldo);
  return {
    delta,
    presupuestoNuevo,
    insuficiente: presupuestoNuevo < 0,
    faltante: r1(Math.max(0, -presupuestoNuevo)),
  };
}

export type CambioPrecioEconomico = {
  pilotId: string;
  pilotName?: string;
  antes: number;
  despues: number;
};

/** Shared calculation for preview and atomic admin price/balance reconciliation. */
export function previsualizarCorreccionEconomica(
  presupuesto: number,
  cambiosPrecio: CambioPrecioEconomico[],
  ajusteManual = 0,
) {
  if (!Number.isFinite(presupuesto) || !Number.isFinite(ajusteManual)) {
    throw new Error("El presupuesto y el ajuste manual deben ser números válidos.");
  }
  const cambios = cambiosPrecio.map(cambio => {
    if (!cambio.pilotId || !Number.isFinite(cambio.antes) || !Number.isFinite(cambio.despues)) {
      throw new Error("Cada cambio debe incluir piloto y precios válidos.");
    }
    return {
      ...cambio,
      delta: r1(cargoPorPrecio(cambio.despues) - cargoPorPrecio(cambio.antes)),
    };
  });
  const ajustePrecios = r1(cambios.reduce((total, cambio) => total + cambio.delta, 0));
  const ajusteManualRedondeado = r1(ajusteManual);
  const delta = r1(ajustePrecios + ajusteManualRedondeado);
  const presupuestoNuevo = r1(presupuesto + delta);
  return {
    cambios,
    ajustePrecios,
    ajusteManual: ajusteManualRedondeado,
    delta,
    presupuestoNuevo,
    insuficiente: presupuestoNuevo < 0,
    faltante: r1(Math.max(0, -presupuestoNuevo)),
  };
}
