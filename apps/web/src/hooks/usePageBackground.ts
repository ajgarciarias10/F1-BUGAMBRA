import { useEffect } from "react";

/**
 * Tiñe el fondo del documento mientras una pantalla está montada.
 *
 * El `body` es gris claro porque la portada tiene tema claro. Las pantallas
 * oscuras pintan su propio fondo, pero solo dentro de su caja: en el rebote del
 * scroll en móvil, y en cualquier hueco antes de que React monte, asoma el gris
 * por debajo y parece que la pantalla se ha quedado en blanco.
 */
export function usePageBackground(color: string) {
  useEffect(() => {
    const raiz = document.documentElement;
    const anterior = raiz.style.backgroundColor;
    raiz.style.backgroundColor = color;
    return () => { raiz.style.backgroundColor = anterior; };
  }, [color]);
}
