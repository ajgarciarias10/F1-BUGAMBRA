# F1 Bugambra

Aplicación de Formula 1 con perfiles de usuarios, datos de carreras, sistema de economía y rivalidades. El frontend está en `apps/web` y está construido con React, TypeScript, Vite y Firebase.

La migración al nuevo backend autoritativo Node.js + PostgreSQL está en `apps/api`. Durante la transición, la SPA sigue funcionando sin cambios mientras se sustituyen gradualmente las operaciones directas sobre Firestore.

## Stack tecnológico

- **Frontend:** React 19, TypeScript, Tailwind CSS 4
- **Bundler:** Vite 6
- **Backend actual:** Firebase (Firestore + Storage + Auth)
- **Backend nuevo:** Node.js + TypeScript + PostgreSQL; Firebase se conserva para Auth
- **IA:** Google Gemini API
- **Hosting:** Replit
- **Router:** React Router v7

---

## Ejecutar en Replit

1. Importa el repositorio en [replit.com](https://replit.com)
2. Abre la pestaña **Secrets** (candado en el panel izquierdo) y añade:
   - `GEMINI_API_KEY` → tu clave de la API de Google Gemini
3. Haz clic en **Run** — Replit ejecutará `npm run dev` automáticamente

La app estará disponible en la URL pública que Replit asigna al proyecto.

---

## Desarrollo local

**Requisitos:** Node.js 22+ y npm 10+

```bash
npm install
npm run dev
```

Crea un archivo `.env.local` con tus variables de entorno:
```
GEMINI_API_KEY=tu_clave_de_gemini
```

La app estará en `http://localhost:3000`.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` / `npm start` | Servidor web de desarrollo en puerto 3000 |
| `npm run dev:web` | Servidor web de desarrollo en puerto 3000 |
| `npm run dev:api` | Servidor API de desarrollo |
| `npm run build` | Genera los archivos web de producción en `apps/web/dist/` |
| `npm run preview` | Sirve el build de producción en puerto 3000 |
| `npm run typecheck` / `npm run lint` | Comprueba tipos en los workspaces |
| `npm test` | Ejecuta los tests del backend |

Los comandos y requisitos del backend nuevo están documentados en [apps/api/README.md](apps/api/README.md). La arquitectura y el comportamiento de las correcciones están en [docs/architecture.md](docs/architecture.md).

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `GEMINI_API_KEY` | Clave de la API de Google Gemini | Sí |

En Replit se configuran en **Secrets** (nunca en el código). En local se ponen en `.env.local`.

---

## Aplicación móvil (PWA)

La web es instalable como aplicación en Android e iPhone, gratis y sin pasar por
Play Store ni App Store. Los usuarios la instalan desde el propio navegador:
la página **`/instalar`** explica los pasos de cada sistema y un banner la ofrece
en la portada.

Piezas que lo hacen posible:

| Archivo | Función |
|---|---|
| `apps/web/public/manifest.webmanifest` | Nombre, iconos, color y accesos directos de la app |
| `apps/web/public/sw.js` | Service worker: shell offline y caché de assets |
| `apps/web/public/icons/` | Iconos 192/512, versión *maskable* y `apple-touch-icon` |
| `apps/web/src/pwa/registerServiceWorker.ts` | Registro del SW (solo en producción) |
| `apps/web/src/hooks/usePWAInstall.ts` | Captura `beforeinstallprompt` y detecta plataforma |
| `apps/web/src/components/InstallApp.tsx` | Página `/instalar`, banner y botón de instalación |

Al tocar `sw.js` hay que subir su constante `SW_VERSION` para que las cachés
antiguas se limpien en los dispositivos ya instalados.

Firestore, Auth y Storage nunca pasan por caché: el service worker los deja ir
siempre a red para no servir datos de liga caducados.

Para generar un vídeo explicativo de la instalación con NotebookLM o Gemini están
las instrucciones en [docs/video-instalacion-instrucciones.md](docs/video-instalacion-instrucciones.md),
con la guía de usuario en [docs/guia-instalacion-app.md](docs/guia-instalacion-app.md).

---

## Firebase

El proyecto usa Firebase para autenticación, base de datos (Firestore) y almacenamiento. La configuración CORS de Firebase Storage está en [cors.json](cors.json).

Una vez conozcas la URL exacta de tu Replit (formato `https://tu-proyecto.usuario.repl.co`), añádela al array `origin` de [cors.json](cors.json) y aplica los cambios:

```bash
gcloud storage buckets update gs://TU_BUCKET --cors-file=cors.json
```
