# F1 Bugambra

Aplicación de Formula 1 con perfiles de usuarios, datos de carreras, sistema de economía y rivalidades. Construida con React + TypeScript + Vite y Firebase como backend.

**URL en producción:** https://ajgarciarias10.github.io/F1-BUGAMBRA/

---

## Stack tecnológico

- **Frontend:** React 19, TypeScript, Tailwind CSS 4
- **Bundler:** Vite 6
- **Backend:** Firebase (Firestore + Storage + Auth)
- **IA:** Google Gemini API
- **Hosting:** GitHub Pages
- **Router:** React Router v7

---

## Desarrollo local

**Requisitos:** Node.js 18+

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Crea el archivo `.env.local` con tus variables de entorno:
   ```
   GEMINI_API_KEY=tu_clave_de_gemini
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La app estará disponible en `http://localhost:3000`

---

## Build para producción

```bash
npm run build
```

Los archivos de salida se generan en la carpeta `dist/`.

Para previsualizar el build localmente:
```bash
npm run preview
```

---

## Despliegue en GitHub Pages

El repositorio se despliega en `https://ajgarciarias10.github.io/F1-BUGAMBRA/`.

### Pasos manuales

1. Genera el build:
   ```bash
   npm run build
   ```

2. Publica el contenido de `dist/` en la rama `gh-pages` (puedes usar [gh-pages](https://github.com/tschaub/gh-pages)):
   ```bash
   npx gh-pages -d dist
   ```

### Notas importantes

- La app usa `BrowserRouter` con `basename="/F1-BUGAMBRA"`, por lo que todas las rutas son relativas a ese prefijo.
- El archivo `public/404.html` gestiona el redireccionamiento para que el enrutado del lado del cliente funcione correctamente en GitHub Pages.
- El script en `index.html` restaura la ruta real después del redireccionamiento desde `404.html`.

---

## Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `GEMINI_API_KEY` | Clave de la API de Google Gemini | Sí |

Las variables de entorno **no se incluyen en el repositorio**. Configura `GEMINI_API_KEY` en tu archivo `.env.local` para desarrollo local. Para GitHub Pages, el valor se debe incrustar en el build.

---

## Firebase

El proyecto usa Firebase para autenticación, base de datos (Firestore) y almacenamiento de archivos. La configuración CORS de Firebase Storage está en [cors.json](cors.json) y permite solicitudes desde el dominio de GitHub Pages.

Para actualizar las reglas CORS en Firebase Storage:
```bash
gcloud storage buckets update gs://TU_BUCKET --cors-file=cors.json
```
