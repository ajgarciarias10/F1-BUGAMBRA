# API F1 Bugambra

Backend autoritativo de F1 Bugambra. Firebase autentica a los usuarios, pero los roles, datos y cálculos se validan en esta API y se guardan en PostgreSQL.

## Requisitos

- Node.js 22 o superior
- npm 10 o superior
- PostgreSQL 16 o superior
- Un proyecto de Firebase y una cuenta de servicio para Firebase Admin

## Desarrollo local

```bash
corepack npm@10.9.4 ci
cp apps/api/.env.example apps/api/.env
cd apps/api
docker compose up -d
cd ../..
corepack npm@10.9.4 --workspace @f1-bugambra/api run db:migrate
corepack npm@10.9.4 --workspace @f1-bugambra/api test
corepack npm@10.9.4 --workspace @f1-bugambra/api run dev
```

La API escucha por defecto en `http://localhost:4000`. PostgreSQL solo se publica en `127.0.0.1`, por lo que no acepta conexiones desde la red.

## Autenticación

El frontend debe enviar el ID token obtenido con Firebase Auth:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

Firebase Admin verifica firma, caducidad y revocación. Después, la API carga el usuario y su rol desde `app_user`; un usuario válido de Firebase que no esté habilitado en PostgreSQL no obtiene acceso.

En el servidor, `GOOGLE_APPLICATION_CREDENTIALS` debe apuntar a la cuenta de servicio y el archivo debe ser legible únicamente por el usuario del proceso de la API.

## Correcciones de carrera

Previsualizar una corrección:

```http
POST /api/seasons/:seasonId/races/:raceId/correction-preview
```

Confirmarla:

```http
POST /api/seasons/:seasonId/races/:raceId/corrections
Idempotency-Key: UUID_GENERADO_POR_EL_CLIENTE
```

La previsualización devuelve `currentRevision` y `raceSequence`. La confirmación los reenvía como `expectedRevision` y `raceSequence`, junto a `correctionReason` y `results`. Se rechaza si otro administrador cambió la carrera desde la previsualización. Repetir exactamente la misma petición con la misma clave devuelve el resultado anterior sin duplicar puntos.

Una corrección crea una revisión nueva y reconstruye puntos y rating desde todos los resultados vigentes. No modifica acumulados mediante incrementos. Las carreras económicamente liquidadas están bloqueadas hasta incorporar la reversión mediante ledger.

## Comprobación con Excel

El Excel manual se utiliza como fuente de contraste, nunca como escritura automática:

```http
POST /api/seasons/:seasonId/reconciliation/excel
Content-Type: multipart/form-data

workbook: archivo .xlsx
sheetName: 2026 (opcional)
```

El adaptador reconoce el formato actual del documento compartido: hoja `Reglamento`, hojas anuales, bloques de seis carreras, clasificación de pilotos y escuderías y presupuestos. Normaliza acentos y estrellas en pilotos, y agrupa entradas como `Zenith 1` a `Zenith`.

La respuesta incluye diferencias por regla, carrera, total de piloto, total de equipo y presupuesto, además de nombres que no se hayan podido asociar. También devuelve huellas SHA-256 de contenido y estructura, el perfil reconocido y `manualReviewRequired: true`. Mientras no estén terminados los motores de rivalidades, ledger y mercado, devuelve `fullyVerified: false` y enumera exactamente qué secciones todavía no ha comparado. El proceso carga el fichero en memoria con un límite de 5 MB, limita su contenido descomprimido a 25 MB y no modifica PostgreSQL.

Cada Excel nuevo debe seguir el protocolo de [auditoría del Excel](../../docs/excel-control-audit.md), incluso si conserva el mismo nombre de fichero. Un cambio de datos exige repetir la conciliación; un cambio de estructura o fórmulas exige revisar y adaptar el lector y sus pruebas.

## Migraciones

Los cambios de esquema viven en `database/migrations` y se ejecutan en orden:

```bash
corepack npm@10.9.4 --workspace @f1-bugambra/api run db:migrate
```

El ejecutor usa un bloqueo de PostgreSQL y registra cada fichero en `schema_migration`. No se deben editar migraciones que ya hayan llegado a un servidor; se añade una migración nueva.

## Operación por SSH

El flujo previsto para el servidor es:

```bash
ssh usuario@servidor
cd /opt/f1-bugambra
corepack npm@10.9.4 ci
corepack npm@10.9.4 --workspace @f1-bugambra/api run typecheck
corepack npm@10.9.4 --workspace @f1-bugambra/api test
corepack npm@10.9.4 --workspace @f1-bugambra/api run db:migrate
sudo systemctl restart f1-bugambra-api
```

La API se expondrá mediante HTTPS detrás de Caddy o Nginx. El puerto de PostgreSQL no debe abrirse públicamente. Las copias se realizarán con `pg_dump` desde el propio servidor.
