# Auditoria del presupuesto del Split 3

Fecha de revision: 15 de septiembre de 2026

## Fuentes revisadas

- Excel: `/home/tonipuccino/Descargas/F1 Bugambra.xlsx`
- Hoja de temporada: `2026`
- Huella SHA-256: `acb3c1f968658072841981938541232d46d1a945355f6f3e59a03e348089d9e9`
- Firestore: base `development`, documentos del Split 2 y Split 3

El libro contiene las hojas `Reglamento` y `2026`. La hoja `2026` acumula los cuatro bloques de la temporada. El presupuesto de cada escuderia no empieza de cero en cada split: la formula conserva todas las ganancias y gastos anteriores y agrega la columna de fichajes del bloque nuevo.

## Por que Roses tiene 50 M

La celda `E52` contiene el presupuesto acumulado de Roses. Antes del mercado del Split 3, el cierre conciliado del Split 2 es **115,9 M**. La celda `R52`, `Fichajes T3`, contiene un gasto neto de **65,9 M**.

| Operacion T3 | Efecto en el saldo |
|---|---:|
| Jota, clausula 75 M | -75,0 M |
| Jose, subasta 75 M | -75,0 M |
| Aparicio, precio -24,1 M | +24,1 M |
| Mesa, precio -60 M | +60,0 M |
| **Gasto neto** | **-65,9 M** |

Por tanto:

`115,9 - 75 - 75 + 24,1 + 60 = 50,0 M`

Los precios negativos son ingresos para la escuderia. No deben convertirse a valor absoluto para restarlos: Aparicio aporta 24,1 M y Mesa aporta 60 M.

La formula completa de `E52` parte de 100 M, suma los ingresos deportivos y de rivalidades de los bloques disputados y resta los ajustes T1, T2 y T3. Su desglose acumulado es:

| Concepto acumulado | Importe |
|---|---:|
| Presupuesto base | 100,0 M |
| 303 puntos de constructores x 0,1 | +30,3 M |
| 5 poles x 2 | +10,0 M |
| 4 vueltas rapidas | +4,0 M |
| 5 carreras sin sanciones x 3 | +15,0 M |
| 12 participaciones x 4 | +48,0 M |
| Rivalidades T1 y T2 | +70,0 M |
| **Generado sobre los 100 M** | **177,3 M** |
| Fichajes, rivalidades y premios T1 | -58,5 M netos |
| Fichajes, rivalidades y premios T2 | -102,9 M netos |
| Fichajes T3 | -65,9 M |
| **Presupuesto final** | **50,0 M** |

## Comparacion con Firestore

Estado comprobado despues de completar las operaciones:

| Escuderia | Cierre Split 2 | Fichajes T3 Excel | Presupuesto Excel | Presupuesto sistema | Diferencia |
|---|---:|---:|---:|---:|---:|
| Alfa Romero | 165,2 M | -30,2 M | 135,0 M | 135,0 M | 0,0 M |
| Roses | 115,9 M | -65,9 M | 50,0 M | 50,0 M | 0,0 M |
| Zenith | 163,1 M | -126,8 M | 36,3 M | 41,3 M | **+5,0 M** |

Roses se corrigio en Firestore a **50 M** sin mover ni borrar fichajes. La fila `Fichajes / ajustes` queda en **-65,9 M**.

## Plantillas del Split 3

La asignacion del bloque 3 del Excel coincide con Firestore:

| Escuderia | Pilotos | Precios identificados |
|---|---|---|
| Alfa Romero | Mimic (Alex en la tabla de precios), Carlos, Dani, Pinilla | 28,9; 0; 0; 1,3 |
| Roses | Jose, Jota, Aparicio, Mesa | 75; 75; -24,1; -60 |
| Zenith | Fabi, Moles, Pabliyo | 70; 36,6; 15,2 |

La diferencia de nombre **Alex / Mimic** parece un alias: ambos tienen precio T3 de 28,9 M y ocupan la misma posicion contable. Conviene confirmarlo antes de automatizar una importacion por nombre.

## Diferencias y asuntos pendientes

### 1. Zenith: faltan 5 M por justificar

Los fichajes visibles de Zenith suman:

`70 + 36,6 + 15,2 = 121,8 M`

Sin embargo, `R51` guarda **126,8 M**. Hay **5 M adicionales** sin desglose por piloto. Esa diferencia explica exactamente que Firestore muestre 41,3 M y el Excel 36,3 M.

No se ha corregido Zenith porque falta saber si esos 5 M son una penalizacion, un ajuste manual o un error del Excel.

### 2. Formulas de escuderias de los bloques 3 y 4

El lector de control detecta 24 errores de referencias. Las formulas de puntos de escuderia de las carreras del bloque 3 consultan la plantilla del bloque 2 (`N`) en vez de la del bloque 3 (`W`). Las del bloque 4 tambien siguen consultando `N` en vez de `AF`.

Actualmente las carreras futuras estan vacias, por lo que esos errores no explican los 50 M de Roses. Si no se corrigen antes de introducir resultados, los puntos y los ingresos futuros de las tres escuderias pueden quedar asignados a pilotos del bloque equivocado.

### 3. Version distinta del Excel auditado anteriormente

La huella del archivo actual es distinta de la version documentada previamente. Su huella estructural actual es `95c236cc75848f6a25b9f214bd9827a3417abcc1eeade5ea0d1e3224ab526fc1`. Esto confirma que hubo cambios y que no se deben reutilizar cifras de una captura o auditoria anterior como si fueran el cierre vigente.

### 4. Total de Dani sin resultado cacheado

La formula del total de Dani no trae un resultado calculado dentro del `.xlsx`. El lector puede reconstruirlo desde las carreras, actualmente con valor cero. No afecta al presupuesto actual de Roses.

## Conclusion

Los **50 M de Roses son correctos** respecto al Excel vigente. Proceden de restar un mercado neto de 65,9 M al cierre de 115,9 M del Split 2. El valor anterior de 98,8 M venia de una interpretacion incompleta de las operaciones y no incluia correctamente los cuatro movimientos del equipo.

Queda por decidir si los 5 M adicionales de Zenith son un ajuste valido. Tambien deben corregirse las referencias de formulas de escuderias antes de procesar las carreras del Split 3.
