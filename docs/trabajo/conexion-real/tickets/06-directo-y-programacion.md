# 06. Directo en el inicio y programación del GP activo

- **Branch from:** `main` (623aec2)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/06-directo-y-programacion.md`, `tool/conectar-prototipo.mjs`, `tool/prototipo-acciones.js`, `apps/web/src/prototipo/**`, `apps/web/src/services/readModelService.ts`, `apps/web/src/components/AdminDashboard.tsx`
- **Do not touch:** `apps/api/**`, `firestore.rules`, las reglas de dinero.
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** cuando la liga (o Fabi) emite en Twitch, el directo sale arriba del inicio y de la portada, y la página lo detecta sola (consulta cada minuto); el admin abre el GP activo y guarda su fecha, hora y vídeo de la vuelta rápida con los mismos servicios que «Programar carrera»; Carreras enseña ese vídeo; typecheck, tests web y build pasan.

## Context

El 24-10-2026 el dueño pidió ver el directo de Imola en el inicio al empezar la emisión y poder poner, como admin, la hora y el vídeo de la vuelta rápida del circuito activo.

## Design

- La programación sale de `AdminDashboard` a `programarCarrera` en `readModelService`, junto a `setFastestLapVideo`.
- El diseño valida y monta el vídeo con `utils/youtube.ts`, las mismas reglas que al guardarlo.
