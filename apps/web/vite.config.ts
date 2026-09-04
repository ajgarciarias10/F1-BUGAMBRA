import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const envDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir, '');
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Las dependencias pesadas van en trozos propios. Firebase es el 57% del
      // bundle y casi nunca cambia: separarlo hace que un despliegue de la liga
      // solo invalide el trozo de la app, en vez de obligar a cada móvil a
      // volver a bajarse 1 MB. Además el navegador los descarga en paralelo.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // Solo se nombran los trozos que interesa aislar. Nada de un
            // "return 'vendor'" genérico al final: forzaría a `firebase/auth`
            // dentro del paquete inicial y anularía su carga diferida.
            if (id.includes('@firebase/firestore')) return 'firebase-firestore';
            if (id.includes('react-dom') || id.includes('scheduler') || id.includes('react-router')) {
              return 'react';
            }
            // El resto lo reparte Rollup siguiendo los import dinámicos.
          },
        },
      },
      // El aviso por defecto salta a los 500 kB y con firebase separado ya no
      // aporta nada: subimos el umbral para que un aviso signifique algo.
      chunkSizeWarningLimit: 700,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
