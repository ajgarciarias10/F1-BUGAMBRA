# Arquitectura objetivo

## Responsabilidades

- React muestra datos y envía comandos mediante HTTPS.
- Firebase Auth gestiona credenciales e identidad.
- La API valida tokens, roles, entradas y reglas de negocio.
- PostgreSQL mantiene integridad, revisiones, auditoría y proyecciones.
- SSH se usa para despliegue, migraciones, copias y diagnóstico, nunca desde el navegador.

## Fuente de verdad

Los resultados vigentes de cada carrera y el ruleset publicado son la fuente deportiva. El ruleset incluye puntos, rating, premios económicos y parámetros de mercado. `driver_standing` y `team_standing` son proyecciones reconstruibles, no datos independientes que deban incrementarse manualmente.

Cada resultado contiene el equipo del piloto en esa carrera. Un fichaje posterior no mueve puntos históricos.

Las altas y bajas se expresan mediante secuencias inclusivas de carrera. Un piloto que se incorpora en el tercer bloque de seis carreras comienza en la secuencia 13; quien sale al terminar el segundo bloque finaliza en la 12. Salir de la liga no elimina resultados ni puntos históricos.

## Correcciones

1. El administrador solicita una previsualización.
2. La API sustituye en memoria la revisión seleccionada y reconstruye la temporada.
3. El frontend muestra diferencias de puntos y rating.
4. La confirmación incluye revisión esperada y clave de idempotencia.
5. PostgreSQL bloquea la carrera y verifica que la revisión no cambió.
6. Se conserva la revisión anterior como `superseded` y se crea una nueva.
7. Las proyecciones se reemplazan con el estado reconstruido.
8. La operación y el motivo quedan en auditoría.

Cuando esté implementado el motor económico, una carrera liquidada generará asientos inversos de su revisión anterior y nuevos asientos para la revisión corregida. Nunca se desbloqueará un booleano para volver a sumar premios.

## Reconciliación con Excel

El Excel histórico es una segunda fuente de comprobación, no la fuente de verdad operativa. Un administrador puede subirlo para comparar reglas, puntos por carrera, totales de pilotos y escuderías y presupuestos. El informe es de solo lectura y debe resolver nombres mediante alias normalizados; cualquier nombre ambiguo o desconocido se muestra para revisión manual.

Cada fichero genera una huella de contenido y otra estructural. Un fichero nuevo nunca se acepta silenciosamente: la API indica revisión manual obligatoria y el procedimiento completo está descrito en [excel-control-audit.md](excel-control-audit.md).

## Importación futura de imágenes

`race_source_asset` y `race_revision.source` preparan la importación sin dar autoridad a la IA. El flujo futuro será imagen, extracción, borrador, validación, revisión humana y confirmación normal. La imagen original y la salida interpretada permanecerán asociadas a la revisión.
