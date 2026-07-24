import { useEffect, useState } from 'react';
import { liderPerfilApi } from '../services/api';

// Perfil del líder (nombre de su ministerio), cacheado a nivel de módulo y
// re-atado al token para que se cargue UNA sola vez y lo compartan todos los
// consumidores (el shell del panel del líder Y la topbar del Layout) sin
// duplicar la llamada. Si cambia el token (otro login) la caché se invalida.
//
// `enabled`: solo cuando es true se toca la caché / se hace fetch. La topbar del
// Layout lo pasa como (rol === 'lider_ministerio'), así los demás roles NO
// hacen ninguna llamada extra.
//
// estado: 'idle' (deshabilitado) · 'cargando' · 'ok' · 'sin_ministerio' · 'error'

let perfilCache = { key: null, estado: 'cargando', nombre: null, promise: null };

export default function useLiderPerfil(enabled = true) {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const [, forzar] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let vivo = true;
    const rerender = () => { if (vivo) forzar(n => n + 1); };

    // Token nuevo → caché limpia.
    if (perfilCache.key !== token) {
      perfilCache = { key: token, estado: 'cargando', nombre: null, promise: null };
    }
    // Ya resuelto: nada que hacer.
    if (perfilCache.estado !== 'cargando') return () => { vivo = false; };

    if (!perfilCache.promise) {
      perfilCache.promise = liderPerfilApi.get()
        .then(({ data }) => { perfilCache.estado = 'ok'; perfilCache.nombre = data.ministerio_nombre || null; })
        // 400 = contextoLider dice que el líder no tiene ministerio asignado.
        .catch(err => { perfilCache.estado = err.response?.status === 400 ? 'sin_ministerio' : 'error'; });
    }
    perfilCache.promise.then(rerender);
    return () => { vivo = false; };
  }, [token, enabled]);

  if (!enabled) return { estado: 'idle', nombre: null };
  return { estado: perfilCache.estado, nombre: perfilCache.nombre };
}
