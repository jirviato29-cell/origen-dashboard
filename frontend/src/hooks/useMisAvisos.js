import { useEffect, useState } from 'react';
import { misAvisosApi } from '../services/api';

// Lista de "mis avisos" (los que le tocan al usuario del token) cacheada a nivel
// de módulo y re-atada al token, para que se cargue UNA sola vez y la compartan
// TODOS los consumidores: el badge de "no leídos" del sidebar Y la propia página
// de la lista. Mismo patrón que usePuestosNuevos.
//
// `enabled`: solo cuando es true se toca la caché / se hace fetch. Sidebar y
// Layout lo pasan como (rol es voluntario o líder); los demás roles NO hacen
// ninguna llamada ni ven badge.
//
// estado: 'idle' (deshabilitado) · 'cargando' · 'ok' · 'error'

let cache = { key: null, estado: 'cargando', avisos: [], promise: null };
const subs = new Set();
const notificar = () => subs.forEach((fn) => fn());

function cargar(token) {
  // Token nuevo → caché limpia.
  if (cache.key !== token) {
    cache = { key: token, estado: 'cargando', avisos: [], promise: null };
  }
  // Ya resuelto: nada que hacer.
  if (cache.estado !== 'cargando') return;
  if (!cache.promise) {
    cache.promise = misAvisosApi.getAll()
      .then(({ data }) => { cache.estado = 'ok'; cache.avisos = Array.isArray(data) ? data : []; })
      .catch(() => { cache.estado = 'error'; cache.avisos = []; })
      .finally(() => notificar());
  }
}

// Fuerza recarga desde el backend (p. ej. al entrar a la lista) y avisa a todos.
export function recargarMisAvisos() {
  const token = cache.key;
  cache = { key: token, estado: 'cargando', avisos: cache.avisos, promise: null };
  cargar(token);
  notificar();
}

// Marca un aviso como leído en la caché local (optimista) para que el badge baje
// al instante; el backend ya persiste la lectura por separado.
export function marcarAvisoLeidoLocal(id) {
  cache = {
    ...cache,
    avisos: cache.avisos.map((a) => (a.id === id ? { ...a, visto: true } : a)),
  };
  notificar();
}

export default function useMisAvisos(enabled = true) {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const [, forzar] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let vivo = true;
    const rerender = () => { if (vivo) forzar((n) => n + 1); };
    subs.add(rerender);
    cargar(token);
    return () => { vivo = false; subs.delete(rerender); };
  }, [token, enabled]);

  if (!enabled) return { estado: 'idle', avisos: [], noLeidos: 0 };
  const noLeidos = cache.avisos.filter((a) => !a.visto).length;
  return { estado: cache.estado, avisos: cache.avisos, noLeidos };
}
