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

function Fila({ etiqueta, valor, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#8A93A0' }}>
        {etiqueta}
      </span>
      <span style={{ fontSize: 14.5, fontWeight: 700, color: valor ? '#1A2230' : '#A3ABB6', overflowWrap: 'anywhere' }}>
        {valor || '—'}
      </span>
      <span style={{ height: 2, width: 22, borderRadius: 2, background: accent, marginTop: 2 }} />
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
          <span style={{ fontSize: 14, fontWeight: 800, color: tema.primary, letterSpacing: '-.01em' }}>
            Tu cuenta
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, minWidth: 0 }}>
          <Fila etiqueta="Nombre de acceso" valor={perfil.nombre} accent={tema.accent} />
          <Fila etiqueta="Campus"           valor={campusTexto}   accent={tema.accent} />
          <Fila etiqueta="Ministerio"       valor={perfil.ministerio} accent={tema.accent} />
        </div>
      </div>
    </div>
  );
}
