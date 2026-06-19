import { useState, useEffect, useRef } from 'react';
import { calendarioApi, participantesApi, abonosApi, comprobanteApi, camposPersonalizadosApi } from '../../services/api';
import { useCalendarioModal } from '../../context/CalendarioModalContext';
import { fmtFecha, fmtFechaShort, toISODate } from '../../utils/fecha';
import * as XLSX from 'xlsx-js-style';
import { I } from '../../components/Icons';
import { useTiposEvento } from '../../context/TiposEventoContext';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';
import { useIsMobile } from '../../utils/useIsMobile';
import MiniCalendarioPE from '../../components/MiniCalendarioPE';
import CamposRegistroModal from '../../components/CamposRegistroModal';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY     = '#112540';
const NAVY_700 = '#244169';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const ORANGE   = '#FF6B2B';
const ORANGE_400 = '#FF8A52';
const ORANGE_50  = '#FFF4EE';
const ORANGE_600 = '#E0561B';
const GREEN    = '#15915A';
const RED      = '#D23B36';
const AMBER    = '#C98A14';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtAmt(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

function initials(nombre) {
  return (nombre || '').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
};

const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

// ── Campos completos de abono — PRESERVED EXACTLY ─────────────────────────
function AbonoFields({
  monto, onMonto,
  metodo, onMetodo,
  numTransaccion, onNumTransaccion,
  file, onFile, fileRef,
  fecha, onFecha,
  cantidadRequerida = false,
}) {
  return (
    <>
      {/* Cantidad */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>
          Cantidad{' '}
          {cantidadRequerida
            ? <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 4 }}>*</span>
            : <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 4 }}>(opcional)</span>
          }
        </label>
        <input
          type="number"
          min={cantidadRequerida ? '0.01' : '0'}
          step="0.01"
          placeholder="0.00"
          value={monto}
          onChange={e => onMonto(e.target.value)}
          style={{ ...inputStyle, width: '50%' }}
          autoFocus={cantidadRequerida}
        />
      </div>

      {/* Método de pago */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Método de pago</label>
        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
          {['efectivo', 'tarjeta', 'transferencia'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onMetodo(m)}
              style={{
                flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                background: metodo === m ? 'var(--chart-primary)' : 'var(--surface)',
                color: metodo === m ? 'white' : 'var(--ink-2)',
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {metodo === 'tarjeta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            No. de transacción{' '}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 4 }}>(opcional)</span>
          </label>
          <input
            type="text"
            placeholder="ej. 1234567890"
            value={numTransaccion}
            onChange={e => onNumTransaccion(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {metodo === 'transferencia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>
            Comprobante{' '}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 4 }}>(opcional)</span>
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
            Número de cuenta: (pendiente)
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={e => onFile(e.target.files[0] || null)}
          />
          <button
            type="button"
            className="btn"
            style={{
              border: `1.5px dashed ${file ? 'var(--chart-primary)' : 'var(--border)'}`,
              background: file ? 'rgba(0,180,216,0.05)' : 'var(--surface)',
              color: file ? 'var(--chart-primary)' : 'var(--ink-2)',
              padding: '10px 16px', borderRadius: 10,
              fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onClick={() => fileRef.current?.click()}
          >
            <I.paperclip size={14} />
            {file ? file.name : 'Seleccionar archivo…'}
          </button>
        </div>
      )}

      {/* Fecha del abono */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Fecha del abono</label>
        <input
          type="date"
          value={fecha}
          onChange={e => onFecha(e.target.value)}
          style={{ ...inputStyle, width: '60%' }}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PuntoEncuentroViewPage() {
  const { permisos } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'punto_encuentro');
  const { openModalPE, refreshKey: calRefreshKey } = useCalendarioModal();
  const { tipoColor, tipoBg } = useTiposEvento();
  const isMobile = useIsMobile();
  const [filter,  setFilter]  = useState('todos');
  const [search,  setSearch]  = useState('');
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [participantesMap,      setParticipantesMap]      = useState({});
  const [abonosMap,             setAbonosMap]             = useState({});
  const [expandedId,            setExpandedId]            = useState(null);
  const [expandedParticipantes, setExpandedParticipantes] = useState(new Set());
  const [deletingId,            setDeletingId]            = useState(null);
  const [deletingAbonoId,       setDeletingAbonoId]       = useState(null);

  // Modal registrar participante
  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalEvento,  setModalEvento]  = useState(null);
  const [form,         setForm]         = useState({ nombre: '', whatsapp: '', edad: '', tipo_persona: 'familia' });
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');
  const [primerAbono,     setPrimerAbono]     = useState({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: '' });
  const [primerAbonoFile, setPrimerAbonoFile] = useState(null);
  const primerAbonoFileRef = useRef(null);
  // Fase 3B — campos personalizados en el formulario
  const [camposDelEvento,     setCamposDelEvento]     = useState([]);
  const [respuestas,          setRespuestas]          = useState({});
  const [camposDeEventosMapa, setCamposDeEventosMapa] = useState({});

  // Modal agregar abono
  const [abonoModalOpen,    setAbonoModalOpen]    = useState(false);
  const [abonoParticipante, setAbonoParticipante] = useState(null);
  const [abonoEvento,       setAbonoEvento]       = useState(null);
  const [abonoForm,         setAbonoForm]         = useState({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: '' });
  const [abonoFile,         setAbonoFile]         = useState(null);
  const [savingAbono,       setSavingAbono]       = useState(false);
  const [abonoError,        setAbonoError]        = useState('');
  const abonoFileRef = useRef(null);

  // Modal cerrar evento
  const [cerrarModalOpen, setCerrarModalOpen] = useState(false);
  const [cerrarEvento,    setCerrarEvento]    = useState(null);
  const [cerrandoId,      setCerrandoId]      = useState(null);

  // Modal campos del registro
  const [camposModalEvento, setCamposModalEvento] = useState(null);

  // Modal corte de caja
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [corteEvento,    setCorteEvento]    = useState(null);
  const [corteResumen,   setCorteResumen]   = useState([]);

  // ── Carga inicial ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      calendarioApi.getAll({ en_punto_encuentro: true }),
      participantesApi.getAll(),
      abonosApi.getAll(),
    ])
      .then(([evRes, partRes, abonosRes]) => {
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
      })
      .catch(() => { setEventos([]); setParticipantesMap({}); setAbonosMap({}); })
      .finally(() => setLoading(false));
  }, []);

  // Recarga eventos cuando GlobalCalendarioModal guarda un nuevo evento de PE
  useEffect(() => {
    if (calRefreshKey === 0) return;
    calendarioApi.getAll({ en_punto_encuentro: true })
      .then(res => setEventos(res.data))
      .catch(() => {});
  }, [calRefreshKey]);

  // Escape para cerrar modales
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (camposModalEvento)   setCamposModalEvento(null);
      else if (cerrarModalOpen)     setCerrarModalOpen(false);
      else if (corteModalOpen) setCorteModalOpen(false);
      else if (abonoModalOpen) setAbonoModalOpen(false);
      else if (modalOpen)      setModalOpen(false);
    };
    if (modalOpen || abonoModalOpen || corteModalOpen || cerrarModalOpen || camposModalEvento) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen, abonoModalOpen, corteModalOpen, cerrarModalOpen]);

  // ── Datos derivados ────────────────────────────────────────────────────
  const hoyStr = new Date().toISOString().slice(0, 10);

  const sorted = [...eventos].sort((a, b) => {
    const ia = toISODate(a.fecha) || '';
    const ib = toISODate(b.fecha) || '';
    return ia.localeCompare(ib);
  });

  const activos  = sorted.filter(e => e.cerrado !== true);
  const cerrados = sorted.filter(e => e.cerrado === true).reverse();

  const filtered = activos.filter(e => {
    const iso = toISODate(e.fecha) || '';
    if (filter === 'proximos') return iso >= hoyStr;
    if (filter === 'pasados')  return iso < hoyStr;
    if (filter === 'especial') return e.tipo === 'Especial';
    return true;
  });

  const proximo = activos
    .filter(e => (toISODate(e.fecha) || '') >= hoyStr)
    .sort((a, b) => (toISODate(a.fecha) || '').localeCompare(toISODate(b.fecha) || ''))[0];

  // ── Próximo evento stats ───────────────────────────────────────────────
  const proximoParts      = proximo ? (participantesMap[proximo.id] || []) : [];
  const proximoInscritos  = proximoParts.length;
  const proximoRecaudado  = proximoParts.reduce((s, p) =>
    s + (abonosMap[p.id] || []).reduce((ss, a) => ss + parseFloat(a.monto || 0), 0), 0);
  const diasFaltantes = proximo
    ? Math.max(0, Math.round((new Date(toISODate(proximo.fecha) + 'T00:00:00') - new Date(hoyStr + 'T00:00:00')) / 86400000))
    : 0;

  // Buscador — recorre todos los participantes ya cargados en memoria
  const searchTrimmed = search.trim().toLowerCase();
  const searchResults = searchTrimmed
    ? Object.entries(participantesMap).flatMap(([eventoId, parts]) => {
        const evento = eventos.find(e => String(e.id) === eventoId);
        if (!evento) return [];
        return parts
          .filter(p => (p.nombre || '').toLowerCase().includes(searchTrimmed))
          .map(p => ({ p, evento }));
      })
    : [];

  // ── Handlers participantes — PRESERVED EXACTLY ─────────────────────────
  const openModal = async (evento) => {
    setModalEvento(evento);
    setForm({ nombre: '', whatsapp: '', edad: '', tipo_persona: 'familia' });
    setPrimerAbono({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: hoyStr });
    setPrimerAbonoFile(null);
    setFormError('');
    setRespuestas({});
    setCamposDelEvento([]);
    setModalOpen(true);
    try {
      const { data: campos } = await camposPersonalizadosApi.getDeEvento(evento.id);
      setCamposDelEvento(campos);
      if (campos.length > 0) {
        setCamposDeEventosMapa(prev => ({
          ...prev,
          [evento.id]: Object.fromEntries(campos.map(c => [c.id, c.nombre])),
        }));
      }
    } catch {
      setCamposDelEvento([]);
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const respuestasLimpias = Object.fromEntries(
        Object.entries(respuestas).filter(([, v]) => v !== '' && v != null)
      );
      const { data: pData } = await participantesApi.create({
        evento_id:    modalEvento.id,
        nombre:       form.nombre,
        whatsapp:     form.whatsapp,
        edad:         form.edad,
        tipo_persona: form.tipo_persona,
        respuestas:   respuestasLimpias,
      });
      setParticipantesMap(prev => ({
        ...prev,
        [modalEvento.id]: [...(prev[modalEvento.id] || []), pData],
      }));
      const monto = parseFloat(primerAbono.monto);
      if (monto > 0) {
        let comprobante_url = null;
        if (primerAbonoFile) {
          const { data: upData } = await comprobanteApi.upload(primerAbonoFile);
          comprobante_url = upData.url;
        }
        const { data: aData } = await abonosApi.create({
          participante_id: pData.id,
          monto,
          metodo:          primerAbono.metodo,
          num_transaccion: primerAbono.num_transaccion || null,
          comprobante_url,
          fecha:           primerAbono.fecha || hoyStr,
        });
        setAbonosMap(prev => ({
          ...prev,
          [pData.id]: [...(prev[pData.id] || []), aData],
        }));
      }
      setExpandedId(modalEvento.id);
      setModalOpen(false);
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParticipante = async (p) => {
    setDeletingId(p.id);
    try {
      await participantesApi.remove(p.id);
      setParticipantesMap(prev => ({
        ...prev,
        [p.evento_id]: (prev[p.evento_id] || []).filter(x => x.id !== p.id),
      }));
    } catch { /* noop */ } finally {
      setDeletingId(null);
    }
  };

  // ── Handlers abonos — PRESERVED EXACTLY ───────────────────────────────
  const openAbonoModal = (participante, evento) => {
    setAbonoParticipante(participante);
    setAbonoEvento(evento);
    setAbonoForm({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: hoyStr });
    setAbonoFile(null);
    setAbonoError('');
    setAbonoModalOpen(true);
  };

  const handleSaveAbono = async () => {
    if (!abonoForm.monto || parseFloat(abonoForm.monto) <= 0) {
      setAbonoError('Ingresa un monto válido.');
      return;
    }
    setSavingAbono(true);
    setAbonoError('');
    try {
      let comprobante_url = null;
      if (abonoFile) {
        const { data: upData } = await comprobanteApi.upload(abonoFile);
        comprobante_url = upData.url;
      }
      const { data } = await abonosApi.create({
        participante_id: abonoParticipante.id,
        monto:           parseFloat(abonoForm.monto),
        metodo:          abonoForm.metodo,
        num_transaccion: abonoForm.num_transaccion || null,
        comprobante_url,
        fecha:           abonoForm.fecha,
      });
      setAbonosMap(prev => ({
        ...prev,
        [abonoParticipante.id]: [...(prev[abonoParticipante.id] || []), data],
      }));
      setExpandedParticipantes(prev => new Set([...prev, abonoParticipante.id]));
      setAbonoModalOpen(false);
    } catch (err) {
      setAbonoError(err?.response?.data?.error || 'Error al guardar el abono.');
    } finally {
      setSavingAbono(false);
    }
  };

  const handleDeleteAbono = async (abono) => {
    setDeletingAbonoId(abono.id);
    try {
      await abonosApi.remove(abono.id);
      setAbonosMap(prev => ({
        ...prev,
        [abono.participante_id]: (prev[abono.participante_id] || []).filter(a => a.id !== abono.id),
      }));
    } catch { /* noop */ } finally {
      setDeletingAbonoId(null);
    }
  };

  const toggleExpandParticipante = (pId) => {
    setExpandedParticipantes(prev => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId); else next.add(pId);
      return next;
    });
  };

  // ── Exportar Excel — 2 hojas: Detalle (por fecha) + Resumen (por persona) ─
  const descargarExcel = (evento) => {
    const participantes = participantesMap[evento.id] || [];
    const costo = parseFloat(evento.costo) || 0;

    // ── Tokens de estilo ────────────────────────────────────────────────────
    const blockBg = ['DCE6F1', 'E2EFDA', 'FCE4D6', 'EBE2F4', 'FFF2CC', 'DAEEF3'];
    const subBg   = 'D9D9D9';
    const totalBg = 'BDD7EE';
    const hdrBg   = '112540';
    const hdrFg   = 'FFFFFF';
    const border  = {
      top:    { style: 'thin', color: { rgb: '888888' } },
      bottom: { style: 'thin', color: { rgb: '888888' } },
      left:   { style: 'thin', color: { rgb: '888888' } },
      right:  { style: 'thin', color: { rgb: '888888' } },
    };

    // Helper: construye un worksheet desde AOA + mapa de estilos
    const buildSheet = (aoa, stylesMap, colWidths) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      Object.entries(stylesMap).forEach(([key, s]) => {
        const [r, c] = key.split(',').map(Number);
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        ws[addr].s = s;
      });
      if (colWidths) ws['!cols'] = colWidths;
      return ws;
    };

    // Helper: acumula filas en AOA y añade bordes + numFmt de moneda en las columnas indicadas
    const makeAccumulator = (aoa, stylesMap, moneyCols = new Set()) => (values, style) => {
      const ri = aoa.length;
      aoa.push(values);
      values.forEach((_, ci) => {
        const s = { ...(style || {}), border };
        if (moneyCols.has(ci)) s.numFmt = '$#,##0';
        stylesMap[`${ri},${ci}`] = s;
      });
    };

    // ── Pre-calcular totales por participante ───────────────────────────────
    const infoP = {};
    participantes.forEach(p => {
      const abs = abonosMap[p.id] || [];
      const totalPagado = abs.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
      const saldo = costo > 0 ? costo - totalPagado : 0;
      infoP[p.id] = {
        ...p,
        tipo: p.tipo_persona === 'invitado' ? 'Invitado' : 'Familia Origen',
        totalPagado,
        saldo: costo > 0 ? saldo : 0,
        estatus: costo > 0
          ? (saldo <= 0 ? 'Liquidado' : totalPagado > 0 ? 'Parcial' : 'Pendiente')
          : '',
      };
    });

    // ════════════════════════════════════════════════════════════════════════
    // HOJA 1 — DETALLE (abonos agrupados por fecha con colores + bordes)
    // ════════════════════════════════════════════════════════════════════════
    const detAoa    = [];
    const detStyles = {};
    // cols 5=Monto abono, 7=Costo total evento, 8=Total abonado
    const detPush   = makeAccumulator(detAoa, detStyles, new Set([5, 7, 8]));

    detPush([
      'Nombre', 'Tipo', 'WhatsApp', 'Edad',
      'Fecha del abono', 'Monto del abono', 'Método de pago',
      'Costo total evento', 'Total abonado', 'Estatus',
    ], { fill: { patternType: 'solid', fgColor: { rgb: hdrBg } },
         font: { bold: true, color: { rgb: hdrFg } } });

    // Recopilar todos los abonos y ordenar por fecha ASC
    const allAbonos = [];
    participantes.forEach(p => {
      (abonosMap[p.id] || []).forEach(a => allAbonos.push({ ...a, _p: infoP[p.id] }));
    });
    allAbonos.sort((a, b) => {
      const fa = toISODate(a.fecha) || String(a.fecha || '').slice(0, 10);
      const fb = toISODate(b.fecha) || String(b.fecha || '').slice(0, 10);
      return fa.localeCompare(fb);
    });

    // Agrupar por fecha
    const fechasOrder = [];
    const byFecha = {};
    allAbonos.forEach(a => {
      const f = toISODate(a.fecha) || String(a.fecha || '').slice(0, 10);
      if (!byFecha[f]) { byFecha[f] = []; fechasOrder.push(f); }
      byFecha[f].push(a);
    });

    let granTotal = 0;
    fechasOrder.forEach((fecha, bi) => {
      const bg = blockBg[bi % blockBg.length];
      let blockTotal = 0;

      byFecha[fecha].forEach(a => {
        const monto = parseFloat(a.monto || 0);
        blockTotal += monto;
        granTotal  += monto;
        const p = a._p;
        const metodo = a.metodo
          ? a.metodo.charAt(0).toUpperCase() + a.metodo.slice(1)
          : '';
        detPush([
          p.nombre || '', p.tipo, p.whatsapp || '',
          p.edad ? Number(p.edad) : '', fecha, monto, metodo,
          costo > 0 ? costo : '', p.totalPagado, p.estatus,
        ], { fill: { patternType: 'solid', fgColor: { rgb: bg } } });
      });

      detPush([`Total ${fecha}`, '', '', '', '', blockTotal, '', '', '', ''], {
        fill: { patternType: 'solid', fgColor: { rgb: subBg } },
        font: { bold: true },
      });

      // Desglose por método de pago de esta fecha (solo métodos con monto > 0)
      const porMetodo = {};
      byFecha[fecha].forEach(a => {
        const m = (a.metodo || 'otro').toLowerCase();
        porMetodo[m] = (porMetodo[m] || 0) + parseFloat(a.monto || 0);
      });
      const labelMetodo = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
      ['efectivo', 'tarjeta', 'transferencia'].forEach(m => {
        if (porMetodo[m] > 0) {
          detPush([`   ${labelMetodo[m]}`, '', '', '', '', porMetodo[m], '', '', '', ''], {
            fill: { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } },
            font: { italic: true, color: { rgb: '888888' } },
          });
        }
      });

      // Fila vacía de separación entre bloques (sin bordes ni color)
      if (bi < fechasOrder.length - 1) {
        detAoa.push(new Array(10).fill(''));
      }
    });

    // Participantes sin abonos
    participantes
      .filter(p => !(abonosMap[p.id] || []).length)
      .forEach(p => detPush([
        p.nombre || '', infoP[p.id].tipo, p.whatsapp || '',
        p.edad ? Number(p.edad) : '', '', '', '',
        costo > 0 ? costo : '', 0, costo > 0 ? 'Pendiente' : '',
      ]));

    detPush(['TOTAL', '', '', '', '', granTotal, '', '', '', ''], {
      fill: { patternType: 'solid', fgColor: { rgb: totalBg } },
      font: { bold: true },
    });

    const wsDetalle = buildSheet(detAoa, detStyles, [
      { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch:  6 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 14 }, { wch: 11 },
    ]);

    // ════════════════════════════════════════════════════════════════════════
    // HOJA 2 — RESUMEN (1 fila por persona, ordenado por nombre)
    // ════════════════════════════════════════════════════════════════════════
    const resAoa    = [];
    const resStyles = {};
    // cols 1=Total abonado, 2=Saldo
    const resPush   = makeAccumulator(resAoa, resStyles, new Set([1, 2]));

    resPush(['Nombre', 'Total abonado', 'Saldo', 'Estatus'], {
      fill: { patternType: 'solid', fgColor: { rgb: hdrBg } },
      font: { bold: true, color: { rgb: hdrFg } },
    });

    const partsSorted = [...participantes].sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es')
    );

    let resTotalAbonado = 0;
    partsSorted.forEach(p => {
      const info = infoP[p.id];
      resTotalAbonado += info.totalPagado;
      resPush([
        p.nombre || '',
        info.totalPagado,
        costo > 0 ? info.saldo : '',
        info.estatus,
      ]);
    });

    resPush(['TOTAL', resTotalAbonado, '', ''], {
      fill: { patternType: 'solid', fgColor: { rgb: totalBg } },
      font: { bold: true },
    });

    const wsResumen = buildSheet(resAoa, resStyles, [
      { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 11 },
    ]);

    // ── Ensamblar workbook y descargar ──────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    const slug = evento.nombre
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    XLSX.writeFile(wb, `abonos_${slug}_${hoyStr}.xlsx`);
  };

  // ── Corte de caja — PRESERVED EXACTLY ─────────────────────────────────
  const openCorteModal = (evento) => {
    setCorteEvento(evento);
    const participantes = participantesMap[evento.id] || [];
    const todosAbonos   = participantes.flatMap(p => abonosMap[p.id] || []);
    const byFecha = {};
    todosAbonos.forEach(a => {
      const fecha = toISODate(a.fecha) || (a.fecha || '').slice(0, 10);
      if (!fecha) return;
      if (!byFecha[fecha]) byFecha[fecha] = { efectivo: 0, tarjeta: 0, transferencia: 0 };
      const m      = parseFloat(a.monto || 0);
      const metodo = (a.metodo || 'efectivo').toLowerCase();
      if (metodo === 'tarjeta')            byFecha[fecha].tarjeta       += m;
      else if (metodo === 'transferencia') byFecha[fecha].transferencia += m;
      else                                 byFecha[fecha].efectivo      += m;
    });
    const resumen = Object.entries(byFecha)
      .map(([fecha, t]) => ({
        fecha,
        efectivo:      t.efectivo,
        tarjeta:       t.tarjeta,
        transferencia: t.transferencia,
        total:         t.efectivo + t.tarjeta + t.transferencia,
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    setCorteResumen(resumen);
    setCorteModalOpen(true);
  };

  // ── Cerrar evento ─────────────────────────────────────────────────────
  const handleCerrarConfirm = async () => {
    if (!cerrarEvento) return;
    setCerrandoId(cerrarEvento.id);
    try {
      await calendarioApi.cerrar(cerrarEvento.id);
      setEventos(prev => prev.map(e => e.id === cerrarEvento.id ? { ...e, cerrado: true } : e));
      setCerrarModalOpen(false);
      setCerrarEvento(null);
    } catch {
      alert('No se pudo cerrar el evento. Intenta de nuevo.');
    } finally {
      setCerrandoId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Layout principal 2 columnas ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.55fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* ── IZQUIERDA: Lista de eventos ────────────────────────────────── */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 14 }}>
            <div>
              <h3 className="card-title">Eventos en Punto de Encuentro</h3>
              <div className="card-sub">{loading ? 'Cargando…' : `${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`}</div>
            </div>
            {canWrite && (
              <button className="btn btn-primary" onClick={() => openModalPE()}>
                <I.plus size={14} /> Registrar evento
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { key: 'todos',    label: 'Todos' },
              { key: 'proximos', label: 'Próximos' },
              { key: 'pasados',  label: 'Pasados' },
              { key: 'especial', label: 'Especiales' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                style={{
                  fontSize: 13, fontWeight: 600, padding: '8px 15px', borderRadius: 9,
                  border: `1px solid ${filter === opt.key ? NAVY : GRAY_200}`,
                  background: filter === opt.key ? NAVY : 'white',
                  color: filter === opt.key ? 'white' : GRAY_700,
                  cursor: 'pointer', transition: '.12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Buscador de persona */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: GRAY_300, pointerEvents: 'none', display: 'flex',
            }}>
              <I.search size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar persona por nombre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34, border: `1.5px solid ${search ? NAVY : 'var(--border)'}` }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: GRAY_500, display: 'flex', alignItems: 'center', padding: 2,
                }}
              >
                <I.x size={13} />
              </button>
            )}
          </div>

          {search.trim() ? (
            searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
                Sin resultados para "{search}"
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {searchResults.map(({ p, evento }) => {
                  const costo       = parseFloat(evento.costo) || 0;
                  const pAbonos     = abonosMap[p.id] || [];
                  const totalPagado = pAbonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
                  const saldo       = costo > 0 ? costo - totalPagado : null;
                  const status      = costo > 0
                    ? (saldo <= 0 ? 'liquidado' : totalPagado > 0 ? 'parcial' : 'pendiente')
                    : null;
                  const esCerrado   = evento.cerrado === true;
                  const sColors = {
                    liquidado: { background: '#E6F5EC', color: GREEN },
                    parcial:   { background: '#FBF2DC', color: AMBER },
                    pendiente: { background: '#FBEAE9', color: RED   },
                  };
                  return (
                    <div key={`${p.id}-${evento.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 'var(--r-lg)',
                      border: `1px solid ${GRAY_200}`, background: 'white',
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: NAVY_700, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12.5, flexShrink: 0,
                      }}>
                        {initials(p.nombre)}
                      </div>
                      {/* Info persona + evento */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: NAVY }}>{p.nombre}</div>
                        <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.whatsapp && <span>WA {p.whatsapp}</span>}
                          {p.whatsapp && p.edad && <span>·</span>}
                          {p.edad && <span>{p.edad} años</span>}
                          {(p.whatsapp || p.edad) && <span style={{ color: GRAY_300 }}>·</span>}
                          <span style={{ color: NAVY_700, fontWeight: 600 }}>{evento.nombre}</span>
                          <span style={{ color: GRAY_300 }}>·</span>
                          <span>{fmtFechaShort(evento.fecha)}</span>
                        </div>
                      </div>
                      {/* Estado de pago */}
                      {status && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {costo > 0 && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                              {fmtAmt(totalPagado)}<span style={{ color: GRAY_500, fontWeight: 500 }}> / {fmtAmt(costo)}</span>
                            </div>
                          )}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                            display: 'inline-block', ...sColors[status],
                          }}>
                            {status === 'liquidado' ? 'Liquidado' : status === 'parcial' ? 'Parcial' : 'Pendiente'}
                          </span>
                        </div>
                      )}
                      {/* Botón abono — solo en eventos activos con costo */}
                      {canWrite && status !== 'liquidado' && !esCerrado && costo > 0 && (
                        <button
                          onClick={() => openAbonoModal(p, evento)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11.5, fontWeight: 600, padding: '7px 11px', borderRadius: 7,
                            background: NAVY, color: 'white', border: 0, cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          <I.plus size={12} /> Abono
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Cargando eventos…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Sin eventos en esta categoría.
            </div>
          ) : (
            <div>
              {filtered.map((e, idx) => {
                const iso        = toISODate(e.fecha) || '';
                const isPast     = iso < hoyStr;
                const isToday    = iso === hoyStr;
                const pList      = participantesMap[e.id] || [];
                const pCount     = pList.length;
                const isExpanded = expandedId === e.id;
                const costo      = parseFloat(e.costo) || 0;

                return (
                  <div key={e.id} style={{
                    border: `1px solid ${GRAY_200}`,
                    borderRadius: 'var(--r-lg)',
                    overflow: 'hidden',
                    marginBottom: idx < filtered.length - 1 ? 14 : 0,
                    opacity: isPast && !isToday ? 0.75 : 1,
                  }}>

                    {/* Event top */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px', background: GRAY_50,
                      borderBottom: `1px solid ${GRAY_200}`, flexWrap: 'wrap',
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: NAVY_100, color: NAVY_700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <I.pin size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{e.nombre}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: GRAY_500, flexWrap: 'wrap' }}>
                          <span>{fmtFechaShort(e.fecha)}</span>
                          {isToday && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: NAVY, color: 'white' }}>Hoy</span>
                          )}
                          {costo > 0 && (
                            <>
                              <span style={{ width: 3, height: 3, borderRadius: '50%', background: GRAY_300, display: 'inline-block' }} />
                              <span>Costo <b style={{ color: NAVY_700 }}>{fmtAmt(costo)}</b></span>
                            </>
                          )}
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: GRAY_300, display: 'inline-block' }} />
                          <span>{pCount} inscritos</span>
                        </div>
                      </div>
                      {e.tipo && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 6, flexShrink: 0,
                          background: tipoBg[e.tipo] || ORANGE_50,
                          color: tipoColor[e.tipo] || ORANGE_600,
                        }}>
                          {e.tipo}
                        </span>
                      )}
                    </div>

                    {/* Event actions */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 18px', borderBottom: `1px solid ${GRAY_100}`,
                      flexWrap: 'wrap',
                    }}>
                      <button
                        onClick={() => {
                          const next = isExpanded ? null : e.id;
                          setExpandedId(next);
                          if (next && !camposDeEventosMapa[e.id]) {
                            camposPersonalizadosApi.getDeEvento(e.id).then(({ data }) => {
                              if (data.length > 0) {
                                setCamposDeEventosMapa(prev => ({
                                  ...prev,
                                  [e.id]: Object.fromEntries(data.map(c => [c.id, c.nombre])),
                                }));
                              }
                            }).catch(() => {});
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          fontSize: 12.5, fontWeight: 600, color: NAVY_700,
                          background: 'transparent', border: 'none',
                          padding: '4px 0', cursor: 'pointer', marginRight: 'auto',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <I.users size={16} style={{ color: GRAY_500 }} />
                        <span>{pCount} participante{pCount !== 1 ? 's' : ''}</span>
                        <span style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                          <I.chevR size={11} />
                        </span>
                      </button>
                      {canWrite && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '8px 13px', fontSize: 13 }}
                          onClick={() => openModal(e)}
                        >
                          <I.plus size={15} /> Registrar
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '8px 13px', fontSize: 13 }}
                        onClick={() => openCorteModal(e)}
                      >
                        <I.cash size={15} /> Corte
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '8px 13px', fontSize: 13 }}
                        onClick={() => descargarExcel(e)}
                      >
                        <I.download size={15} /> Excel
                      </button>
                      {canWrite && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '8px 13px', fontSize: 13 }}
                          onClick={() => setCamposModalEvento(e)}
                        >
                          <I.edit size={14} /> Campos
                        </button>
                      )}
                      {canWrite && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '8px 13px', fontSize: 13, color: RED, borderColor: RED }}
                          onClick={() => { setCerrarEvento(e); setCerrarModalOpen(true); }}
                        >
                          Cerrar evento
                        </button>
                      )}
                    </div>

                    {/* Participants list (expandible) */}
                    {isExpanded && (
                      <div>
                        {pList.length === 0 ? (
                          <div style={{ padding: 22, textAlign: 'center', fontSize: 12.5, color: GRAY_500 }}>
                            Aún sin participantes registrados · sé el primero en inscribir
                          </div>
                        ) : (
                          pList.map(p => {
                            const pAbonos     = abonosMap[p.id] || [];
                            const totalPagado = pAbonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
                            const saldo       = costo > 0 ? costo - totalPagado : null;
                            const status      = costo > 0
                              ? (saldo <= 0 ? 'liquidado' : totalPagado > 0 ? 'parcial' : 'pendiente')
                              : null;
                            const pExpanded = expandedParticipantes.has(p.id);

                            const statusStyle = {
                              liquidado: { background: '#E6F5EC', color: GREEN },
                              parcial:   { background: '#FBF2DC', color: AMBER },
                              pendiente: { background: '#FBEAE9', color: RED },
                            };

                            return (
                              <div key={p.id} style={{ borderTop: `1px solid ${GRAY_100}` }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 18px', background: 'white',
                                  transition: 'background .1s',
                                }}>
                                  {/* Avatar */}
                                  <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: NAVY_700, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 12, flexShrink: 0,
                                  }}>
                                    {initials(p.nombre)}
                                  </div>

                                  {/* Body */}
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      {p.nombre}
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: NAVY_100, color: NAVY_700 }}>
                                        {p.tipo_persona === 'invitado' ? 'Invitado' : 'Familia Origen'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 2, display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                                      {p.whatsapp && <span>WA {p.whatsapp}</span>}
                                      {p.whatsapp && p.edad && <span>·</span>}
                                      {p.edad && <span>{p.edad} años</span>}
                                    </div>
                                    {p.respuestas && Object.keys(p.respuestas).length > 0 && (() => {
                                      const mapa = camposDeEventosMapa[e.id] || {};
                                      const pares = Object.entries(p.respuestas)
                                        .filter(([cid, v]) => mapa[cid] && v !== '' && v != null)
                                        .map(([cid, v]) => `${mapa[cid]}: ${v}`);
                                      return pares.length > 0 ? (
                                        <div style={{ fontSize: 11, color: GRAY_500, marginTop: 1 }}>
                                          {pares.join(' · ')}
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>

                                  {/* Payment info */}
                                  {costo > 0 && (
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                                        {fmtAmt(totalPagado)} <span style={{ color: GRAY_500, fontWeight: 500 }}>/ {fmtAmt(costo)}</span>
                                      </div>
                                      {status && (
                                        <span style={{
                                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                                          marginTop: 3, display: 'inline-block',
                                          ...statusStyle[status],
                                        }}>
                                          {status === 'liquidado' ? 'Liquidado' : status === 'parcial' ? 'Parcial' : 'Pendiente'}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Abono history toggle */}
                                  {pAbonos.length > 0 && (
                                    <button
                                      onClick={() => toggleExpandParticipante(p.id)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        background: 'transparent', border: 'none',
                                        padding: '3px 7px', borderRadius: 6,
                                        fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
                                        fontFamily: 'var(--font-ui)', flexShrink: 0,
                                      }}
                                      title="Ver abonos"
                                    >
                                      <I.receipt size={12} />
                                      <span>{pAbonos.length}</span>
                                      <span style={{ display: 'inline-flex', transform: pExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                                        <I.chevR size={10} />
                                      </span>
                                    </button>
                                  )}

                                  {/* Abono button — solo si el evento tiene costo */}
                                  {canWrite && costo > 0 && (
                                    status === 'liquidado' ? (
                                      <button style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        fontSize: 11.5, fontWeight: 600, padding: '7px 11px', borderRadius: 7,
                                        background: 'white', color: GRAY_500, border: `1px solid ${GRAY_200}`,
                                        cursor: 'default', flexShrink: 0,
                                      }}>
                                        Liquidado
                                      </button>
                                    ) : (
                                      <button onClick={() => openAbonoModal(p, e)} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        fontSize: 11.5, fontWeight: 600, padding: '7px 11px', borderRadius: 7,
                                        background: NAVY, color: 'white', border: 0, cursor: 'pointer', flexShrink: 0,
                                      }}>
                                        <I.plus size={12} /> Abono
                                      </button>
                                    )
                                  )}

                                  {/* Delete */}
                                  {canWrite && (
                                    <button
                                      onClick={() => handleDeleteParticipante(p)}
                                      disabled={deletingId === p.id}
                                      style={{
                                        width: 30, height: 30, borderRadius: 7,
                                        border: `1px solid ${GRAY_200}`, background: 'white',
                                        color: GRAY_300, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                                      }}
                                      title="Eliminar participante"
                                    >
                                      <I.trash size={14} />
                                    </button>
                                  )}
                                </div>

                                {/* Abonos detalle */}
                                {pExpanded && pAbonos.length > 0 && (
                                  <div style={{
                                    padding: '6px 12px 8px 16px',
                                    borderTop: `1px dashed ${GRAY_200}`,
                                    background: GRAY_50,
                                    display: 'flex', flexWrap: 'wrap', gap: 6,
                                  }}>
                                    {pAbonos.map(a => (
                                      <div key={a.id} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '3px 7px 3px 9px', borderRadius: 99,
                                        background: 'white', border: `1px solid ${GRAY_200}`,
                                        fontSize: 11.5,
                                      }}>
                                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{fmtMoney(a.monto)}</span>
                                        <span style={{ color: GRAY_500 }}>·</span>
                                        <span style={{ color: 'var(--ink-2)', textTransform: 'capitalize' }}>{a.metodo}</span>
                                        <span style={{ color: GRAY_500 }}>·</span>
                                        <span style={{ color: GRAY_500 }}>{fmtFechaShort(a.fecha)}</span>
                                        {a.comprobante_url && (
                                          <a href={a.comprobante_url} target="_blank" rel="noopener noreferrer"
                                            style={{ color: 'var(--chart-primary)', marginLeft: 2, lineHeight: 1 }}
                                            title="Ver comprobante">
                                            <I.paperclip size={10} />
                                          </a>
                                        )}
                                        {canWrite && (
                                          <button
                                            className="icon-btn"
                                            onClick={() => handleDeleteAbono(a)}
                                            disabled={deletingAbonoId === a.id}
                                            style={{ width: 16, height: 16, color: 'var(--danger)', flexShrink: 0, marginLeft: 1 }}
                                            title="Eliminar abono"
                                          >
                                            <I.x size={9} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Eventos concluidos ──────────────────────────────────────────── */}
          {!search.trim() && cerrados.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${GRAY_200}`, paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: GRAY_500, marginBottom: 12 }}>
                Eventos concluidos · {cerrados.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cerrados.map(e => {
                  const pList      = participantesMap[e.id] || [];
                  const costo      = parseFloat(e.costo) || 0;
                  const recaudado  = pList.reduce((s, p) =>
                    s + (abonosMap[p.id] || []).reduce((ss, a) => ss + parseFloat(a.monto || 0), 0), 0);
                  const isExpCC    = expandedId === `cc-${e.id}`;

                  return (
                    <div key={e.id} style={{
                      border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)',
                      overflow: 'hidden', opacity: 0.82,
                    }}>
                      {/* Cabecera evento concluido */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px', background: GRAY_50,
                        borderBottom: `1px solid ${GRAY_200}`, flexWrap: 'wrap',
                      }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{e.nombre}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: GRAY_200, color: GRAY_500 }}>Concluido</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: GRAY_500, flexWrap: 'wrap' }}>
                            <span>{fmtFechaShort(e.fecha)}</span>
                            {e.tipo && (
                              <>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: GRAY_300, display: 'inline-block' }} />
                                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: tipoBg[e.tipo] || ORANGE_50, color: tipoColor[e.tipo] || ORANGE_600 }}>{e.tipo}</span>
                              </>
                            )}
                            {recaudado > 0 && (
                              <>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: GRAY_300, display: 'inline-block' }} />
                                <span>Recaudado <b style={{ color: NAVY_700 }}>{fmtAmt(recaudado)}</b></span>
                              </>
                            )}
                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: GRAY_300, display: 'inline-block' }} />
                            <span>{pList.length} participantes</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => setExpandedId(isExpCC ? null : `cc-${e.id}`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              fontSize: 12, fontWeight: 600, color: GRAY_500,
                              background: 'white', border: `1px solid ${GRAY_200}`,
                              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                              fontFamily: 'var(--font-ui)',
                            }}
                          >
                            <I.users size={14} />
                            Ver participantes
                            <span style={{ display: 'inline-flex', transform: isExpCC ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                              <I.chevR size={10} />
                            </span>
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            onClick={() => descargarExcel(e)}
                          >
                            <I.download size={14} /> Excel
                          </button>
                        </div>
                      </div>

                      {/* Lista de participantes (solo consulta) */}
                      {isExpCC && (
                        <div>
                          {pList.length === 0 ? (
                            <div style={{ padding: 18, textAlign: 'center', fontSize: 12.5, color: GRAY_500 }}>
                              Sin participantes registrados.
                            </div>
                          ) : (
                            pList.map(p => {
                              const pAbonos     = abonosMap[p.id] || [];
                              const totalPagado = pAbonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
                              const saldo       = costo > 0 ? costo - totalPagado : null;
                              const status      = costo > 0
                                ? (saldo <= 0 ? 'liquidado' : totalPagado > 0 ? 'parcial' : 'pendiente')
                                : null;
                              const statusStyle = {
                                liquidado: { background: '#E6F5EC', color: GREEN },
                                parcial:   { background: '#FBF2DC', color: AMBER },
                                pendiente: { background: '#FBEAE9', color: RED },
                              };
                              return (
                                <div key={p.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '11px 18px', borderTop: `1px solid ${GRAY_100}`,
                                  background: 'white',
                                }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: GRAY_300, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 11.5, flexShrink: 0,
                                  }}>
                                    {initials(p.nombre)}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.nombre}</div>
                                    <div style={{ fontSize: 11, color: GRAY_500, marginTop: 1 }}>
                                      {p.tipo_persona === 'invitado' ? 'Invitado' : 'Familia Origen'}
                                      {p.whatsapp && ` · WA ${p.whatsapp}`}
                                    </div>
                                  </div>
                                  {costo > 0 && (
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                                        {fmtAmt(totalPagado)} <span style={{ color: GRAY_500, fontWeight: 500 }}>/ {fmtAmt(costo)}</span>
                                      </div>
                                      {status && (
                                        <span style={{
                                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                                          marginTop: 2, display: 'inline-block',
                                          ...statusStyle[status],
                                        }}>
                                          {status === 'liquidado' ? 'Liquidado' : status === 'parcial' ? 'Parcial' : 'Pendiente'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── DERECHA: Panel lateral ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Próximo evento — feature card navy */}
          {!loading && proximo && (
            <div style={{
              background: NAVY, borderRadius: 'var(--r-xl)', padding: 22, color: 'white',
              position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-md)',
            }}>
              {/* Decorative circle */}
              <div style={{
                position: 'absolute', right: -40, top: -40, width: 160, height: 160,
                borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)',
                pointerEvents: 'none',
              }} />

              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ORANGE_400, marginBottom: 12 }}>
                Próximo evento
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 8 }}>
                {proximo.nombre}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: NAVY_300, fontSize: 12.5, flexWrap: 'wrap', marginBottom: 18 }}>
                <span>{fmtFecha(proximo.fecha)}</span>
                {proximo.tipo && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: NAVY_300, display: 'inline-block' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,138,82,0.16)', color: ORANGE_400 }}>
                      {proximo.tipo}
                    </span>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: isMobile ? 14 : 22, flexWrap: 'wrap', marginBottom: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {diasFaltantes}
                  </span>
                  <span style={{ fontSize: 11, color: NAVY_300, fontWeight: 600 }}>días faltan</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {proximoInscritos}
                  </span>
                  <span style={{ fontSize: 11, color: NAVY_300, fontWeight: 600 }}>inscritos</span>
                </div>
                {parseFloat(proximo.costo || 0) > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: '#3DD68C' }}>
                      {fmtAmt(proximoRecaudado)}
                    </span>
                    <span style={{ fontSize: 11, color: NAVY_300, fontWeight: 600 }}>recaudado</span>
                  </div>
                )}
              </div>

              {canWrite && (
                <div style={{ display: 'flex', gap: 9, position: 'relative', zIndex: 1 }}>
                  <button
                    className="btn"
                    onClick={() => openModal(proximo)}
                    style={{ background: '#FF6B2B', color: 'white', fontWeight: 700, border: 'none', width: isMobile ? '100%' : undefined }}
                    onMouseEnter={e => e.currentTarget.style.background = '#E0561B'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FF6B2B'}
                  >
                    <I.plus size={15} /> Registrar participante
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mini calendario PE */}
          {!loading && (
            <MiniCalendarioPE eventos={eventos} />
          )}

        </div>
      </div>

      {/* ── Modal registrar participante — PRESERVED EXACTLY ────────────────── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />

            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Punto de Encuentro</div>
                <h3 className="anf-modal-date">Registrar participante</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{modalEvento?.nombre}</p>
              </div>
              <button className="icon-btn" onClick={() => setModalOpen(false)} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Relación con la iglesia */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>Relación con la iglesia</label>
                <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                  {[
                    { val: 'familia',  label: 'Familia Origen' },
                    { val: 'invitado', label: 'Invitado' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo_persona: opt.val }))}
                      style={{
                        flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 600,
                        background: form.tipo_persona === opt.val
                          ? (opt.val === 'invitado' ? '#F59E0B' : '#10B981')
                          : 'var(--surface)',
                        color: form.tipo_persona === opt.val ? 'white' : 'var(--ink-2)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>
                  Nombre <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 4 }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              {/* WhatsApp */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>
                  WhatsApp <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="ej. 4491234567"
                  value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Edad */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>
                  Edad <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>
                <input
                  type="number"
                  placeholder="ej. 25"
                  min="1" max="120"
                  value={form.edad}
                  onChange={e => setForm(f => ({ ...f, edad: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Campos personalizados del evento */}
              {camposDelEvento.map(c => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>
                    {c.nombre}{' '}
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                  </label>
                  {c.tipo === 'opciones' ? (
                    <select
                      value={respuestas[c.id] ?? ''}
                      onChange={ev => setRespuestas(r => ({ ...r, [c.id]: ev.target.value }))}
                      style={inputStyle}
                    >
                      <option value="">Seleccionar…</option>
                      {(c.opciones || []).map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={c.tipo === 'numero' ? 'number' : 'text'}
                      placeholder={c.tipo === 'numero' ? 'Ingresa un número' : 'Ingresa tu respuesta'}
                      value={respuestas[c.id] ?? ''}
                      onChange={ev => setRespuestas(r => ({ ...r, [c.id]: ev.target.value }))}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}

              {/* Primer abono (opcional) */}
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Primer abono <span style={{ fontWeight: 500, textTransform: 'none' }}>(opcional)</span>
                </div>
                <AbonoFields
                  monto={primerAbono.monto}
                  onMonto={v => setPrimerAbono(f => ({ ...f, monto: v }))}
                  metodo={primerAbono.metodo}
                  onMetodo={m => setPrimerAbono(f => ({ ...f, metodo: m, num_transaccion: '' }))}
                  numTransaccion={primerAbono.num_transaccion}
                  onNumTransaccion={v => setPrimerAbono(f => ({ ...f, num_transaccion: v }))}
                  file={primerAbonoFile}
                  onFile={setPrimerAbonoFile}
                  fileRef={primerAbonoFileRef}
                  fecha={primerAbono.fecha}
                  onFecha={v => setPrimerAbono(f => ({ ...f, fecha: v }))}
                  cantidadRequerida={false}
                />
              </div>
            </div>

            {formError && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>{formError}</p>
            )}

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={saving || !form.nombre.trim()}
              style={{ opacity: (saving || !form.nombre.trim()) ? 0.45 : 1, marginTop: 4 }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : 'Registrar participante'}
            </button>

            {!form.nombre.trim() && !formError && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
                El nombre es requerido
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Modal agregar abono — PRESERVED EXACTLY ─────────────────────────── */}
      {abonoModalOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setAbonoModalOpen(false); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />

            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Punto de Encuentro · Abono</div>
                <h3 className="anf-modal-date">Agregar abono</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  {abonoParticipante?.nombre}
                  {abonoEvento?.costo > 0 && (
                    <span style={{ marginLeft: 8 }}>· Costo: {fmtMoney(abonoEvento.costo)}</span>
                  )}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setAbonoModalOpen(false)} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <AbonoFields
                monto={abonoForm.monto}
                onMonto={v => setAbonoForm(f => ({ ...f, monto: v }))}
                metodo={abonoForm.metodo}
                onMetodo={m => setAbonoForm(f => ({ ...f, metodo: m, num_transaccion: '' }))}
                numTransaccion={abonoForm.num_transaccion}
                onNumTransaccion={v => setAbonoForm(f => ({ ...f, num_transaccion: v }))}
                file={abonoFile}
                onFile={setAbonoFile}
                fileRef={abonoFileRef}
                fecha={abonoForm.fecha}
                onFecha={v => setAbonoForm(f => ({ ...f, fecha: v }))}
                cantidadRequerida={true}
              />
            </div>

            {abonoError && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>{abonoError}</p>
            )}

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSaveAbono}
              disabled={savingAbono || !abonoForm.monto}
              style={{ opacity: (savingAbono || !abonoForm.monto) ? 0.45 : 1, marginTop: 4 }}
            >
              <I.check size={16} />
              {savingAbono ? 'Guardando…' : 'Guardar abono'}
            </button>

            {!abonoForm.monto && !abonoError && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
                Ingresa la cantidad del abono
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Modal corte de caja — PRESERVED EXACTLY ─────────────────────────── */}
      {corteModalOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setCorteModalOpen(false); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />

            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Punto de Encuentro · Corte</div>
                <h3 className="anf-modal-date">Corte de caja</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{corteEvento?.nombre}</p>
              </div>
              <button className="icon-btn" onClick={() => setCorteModalOpen(false)} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            {corteResumen.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', padding: '24px 0' }}>
                Sin abonos registrados.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {corteResumen.map(p => (
                  <div key={p.fecha} style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '7px 14px', background: 'var(--surface-2)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                      {fmtFecha(p.fecha)}
                    </div>
                    <div style={{ padding: '8px 14px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                      <span>Efectivo: <strong style={{ color: 'var(--ink)' }}>{fmtMoney(p.efectivo)}</strong></span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span>Tarjeta: <strong style={{ color: 'var(--ink)' }}>{fmtMoney(p.tarjeta)}</strong></span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span>Transferencia: <strong style={{ color: 'var(--ink)' }}>{fmtMoney(p.transferencia)}</strong></span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span style={{ fontWeight: 700, color: 'var(--chart-primary)' }}>Total del día: {fmtMoney(p.total)}</span>
                    </div>
                  </div>
                ))}

                {(() => {
                  const gt = corteResumen.reduce(
                    (acc, p) => ({
                      efectivo:      acc.efectivo      + p.efectivo,
                      tarjeta:       acc.tarjeta       + p.tarjeta,
                      transferencia: acc.transferencia + p.transferencia,
                      total:         acc.total         + p.total,
                    }),
                    { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 }
                  );
                  return (
                    <div style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)',
                      fontSize: 13, lineHeight: 1.7,
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        Gran total ({corteResumen.length} {corteResumen.length === 1 ? 'fecha' : 'fechas'}):
                      </span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span style={{ color: 'var(--ink-2)' }}>Efectivo: <strong>{fmtMoney(gt.efectivo)}</strong></span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span style={{ color: 'var(--ink-2)' }}>Tarjeta: <strong>{fmtMoney(gt.tarjeta)}</strong></span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span style={{ color: 'var(--ink-2)' }}>Transferencia: <strong>{fmtMoney(gt.transferencia)}</strong></span>
                      <span style={{ margin: '0 7px', color: 'var(--border-strong)' }}>·</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--chart-primary)' }}>Total: {fmtMoney(gt.total)}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              className="btn"
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink-2)', marginTop: 4 }}
              onClick={() => setCorteModalOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal campos del registro ───────────────────────────────────────── */}
      {camposModalEvento && (
        <CamposRegistroModal
          eventoId={camposModalEvento.id}
          eventoNombre={camposModalEvento.nombre}
          onClose={() => setCamposModalEvento(null)}
        />
      )}

      {/* ── Modal confirmar cierre de evento ────────────────────────────────── */}
      {cerrarModalOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setCerrarModalOpen(false); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />

            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Punto de Encuentro</div>
                <h3 className="anf-modal-date">Cerrar evento</h3>
              </div>
              <button className="icon-btn" onClick={() => setCerrarModalOpen(false)} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: GRAY_700, lineHeight: 1.65, margin: '0 0 8px' }}>
              ¿Cerrar el evento <strong>"{cerrarEvento?.nombre}"</strong>?{' '}
              Una vez cerrado pasa a <em>Eventos concluidos</em> y ya <strong>NO</strong> se podrá reabrir
              ni registrar más participantes o abonos. Esta acción es definitiva.
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                className="btn"
                style={{ flex: 1, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ink-2)' }}
                onClick={() => setCerrarModalOpen(false)}
                disabled={cerrandoId != null}
              >
                Cancelar
              </button>
              <button
                className="btn"
                style={{
                  flex: 1, background: RED, color: 'white', border: 'none', fontWeight: 700,
                  opacity: cerrandoId != null ? 0.6 : 1,
                }}
                onClick={handleCerrarConfirm}
                disabled={cerrandoId != null}
              >
                {cerrandoId != null ? 'Cerrando…' : 'Sí, cerrar evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
