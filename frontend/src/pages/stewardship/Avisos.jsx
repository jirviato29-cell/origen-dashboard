import { useEffect, useMemo, useState } from 'react';
import { avisosApi } from '../../services/api';
import { useMinisterios } from '../../context/MinisteriosContext';
import Modal from '../../components/Modal';
import { I } from '../../components/Icons';

// Página "Avisos" (solo stewardship): envío de notificaciones push masivas y su
// historial. El backend verifica el rol del token y resuelve los destinatarios;
// aquí solo mandamos los filtros del formulario.
//
// Los botones llevan estilo INLINE porque la regla global `.app button { color:
// inherit }` pisaría los colores de clase. El acento se elige por campus.

const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';
const MAX_TITULO  = 60;
const MAX_MENSAJE = 180;

function temaCampus() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  return campus === 'gdl'
    ? { primary: '#0A0A0A', accent: '#2DD4BF', accentInk: '#0A0A0A' }
    : { primary: '#112540', accent: '#FF6B2B', accentInk: '#FFFFFF' };
}

const TIPO_LABEL = {
  lideres:     'Líderes',
  voluntarios: 'Voluntarios',
  todos:       'Líderes y voluntarios',
};
const CAMPUS_LABEL = { ags: 'Ags', gdl: 'Gdl', todos: 'Todos los campus' };

const card = {
  fontFamily: FONT,
  border: '1px solid #E2E6EC',
  borderRadius: 14,
  background: '#fff',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minWidth: 0,
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
  textTransform: 'uppercase', color: '#8A93A0', marginBottom: 5, display: 'block',
};
const fieldStyle = {
  fontFamily: FONT, fontSize: 14, width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD2DC',
  background: '#fff', color: '#1A2230',
};

const btnBase = {
  fontFamily: FONT, fontSize: 14, fontWeight: 700, padding: '11px 16px',
  borderRadius: 11, border: '1px solid transparent', cursor: 'pointer',
  lineHeight: 1.15, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', gap: 8,
};

function fmtFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Avisos() {
  const tema = temaCampus();
  const { ministerios } = useMinisterios() || {};

  const [titulo, setTitulo]   = useState('');
  const [mensaje, setMensaje] = useState('');
  const [campus, setCampus]   = useState('ags');
  const [ministerioId, setMinisterioId] = useState('');       // '' = todos
  const [tipo, setTipo]       = useState('todos');

  const [historial, setHistorial] = useState([]);
  const [cargandoHist, setCargandoHist] = useState(true);

  const [confirm, setConfirm] = useState(null); // { total } | null
  const [calculando, setCalculando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]   = useState('');
  const [toast, setToast]   = useState('');

  const restantesMsg = MAX_MENSAJE - mensaje.length;
  const restantesTit = MAX_TITULO - titulo.length;
  const formListo = titulo.trim().length > 0 && mensaje.trim().length > 0;

  const listaMin = useMemo(
    () => (Array.isArray(ministerios) ? ministerios : []),
    [ministerios]
  );

  // Refresco silencioso del historial (tras enviar): no toca el estado de carga
  // para no parpadear la tabla que ya tiene datos.
  async function cargarHistorial() {
    try {
      const { data } = await avisosApi.historial();
      setHistorial(Array.isArray(data) ? data : []);
    } catch {
      setHistorial([]);
    }
  }

  // Carga inicial: el setState ocurre tras el await (no síncrono dentro del effect).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await avisosApi.historial();
        if (vivo) setHistorial(Array.isArray(data) ? data : []);
      } catch {
        if (vivo) setHistorial([]);
      } finally {
        if (vivo) setCargandoHist(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  // Paso 1: calcula destinatarios y abre el modal de confirmación.
  async function pedirConfirmacion() {
    setError('');
    if (!formListo) { setError('Escribe un título y un mensaje.'); return; }
    setCalculando(true);
    try {
      const { data } = await avisosApi.destinatarios({
        campus,
        tipo_destinatario: tipo,
        ...(ministerioId ? { ministerio_id: ministerioId } : {}),
      });
      setConfirm({ total: data?.total ?? 0 });
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo calcular los destinatarios.');
    } finally {
      setCalculando(false);
    }
  }

  // Paso 2: envío real (solo desde el modal).
  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      const { data } = await avisosApi.enviar({
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        campus,
        ministerio_id: ministerioId ? Number(ministerioId) : null,
        tipo_destinatario: tipo,
      });
      setConfirm(null);
      mostrarToast(
        `Aviso enviado · ${data.total_entregados}/${data.total_destinatarios} entregados` +
        (data.total_fallidos ? ` · ${data.total_fallidos} sin entregar` : '')
      );
      setTitulo(''); setMensaje('');
      cargarHistorial();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo enviar el aviso.');
      setConfirm(null);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000, background: tema.primary, color: '#fff',
          padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', gap: 8,
          maxWidth: '92vw',
        }}>
          <I.check size={16} color="#3DD68C" /> {toast}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16, alignItems: 'start', width: '100%', maxWidth: '100%', boxSizing: 'border-box',
      }}>

        {/* ── Formulario ─────────────────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ color: tema.accent, display: 'inline-flex' }}>
              <I.bell size={17} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: tema.primary, letterSpacing: '-.01em' }}>
              Nuevo aviso
            </span>
          </div>

          <div>
            <label style={labelStyle}>Título</label>
            <input
              type="text"
              value={titulo}
              maxLength={MAX_TITULO}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Ensayo de este sábado"
              style={fieldStyle}
            />
            <div style={{ fontSize: 11.5, color: restantesTit < 0 ? '#D23B36' : '#A3ABB6', marginTop: 4, textAlign: 'right' }}>
              {restantesTit} caracteres restantes
            </div>
          </div>

          <div>
            <label style={labelStyle}>Mensaje</label>
            <textarea
              value={mensaje}
              maxLength={MAX_MENSAJE}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe el aviso que llegará como notificación…"
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical', minHeight: 74 }}
            />
            <div style={{ fontSize: 11.5, color: restantesMsg < 0 ? '#D23B36' : '#A3ABB6', marginTop: 4, textAlign: 'right' }}>
              {restantesMsg} caracteres restantes
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Campus</label>
              <select value={campus} onChange={(e) => setCampus(e.target.value)} style={fieldStyle}>
                <option value="ags">Aguascalientes</option>
                <option value="gdl">Guadalajara</option>
                <option value="todos">Todos los campus</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ministerio</label>
              <select value={ministerioId} onChange={(e) => setMinisterioId(e.target.value)} style={fieldStyle}>
                <option value="">Todos los ministerios</option>
                {listaMin.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Destinatarios</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={fieldStyle}>
                <option value="todos">Líderes y voluntarios</option>
                <option value="lideres">Solo líderes</option>
                <option value="voluntarios">Solo voluntarios</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#D23B36', lineHeight: 1.4 }}>{error}</div>
          )}

          <button
            type="button"
            onClick={pedirConfirmacion}
            disabled={!formListo || calculando || enviando}
            style={{
              ...btnBase, width: '100%',
              background: tema.accent, color: tema.accentInk, border: `1px solid ${tema.accent}`,
              opacity: (!formListo || calculando || enviando) ? 0.6 : 1,
              cursor: (!formListo || calculando || enviando) ? 'default' : 'pointer',
            }}
          >
            <I.bell size={16} /> {calculando ? 'Calculando…' : 'Enviar aviso'}
          </button>
        </div>

        {/* ── Historial ──────────────────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ color: tema.accent, display: 'inline-flex' }}>
              <I.clock size={17} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: tema.primary, letterSpacing: '-.01em' }}>
              Historial
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#8A93A0' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Fecha</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Título</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Destino</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Entregados</th>
                </tr>
              </thead>
              <tbody>
                {cargandoHist ? (
                  <tr><td colSpan={4} style={{ padding: '14px 8px', color: '#A3ABB6' }}>Cargando…</td></tr>
                ) : historial.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '14px 8px', color: '#A3ABB6' }}>Aún no se han enviado avisos.</td></tr>
                ) : historial.map((a) => (
                  <tr key={a.id} style={{ borderTop: '1px solid #EEF1F5' }}>
                    <td style={{ padding: '8px', color: '#5A6472', whiteSpace: 'nowrap' }}>{fmtFecha(a.created_at)}</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#1A2230' }}>{a.titulo}</td>
                    <td style={{ padding: '8px', color: '#5A6472' }}>
                      {TIPO_LABEL[a.destinatarios] || a.destinatarios}
                      {' · '}{CAMPUS_LABEL[a.campus] || a.campus}
                      {a.ministerio_nombre ? ` · ${a.ministerio_nombre}` : ''}
                    </td>
                    <td style={{ padding: '8px', fontWeight: 700, color: tema.primary, whiteSpace: 'nowrap' }}>
                      {a.total_entregados}/{a.total_destinatarios}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal de confirmación (irreversible) ─────────────────────────────── */}
      {confirm && (
        <Modal title="Confirmar envío" onClose={() => (enviando ? null : setConfirm(null))}>
          <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#2B2B2B', lineHeight: 1.5, margin: 0 }}>
              Este aviso se enviará a{' '}
              <strong style={{ color: tema.primary }}>
                {confirm.total} {confirm.total === 1 ? 'persona' : 'personas'}
              </strong>{' '}
              con notificaciones activas. <strong>Es irreversible</strong> y llegará a sus dispositivos de inmediato.
            </p>
            {confirm.total === 0 && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#D23B36' }}>
                No hay destinatarios con notificaciones activas para estos filtros.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={enviando}
                style={{ ...btnBase, background: '#fff', color: '#1A2230', border: '1px solid #CBD2DC', opacity: enviando ? 0.6 : 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                disabled={enviando || confirm.total === 0}
                style={{
                  ...btnBase,
                  background: tema.accent, color: tema.accentInk, border: `1px solid ${tema.accent}`,
                  opacity: (enviando || confirm.total === 0) ? 0.6 : 1,
                  cursor: (enviando || confirm.total === 0) ? 'default' : 'pointer',
                }}
              >
                {enviando ? 'Enviando…' : 'Sí, enviar ahora'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
