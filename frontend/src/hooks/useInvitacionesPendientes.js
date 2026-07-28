import { useEffect, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../services/api';

// Conteo de invitaciones PENDIENTES del voluntario (fechas por responder del mes
// actual y el siguiente), para el badge naranja del sidebar. Cacheado a nivel de
// módulo y re-atado al token (mismo patrón que usePuestosNuevos), así el badge se
// carga una sola vez y lo comparten todos los consumidores. La página de
// Invitaciones llama a refrescarInvitaciones() tras responder para que baje.
//
// estado: 'idle' (deshabilitado) · 'cargando' · 'ok' · 'error'

const mesDeHoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};
const sumaMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const contarPendientes = (data) => {
  const hoy = data?.hoy || '';
  return (data?.dias || []).filter(d =>
    (!hoy || d.fecha >= hoy) && d.puede_marcar && !d.bloqueado && d.estado == null
  ).length;
};

let cache = { key: null, estado: 'cargando', nuevos: 0, promise: null };
const subs = new Set();
const notificar = () => subs.forEach(fn => fn());

function cargar(token) {
  if (cache.key !== token) {
    cache = { key: token, estado: 'cargando', nuevos: 0, promise: null };
  }
  if (cache.estado !== 'cargando') return;
  if (!cache.promise) {
    const mesA = mesDeHoy();
    const mesB = sumaMes(mesA, 1);
    cache.promise = Promise.all([
      voluntarioDisponibilidadApi.getMes(mesA),
      voluntarioDisponibilidadApi.getMes(mesB),
    ])
      .then(([a, b]) => { cache.estado = 'ok'; cache.nuevos = contarPendientes(a.data) + contarPendientes(b.data); })
      .catch(() => { cache.estado = 'error'; cache.nuevos = 0; })
      .finally(() => notificar());
  }
}

// Invalida la caché y vuelve a consultar (tras responder una invitación).
export function refrescarInvitaciones() {
  const token = cache.key;
  cache = { key: token, estado: 'cargando', nuevos: cache.nuevos, promise: null };
  cargar(token);
  notificar();
}

export default function useInvitacionesPendientes(enabled = true) {
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
