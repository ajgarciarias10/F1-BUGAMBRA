# 03. El diseño aprobado (prototipo) es la app, con sesión real

- **Branch from:** `main` (17cac3d)
- **Work branch:** `feature/prototipo-conectado`
- **Owned files:** `docs/trabajo/conexion-real/tickets/03-prototipo-con-sesion-real.md`, `tool/conectar-prototipo.mjs`, `tool/web-entry.test.mjs`, `apps/web/src/prototipo/**`, `apps/web/panel.html` (antes `apps/web/index.html`), `apps/web/src/App.tsx`, `apps/web/vite.config.ts`, `apps/web/package.json`, `apps/web/public/sw.js`, `vercel.json`, `.gitignore`, `docs/redesign/prototipo-gemini/index.html` y `generador/liga-live.js` (solo el nombre de Imola), `docs/BACKLOG.md`
- **Do not touch:** `apps/api/**`, `firestore.rules`, `apps/web/src/services/**`, `apps/web/src/utils/**`, `apps/web/src/contexts/**`
- **Agent and model:** Agente de esta sesión, sin delegación.
- **Done when:** `/` publica el diseño del prototipo sin barra de simulación; Google, correo, registro, recuperar contraseña y cerrar sesión son reales (Firebase Auth y `perfilService`); rol, nombre, escudería y piloto salen de `usuarios/{uid}`; las rutas privadas esperan a la sesión y sin ella llevan a Entrar; los paneles clásicos siguen en `/admin`, `/jeque`, `/piloto` y `/usuario`; typecheck, tests web y build (con su comprobación del artefacto) pasan.

## Context

El 24-10-2026 el dueño rechazó las pantallas React del rediseño: quiere su prototipo (`docs/redesign/prototipo-gemini/index.html`) como la app, conectado al back. Aprobó este plan: barra fuera, Google y roles reales, y cada acción simulada pasa a los servicios auditados existentes, por fases.

## Design

- `tool/conectar-prototipo.mjs` genera `apps/web/index.html` desde el prototipo en `dev` y `build`. Cada cambio debe encajar una sola vez o el build falla.
- `apps/web/src/prototipo/sesion.ts` reutiliza `services/auth`, `services/perfilService` y `utils/authFeedback`, y publica la sesión con el evento `bugambra:sesion`.
- La app React queda en `panel.html` para los paneles clásicos; Vercel enruta allí `/admin`, `/jeque`, `/piloto` y `/usuario`. El menú del diseño enlaza a «Panel completo» mientras sus acciones sigan simuladas.
- El service worker solo sirve desde caché la navegación a `/`; sube a `v3` para tirar la caché antigua.

## Out of scope (fase 2)

Las acciones del diseño que aún dicen «prototipo: no se guarda» (economía, actas, pactos, rivalidades, altas, buzón, logo del jeque, pujas) y el libro de movimientos de ejemplo.
