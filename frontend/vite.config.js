import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const NAVY = '#112540' // navy del sistema (theme_color / background_color)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Al publicar una versión nueva, el SW se actualiza solo en la siguiente apertura.
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      manifest: {
        name: 'Origen Dashboard',
        short_name: 'Origen',
        description: 'Dashboard de Origen para voluntarios y equipos.',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: NAVY,
        background_color: NAVY,
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Nueva versión activa de inmediato, sin quedar "waiting".
        skipWaiting: true,
        clientsClaim: true,

        // SOLO el shell entra al precache: html, js, css, iconos y favicon.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
        // El bundle principal de la app supera los 2 MiB por defecto; subimos el
        // límite para que el shell completo (incluido el JS) quede precacheado.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,

        // Las rutas del SPA (p. ej. /voluntario/calendario abierta directo) caen a index.html...
        navigateFallback: '/index.html',
        // ...PERO nunca interceptamos la API ni rutas con extensión de archivo.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/api$/,
          /\/[^/?]+\.[^/]+$/, // cualquier ruta que termine en un archivo con extensión
        ],

        // CRÍTICO: NO hay runtimeCaching. La API (/api y el backend en Render) NUNCA se cachea.
        // Sin runtimeCaching definido, cada petición fetch/axios va siempre a la red.
        runtimeCaching: [],
      },

      devOptions: {
        // No activamos el SW en `vite dev` para no interferir mientras se desarrolla.
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
