import { useEffect, useState } from 'react';
import { voluntarioPuestosApi } from '../services/api';

// Conteo de "puestos nuevos" (asignaciones futuras sin ver) del voluntario,
// cacheado a nivel de módulo y re-atado al token para que se cargue UNA sola vez
// y lo compartan TODOS los consumidores (el badge del sidebar Y el puntito de la
// campanita en la topbar) sin duplicar la llamada. Mismo patrón que useLiderPerfil.
//
// `enabled`: solo cuando es true se toca la caché / se hace fetch. Sidebar y
// Layout lo pasan como (rol === 'voluntario'), así los demás roles NO hacen
// ninguna llamada extra ni ven badge.
//
// Como el badge vive en dos lugares a la vez, hay un pub/sub: cuando el voluntario
// abre "Mis puestos" y llama marcarPuestosVistos(), ambos badges bajan a 0.
//
// estado: 'idle' (deshabilitado) · 'cargando' · 'ok' · 'error'

let cache = { key: null, estado: 'cargando', nuevos: 0, promise: null };
const subs = new Set();
const notificar = () => subs.forEach(fn => fn());

function cargar(token) {
  // Token nuevo → caché limpia.
  if (cache.key !== token) {
    cache = { key: token, estado: 'cargando', nuevos: 0, promise: null };
  }
  // Ya resuelto: nada que hacer.
  if (cache.estado !== 'cargando') return;
  if (!cache.promise) {
    cache.promise = voluntarioPuestosApi.getNuevos()
      .then(({ data }) => { cache.estado = 'ok'; cache.nuevos = data?.nuevos || 0; })
      .catch(() => { cache.estado = 'error'; cache.nuevos = 0; })
      .finally(() => notificar());
  }
}

// Baja el badge a 0 en todos los consumidores (tras marcar-vistos en el backend).
// Mantiene el token para no re-consultar de inmediato; en la próxima sesión/token
// se vuelve a cargar fresco.
export function marcarPuestosVistos() {
  cache = { key: cache.key, estado: 'ok', nuevos: 0, promise: null };
  notificar();
}

export default function usePuestosNuevos(enabled = true) {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const [, forzar] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let vivo = true;
    const rerender = () => { if (vivo) forzar(n => n + 1); };
    subs.add(rerender);
    cargar(token);
    return () => { vivo = false; subs.delete(rerender); };
  }, [token, enabled]);

  if (!enabled) return { estado: 'idle', nuevos: 0 };
  return { estado: cache.estado, nuevos: cache.nuevos };
}
