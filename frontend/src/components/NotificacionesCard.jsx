import { useEffect, useState } from 'react';
import {
  estadoNotificaciones,
  activarNotificaciones,
  desactivarNotificaciones,
  mandarPrueba,
} from '../utils/push';

// Tarjeta "Notificaciones" autocontenida para cualquier rol. Detecta soporte del
// navegador, el estado del permiso y si ya hay una suscripción activa, y expone
// activar / desactivar / mandar prueba.
//
// Maneja todos los casos sin tumbar la pantalla: navegador no compatible, iOS
// sin instalar, permiso denegado y error de red.
//
// IMPORTANTE: los botones llevan estilo INLINE (color, fondo, borde y fuente)
// porque la regla global `.app button { color: inherit }` pisaría los colores.
//
// Theming por campus: se lee `campus_activo` de localStorage (mismo mecanismo que
// el Sidebar) para pintar el acento —Ags naranja, Gdl menta— sin depender del
// cascade CSS, que no llega a los estilos inline.

const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';
const GREEN = '#15915A';
const GRAY  = '#5A6472';

// Paleta por campus. Ags: navy + naranja. Gdl: negro + menta.
function temaCampus() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  return campus === 'gdl'
    ? { primary: '#0A0A0A', accent: '#2DD4BF', accentInk: '#0A0A0A' }
    : { primary: '#112540', accent: '#FF6B2B', accentInk: '#FFFFFF' };
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
};

// Base común de los botones (blindada contra .app button).
const btnBase = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 700,
  padding: '11px 14px',
  borderRadius: 11,
  border: '1px solid transparent',
  cursor: 'pointer',
  lineHeight: 1.15,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
};

export default function NotificacionesCard() {
  const [estado, setEstado]     = useState(null);   // resultado de estadoNotificaciones()
  const [cargando, setCargando] = useState(false);  // activando/probando/desactivando
  const [error, setError]       = useState('');
  const [aviso, setAviso]       = useState('');      // mensaje de éxito breve

  const tema = temaCampus();

  async function refrescar() {
    try {
      setEstado(await estadoNotificaciones());
    } catch {
      setEstado({ soportado: false, permiso: 'default', activo: false, iosSinInstalar: false });
    }
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const e = await estadoNotificaciones();
        if (vivo) setEstado(e);
      } catch {
        if (vivo) setEstado({ soportado: false, permiso: 'default', activo: false, iosSinInstalar: false });
      }
    })();
    return () => { vivo = false; };
  }, []);

  async function onActivar() {
    setError(''); setAviso(''); setCargando(true);
    try {
      await activarNotificaciones();
      await refrescar();
      setAviso('¡Listo! Notificaciones activadas.');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'No se pudieron activar las notificaciones.');
    } finally {
      setCargando(false);
    }
  }

  async function onDesactivar() {
    setError(''); setAviso(''); setCargando(true);
    try {
      await desactivarNotificaciones();
      await refrescar();
      setAviso('Notificaciones desactivadas en este dispositivo.');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'No se pudieron desactivar las notificaciones.');
    } finally {
      setCargando(false);
    }
  }

  async function onPrueba() {
    setError(''); setAviso(''); setCargando(true);
    try {
      await mandarPrueba();
      setAviso('Enviamos una notificación de prueba a este dispositivo.');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'No se pudo enviar la prueba.');
    } finally {
      setCargando(false);
    }
  }

  if (!estado) return null; // aún cargando el estado inicial

  const titulo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden="true" style={{ fontSize: 16 }}>🔔</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: tema.primary, letterSpacing: '-.01em' }}>
        Notificaciones
      </span>
    </div>
  );

  const msgError = error && (
    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#D23B36', lineHeight: 1.4 }}>{error}</div>
  );
  const msgAviso = aviso && !error && (
    <div style={{ fontSize: 12.5, fontWeight: 600, color: GREEN, lineHeight: 1.4 }}>{aviso}</div>
  );

  // 1) Navegador no compatible.
  if (!estado.soportado) {
    return (
      <div style={card}>
        {titulo}
        <div style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.45 }}>
          Este navegador no soporta notificaciones push.
        </div>
      </div>
    );
  }

  // 2) iOS sin instalar en pantalla de inicio.
  if (estado.iosSinInstalar) {
    return (
      <div style={card}>
        {titulo}
        <div style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.45 }}>
          Primero agrega Origen a tu pantalla de inicio para poder activar las
          notificaciones. Toca <strong>Compartir</strong> y luego{' '}
          <strong>«Agregar a inicio»</strong>.
        </div>
      </div>
    );
  }

  // 3) Permiso denegado.
  if (estado.permiso === 'denied') {
    return (
      <div style={card}>
        {titulo}
        <div style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.45 }}>
          Bloqueaste las notificaciones. Actívalas desde los ajustes del navegador
          para este sitio y vuelve a intentarlo.
        </div>
      </div>
    );
  }

  // 4) Ya activadas → confirmación + "Mandar prueba" + "Desactivar".
  if (estado.activo && estado.permiso === 'granted') {
    return (
      <div style={card}>
        {titulo}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: GREEN }}>
          <span aria-hidden="true">✓</span> Notificaciones activadas
        </div>
        <button
          type="button"
          onClick={onPrueba}
          disabled={cargando}
          style={{
            ...btnBase,
            background: '#fff',
            color: tema.primary,
            border: '1px solid #CBD2DC',
            opacity: cargando ? 0.6 : 1,
          }}
        >
          {cargando ? 'Enviando…' : 'Mandar prueba'}
        </button>
        <button
          type="button"
          onClick={onDesactivar}
          disabled={cargando}
          style={{
            ...btnBase,
            background: '#fff',
            color: '#D23B36',
            border: '1px solid #F0C4C2',
            opacity: cargando ? 0.6 : 1,
          }}
        >
          {cargando ? 'Un momento…' : 'Desactivar notificaciones'}
        </button>
        {msgError}
        {msgAviso}
      </div>
    );
  }

  // 5) Por defecto: botón para activar.
  return (
    <div style={card}>
      {titulo}
      <div style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.45 }}>
        Activa los avisos para enterarte cuando te programen o te escriban.
      </div>
      <button
        type="button"
        onClick={onActivar}
        disabled={cargando}
        style={{
          ...btnBase,
          background: tema.accent,
          color: tema.accentInk,
          border: `1px solid ${tema.accent}`,
          opacity: cargando ? 0.6 : 1,
        }}
      >
        {cargando ? 'Activando…' : 'Activar notificaciones'}
      </button>
      {msgError}
      {msgAviso}
    </div>
  );
}
