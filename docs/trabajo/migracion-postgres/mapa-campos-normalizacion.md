# Mapa de campos aprobado para el ticket 02

Fuente: `f1_import_test.documento`, copia verificada de 396 documentos de Firebase del 2026-11-04. El dueño aprobó este mapa, con la exclusión posterior y definitiva de los 4 `paddock_posts`. El control exigido es **392 documentos conservados en una tabla normalizada o en el archivo, 4 exclusiones listadas y cero pérdidas no explicadas**. La aprobación del mapa no declara que los datos ya estén migrados ni conciliados.

| Colección / ruta | Documentos | Destino previsto | Campos directos y conservación pendiente |
|---|---:|---|---|
| `usuarios/*` | 16 | `app_user` | `uid`, correo minúsculo, nombre y rol. No se migra `admin@f1bugambra.com`; `ajgarciarias@gmail.com` es admin. `piloto_id`, `escuderia_id`, foto y alias necesitan relación o conservación explícita. |
| `pilotos/*` | 13 | `driver` | ID externo, nombre, foto extraída a fichero. `rating_piloto` corresponde al estado de piloto por split, no al nombre global. |
| `temporadas/*` | 1 | Tabla de archivo de origen | Es la agrupación superior «Temporada 1» de varios splits; `season` representa cada split en el esquema actual, así que no se puede asignar esta fila a un segundo `season` sin duplicar la jerarquía. |
| `splits/*` | 5 | `season` y reglas/estado asociados | Origins y Splits 1–4. `orden`, nombre, estado; `temporadaId`, `economia_mapeo`, rivalidades, dúos, flags de mercado y enlaces no tienen columnas directas. |
| `splits/*/circuitos/*` | 24 | `race`, `race_revision`, `race_result` | ID, secuencia, estado, resultados y flags de economía. Hay carreras con posición desconocida; el esquema actual exige posiciones que la fuente no tiene. Votaciones, decisiones FIA, reglas aplicadas y saldos de economía necesitan conservación explícita. |
| `splits/*/roster/*` | 21 | `season_driver`, `roster_assignment` | Identidad, equipo, valoración, precio y ventana de participación. Historial de valoración/precio y condiciones de compra necesitan conservación explícita. |
| `splits/*/equipos/*` | 14 | `team`, `season_team`, `team_standing` | Nombre, presupuesto inicial y guardado, puntos. Histórico económico y estado de mercado necesitan conservación explícita. |
| `splits/*/equipos/*/pilotos/*` | 35 | `season_driver`, `roster_assignment`, `driver_standing` | Precio, participación, estadísticas. Campos pendientes de fichaje, cláusulas e historiales no tienen destino directo. |
| `splits/*/transfers/*` | 7 | `transfer` | Piloto, equipos, precio, estado y fecha. `fichaAnterior`, vendedor y revisión de precio necesitan conservación explícita. |
| `splits/*/adminOperations/*` | 7 | `audit_log` / `processing_command` | Operación, motivo, actor y antes/después. Los identificadores originales deben conservarse para evitar duplicados. |
| `splits/*/subasta/*` | 1 | Sin tabla equivalente | Estado de subasta y puja; no cabe en `transfer` sin perder su semántica. |
| `splits/*/circuitos/*/votacion_audit/*` | 1 | `audit_log` | Acción, actor, estado anterior/nuevo y fecha; conserva la ruta de origen. |
| `transacciones/*` | 200 | `ledger_entry` | Equipo, split, carrera, cantidad con signo, concepto, fecha y orden de `seq`. Veintisiete entradas no tienen fecha. El esquema actual exige actor y no guarda el ID de origen ni el orden explícito. |
| `admin_audit/*` | 33 | `audit_log` | Actor, acción, antes/después, fecha y ruta de origen. `balances` y `movements` necesitan conservación. |
| `admin_excel_mappings/*` | 3 | Sin tabla equivalente | URL, temporada, fecha y mapeos de la hoja. |
| `auth_emails/*` | 9 | Sin tabla equivalente | Relación UID/correo de autenticación; no se migran contraseñas. |
| `paddock_posts/*` | 4 | Excluido por decisión del dueño | No se importa a la base normalizada ni al archivo de origen; sus imágenes tampoco se extraen. La copia verificada de `f1_import_test` permanece intacta. |
| `restauraciones_split/*` y subcolección `documentos` | 2 | Sin tabla equivalente | Registro y contenido de restauraciones históricas. |

Además, `f1_import_test.auth_usuario` contiene 17 identidades. Se usará para comprobar correos y proveedores, sin copiar hashes ni inventar cuentas. La cuenta antigua `admin@f1bugambra.com` se excluye.

## Decisiones de esquema aprobadas

1. Para conservar los campos de Firebase **salvo `paddock_posts`**, añadir en `003_*.sql` una tabla de archivo de documentos de origen, con `path` único, `seq` y `data jsonb`, además de las tablas normalizadas operativas. Allí quedan las colecciones sin tabla y también los campos no modelados de los documentos normalizados. La app solo lee el archivo; ningún cálculo de dinero lo consulta. Las imágenes base64 se sustituyen allí por la URL del fichero y su hash; la copia fiel original permanece intacta en `f1_import_test`.
2. Servir las fotos migradas de pilotos por una ruta HTTP de solo lectura, con nombres por hash, MIME comprobado, sin listados ni acceso fuera de la carpeta configurada. No se crea tabla ni ruta para `paddock_posts`.
3. En `003_*.sql`, permitir posiciones y actores históricos desconocidos donde la fuente no los guarda, sin inferir DNF de cero puntos ni atribuir acciones al administrador sin prueba.
4. Conservar estado de subasta y mapeos de Excel en la tabla de archivo hasta que exista un modelo funcional propio. No activarlos automáticamente en la web.

4. Comprobar para los 392 documentos incluidos que cada ruta tiene al menos un destino normalizado o una fila en el archivo, y que los campos no modelados de documentos normalizados siguen en el archivo. Listar las cuatro rutas excluidas. Verificar SHA-256 de cada fichero extraído contra los bytes originales del base64.

Estas decisiones no modifican saldos. El informe de conciliación comparará saldo inicial más movimientos contra saldo guardado por equipo y split; cualquier diferencia queda pendiente del dueño.
