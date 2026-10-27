# 09. Reabrir un acta cerrada desde el diseño

- **Branch from:** `main` (9fa12c0)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/09-reabrir-acta.md`, `tool/conectar-prototipo.mjs`, `tool/prototipo-acciones.js`, `apps/web/src/prototipo/**`
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** con el acta cerrada, el admin ve el aviso y «Reabrir acta», y guardar o cerrar le lleva a reabrirla en vez de ignorar el cambio; reabrir revierte antes la economía procesada con `revertirEconomiaCarrera`, y se niega si un piloto se pactó después de ese GP hasta deshacer el pacto; build y tests pasan.

## Context

El 27-10-2026 el dueño cambió a Fabi al 6.º del GP 16 (sanción) con el acta ya cerrada y la economía procesada; el cambio no se guardó. Después se pactó a Carlos con Roses (congelado en ese GP). Hay que deshacer el pacto, reabrir el acta revirtiendo la economía, corregir y volver a procesar.
