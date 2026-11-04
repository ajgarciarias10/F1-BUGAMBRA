# Hallazgos de la importación a `f1_import_test` (2026-11-04)

Origen: exportación de Firestore (base `development`) y Auth del proyecto `gen-lang-client-0829043813`. 396 documentos, 17 usuarios de Auth. Verificación (`--verify`): mismo contenido, mismo orden, sin huérfanos; control negativo: con un dato alterado a mano sale con código 1.

Para decidir en el paso al esquema normalizado (ticket aparte):

- **Orden.** `seq` es el orden determinista de la copia (ruta ordinal). 27 de las 200 transacciones (`…__historico__…`) no tienen fecha; el orden temporal real de esas no existe en la fuente, así que el esquema normalizado debe dar una columna de orden explícita en vez de inferirlo de `fecha`.
- **Fechas de transacciones** vienen en dos formatos: timestamp (147) y texto ISO (26).
- **Auth sin documento en `usuarios`:** `admin@f1bugambra.com` (solo contraseña). Decidir si es la cuenta de administración.
- **Contraseñas:** la cuenta de servicio no devolvió los hashes; los 12 usuarios de correo y contraseña tendrían que restablecerla, salvo que se saquen con `firebase auth:export`.
- Sin Storage (el bucket no existe). `paddock_posts` guarda imágenes en base64 dentro del documento.
- El libro y los saldos guardados de cada equipo **no** se han reconciliado: eso es del ticket de economía (`AGENTS.md`), no de esta copia.
