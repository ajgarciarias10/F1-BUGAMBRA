# Incongruencia de 0,9M en Zenith

**Estado:** abierta. Pendiente de comprobar contra el Excel.
**Fecha:** 3 de septiembre de 2026.
**Impacto:** el saldo de apertura del Split 3 de Zenith. Ninguna otra cifra depende de esto.

## Aviso sobre el alcance de esta revisión

**No he revisado el Excel.** No tengo acceso al documento: solo he visto dos recortes de
pantalla (la serie de precios de Aparicio y Carlos, y el bloque de tipo de operación del
Split 3) y las cifras que se han transcrito a mano al repositorio.

Tampoco he podido leer Firestore: el CLI de Firebase no expone lectura de documentos y no
hay credenciales de `gcloud` en esta máquina.

Lo que sigue es una auditoría de **la transcripción**, no de la hoja. Las conclusiones valen
para descartar dónde *no* está el error; para confirmar dónde sí está hace falta abrir el
Excel.

## El desajuste

Al cierre del Split 2 y aplicadas las operaciones de mercado del Split 3, los saldos son:

| Escudería | Cierre S2 transcrito | Compras del mercado | Derivado | Dice la hoja | Desvío |
|---|---|---|---|---|---|
| Zenith | 163,1M | −51,8M | **111,3M** | **110,4M** | +0,9M |
| Alfa Romero | 165,2M | −1,3M | 163,9M | 163,9M | 0,0M |
| Roses | 115,9M | +30,0M | 145,9M | 145,9M | 0,0M |

Las compras son: Zenith paga Moles (36,6M) y Pabliyo (15,2M); Alfa Romero mantiene a Pinilla
(1,3M); Roses ingresa 30M por llevarse a Aparicio, que tiene precio negativo. El vendedor no
cobra la cláusula — regla confirmada, y precisamente lo que hace que Alfa Romero y Roses
cuadren al decimal.

**Dos de las tres escuderías cuadran exactas.** El error es de Zenith en concreto, no del
modelo económico.

## Lo que sí he comprobado

Auditoría de los datos transcritos del Split 2 en `apps/web/src/components/Split2Loader.tsx`:

1. **Los puntos cuadran.** La suma de los puntos de los cuatro pilotos de cada escudería
   coincide con los puntos por carrera del equipo en las seis carreras, y la suma de las seis
   coincide con el total de temporada. Sin un solo descuadre.
2. **Las carreras son consistentes.** Una pole y una vuelta rápida por carrera, todas de
   pilotos de la parrilla, y ninguna posición repetida al despejar los puestos desde los
   puntos.
3. **Poles y vueltas rápidas cuadran con la temporada.** Split 2 aporta 1/3/2 poles y 3/1/2
   vueltas rápidas (Zenith/Alfa/Roses); restado de los totales de temporada (3/4/5 y 7/1/4),
   a Split 1 le quedan 2/1/3 y 4/0/2 — seis y seis, uno por carrera. Encaja.
4. **Las aperturas despejadas salen limpias.** Para cualquier número de carreras sin
   sancionados, la apertura que hace falta para llegar al saldo esperado sale en cifras
   redondas (Zenith 267,0M − 3k; Alfa 95,2M − 3k; Roses 154,0M − 3k). No aparece ningún 0,9
   por ninguna parte.

**Conclusión: el 0,9M no está dentro de la transcripción del Split 2.** Es coherente consigo
misma.

## De dónde puede venir

En esta economía todos los conceptos se mueven en unidades enteras salvo dos:

- los **puntos de constructores**, que van a 0,1M por punto;
- los **precios de fichaje**, que llevan decimales (72,8 · 47,1 · 68,4 · 61,5 · 30,5 · 36,6 · 15,2…).

Participación (4M), pole (2M), vuelta rápida (1M) y carrera sin sancionados (3M) son enteros,
y los premios de rivalidad van de 0,5 en 0,5. **Un desvío de exactamente 0,9M solo puede
salir de los puntos o de un precio.** Por orden de probabilidad:

1. **Nueve puntos de constructores de diferencia en Zenith.** 9 × 0,1M = 0,9M exacto. El
   total transcrito es 189; si la hoja dice 180, cuadra. Contra esto juega que los puntos por
   carrera y los de los pilotos cuadran entre sí, así que tendrían que estar mal los dos
   sitios a la vez.
2. **El cierre real del Split 2 es 162,2M y no 163,1M.** 163,1 es un número transcrito a mano
   como "saldo esperado". Si el Split 1 cerró 0,9M por debajo de lo que asumía esa
   transcripción, el saldo real de Zenith en Firestore ya es 162,2M y la hoja tiene razón.
   **Es la hipótesis más probable**, porque el cargador usa el cierre real del Split 1 como
   apertura y solo cae en el número transcrito si no lo encuentra.
3. **Un precio del mercado del Split 3 mal leído.** Los dos son de Zenith: Moles 36,6M y
   Pabliyo 15,2M. Si uno de ellos fuese 0,9M más caro (37,5M o 16,1M), cuadraría. Los leí de
   una captura de pantalla, así que no es descartable.
4. **Una operación de Zenith que no salía en la captura.** El recorte del bloque de
   operaciones no llegaba a mostrar todas las filas con precio.

## Qué mirar en el Excel para cerrarlo

En este orden, que va de lo más probable a lo menos:

1. El **saldo de cierre del Split 2 de Zenith**: ¿163,1M o 162,2M?
2. El **saldo de cierre del Split 1 de Zenith**, y si cuadra con el que tiene ahora Firestore.
3. Los **puntos de constructores de Zenith en el Split 2**: ¿189 o 180?
4. Los **precios exactos** de las cláusulas de Moles y Pabliyo.
5. Si hay alguna **otra operación de Zenith** en el mercado del Split 3.

## Cómo está resuelto mientras tanto

En `apps/web/src/components/Split3Setup.tsx` la apertura del Split 3 va **anclada a las
cifras de la hoja** (`APERTURA_EXCEL`): Zenith 110,4M, Roses 145,9M, Alfa Romero 163,9M. Es el
mismo patrón que usa `Split2Loader` con `saldoEsperado`.

El valor derivado se sigue calculando, y si no coincide con el anclado **el log lo canta** al
preparar el split, con el desvío y el aviso de que manda la hoja. No se absorbe en silencio.

Cuando se sepa de dónde sale el 0,9M:

- si el fallo está en el cierre del Split 2 → corregir `saldoEsperado` de Zenith en
  `Split2Loader.tsx` y volver a cargar el Split 2;
- si está en un precio del mercado → corregir la línea en `MERCADO` de `Split3Setup.tsx`;
- en ambos casos, el desvío del log debe desaparecer. Ese es el criterio de cierre.
