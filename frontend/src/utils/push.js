// Helper de notificaciones push del navegador.
//
// Reglas clave:
//   · El permiso SOLO se pide desde un gesto del usuario (un clic). Nunca al
//     cargar: iOS lo rechaza y además es mala práctica.
//   · La clave pública VAPID se lee de import.meta.env (VITE_VAPID_PUBLIC_KEY),
//     nunca hardcodeada.
//   · En iPhone el push web solo funciona si la PWA está INSTALADA en la pantalla
//     de inicio (modo standalone), no desde Safari normal.

import { pushApi } from '../services/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// ¿El navegador soporta push? (SW + PushManager + Notification)
export function soportaPush() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Detección de iOS/iPadOS (incluye el iPad que se hace pasar por Mac).
export function esIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSClasico = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return iOSClasico || iPadOS;
}

// ¿La app corre como PWA instalada (standalone)?
export function enModoStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator.standalone === true // iOS Safari
  );
}

// La clave VAPID viaja en Base64URL; PushManager la exige como Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const salida = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) salida[i] = raw.charCodeAt(i);
  return salida;
}

// Estado actual sin pedir nada: sirve para pintar el botón al cargar.
//   { soportado, permiso: 'default'|'granted'|'denied', activo, iosSinInstalar }
export async function estadoNotificaciones() {
  const soportado = soportaPush();
  const iosSinInstalar = esIOS() && !enModoStandalone();
  if (!soportado) {
    return { soportado: false, permiso: 'default', activo: false, iosSinInstalar };
  }
  const permiso = Notification.permission;
  let activo = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    activo = Boolean(sub);
  } catch { /* ignore */ }
  return { soportado, permiso, activo, iosSinInstalar };
}

// Pide permiso (desde un clic) y suscribe. Devuelve la suscripción o lanza un
// Error con un mensaje claro para mostrar en la UI.
export async function activarNotificaciones() {
  if (!soportaPush()) {
    throw new Error('Este navegador no soporta notificaciones.');
  }
  if (esIOS() && !enModoStandalone()) {
    throw new Error('Primero agrega Origen a tu pantalla de inicio para activar las notificaciones.');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Falta la clave pública VAPID (VITE_VAPID_PUBLIC_KEY).');
  }

  // El permiso DEBE pedirse dentro del gesto del usuario.
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    throw new Error('Permiso denegado. Actívalo desde los ajustes del navegador para este sitio.');
  }

  const reg = await navigator.serviceWorker.ready;

  // Reutiliza la suscripción si ya existe; si no, crea una nueva.
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // Mandar al backend (se liga al usuario del token). Enviamos el objeto
  // serializado { endpoint, keys:{ p256dh, auth } }.
  await pushApi.suscribir(sub.toJSON());
  return sub;
}

// Manda la notificación de prueba (solo al propio usuario).
export async function mandarPrueba() {
  await pushApi.prueba();
}

// Desactiva: cancela la suscripción del navegador y avisa al backend.
export async function desactivarNotificaciones() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await pushApi.desuscribir(sub.endpoint).catch(() => { /* backend best-effort */ });
      await sub.unsubscribe();
    }
  } catch { /* ignore */ }
}
