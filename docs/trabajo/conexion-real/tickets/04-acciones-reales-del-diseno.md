# 04. Acciones del diseño con los servicios auditados (fase 2, primera parte)

- **Branch from:** `main` (cb6ce86)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/04-acciones-reales-del-diseno.md`, `tool/conectar-prototipo.mjs`, `tool/prototipo-acciones.js`, `apps/web/src/prototipo/**`, `apps/web/src/services/rivalidadesService.ts`, `apps/web/src/utils/rivalidades.ts`, `apps/web/src/utils/rivalidades.test.ts`, `apps/web/src/components/AdminRivalriesPanel.tsx`, `docs/BACKLOG.md`
- **Do not touch:** `apps/api/**`, `firestore.rules`, las reglas de dinero (`utils/presupuesto.ts`, `utils/economyRules.ts`) y el resto de servicios, que solo se llaman.
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** en el diseño, pactar, deshacer pacto o alta, corregir precio de compra, procesar la economía de un GP, guardar rivalidades, abrir/cerrar el mercado y enviar propuestas al buzón escriben con los mismos servicios que el panel clásico; el mercado solo aparece con `fichajes_abiertos`; el perfil enseña la trayectoria real del piloto enlazado; ninguna acción sigue simulando un guardado (las no conectadas abren el panel completo); typecheck, tests web y build pasan.

## Context

El 24-10-2026 el dueño aprobó conectar las acciones por partes. Pidió además: el mercado solo visible cuando él lo abra; los fichajes fuera de la subasta se hacen desde el mercado del admin para que no se vean en vivo; su trayectoria de piloto (es admin con `piloto_toni`) debe verse.

## Design

- `src/prototipo/acciones.ts` traduce ids del diseño a Firestore y llama a `transferService`, `economyService`, `adminMutationService`, `rivalidadesService` y `sugerenciasService`. Se carga bajo demanda.
- `tool/prototipo-acciones.js` redefine en el diseño las funciones simuladas.
- Las rivalidades salen de `AdminRivalriesPanel` a `rivalidadesService` (con su parte pura en `utils/rivalidades.ts`) para que el panel y el diseño guarden igual.

## Pending (siguiente parte)

Liberar piloto y ajustar cláusula (hoy dentro de `EconomyAdminPanel`), alta/fichaje fuera de subasta, ajuste de saldo, acta y decisiones FIA, usuarios y roles, sala de pujas, logo del jeque, iniciar temporada. Hasta entonces abren el panel completo.
