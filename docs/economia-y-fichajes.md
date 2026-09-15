# Economía y fichajes

## Operaciones desde administración

- **Fichar en este split / Alta directa**: incorpora al piloto libre a la plantilla actual. Cobra una sola vez, registra el movimiento y conserva la ficha anterior. **Deshacer alta** compensa ese cobro y restaura la ficha anterior; los ingresos ajenos a la operación se conservan. Si hubo actividad posterior, debe deshacerse primero.
- **Pactar próximo split**: mantiene al piloto en su equipo de competición y escribe su destino en el siguiente split. El importe se carga en el split de origen. Debe existir el split de destino. Cambiar el pacto compensa el anterior antes de aplicar el nuevo, dentro de la misma transacción.
- **Deshacer pacto**: restaura la fotografía anterior del destino y compensa el movimiento económico en una sola transacción. Se conserva el identificador del split de destino para que reordenar splits no cambie qué se revierte.
- **Liberar**: pasa la ficha a agentes libres; no es una devolución del fichaje. No permite borrar un pacto pendiente sin anularlo antes.
- **Ajustar saldo**: introduce un movimiento positivo o negativo y su motivo. Sirve para correcciones administrativas y conciliación histórica; no modifica el precio de los pilotos.
- **Ajustar cláusula**: fija una cláusula manual, con motivo, sin alterar el saldo. Las liquidaciones posteriores respetan el ajuste. Dejando el campo vacío se retira el ajuste y se recupera el valor automático.

Los acuerdos tradicionales y las correcciones los documenta administración. Los jeques consultan plantillas/saldos y pujan en la sala; las reglas de Firestore reservan las escrituras económicas y de plantilla a administración.

## Reglas económicas

En **Reglas económicas del split** se configuran los importes de pole, vuelta rápida, participación, equipo sin sanciones, dinero por punto, piloto sin rival, premios de rivalidades y cobro de cláusula al vendedor.

Cada carrera guarda la configuración utilizada. Cambiar las reglas no vuelve a pagar carreras liquidadas. Para corregirlas, hay que revertir y procesar de nuevo en orden. Los importes predeterminados mantienen las reglas anteriores cuando el split todavía no tiene configuración.

El valor `-110` ya no activa ninguna excepción: es un precio negativo normal. Los importes negativos ingresan al fichar y se retiran al anular.

## Liquidaciones y aperturas

Procesar una carrera y revertirla utiliza transacciones. La reversión identifica equipos por ID, compensa los movimientos originales y recupera los valores anteriores de los pilotos. Solo puede revertirse la última carrera liquidada. Si faltan los movimientos originales, se informa del problema sin inventar una devolución.

El antiguo reset destructivo se sustituye por la reversión secuencial de liquidaciones: conserva fichajes, pactos y ajustes. Si una carrera falla al revertirse, se detiene y muestra el error; las ya revertidas quedan identificadas por su estado.

Al derivar aperturas:

1. Se reconstruye el cierre anterior a los pactos cuando se parte de un saldo vivo.
2. Se calcula el mercado completo desde las fichas del destino, también si se registraron como altas directas, y se escribe un resultado absoluto antes de comenzar la temporada.
3. `presupuesto_inicial` conserva el cierre anterior y `presupuesto` contiene el cierre más el mercado. Así **Fichajes / ajustes** muestra el movimiento real del bloque.
4. Se conserva la procedencia (`presupuesto_origen_splitId`). Los cambios y anulaciones posteriores de pactos actualizan el saldo disponible vinculado, pero no alteran su base inicial.

Los saldos copiados manualmente antes de esta corrección no tienen esa vinculación: deben revisarse/derivarse antes de asumir que se sincronizan.

## Datos históricos

### Restaurar Split 3 desde el cierre de Split 2

En **Administración → Economía**, selecciona **Split 3** y despliega **Restaurar Split 3 desde un cierre anterior**. Elige **Split 2**, pulsa **Previsualizar restauración**, revisa los saldos por equipo y confirma.

La restauración recupera las escuderías, pilotos, ratings y valores finales del origen. Usa el saldo de cierre conciliado si existe; en su defecto reconstruye el saldo anterior a los pactos sumando sus devoluciones. Los pilotos declarados agentes libres para el siguiente split pasan a agentes libres. No se cobra la plantilla restaurada.

Se anulan y compensan los pactos del origen hacia el destino para que no reaparezcan fichajes cancelados. Se mantienen los resultados y estadísticas del origen. En el destino se reinician resultados, estadísticas, liquidaciones, fichajes y sala de subastas; se conservan los circuitos del calendario y se deja el mercado cerrado hasta que administración lo abra.

Antes de sustituir los documentos se guarda su contenido en `restauraciones_split/{id}/documentos`, dentro de la misma transacción. La interfaz muestra el identificador de esa copia. Si alguien modifica los datos después de la vista previa, la restauración solicita calcularla de nuevo. Una restauración que falla no deja cambios parciales.

Este cambio de código no repara automáticamente los documentos de producción. Los fichajes antiguos pueden carecer de justificante del cargo o fotografía previa; su `precio_compra` por sí solo no demuestra dónde se cobró.

Para conciliar un descuadre, revisar split, equipo, piloto, precio y movimientos existentes. Si el pacto conserva el importe y la fotografía, usar su anulación. Si falta el justificante, documentar la corrección de saldo con **Ajustar saldo** y corregir la plantilla por separado, sin registrar un alta pagada solo para recrear una ficha.

Las altas directas nuevas guardan el justificante en `splits/{splitId}/transfers/{id}`. Sus anulaciones se registran como movimientos compensatorios y marcan la operación como anulada. Los pactos conservan la fotografía con tipos nativos de Firestore; se admite la lectura del formato JSON anterior.

## Verificación y publicación

```sh
corepack npm run typecheck
corepack npm --workspace @f1-bugambra/web test
corepack npm run build
```

Las pruebas de servicios ejecutan el código real contra un adaptador de Firestore en memoria que exige lecturas antes de escrituras y simula fallos de commit. Cubren cobros, devoluciones, precios negativos, adjudicación repetida, premios configurables, cláusulas manuales y herencia de aperturas. No sustituyen una prueba de navegador con Firebase ni validan las reglas contra un emulador.

La publicación debe incluir tanto la web como `firestore.rules`. No se realiza ningún despliegue ni modificación de datos reales al ejecutar estas pruebas.
