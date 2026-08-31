# Auditoría del Excel de control

## Versión analizada

- Documento: Google Sheets compartido para F1 Bugambra
- Hojas: `Reglamento` y `2026`
- Perfil reconocido: `f1-bugambra-control-v1`
- SHA-256 del fichero analizado: `5019f0df6351ff565f716c1073a470eb97952e9e6cfa386b60165d748622cf29`
- SHA-256 estructural: `15af166b91a51a077609ef0ad74460633dcbe4748e938e82328a8f40c8581b24`

La huella del fichero cambia cuando cambian sus datos. La huella estructural permite detectar cambios en hojas, textos y fórmulas. Una huella nueva obliga a repetir la conciliación; un cambio estructural obliga además a revisar manualmente fórmulas y reglas antes de adaptar el lector.

## Puntuación deportiva

- Posiciones 1 a 12: `16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1`.
- Pole: `2` puntos.
- Vuelta rápida: `0` puntos deportivos.
- Los puntos de escudería son la suma de los pilotos que pertenecían a ella en esa carrera.
- La temporada está distribuida en cuatro bloques de seis carreras.

Estas reglas coinciden con `currentSeasonRules`.

## Altas y bajas de 2026

- Dani se incorpora en el tercer bloque, desde la carrera 13.
- Toni y Samu participan hasta el final del segundo bloque, carrera 12.
- Los puntos conseguidos por Toni y Samu antes de salir se conservan en la clasificación histórica.
- Dani no recibe puntos retroactivos de los dos primeros bloques.

En PostgreSQL se representará con periodos inclusivos de participación:

```text
Dani: starts_at_sequence = 13, ends_at_sequence = null
Toni: starts_at_sequence = 1, ends_at_sequence = 12
Samu: starts_at_sequence = 1, ends_at_sequence = 12
```

La asignación a escudería también tiene inicio y fin. Un resultado solo se acepta si el piloto estaba inscrito y pertenecía a esa escudería en la secuencia de la carrera.

## Rivalidades

El Excel no trata `1M/0,5M` y `2M/1M` como premios generales para el P1 y P2 absolutos. Son premios dentro de cada grupo de rivalidad.

Grupo de tres:

- Clasificación por carrera: `1M, 0,5M, 0M`.
- Carrera: `2M, 1M, 0M`.
- Final del bloque de seis carreras: `6M, 3M, 0M`.

Grupo de dos:

- Clasificación por carrera: `1M, 0M`.
- Carrera: `2M, 0M`.
- Final del bloque: `4M, 2M`.

Piloto sin rival:

- `1,5M` por carrera en la que participa.

Los grupos se crean por estatus y el estatus se ordena por precio de compra. El nuevo ruleset representa estas reglas por separado para impedir que vuelvan a aplicarse como premios generales.

## Presupuesto

La fórmula base observada para cada escudería es:

```text
100M
+ puntos de constructores * 0,1M
+ poles * 2M
+ vueltas rápidas * 1M
+ carreras sin sancionados * 3M
+ participaciones de equipo * 4M
+ ingresos de rivalidades de sus cuatro estatus
- ajustes manuales de fichajes y premios entre bloques
```

Premio de constructores al final de bloque: `20M, 15M, 10M`.

Después del día de puja ningún jeque puede conservar más de `50M`.

Los ajustes manuales de las columnas `Fichajes Tn`, `Rivalidades Tn` y `Premios Tn` son parte de la contabilidad histórica. En PostgreSQL deberán transformarse en asientos del ledger con concepto, bloque y autor, no en celdas o correcciones directas del saldo.

## Mercado y precios

Precio positivo al comienzo de un bloque:

```text
cláusula = precio de compra * 2
mantener = cláusula * 1,5 = precio de compra * 3
```

El Excel aplica una reducción de cláusula de `20% del precio de compra` después de la primera carrera del bloque y mantiene ese valor el resto del bloque. El precio de mantener positivo permanece fijo en las fórmulas observadas; no se recalcula en cada carrera desde la cláusula reducida.

Para precios negativos, el Excel conserva el signo:

