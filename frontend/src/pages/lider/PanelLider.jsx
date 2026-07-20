// Pantallas del líder de ministerio, ahora separadas en tres rutas/pestañas.
// Cada una envuelve su sección (que ya trae su propio título + descripción) en
// el contenedor estándar (ancho acotado + tarjeta blanca). El título de página
// lo pone la topbar del Layout vía ROUTE_INFO.
import { useEffect, useState } from 'react';
import { liderPerfilApi } from '../../services/api';
import MisVoluntarios from './MisVoluntarios';
import PosicionesMinisterio from './PosicionesMinisterio';
import ProgramarServicio from './ProgramarServicio';

const NAVY_900 = '#112540';
const ORANGE_500 = '#FF6B2B';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';

const CSS = `
.pl-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;max-width:720px;}
.pl-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ORANGE_500};margin-bottom:7px;}
.pl-title{font-size:22px;font-weight:800;letter-spacing:-.03em;color:${NAVY_900};margin:0;}
.pl-sub{font-size:13px;color:${GRAY_500};margin:6px 0 0;}
.pl-warn{margin-top:12px;padding:11px 14px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:#D23B36;font-size:12.5px;font-weight:600;}
.pl-card{margin-top:18px;background:#fff;border:1px solid ${GRAY_200};border-radius:16px;padding:24px;}
`;

// Perfil del líder (nombre de su ministerio), cacheado a nivel de módulo y
// re-atado al token para que se cargue UNA vez y no se refetchee al cambiar de
// pestaña (las tres pantallas montan su propio shell). Si cambia el token
// (otro login), la caché se invalida sola.
let perfilCache = { key: null, estado: 'cargando', nombre: null, promise: null };

function useLiderPerfil() {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const [, forzar] = useState(0);

  useEffect(() => {
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
  }, [token]);

  return { estado: perfilCache.estado, nombre: perfilCache.nombre };
}

// Cabecera + tarjeta compartida por las tres pantallas del líder.
function LiderShell({ title, sub, children }) {
  const { estado, nombre } = useLiderPerfil();
  // "Ministerio · Origen Kids" cuando hay nombre; el fallback discreto es solo
  // "Ministerio" (mientras carga, si falla la red, o sin ministerio).
  const eyebrow = estado === 'ok' && nombre ? `Ministerio · ${nombre}` : 'Ministerio';
  return (
    <div className="pl-root">
      <style>{CSS}</style>
      <div className="pl-eyebrow">{eyebrow}</div>
      <h1 className="pl-title">{title}</h1>
      <div className="pl-sub">{sub}</div>
      {estado === 'sin_ministerio' && (
        <div className="pl-warn">
          Sin ministerio asignado — pídele al administrador que te lo asigne.
        </div>
      )}
      <div className="pl-card">{children}</div>
    </div>
  );
}

export function LiderVoluntarios() {
  return (
    <LiderShell title="Mis voluntarios" sub="Da de alta a tu equipo y pásales su clave de acceso.">
      <MisVoluntarios />
    </LiderShell>
  );
}

export function LiderPosiciones() {
  return (
    <LiderShell title="Posiciones" sub="Define las posiciones de tu ministerio para asignarlas a tu equipo.">
      <PosicionesMinisterio />
    </LiderShell>
  );
}

export function LiderProgramar() {
  return (
    <LiderShell title="Programar servicio" sub="Mira quién puede servir y reparte posiciones por fecha.">
      <ProgramarServicio />
    </LiderShell>
  );
}
