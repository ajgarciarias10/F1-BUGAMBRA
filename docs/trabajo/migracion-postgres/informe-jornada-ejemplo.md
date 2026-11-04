# Informe de ejemplo: Split 3, Hungría

Lectura de la hoja oficial confirmada por el dueño, 2026-11-04. Hoja `2026`, carrera `Y1`. Exportación descargada el 2026-11-04: SHA-256 `192442e9ff103dbd915bbc2ce5285440b4be2516f200f8d4feddbe53698eac86`. La copia queda fuera del repositorio en `~/backups/hoja-liga/`.

Fuente de la app: `f1_import_test.documento`, copia fiel de la exportación de Firebase del 2026-11-04. No se modificó ningún dato. La web puede diferir de la hoja porque aún faltan sanciones del circuito.

El informe JSON generado por `node scripts/check-race-against-sheet.mjs --split split_3 --race hungria` contiene cada comparación con celda, valor de hoja, valor de la copia y estado. En esta lectura: 37 coincidencias, 4 diferencias y 54 comparaciones desconocidas.

| Concepto | Equipo | Celda | Hoja | Copia Firebase |
|---|---|---|---:|---:|
| Presupuesto actual | Zenith | `E51` | 102,5 M | 93,8 M |
| Fichajes Split 3 | Zenith | `R51` | 126,8 M | 121,8 M |
| Presupuesto actual | Roses | `E52` | 42,7 M | 35,1 M |
| Presupuesto actual | Alfa Romero | `E53` | 138,2 M | 124,4 M |

Estos saldos son fotos actuales de dos fuentes distintas, no saldos de Hungría calculados al cierre. La hoja puede incluir carreras o decisiones posteriores. Las diferencias son hallazgos, nunca ajustes automáticos.

La hoja registra puntos por carrera, pero no posiciones de clasificación o llegada; no se deducen de los puntos. Tampoco desglosa en una celda numérica por jornada los premios de pole, vuelta rápida, equipo sin sanciones y participación. El informe los marca como desconocidos en la hoja y muestra los asientos existentes en la copia. Una celda vacía se mantiene desconocida, aunque la app tenga un resultado o un asiento.
