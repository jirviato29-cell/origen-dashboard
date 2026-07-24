import { useEffect, useState } from 'react';
import NotificacionesCard from '../components/NotificacionesCard';
import { I } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { miPerfilApi } from '../services/api';

// Pestaña "Configuración": una sola página compartida por voluntario y líder.
// Hoy contiene la tarjeta de Notificaciones y una tarjeta de solo lectura con la
// identidad del usuario (nombre de acceso, campus y ministerio). El título vive
// en la topbar del Layout, así que aquí NO se repite.
//
// Los botones/acentos van con estilo INLINE por el mismo motivo que
// NotificacionesCard: la regla global `.app button { color: inherit }` pisaría
// los colores de clase. El acento se elige por campus (Ags naranja, Gdl menta).

const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';

const CAMPUS_LABEL = { ags: 'Aguascalientes', gdl: 'Guadalajara' };

function temaCampus(campus) {
  return campus === 'gdl'
    ? { primary: '#0A0A0A', accent: '#2DD4BF' }
    : { primary: '#112540', accent: '#FF6B2B' };
}

const card = {
  fontFamily: FONT,
  border: '1px solid #E2E6EC',
  borderRadius: 14,
  background: '#fff',
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minWidth: 0,          // permite que la columna del grid se encoja sin desbordar
  boxSizing: 'border-box',
};

function Fila({ etiqueta, valor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#5B6675' }}>
        {etiqueta}
      </span>
      <span style={{ fontSize: 17, fontWeight: 600, color: valor ? '#1A2230' : '#7A8699', overflowWrap: 'anywhere' }}>
        {valor || '—'}
      </span>
    </div>
  );
}

export default function Configuracion() {
  const { userName } = useAuth();

  // Valores inmediatos desde la sesión/localStorage para no mostrar una tarjeta
  // vacía mientras carga; el fetch los refina (y trae el ministerio).
  const campusInicial = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  const [perfil, setPerfil] = useState({
    nombre: userName || '',
    campus: campusInicial,
    ministerio: null,
  });

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await miPerfilApi.get();
        if (vivo && data) {
          setPerfil({
            nombre:     data.nombre || userName || '',
            campus:     data.campus || campusInicial,
            ministerio: data.ministerio || null,
          });
        }
      } catch {
        // Sin endpoint (aún sin deploy) o error de red: se conservan los valores
        // iniciales de la sesión. La pantalla nunca se cae por esto.
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tema = temaCampus(perfil.campus);
  const campusTexto = CAMPUS_LABEL[perfil.campus] || perfil.campus;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        alignItems: 'start',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <NotificacionesCard />

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true" style={{ color: tema.accent, display: 'inline-flex' }}>
            <I.users size={17} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: tema.primary, letterSpacing: '-.01em' }}>
            Tu cuenta
          </span>
        </div>
        {/* Una sola columna: cada dato en su renglón, sin que el nombre largo
            choque con la columna de al lado en el teléfono. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <Fila etiqueta="Nombre de acceso" valor={perfil.nombre} />
          <Fila etiqueta="Campus"           valor={campusTexto} />
          <Fila etiqueta="Ministerio"       valor={perfil.ministerio} />
        </div>
      </div>
    </div>
  );
}
