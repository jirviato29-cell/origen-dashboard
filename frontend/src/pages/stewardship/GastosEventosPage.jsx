import { useState, useEffect } from 'react';
import { calendarioApi, participantesApi, abonosApi, gastosEventosApi, comprobanteApi } from '../../services/api';
import { fmtFechaShort, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';

// ── Campus theming (mismo criterio isGdl que el resto de pantallas) ──────────
const isGdl  = localStorage.getItem('campus_activo') === 'gdl';
const ACCENT = isGdl ? '#2DD4BF' : '#112540';   // MINT gdl / NAVY ags

// Botón "Ver gastos" — sólido con buen contraste en ambos campus
const VER_BG     = isGdl ? '#2DD4BF' : '#112540';   // mint gdl / navy ags
const VER_FG     = isGdl ? '#0F172A' : '#FFFFFF';   // texto navy oscuro sobre mint / blanco sobre navy
const VER_BORDER = isGdl ? '#22B8A6' : '#24406B';   // borde sutil un tono más oscuro que el fondo
const VER_HOVER  = isGdl ? '#26BFAE' : '#1B3358';   // hover: mint más apagado / navy más claro

const NAVY_700 = '#244169';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';
const GREEN    = '#15915A';
const RED      = '#D23B36';

const MAX_BYTES = 10 * 1024 * 1024;

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function esPdf(url) {
  return /\.pdf(\?|#|$)/i.test(String(url || ''));
}

// Miniatura clickeable de un archivo (foto o comprobante). Omite si no hay url.
function Miniatura({ url, label }) {
  if (!url) return null;
  return (
    <a className="ge-thumb" href={url} target="_blank" rel="noreferrer" title={`${label} — abrir`}>
      {esPdf(url)
        ? <span className="ge-thumb-box ge-thumb-pdf">PDF</span>
        : <img className="ge-thumb-box" src={url} alt={label} />}
      <span className="ge-thumb-cap">{label}</span>
    </a>
  );
}

const emptyForm = () => ({
  fecha: todayISO(), concepto: '', monto: '', nota: '', tipo_comprobante: 'Ticket',
});

// ── Estilo de input compartido (mismo que el resto de modales) ────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
};
const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function GastosEventosPage() {
  const [eventos,          setEventos]          = useState([]);
  const [participantesMap, setParticipantesMap] = useState({});
  const [abonosMap,        setAbonosMap]        = useState({});
  const [gastosMap,        setGastosMap]        = useState({});
  const [loading,          setLoading]          = useState(true);

  // ── Estado del modal ─────────────────────────────────────────────────────────
  const [modalAbierto,  setModalAbierto]  = useState(false);
  const [eventoActivo,  setEventoActivo]  = useState(null);
  const [gastosEvento,  setGastosEvento]  = useState([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);

  // Formulario del modal
  const [form,        setForm]        = useState(emptyForm);
  const [formError,   setFormError]   = useState('');
  const [errConcepto, setErrConcepto] = useState(false);
  const [errMonto,    setErrMonto]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);

  // Archivos en memoria antes de subir
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [fotoFile,        setFotoFile]        = useState(null);
  const [fileKey,  setFileKey]  = useState(0);   // reset del input file comprobante
  const [fileKey2, setFileKey2] = useState(0);   // reset del input file foto
  const [fileError,  setFileError]  = useState('');
  const [fileError2, setFileError2] = useState('');

  // ── Recaudado de un evento (participantes + abonos, client-side) ──────────────
  const recaudadoDe = (ev) =>
    (participantesMap[ev.id] || []).reduce(
      (s, p) => s + (abonosMap[p.id] || []).reduce((ss, a) => ss + parseFloat(a.monto || 0), 0),
      0
    );

  // ── Reconstruye gastosMap desde el backend (para la tabla principal) ──────────
  const rebuildGastosMap = async () => {
    try {
      const { data: gastos } = await gastosEventosApi.getAll();
      const gMap = {};
      gastos.forEach(g => {
        gMap[g.evento_id] = (gMap[g.evento_id] || 0) + parseFloat(g.monto || 0);
      });
      setGastosMap(gMap);
    } catch { /* si el endpoint falla, se conserva lo previo */ }
  };

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const [evRes, partRes, abonosRes] = await Promise.all([
          calendarioApi.getAll({ en_punto_encuentro: true }),
          participantesApi.getAll(),
          abonosApi.getAll(),
        ]);
        if (cancelado) return;

        setEventos(evRes.data);

        const pMap = {};
        partRes.data.forEach(p => {
          if (!pMap[p.evento_id]) pMap[p.evento_id] = [];
          pMap[p.evento_id].push(p);
        });
        setParticipantesMap(pMap);

        const aMap = {};
        abonosRes.data.forEach(a => {
          if (!aMap[a.participante_id]) aMap[a.participante_id] = [];
          aMap[a.participante_id].push(a);
        });
        setAbonosMap(aMap);
      } catch {
        if (!cancelado) { setEventos([]); setParticipantesMap({}); setAbonosMap({}); }
      }

      // Los gastos van en un try/catch SEPARADO: si el endpoint aún no está
      // desplegado en Render, la pantalla no se rompe (gastos = 0 por evento).
      try {
        const { data: gastos } = await gastosEventosApi.getAll();
        if (cancelado) return;
        const gMap = {};
        gastos.forEach(g => {
          gMap[g.evento_id] = (gMap[g.evento_id] || 0) + parseFloat(g.monto || 0);
        });
        setGastosMap(gMap);
      } catch {
        if (!cancelado) setGastosMap({});
      }

      if (!cancelado) setLoading(false);
    })();

    return () => { cancelado = true; };
  }, []);

  // Escape para cerrar el modal (salvo mientras guarda/sube)
  useEffect(() => {
    if (!modalAbierto) return;
    const handler = (e) => { if (e.key === 'Escape' && !saving && !uploading) cerrarModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAbierto, saving, uploading]);

  // ── Filas derivadas — solo eventos de PE con costo > 0 (activos y concluidos) ─
  const filas = [...eventos]
    .filter(e => (Number(e.costo) || 0) > 0)
    .sort((a, b) => (toISODate(b.fecha) || '').localeCompare(toISODate(a.fecha) || ''))
    .map(e => {
      const inscritos = (participantesMap[e.id] || []).length;
      const recaudado = recaudadoDe(e);
      const gastos    = gastosMap[e.id] || 0;
      const neto      = recaudado - gastos;
      const concluido = e.cerrado === true;
      return { e, inscritos, recaudado, gastos, neto, concluido };
    });

  // ── Modal: abrir / cargar / cerrar ────────────────────────────────────────────
  const cargarGastosEvento = async (eventoId) => {
    setLoadingGastos(true);
    try {
      const { data } = await gastosEventosApi.getAll({ evento_id: eventoId });
      setGastosEvento(data);
    } catch {
      setGastosEvento([]);
    } finally {
      setLoadingGastos(false);
    }
  };

  const abrirModal = (evento) => {
    setEventoActivo(evento);
    setGastosEvento([]);
    setForm(emptyForm());
    setFormError(''); setErrConcepto(false); setErrMonto(false);
    setComprobanteFile(null); setFotoFile(null);
    setFileError(''); setFileError2('');
    setFileKey(k => k + 1); setFileKey2(k => k + 1);
    setModalAbierto(true);
    cargarGastosEvento(evento.id);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEventoActivo(null);
    // Recargar la tabla principal para reflejar Gastos/Neto actualizados
    rebuildGastosMap();
  };

  // ── Archivos ───────────────────────────────────────────────────────────────
  const handleComprobante = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) { setFileError('El archivo supera el límite de 10 MB.'); setComprobanteFile(null); return; }
    setFileError('');
    setComprobanteFile(f);
  };
  const quitarComprobante = () => { setComprobanteFile(null); setFileError(''); setFileKey(k => k + 1); };

  const handleFoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) { setFileError2('El archivo supera el límite de 10 MB.'); setFotoFile(null); return; }
    setFileError2('');
    setFotoFile(f);
  };
  const quitarFoto = () => { setFotoFile(null); setFileError2(''); setFileKey2(k => k + 1); };

  // ── Guardar gasto nuevo (no cierra el modal) ──────────────────────────────────
  const handleGuardar = async () => {
    const concepto = form.concepto.trim();
    const monto    = parseFloat(form.monto);
    const faltaConcepto = !concepto;
    const faltaMonto    = !(monto > 0);
    setErrConcepto(faltaConcepto);
    setErrMonto(faltaMonto);
    if (faltaConcepto || faltaMonto) {
      setFormError('Concepto y monto (mayor a cero) son requeridos.');
      return;
    }
    setFormError('');

    // 1) Subir comprobante si existe
    let comprobante_url = null;
    let foto_url        = null;
    try {
      if (comprobanteFile) {
        setUploading(true);
        const res = await comprobanteApi.upload(comprobanteFile);
        comprobante_url = res.data.url;
      }
      if (fotoFile) {
        setUploading(true);
        const res2 = await comprobanteApi.upload(fotoFile);
        foto_url = res2.data.url;
      }
    } catch {
      setFormError('Error al subir el archivo. Los demás datos no se perdieron, inténtalo de nuevo.');
      setUploading(false);
      return;
    }
    setUploading(false);

    // 2) Crear gasto
    setSaving(true);
    try {
      await gastosEventosApi.create({
        evento_id:        eventoActivo.id,
        fecha:            form.fecha,
        concepto,
        monto,
        nota:             form.nota.trim() || null,
        tipo_comprobante: form.tipo_comprobante,
        comprobante_url,
        foto_url,
      });
      // Recargar gastos del evento + limpiar form (NO cerramos el modal)
      await cargarGastosEvento(eventoActivo.id);
      setForm(emptyForm());
      setComprobanteFile(null); setFotoFile(null);
      setFileError(''); setFileError2('');
      setFileKey(k => k + 1); setFileKey2(k => k + 1);
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar gasto ────────────────────────────────────────────────────────────
  const handleEliminar = async (g) => {
    if (!window.confirm(`¿Eliminar el gasto "${g.concepto}" por ${fmtMoney(g.monto)}?`)) return;
    setDeletingId(g.id);
    try {
      await gastosEventosApi.remove(g.id);
      await cargarGastosEvento(eventoActivo.id);
    } catch {
      alert('No se pudo eliminar el gasto. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Resumen del evento activo (recalculado al vuelo) ──────────────────────────
  const modalRecaudado = eventoActivo ? recaudadoDe(eventoActivo) : 0;
  const modalGastos    = gastosEvento.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
  const modalNeto      = modalRecaudado - modalGastos;

  const isBusy    = saving || uploading;
  const montoPrev = parseFloat(form.monto) || 0;

  return (
    <div className="ge-root">
      <style>{`
        .ge-root { display: flex; flex-direction: column; gap: 14px; }
        .ge-head { display: flex; align-items: center; gap: 12px; }
        .ge-head-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: ${ACCENT}; color: #fff;
        }
        .ge-title { font-size: 18px; font-weight: 700; color: var(--ink); }
        .ge-sub   { font-size: 12.5px; color: var(--muted); margin-top: 1px; }

        /* ── Una tarjeta independiente por evento ─────────────────────────────── */
        .ge-eventos { display: flex; flex-direction: column; gap: 14px; }
        .ge-evento-card { padding: 0; overflow: hidden; }
        .ge-evento-head {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          padding: 15px 18px; border-bottom: 1px solid ${GRAY_200}; background: ${GRAY_50};
        }
        .ge-evento-nombre { font-size: 15.5px; font-weight: 800; color: var(--ink); }
        .ge-evento-fecha  { font-size: 12px; color: ${GRAY_500}; margin-top: 2px; }
        .ge-badge {
          display: inline-block; font-size: 10.5px; font-weight: 700;
          padding: 2px 9px; border-radius: 6px; white-space: nowrap; flex-shrink: 0;
        }
        .ge-badge.activo    { background: rgba(45,212,191,.14); color: ${GREEN}; }
        .ge-badge.concluido { background: ${GRAY_100}; color: ${GRAY_500}; }

        .ge-metrics {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 1px; background: ${GRAY_200};
        }
        .ge-metric { background: var(--surface); padding: 14px 16px; }
        .ge-metric-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${GRAY_500}; }
        .ge-metric-val { font-size: 17px; font-weight: 800; margin-top: 4px; color: var(--ink); font-variant-numeric: tabular-nums; }

        .ge-evento-foot { padding: 14px 18px; display: flex; justify-content: flex-end; }
        .ge-empty { text-align: center; padding: 44px 0; color: var(--muted); font-size: 14px; }
        @media (max-width: 600px) { .ge-metrics { grid-template-columns: repeat(2, 1fr); } }

        .ge-btn-ver {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 600; padding: 7px 12px; border-radius: 8px;
          background: ${VER_BG}; color: ${VER_FG}; border: 1px solid ${VER_BORDER};
          cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s;
        }
        .ge-btn-ver svg { color: ${VER_FG}; }
        .ge-btn-ver:hover { background: ${VER_HOVER}; border-color: ${VER_HOVER}; }

        /* ── Modal ──────────────────────────────────────────────────────────── */
        .ge-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(17,37,64,0.45); backdrop-filter: blur(2px);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 24px 16px; overflow-y: auto;
        }
        .ge-modal {
          width: 100%; max-width: 560px; background: var(--surface);
          border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          display: flex; flex-direction: column; overflow: hidden;
          margin: auto;
        }
        .ge-modal-head {
          padding: 18px 20px; border-bottom: 1px solid ${GRAY_200};
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        }
        .ge-modal-title { font-size: 16.5px; font-weight: 700; color: var(--ink); }
        .ge-modal-eyebrow {
          font-size: 10.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: ${ACCENT}; margin-bottom: 3px;
        }
        .ge-x {
          width: 34px; height: 34px; flex-shrink: 0; border-radius: 8px;
          border: 1px solid ${GRAY_200}; background: var(--surface); cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: ${GRAY_500};
        }
        .ge-resumen {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
          background: ${GRAY_200}; border-bottom: 1px solid ${GRAY_200};
        }
        .ge-resumen div { background: var(--surface); padding: 12px 14px; text-align: center; }
        .ge-resumen .lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${GRAY_500}; }
        .ge-resumen .val { font-size: 15px; font-weight: 800; margin-top: 3px; font-variant-numeric: tabular-nums; }

        .ge-modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 18px; }
        .ge-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${GRAY_500}; }

        .ge-gasto-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 12px; border: 1px solid ${GRAY_200}; border-radius: 10px; background: var(--surface);
        }
        .ge-gasto-item + .ge-gasto-item { margin-top: 8px; }
        .ge-gasto-main { flex: 1; min-width: 0; }
        .ge-gasto-concepto { font-size: 13.5px; font-weight: 700; color: var(--ink); }
        .ge-gasto-meta { font-size: 11.5px; color: ${GRAY_500}; margin-top: 2px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .ge-gasto-nota { font-size: 12px; color: ${GRAY_700}; margin-top: 4px; }
        .ge-gasto-thumbs { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
        .ge-thumb { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; }
        .ge-thumb-box {
          width: 48px; height: 48px; border-radius: 8px; border: 1px solid ${GRAY_200};
          object-fit: cover; display: flex; align-items: center; justify-content: center;
          background: ${GRAY_50}; overflow: hidden;
        }
        .ge-thumb-pdf {
          font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: ${RED};
          background: rgba(210,59,54,0.10); border-color: rgba(210,59,54,0.30);
        }
        .ge-thumb:hover .ge-thumb-box { border-color: ${ACCENT}; }
        .ge-thumb-cap { font-size: 10.5px; font-weight: 600; color: ${GRAY_500}; }
        .ge-gasto-monto { font-size: 14px; font-weight: 800; color: ${RED}; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .ge-del {
          background: none; border: 0; cursor: pointer; color: ${GRAY_300}; padding: 4px; flex-shrink: 0;
          display: flex; align-items: center;
        }
        .ge-del:hover { color: ${RED}; }
        .ge-empty-gastos { text-align: center; padding: 18px 0; color: var(--muted); font-size: 13px; border: 1px dashed ${GRAY_200}; border-radius: 10px; }

        .ge-field { display: flex; flex-direction: column; gap: 6px; }
        .ge-file-drop {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 14px; border-radius: 10px; border: 1.5px dashed var(--border);
          cursor: pointer; color: var(--muted); font-size: 13px; font-weight: 500; background: var(--surface);
        }
        .ge-file-chip {
          display: flex; align-items: center; gap: 10px; padding: 9px 12px;
          border-radius: 10px; border: 1.5px solid var(--border); background: var(--surface);
        }
        .ge-modal-foot {
          padding: 14px 20px; border-top: 1px solid ${GRAY_200};
          display: flex; gap: 10px; justify-content: flex-end;
          position: sticky; bottom: 0; background: var(--surface);
        }
        .ge-btn {
          display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600;
          padding: 10px 18px; border-radius: 10px; cursor: pointer; border: 1px solid ${GRAY_200};
        }
        .ge-btn-ghost { background: var(--surface); color: ${GRAY_700}; }
        .ge-btn-save { background: ${ACCENT}; color: #fff; border-color: ${ACCENT}; }
        .ge-btn:disabled { opacity: .5; cursor: not-allowed; }
        @media (max-width: 560px) { .ge-resumen { grid-template-columns: 1fr; } }
      `}</style>

      {/* Encabezado */}
      <div className="ge-head">
        <div className="ge-head-icon"><I.receipt size={20} /></div>
        <div>
          <div className="ge-title">Gastos de eventos</div>
          <div className="ge-sub">
            {loading ? 'Cargando…' : `${filas.length} evento${filas.length !== 1 ? 's' : ''} de Punto de Encuentro`}
          </div>
        </div>
      </div>

      {/* Una tabla/tarjeta independiente por evento — sin total combinado */}
      {loading ? (
        <div className="card"><div className="ge-empty">Cargando eventos…</div></div>
      ) : filas.length === 0 ? (
        <div className="card"><div className="ge-empty">No hay eventos con costo.</div></div>
      ) : (
        <div className="ge-eventos">
          {filas.map(({ e, inscritos, recaudado, gastos, neto, concluido }) => (
            <div key={e.id} className="card ge-evento-card">

              {/* Encabezado del evento */}
              <div className="ge-evento-head">
                <div>
                  <div className="ge-evento-nombre">{e.nombre}</div>
                  <div className="ge-evento-fecha">{fmtFechaShort(e.fecha)}</div>
                </div>
                <span className={`ge-badge ${concluido ? 'concluido' : 'activo'}`}>
                  {concluido ? 'Concluido' : 'Activo'}
                </span>
              </div>

              {/* Datos de ESE evento */}
              <div className="ge-metrics">
                <div className="ge-metric">
                  <div className="ge-metric-lbl">Inscritos</div>
                  <div className="ge-metric-val">{inscritos}</div>
                </div>
                <div className="ge-metric">
                  <div className="ge-metric-lbl">Recaudado</div>
                  <div className="ge-metric-val">{fmtMoney(recaudado)}</div>
                </div>
                <div className="ge-metric">
                  <div className="ge-metric-lbl">Gastos</div>
                  <div className="ge-metric-val" style={{ color: RED }}>{fmtMoney(gastos)}</div>
                </div>
                <div className="ge-metric">
                  <div className="ge-metric-lbl">Neto</div>
                  <div className="ge-metric-val" style={{ color: neto >= 0 ? GREEN : RED }}>{fmtMoney(neto)}</div>
                </div>
              </div>

              {/* Acción de ESE evento */}
              <div className="ge-evento-foot">
                <button
                  className="ge-btn-ver"
                  onClick={() => abrirModal(e)}
                  style={{ background: VER_BG, color: VER_FG, borderColor: VER_BORDER, opacity: 1 }}
                >
                  <I.receipt size={14} /> Registrar gasto
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Modal Gastos de [evento] ─────────────────────────────────────────── */}
      {modalAbierto && eventoActivo && (
        <div
          className="ge-overlay"
          onClick={(ev) => { if (ev.target === ev.currentTarget && !isBusy) cerrarModal(); }}
        >
          <div className="ge-modal" onClick={ev => ev.stopPropagation()}>

            {/* Encabezado */}
            <div className="ge-modal-head">
              <div>
                <div className="ge-modal-eyebrow">Punto de Encuentro · Gastos</div>
                <div className="ge-modal-title">Gastos de {eventoActivo.nombre}</div>
              </div>
              <button className="ge-x" onClick={() => { if (!isBusy) cerrarModal(); }} aria-label="Cerrar">
                <I.x size={16} />
              </button>
            </div>

            {/* Resumen recalculado al vuelo */}
            <div className="ge-resumen">
              <div>
                <div className="lbl">Recaudado</div>
                <div className="val" style={{ color: NAVY_700 }}>{fmtMoney(modalRecaudado)}</div>
              </div>
              <div>
                <div className="lbl">Gastos declarados</div>
                <div className="val" style={{ color: RED }}>{fmtMoney(modalGastos)}</div>
              </div>
              <div>
                <div className="lbl">Restante de lo recaudado</div>
                <div className="val" style={{ color: modalNeto >= 0 ? GREEN : RED }}>{fmtMoney(modalNeto)}</div>
              </div>
            </div>

            <div className="ge-modal-body">

              {/* (a) Lista de gastos declarados */}
              <div>
                <div className="ge-section-title" style={{ marginBottom: 10 }}>
                  Gastos declarados{gastosEvento.length ? ` (${gastosEvento.length})` : ''}
                </div>
                {loadingGastos ? (
                  <div className="ge-empty-gastos">Cargando gastos…</div>
                ) : gastosEvento.length === 0 ? (
                  <div className="ge-empty-gastos">Aún no hay gastos declarados para este evento.</div>
                ) : (
                  <div>
                    {gastosEvento.map(g => (
                      <div key={g.id} className="ge-gasto-item">
                        <div className="ge-gasto-main">
                          <div className="ge-gasto-concepto">{g.concepto}</div>
                          <div className="ge-gasto-meta">
                            <span>{fmtFechaShort(g.fecha)}</span>
                            {g.tipo_comprobante && (
                              <>
                                <span style={{ color: GRAY_300 }}>·</span>
                                <span>{g.tipo_comprobante}</span>
                              </>
                            )}
                          </div>
                          {g.nota && <div className="ge-gasto-nota">{g.nota}</div>}
                          {(g.comprobante_url || g.foto_url) && (
                            <div className="ge-gasto-thumbs">
                              <Miniatura url={g.foto_url}        label="Foto" />
                              <Miniatura url={g.comprobante_url} label="Comprobante" />
                            </div>
                          )}
                        </div>
                        <div className="ge-gasto-monto">{fmtMoney(g.monto)}</div>
                        <button
                          className="ge-del"
                          onClick={() => handleEliminar(g)}
                          disabled={deletingId === g.id}
                          title="Eliminar gasto"
                        >
                          <I.trash size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* (b) Formulario para declarar gasto nuevo */}
              <div style={{ borderTop: `1px solid ${GRAY_100}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="ge-section-title">Declarar gasto nuevo</div>

                {/* Fecha */}
                <div className="ge-field">
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    style={inputStyle} />
                </div>

                {/* Concepto */}
                <div className="ge-field">
                  <label style={labelStyle}>Concepto</label>
                  <input type="text" placeholder="ej. Renta de sillas"
                    value={form.concepto}
                    onChange={e => { setForm(f => ({ ...f, concepto: e.target.value })); setErrConcepto(false); }}
                    style={{ ...inputStyle, borderColor: errConcepto ? RED : 'var(--border)' }} />
                </div>

                {/* Monto */}
                <div className="ge-field">
                  <label style={labelStyle}>Monto</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.monto}
                      onChange={e => { setForm(f => ({ ...f, monto: e.target.value })); setErrMonto(false); }}
                      style={{ ...inputStyle, padding: '10px 12px 10px 26px', borderColor: errMonto ? RED : 'var(--border)' }} />
                  </div>
                </div>

                {/* Nota */}
                <div className="ge-field">
                  <label style={labelStyle}>
                    Nota
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                  </label>
                  <textarea rows={2} placeholder="Detalles del gasto…"
                    value={form.nota}
                    onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 58 }} />
                </div>

                {/* Tipo de comprobante */}
                <div className="ge-field">
                  <label style={labelStyle}>Tipo de comprobante</label>
                  <select value={form.tipo_comprobante}
                    onChange={e => setForm(f => ({ ...f, tipo_comprobante: e.target.value }))}
                    style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}>
                    <option value="Ticket">Ticket</option>
                    <option value="Factura">Factura</option>
                  </select>
                </div>

                {/* Comprobante (imagen o PDF) */}
                <div className="ge-field">
                  <label style={labelStyle}>
                    Comprobante
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                  </label>
                  {!comprobanteFile ? (
                    <label className="ge-file-drop">
                      <I.download size={15} /> Seleccionar imagen o PDF
                      <input key={fileKey} type="file" accept="image/*,application/pdf"
                        onChange={handleComprobante} style={{ display: 'none' }} />
                    </label>
                  ) : (
                    <div className="ge-file-chip">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comprobanteFile.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{(comprobanteFile.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button type="button" onClick={quitarComprobante} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                        <I.x size={14} />
                      </button>
                    </div>
                  )}
                  {fileError && <p style={{ fontSize: 12, color: RED, margin: 0 }}>{fileError}</p>}
                </div>

                {/* Foto de lo adquirido (imagen) */}
                <div className="ge-field">
                  <label style={labelStyle}>
                    Foto de lo adquirido
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                  </label>
                  {!fotoFile ? (
                    <label className="ge-file-drop">
                      <I.download size={15} /> Seleccionar imagen
                      <input key={fileKey2} type="file" accept="image/*"
                        onChange={handleFoto} style={{ display: 'none' }} />
                    </label>
                  ) : (
                    <div className="ge-file-chip">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fotoFile.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{(fotoFile.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button type="button" onClick={quitarFoto} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                        <I.x size={14} />
                      </button>
                    </div>
                  )}
                  {fileError2 && <p style={{ fontSize: 12, color: RED, margin: 0 }}>{fileError2}</p>}
                </div>

                {/* Total preview */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 15px', borderRadius: 10, background: NAVY_700 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Monto a declarar</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'white', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(montoPrev)}</span>
                </div>

                {formError && <p style={{ fontSize: 12.5, color: RED, margin: 0 }}>{formError}</p>}
              </div>
            </div>

            {/* Pie: Guardar / Cerrar */}
            <div className="ge-modal-foot">
              <button
                className="ge-btn ge-btn-ghost"
                onClick={() => { if (!isBusy) cerrarModal(); }}
                disabled={isBusy}
                style={{ background: '#FFFFFF', color: '#112540', borderColor: GRAY_300, opacity: isBusy ? 0.5 : 1 }}
              >
                Cerrar
              </button>
              <button
                className="ge-btn ge-btn-save"
                onClick={handleGuardar}
                disabled={isBusy}
                style={{ background: VER_BG, color: VER_FG, borderColor: VER_BORDER, opacity: isBusy ? 0.5 : 1 }}
              >
                <I.check size={16} />
                {uploading ? 'Subiendo archivo…' : saving ? 'Guardando…' : 'Guardar gasto'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
