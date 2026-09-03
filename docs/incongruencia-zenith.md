# Incongruencia de 0,9M en Zenith

**Estado:** abierta. Descartadas tres hipótesis; la cuarta necesita el Excel.
**Fecha:** abierta el 3 de septiembre de 2026.
**Impacto:** el saldo de apertura del Split 3 de Zenith. Ninguna otra cifra depende de esto.

## Qué pasaba

La apertura del Split 3 de Zenith derivada de los datos daba 111,3M y la hoja decía 110,4M.
Alfa Romero y Roses cuadraban al decimal, así que el error era de Zenith en concreto y no del
modelo económico.

## Lo que se ha descartado

Reconstruyendo la fórmula de la hoja —`Presupuesto final = 100M + Generado − Σ(Fichajes +
Rivalidades + Premios de cada tramo)`— y comparándola contra `economia_historica` en
Firestore, todo cuadra al decimal salvo un número:

| | Generado | T1 | T2 | Cierre S2 derivado | Cierre S2 guardado |
|---|---|---|---|---|---|
| Zenith | 193,4M ✓ | −65,0M ✓ | +195,3M ✓ | 163,1M | 163,1M ✓ |
| Roses | 177,3M ✓ | +58,5M ✓ | +102,9M ✓ | 115,9M | 115,9M ✓ |
| Alfa Romero | 153,2M ✓ | +77,0M ✓ | +11,0M ✓ | 165,2M | 165,2M ✓ |

Esto descarta que el cierre del Split 2 de Zenith esté mal transcrito (163,1M es correcto,
confirmado por dos caminos independientes) y descarta que los puntos de constructores estén
mal. El desvío está encerrado en el tramo 3: la hoja dice que Zenith gastó **52,7M** en el
mercado del Split 2 al 3, y el roster real solo suma **51,8M**.

Las dos operaciones de Zenith en ese mercado están confirmadas y coinciden exactamente con lo
guardado en Firestore — no hacía falta corregir nada ahí:

```
splits/split_3/equipos/equipo_zenith/pilotos/piloto_moles.precio_compra   = 36.6
splits/split_3/equipos/equipo_zenith/pilotos/piloto_pabliyo.precio_compra = 15.2
                                                              36,6 + 15,2 = 51,8M
```

**Pista descartada:** el único 0,9M que existe en toda la base es la cláusula de Pabliyo en
el Split 1 (`0,5M × 1,8`). La coincidencia hizo pensar que su precio de traspaso al Split 3
debía llevar ese arrastre (15,2 + 0,9 = 16,1M), pero es una coincidencia sin relación: la
operación que se está investigando es el mercado del Split 2 al 3, no la curva del Split 1, y
el precio de 15,2M ya es el correcto para ese traspaso. Descartada.

## Lo que queda por mirar

El desvío de 0,9M está en la propia hoja: su total del tramo 3 (52,7M) no coincide con la
suma de sus dos únicas operaciones (51,8M) tal como están confirmadas. Solo puede venir de
una de estas dos cosas, y ninguna se puede resolver sin el Excel delante:

1. **El precio de una de las dos operaciones en la hoja no es el que se transcribió aquí.**
   Si Moles o Pabliyo costaron 0,9M más en la celda original, sale la cuenta.
2. **La celda de la hoja tiene un error de redondeo o arrastre** y el valor correcto es
   111,3M, no 110,4M.

## Cómo está resuelto mientras tanto

El presupuesto inicial del Split 3 se puede derivar del cierre del Split 2 desde el panel de
Economía (botón *Derivar apertura desde split_2*, en `apps/web/src/services/splitBuilder.ts`).
Con los datos actuales da **111,3M** para Zenith, **163,9M** para Alfa Romero y **98,8M** para
Roses — este último ya con el traspaso de Jota aplicado, que es posterior a la hoja
transcrita (145,9 − 47,1 = 98,8).

Si se confirma con el Excel que la cifra correcta de Zenith es 110,4M, se ajusta a mano en el
mismo panel (campo *Inicial* de la tabla de escuderías) tras aplicar la derivación. Mientras
tanto se deja en el valor derivado de los datos reales, 111,3M, por ser el que no depende de
ninguna cifra sin verificar.
