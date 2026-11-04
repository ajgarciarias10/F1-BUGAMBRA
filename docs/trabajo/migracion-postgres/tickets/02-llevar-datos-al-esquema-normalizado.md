# 02. Llevar los datos de `f1_import_test` al esquema normalizado

- **Branch from:** feature/migracion-postgres
- **Work branch:** feature/migracion-postgres-normalizar
- **Owned files:** `docs/trabajo/migracion-postgres/**`, `apps/api/database/migrations/003_*.sql` (solo ajustes necesarios al esquema, nuevos ficheros), `apps/api/scripts/migrate-staging-to-schema.ts`, `apps/api/tests/migrate-staging*.test.ts`, `apps/api/package.json` (solo scripts), `apps/api/src/server.ts` (solo para registrar la ruta de imágenes), `apps/api/src/media.ts` (nuevo: servir las imágenes migradas), `apps/api/tests/media*.test.ts`
- **Do not touch:** `apps/web/**`, `001_initial_schema.sql` y `002_admin_account.sql` (se amplía con migraciones nuevas, no se reescribe), el proyecto Firebase en vivo, `f1_import_test` (solo lectura)
- **Agent and model:** Claude, nivel medio
- **Done when:** el script migra de `f1_import_test` al esquema real en una sola transacción repetible (mismo resultado si se ejecuta dos veces), excluyendo `paddock_posts` por decisión del dueño, el informe de conciliación se genera y `npm test` de la API pasa. Ningún dato se da por bueno si el informe tiene diferencias sin explicar.

## Context

Ticket 01 dejó una copia fiel y verificada en `f1_import_test` (396 documentos, 17 usuarios). Hallazgos en `hallazgos-importacion.md`. Decisiones del dueño (2026-11-04):

- **Sin contraseñas.** Cada usuario entra con Google; no se migran hashes. Los 12 usuarios que tenían correo y contraseña solo entran si su correo tiene cuenta de Google. Comprobar que cada usuario activo tiene un correo que sirva para Google.
- **`admin@f1bugambra.com` no existe en la base nueva.** No se migra. El administrador es una cuenta con Google (confirmar cuál con el dueño).
- **Administrador: `ajgarciarias@gmail.com`** (ya es `rol: admin` en los datos y entra con Google).
- **Decisión posterior del dueño:** `paddock_posts` se descarta de la base nueva por innecesario. No se importa ni se conserva en la tabla de archivo normalizada. La exportación y `f1_import_test` quedan intactas; no se escribe en Firebase.
- **Alcance ampliado (2026-11-04, dueño):** se permite `apps/api/src/server.ts` y un `media.ts` nuevo para servir las fotos migradas de pilotos. Los 9 usuarios que solo tenían contraseña usan correos gmail.com, así que pueden entrar con Google.
- **Los fallos de orden y de datos se arreglan antes de producción**, no se arrastran.
- **Hacerlo ordenado y sin sobrecargar la base:** inserciones por lotes, índices después de cargar, y nada pesado dentro de las filas.

## What to do

1. **Mapa de campos.** Documentar, antes de escribir código, cómo se corresponde cada colección con las tablas de `001_initial_schema.sql` (`splits`→`season`/`race`, `transacciones`→`ledger_entry`, `usuarios`→`app_user`, `pilotos`→`driver`, `admin_audit`→`audit_log`, etc.) y qué no tiene sitio. Parar y preguntar si algo no encaja en vez de improvisar.
2. **Orden explícito.** Dar a `ledger_entry` una columna de orden propia (`secuencia`) en vez de depender de `fecha`: 27 transacciones históricas no tienen fecha. Regla de orden documentada y con test: fecha cuando existe, y para las históricas el orden de `seq` de la copia. Fechas en texto ISO y en timestamp se normalizan a `timestamptz`.
3. **Imágenes fuera de las filas.** `pilotos.foto_url` trae imágenes en base64. Extraerlas a ficheros en disco servidos por la API y guardar solo la URL. Excluir por completo `paddock_posts` y sus imágenes del destino, con un conteo explícito en el informe.
4. **Conciliación de saldos** (ver abajo). Generar un informe, no corregir nada solo.
5. **Usuarios.** Cargar `usuarios` en `app_user` excluyendo `admin@f1bugambra.com`. Clave: correo en minúsculas. Informar de cualquier correo duplicado o sin documento.
6. **Repetible.** Ejecutar el script dos veces da el mismo resultado; identificadores estables (`external_key` = id de Firestore) para que no se duplique nada.
7. **Prueba de carga.** Medir tiempo y tamaño de la migración y de las consultas principales (libro por equipo y split).

## Conciliación de saldos

Cada equipo tiene un saldo guardado y un libro de movimientos. Si el libro está completo, saldo inicial + movimientos debe dar el saldo guardado. En la copia del 2026-11-04 no ocurre en 8 de 12 casos (ejemplo: Roses en el split 1 guarda 28,1 y el libro da 145,0; diferencia -116,9). Puede haber causas legítimas (ajustes manuales del reparto, el tope de 50M de la subasta, movimientos que nunca se anotaron) o errores.

El script solo **informa** la diferencia por equipo y split, con los movimientos implicados. Las reglas de `AGENTS.md` mandan: el libro oficial es la hoja de cálculo de la liga, los saldos de Split 3 tienen objetivos ya anotados allí, y nada se corrige sin el dueño y sin un registro antes/después. Ninguna cifra de equipo o piloto va fija en el código.

## Rules that apply

`AGENTS.md`: guardarraíles de economía y de transacciones (todo el cambio dependiente en una transacción, identificadores estables), "nunca declarar aplicado un cambio en Firestore en vivo", sin constantes de equipos ni pilotos. Antes de añadir una dependencia nueva, parar y preguntar.

## Report

Usar la plantilla de `docs/agents/operating-procedure.md` §3.4. Incluir el informe de conciliación completo y lo que no se pudo comprobar.
