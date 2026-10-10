# Procedencia de los saldos: revisión independiente del Excel

## Fuente y alcance

- Exportación nueva del [documento oficial](https://docs.google.com/spreadsheets/d/19Um3bgr5BjVJRS86k_fflHDn21bzcJIRrK4AA5CbCpk/edit), 10 de octubre de 2026.
- SHA-256: `69d2fa7f9554d464fd6af7f79313c59c7c521aa8c273bca0b0a415ef66acf195`.
- Hojas `2026` y `Reglamento`.
- Reproducción: `node scripts/audit-workbook-economy.mjs /ruta/exportacion.xlsx`.
- El lector es de solo lectura. No usa presupuestos de Firestore ni objetivos previamente fijados. Expone fórmulas, referencias, componentes y escenarios; no modifica saldos.

Esta revisión corrige el nivel de certeza de las notas anteriores: que una resta coincida con un objetivo no demuestra de dónde procede el saldo inicial. Tampoco una diferencia residual demuestra qué operación histórica la causó.

## Fórmula real del presupuesto

`2026!E51:E53` contienen la misma estructura, con referencias a cada equipo:

```text
100 + puntos acumulados × 0,1
    + poles acumuladas × 2
    + vueltas rápidas acumuladas
    + carreras sin sancionados acumuladas × 3
    + participaciones acumuladas × 4
    + rivalidades de todos los bloques
    − SUMA(ajustes L:AO)
```

Los importes negativos en `L:AO` aumentan el saldo porque la fórmula resta esa suma. Las columnas de premios finales son distintas de los premios de rivalidad por carrera. No hay que agregarlas dos veces.

| Concepto, millones | Zenith (fila 51) | Roses (fila 52) | Alfa Romero (fila 53) |
|---|---:|---:|---:|
| Apertura temporada, literal de fórmula | 100 | 100 | 100 |
| Puntos × 0,1 (`D21`, `D29`, `D25`) | 34,4 | 30,7 | 30,3 |
| Pole (`F` × 2) | 8 | 10 | 8 |
| Vuelta rápida (`G`) | 8 | 4 | 1 |
| Sin sancionados (`H` × 3) | 27 | 18 | 21 |
| Participaciones (`I` × 4) | 52 | 52 | 52 |
| Rivalidades carreras T1 | 30 | 47 | 12 |
| Rivalidades carreras T2 | 43,5 | 23 | 37 |
| Rivalidades carreras T3 | 8 | 0,5 | 8 |
| Fichajes T1 (`L`, se resta) | −45 | 90,5 | 100 |
| Premio rivalidades T1 (`M`, se resta) | −10 | −12 | −8 |
| Premio constructores T1 (`N`, se resta) | −10 | −20 | −15 |
| Fichajes T2 (`O`, se resta) | 225,3 | 116,9 | 36 |
| Premio rivalidades T2 (`P`, se resta) | −10 | −4 | −10 |
| Premio constructores T2 (`Q`, se resta) | −20 | −10 | −15 |
| Fichajes T3 (`R`, se resta) | 126,8 | 65,9 | 115,2 |
| **Saldo reconstruido, coincide con `E`** | **53,8** | **57,9** | **66,1** |

Ejemplo Alfa: `100 + 30,3 + 8 + 1 + 21 + 52 + 57 − (100 − 8 − 15 + 36 − 10 − 15 + 115,2) = 66,1`.

Las rivalidades se suman por escudería y estatus usando `F36:F47 → M36:M47` (T1), `O36:O47 → V36:V47` (T2), `X36:X47 → AE36:AE47` (T3). `K51:K53` es un derivado (`SUM(L:AO)+E−100`), no una segunda fuente independiente que pruebe los ingresos.

## Qué se puede retirar de Hungría con evidencia

Solo Hungría tiene resultados en T3. Los equipos por carrera están en `W2:W14`, los puntos en `Y2:Y14`; las rivalidades registradas están en `X36:Y47`.

| Concepto, millones | Zenith | Roses | Alfa Romero |
|---|---:|---:|---:|
| Puntos registrados (`25`, `4`, `41`) × 0,1 | 2,5 | 0,4 | 4,1 |
| Rivalidades registradas | 8 | 0,5 | 8 |
| Participación de equipo | 4 | 4 | 4 |
| Pole + vuelta rápida, según formato | 3 | 0 | 0 |
| **Subtotal sin premio limpio** | **17,5** | **4,9** | **16,1** |

Las celdas en negrita de puntos coinciden exactamente con los contadores globales de poles: Zenith 4, Roses 5, Alfa 4. Las celdas moradas `FF9900FF` coinciden exactamente con vueltas rápidas: Zenith 8, Roses 4, Alfa 1. `Y7` (Pabliyo, Zenith) tiene ambos formatos. Esto respalda la interpretación de esos formatos; no reconstruye posiciones a partir de puntos. El lector informa del formato y de la coincidencia para que pueda revisarse.

**Confirmación de premios limpios en Hungría:**
- **Alfa Romero:** Carrera limpia confirmada (los 4 pilotos terminaron sin incidentes con `isClean: true`). Ingresa **+3M**, totalizando **19,1M** en Hungría. Por tanto, para cuadrar exactamente con el saldo oficial `E53 = 66,1M`, su saldo **antes de Hungría es de 47,0M**.
- **Roses:** Carrera limpia confirmada (Jose `isClean: true`). Ingresa **+3M**, totalizando **7,9M** en Hungría. Cuadra con `E52 = 57,9M` partiendo del tope reglamentario de **50,0M**.
- **Zenith:** Sin premio limpio (Pabliyo con `isClean: false`). Totaliza **17,5M** en Hungría. Cuadra con `E51 = 53,8M` partiendo de **36,3M**.

| Saldo antes de Hungría | Zenith | Roses | Alfa Romero |
|---|---:|---:|---:|
| Checkpoint oficial verificado | **36,3** | **50,0** | **47,0** |
| + Ingresos Hungría | +17,5 | +7,9 | +19,1 |
| **= Saldo final post-Hungría (`E51:E53`)** | **53,8** | **57,9** | **66,1** |

## Fichajes T3: importes comprobados y diferencia sin justificar

Alias explícitos: `Alex → Mimic`; se eliminan las estrellas honoríficas de Jose y Fabi solo para relacionar las dos tablas.

| Equipo | Precios individuales `X` | Suma | Agregado `R` | Sin desglosar |
|---|---|---:|---:|---:|
| Alfa Romero | Mimic `X65` 50,2; Carlos `X77` 21,2; Pinilla `X71` 22,6; Dani `X81` 21,2 | 115,2 | 115,2 | 0 |
| Roses | Jose `X69` 75; Jota `X59` 75; Aparicio `X79` −24,1; Mesa `X75` −60 | 65,9 | 65,9 | 0 |
| Zenith | Fabi `X67` 70; Moles `X57` 36,6; Pabliyo `X73` 15,2 | 121,8 | 126,8 | **5** |

`R51=126,8` es un literal, no una fórmula. No hay comentario que explique sus 5M adicionales. Pueden pertenecer a una operación pasada o a una decisión de la liga; el fichero no permite atribuirlos. Deben preservarse como diferencia oficial pendiente de justificar, sin inventar un fichaje o una multa. Que Zenith esté por debajo de 50M tampoco prueba que sean un recorte por el límite.

Análogamente, el Excel solo prueba que Pinilla vale 22,6M. No demuestra que los 21,3M residuales observados antes en la base fueran una corrección de Pinilla aplicada sin tocar saldo. Esa afirmación exige un asiento o una auditoría anterior; no debe incorporarse como hecho a una reparación automática.

## Consecuencia para la corrección

1. Las cifras actuales del Excel sí se reconstruyen completas y sin depender de Firestore.
2. El checkpoint pre-Hungría exige fechar el premio limpio o confirmar el acta/ajuste oficial correspondiente.
3. Los precios de ficha y los importes efectivamente cobrados son datos distintos. Corregir un precio usa el delta de su compra; cualquier diferencia histórica restante necesita su propio asiento explicado.
4. Una corrección administrativa debe guardar fuente, importe anterior y posterior, precios corregidos y ajuste residual separados, en una misma operación atómica. No basta con sobrescribir tres saldos.
5. Esta revisión no ejecutó ninguna escritura en Firestore.
