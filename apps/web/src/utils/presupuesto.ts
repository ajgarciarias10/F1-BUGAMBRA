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
