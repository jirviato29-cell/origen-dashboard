// Service Worker propio (estrategia injectManifest de vite-plugin-pwa).
//
// Reemplaza al SW autogenerado (generateSW) para poder añadir los handlers de
// push, PERO conserva EXACTAMENTE el mismo comportamiento del shell que ya había:
//   · Precache SOLO del shell (self.__WB_MANIFEST): html, js, css, iconos.
//   · autoUpdate + skipWaiting + clientsClaim → la versión nueva entra sola.
//   · navigateFallback a index.html para rutas del SPA...
//   · ...SIN interceptar /api ni archivos con extensión.
//   · NADA de runtimeCaching: la API (/api y el backend en Render) NUNCA se
//     cachea. Es CRÍTICO: evita el bug de servir contenido viejo.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

// La versión nueva activa de inmediato, sin quedar "waiting".
self.skipWaiting();
clientsClaim();

// Precache del shell. vite-plugin-pwa inyecta aquí la lista de archivos del
// build (self.__WB_MANIFEST) según injectManifest.globPatterns de vite.config.
precacheAndRoute(self.__WB_MANIFEST || []);
// Limpia precaches de versiones anteriores (equivale a cleanupOutdatedCaches
// del generateSW): no se acumulan cachés viejos entre despliegues.
cleanupOutdatedCaches();

// Rutas del SPA (p. ej. /voluntario/calendario abierta directo) → index.html.
// PERO nunca interceptamos la API ni rutas que terminan en un archivo con
// extensión (mismos patrones que tenía navigateFallbackDenylist).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [
      /^\/api\//,
      /^\/api$/,
      /\/[^/?]+\.[^/]+$/, // cualquier ruta que termine en un archivo con extensión
    ],
  })
);

// IMPORTANTE: NO hay ningún registerRoute para /api ni runtimeCaching. Toda
// petición fetch/axios a la API va SIEMPRE a la red (sin caché).

// ── Push ──────────────────────────────────────────────────────────────────────
// El backend manda un JSON { titulo, cuerpo, url }. Mostramos la notificación con
// el icono de Origen y un badge; la URL de destino viaja en data para el click.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { cuerpo: event.data ? event.data.text() : '' };
  }
  const titulo = data.titulo || 'Origen';
  const cuerpo = data.cuerpo || '';
  const url    = data.url    || '/';
  // icon = logo a color (grande). badge = silueta monocroma para la barra de
  // estado en Android (se convierte usando SOLO el canal alfa). Deben ser
  // archivos DISTINTOS: si el badge apunta al PNG opaco del icon, Android lo
  // dibuja como un cuadro blanco sólido. Se leen del payload con respaldo local.
  const icon  = data.icon  || '/pwa-192x192.png';
  const badge = data.badge || '/badge.png';

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon,
      badge,
      vibrate: [200, 100, 200],
      data: { url },
    })
  );
});

// ── Click en la notificación ──────────────────────────────────────────────────
// Cierra la notificación y abre/enfoca la app en la URL del payload (o en /).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Si ya hay una ventana de la app abierta, la enfocamos y navegamos.
    for (const cliente of clientes) {
      if ('focus' in cliente) {
        await cliente.focus();
        if ('navigate' in cliente) {
          try { await cliente.navigate(url); } catch { /* mismo-origen puede fallar; ignorar */ }
        }
        return;
      }
    }
    // Si no hay ninguna abierta, abrimos una nueva.
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