```text
mantener inicial = precio de compra / 3
cláusula inicial = precio de compra / 2
```

La magnitud negativa aumenta una vez y el valor de mantener se vuelve a relacionar con la cláusula. Esto no coincide con la lógica antigua de Firestore, que convertía el precio a valor absoluto y actualizaba precios en cada carrera.

El valor `-110` aparece como centinela histórico para congelaciones. En la nueva base no se utilizará como precio real: la congelación será un estado explícito.

Al comenzar un bloque nuevo, el Excel permite introducir manualmente el tipo y precio de la nueva operación (`Mantener`, `Cláusula` o `Subasta`) y reinicia las fórmulas desde ese valor.

## Reglas textuales

- Las plantillas vuelven al mercado tras seis carreras, salvo excepciones.
- Una escudería completa no puede continuar pujando.
- La puja termina un minuto antes de la hora de carrera en el ejemplo del reglamento.
- El dinero de una cláusula se retira del sistema; no se entrega a la escudería vendedora.
- Los cambios de reglamento requieren consulta y votación.
- Los handicaps se describen de forma textual y todavía no forman parte del motor automático.

## Qué puede verificar el Excel

- Reglas deportivas y económicas expresadas en la hoja `Reglamento`.
- Puntos por piloto y carrera.
- Totales de pilotos.
- Puntos por escudería y carrera.
- Totales de escuderías.
- Ingresos de rivalidades registrados manualmente.
- Presupuestos finales.
- Evolución y reinicio de precios por bloque.

## Qué no puede verificar por sí solo

- Rating, porque el Excel no contiene su fórmula ni evolución.
- Autorización y roles de usuarios.
- Idempotencia y concurrencia.
- Auditoría de quién realizó un cambio.
- Unicidad del piloto en la base de datos.
- Que un ajuste manual tenga justificación o autor.

Estas garantías deben comprobarse mediante pruebas del backend y restricciones de PostgreSQL.

## Protocolo para un Excel nuevo

1. Descargar una copia `.xlsx` directamente desde Google Sheets.
2. Calcular las huellas de contenido y estructura.
3. Comparar nombres y cantidad de hojas.
4. Comparar posiciones de cabeceras y bloques.
5. Extraer y comparar todas las fórmulas con la versión anterior.
6. Extraer de nuevo las reglas de `Reglamento`.
7. Revisar altas, bajas y aliases de pilotos, escuderías y carreras.
8. Recalcular muestras de puntos, rivalidades, presupuestos y precios sin confiar en el resultado cacheado de las fórmulas.
9. Ejecutar la conciliación completa contra PostgreSQL.
10. Adaptar el lector y sus pruebas si cambia la estructura.
11. Solo entonces considerar compatible la nueva versión.

El endpoint devuelve siempre `manualReviewRequired: true`. Nunca se importan cambios deportivos o económicos automáticamente desde un Excel nuevo.

## Revisión 2026-08-31

- Firestore tiene puntos deportivos desalineados respecto al Excel en `split_1` y `split_2`, pero no debe corregirse como fuente de verdad durante la migración.
- La corrección definitiva debe hacerse en PostgreSQL creando o corrigiendo revisiones de carrera; `driver_standing` y `team_standing` se reconstruyen desde `race_result`.
- El Excel solo contiene puntos por carrera, no el acta completa necesaria para generar una `race_revision` autoritativa con posiciones, qualy, DNF y bonos.
- La hoja contiene fórmulas de puntos de escudería incorrectas para los bloques 3 y 4: arrancan en `Y` y `AH`, pero siguen apuntando a la plantilla de pilotos del bloque 2 (`N`) en vez de `W` y `AF`.
- El lector del Excel ahora valida estas referencias para que una caché de fórmula no oculte errores cuando se modifiquen datos.
- La prioridad es corregir nuestras fórmulas/cálculos para que reproduzcan el Excel vigente; el Excel compartido no se modifica desde el backend.
- Fórmulas legacy ajustadas en la SPA: la vuelta rápida no suma puntos deportivos, las rivalidades reparten premios por ranking completo y los precios positivos solo reducen cláusula una vez por bloque manteniendo fijo el coste de mantener.
