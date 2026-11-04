# Resultado de la importación normalizada (2026-11-04)

El informe completo, incluidos los 200 movimientos implicados en la conciliación, está en [`informe-conciliacion-2026-11-04.json`](informe-conciliacion-2026-11-04.json). Fuente: exportación de Firebase del 2026-11-04, identificada por el SHA-256 de su `.tar.gz` en ese JSON; `f1_import_test` se revalidó después de importar (396 documentos, 17 identidades Auth, mismo contenido y orden).

## Cobertura y medios

- 392 de los 396 documentos tienen una fila en `source_document_archive`; el control comprobó ruta, SHA de origen y todos los campos (con base64 sustituido por la URL del fichero). Los 4 `paddock_posts` se enumeran como exclusión decidida, no figuran en el archivo ni en una tabla operativa. Siguen intactos en `f1_import_test` y en la exportación.
- 32 apariciones de imágenes base64 en los documentos incluidos se deduplicaron en 26 ficheros. Cada fichero se comparó byte a byte y por SHA-256 con el base64 original. El archivo no contiene `data:image/`.
- La API sirve esas imágenes por nombre de hash y MIME validado, sin listar directorios ni seguir enlaces simbólicos. El directorio por defecto es `~/backups/f1-media`; se configura con `F1_MEDIA_DIR`.
- El archivo de origen rechaza escrituras ordinarias mediante un trigger; el importador habilita la escritura solo en su transacción. El código de economía no consulta el archivo.

## Filas operativas y orden

Se cargaron 16 usuarios, 13 pilotos, 4 equipos, 5 splits como `season`, 14 equipos por split, 45 pilotos por split, 35 asignaciones, 24 carreras, 23 revisiones, 233 resultados, 200 asientos de libro, 7 transferencias y 41 registros de auditoría. `admin@f1bugambra.com` no se creó; `ajgarciarias@gmail.com` tiene rol `admin`.

`ledger_entry.secuencia` ordena primero los 173 asientos con fecha normalizada y después los 27 sin fecha por `seq` de la copia. Once asientos de importe cero permanecen. El valor repetido `99` de posiciones se guarda como desconocido (`NULL`); `isDnfOwnError: true` cuenta como indicación explícita de DNF. No se reconstruyeron posiciones desde puntos.

Dos ejecuciones consecutivas produjeron el mismo hash de filas y el mismo conteo en 16 tablas. En esta base, la carga final tardó 787 ms; el archivo ocupa 1.351.680 bytes con índices y una consulta del libro por equipo y split tardó 1,1 ms. Son mediciones locales, no una promesa de rendimiento en producción.

## Conciliación informativa

El cálculo `presupuesto_inicial + movimientos` difiere del saldo guardado en 8 de 14 equipos por split. Las diferencias (`guardado − calculado`, en millones) son:

| Split | Equipo | Diferencia |
|---|---|---:|
| 1 | Alfa Romero | −36,0 |
| 1 | Roses | −116,9 |
| 1 | Zenith | −168,8 |
| 2 | Roses | −75,0 |
| 3 | Alfa Romero | −1,3 |
| 3 | Roses | −75,0 |
| 3 | Zenith | −51,8 |
| 4 | Roses | −58,3 |

Los 14 casos, con saldo inicial, saldo guardado, saldo calculado y rutas de cada movimiento, constan en el JSON. El estado de conciliación es `pending_owner_review`: el importador conservó los saldos originales sin corregirlos. Este cálculo usa la copia de Firebase; la comparación con la hoja oficial corresponde al ticket 03 y no sustituye una decisión del dueño sobre diferencias.

## Límites pendientes

La importación no prueba que cada correo pertenezca efectivamente a una cuenta de Google; solo verifica que los usuarios activos tienen identidad y correo en la copia Auth. Las reglas históricas, estados de subasta, mapeos Excel y otros campos sin modelo operativo quedan en el archivo, sin activar comportamiento de aplicación. La web y la autenticación nueva siguen siendo otros tickets.
