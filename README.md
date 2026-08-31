# F1 Bugambra

Aplicación de Formula 1 con perfiles de usuarios, datos de carreras, sistema de economía y rivalidades. El frontend actual está construido con React, TypeScript, Vite y Firebase.

La migración al nuevo backend autoritativo Node.js + PostgreSQL está en `apps/api`. Durante la transición, la SPA actual sigue funcionando sin cambios mientras se sustituyen gradualmente las operaciones directas sobre Firestore.

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

**Requisitos:** Node.js 18+

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
| `npm run dev` / `npm start` | Servidor de desarrollo en puerto 3000 |
| `npm run build` | Genera los archivos de producción en `dist/` |
| `npm run preview` | Sirve el build de producción en puerto 3000 |
| `npm run lint` | Comprueba tipos con TypeScript |

Los comandos y requisitos del backend nuevo están documentados en [apps/api/README.md](apps/api/README.md). La arquitectura y el comportamiento de las correcciones están en [docs/architecture.md](docs/architecture.md).

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `GEMINI_API_KEY` | Clave de la API de Google Gemini | Sí |

En Replit se configuran en **Secrets** (nunca en el código). En local se ponen en `.env.local`.

---

## Firebase

El proyecto usa Firebase para autenticación, base de datos (Firestore) y almacenamiento. La configuración CORS de Firebase Storage está en [cors.json](cors.json).

Una vez conozcas la URL exacta de tu Replit (formato `https://tu-proyecto.usuario.repl.co`), añádela al array `origin` de [cors.json](cors.json) y aplica los cambios:

```bash
gcloud storage buckets update gs://TU_BUCKET --cors-file=cors.json
```
