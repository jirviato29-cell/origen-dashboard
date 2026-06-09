import { useState, useEffect, useRef } from 'react';
import { calendarioApi, participantesApi, abonosApi, comprobanteApi } from '../../services/api';
import { fmtFecha, fmtFechaShort, toISODate } from '../../utils/fecha';
import * as XLSX from 'xlsx';
import { I } from '../../components/Icons';
import { TIPO_COLOR, TIPO_BG, TIPO_CELL_BG } from '../../utils/tipoEventoColors';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// ── Campos completos de abono (cantidad + método + condicionales + fecha) ────
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
  const [filter,  setFilter]  = useState('todos');
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
  // Primer abono embebido en el formulario de registro
  const [primerAbono,     setPrimerAbono]     = useState({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: '' });
  const [primerAbonoFile, setPrimerAbonoFile] = useState(null);
  const primerAbonoFileRef = useRef(null);

  // Modal agregar abono (abonos posteriores)
  const [abonoModalOpen,    setAbonoModalOpen]    = useState(false);
  const [abonoParticipante, setAbonoParticipante] = useState(null);
  const [abonoEvento,       setAbonoEvento]       = useState(null);
  const [abonoForm,         setAbonoForm]         = useState({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: '' });
  const [abonoFile,         setAbonoFile]         = useState(null);
  const [savingAbono,       setSavingAbono]       = useState(false);
  const [abonoError,        setAbonoError]        = useState('');
  const abonoFileRef = useRef(null);

  // Modal corte de caja (resumen en vivo, calculado en front)
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [corteEvento,    setCorteEvento]    = useState(null);
  const [corteResumen,   setCorteResumen]   = useState([]);

  // ── Carga inicial ────────────────────────────────────────────────────────
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

  // Escape para cerrar modales
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (corteModalOpen)     setCorteModalOpen(false);
      else if (abonoModalOpen) setAbonoModalOpen(false);
      else if (modalOpen)     setModalOpen(false);
    };
    if (modalOpen || abonoModalOpen || corteModalOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen, abonoModalOpen, corteModalOpen]);

  // ── Datos derivados ──────────────────────────────────────────────────────
  const hoyStr = new Date().toISOString().slice(0, 10);

  const sorted = [...eventos].sort((a, b) => {
    const ia = toISODate(a.fecha) || '';
    const ib = toISODate(b.fecha) || '';
    return ib.localeCompare(ia);
  });

  const filtered = sorted.filter(e => {
    const iso = toISODate(e.fecha) || '';
    if (filter === 'proximos') return iso >= hoyStr;
    if (filter === 'pasados')  return iso < hoyStr;
    if (filter === 'especial') return e.tipo === 'Especial';
    return true;
  });

  const proximo = sorted
    .filter(e => (toISODate(e.fecha) || '') >= hoyStr)
    .sort((a, b) => (toISODate(a.fecha) || '').localeCompare(toISODate(b.fecha) || ''))[0];

  // ── Handlers participantes ───────────────────────────────────────────────
  const openModal = (evento) => {
    setModalEvento(evento);
    setForm({ nombre: '', whatsapp: '', edad: '', tipo_persona: 'familia' });
    setPrimerAbono({ monto: '', metodo: 'efectivo', num_transaccion: '', fecha: hoyStr });
    setPrimerAbonoFile(null);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido.'); return; }
    setSaving(true);
    setFormError('');
    try {
      // 1. Crear participante
      const { data: pData } = await participantesApi.create({
        evento_id:    modalEvento.id,
        nombre:       form.nombre,
        whatsapp:     form.whatsapp,
        edad:         form.edad,
        tipo_persona: form.tipo_persona,
      });
      setParticipantesMap(prev => ({
        ...prev,
        [modalEvento.id]: [...(prev[modalEvento.id] || []), pData],
      }));

      // 2. Crear primer abono si se capturó monto
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

  // ── Handlers abonos ──────────────────────────────────────────────────────
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

  // ── Exportar Excel ──────────────────────────────────────────────────────
  const descargarExcel = (evento) => {
    const participantes = participantesMap[evento.id] || [];
    const costo = parseFloat(evento.costo) || 0;

    const headers = ['Nombre', 'WhatsApp', 'Edad', 'Relación', 'Costo', 'Pagado', 'Saldo', 'Estado'];

    const rows = participantes.map(p => {
      const abonos = abonosMap[p.id] || [];
      const pagado = abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
      const saldo  = costo > 0 ? costo - pagado : 0;
      return [
        p.nombre    || '',
        p.whatsapp  || '',
        p.edad      ? Number(p.edad) : '',
        p.tipo_persona === 'invitado' ? 'Invitado' : 'Familia Origen',
        costo  > 0  ? costo  : '',
        pagado > 0  ? pagado : 0,
        costo  > 0  ? saldo  : '',
        costo  > 0  ? (saldo <= 0 ? 'Liquidado' : 'Debe') : '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Anchos de columna
    ws['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 6 }, { wch: 16 },
      { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

    const slug = evento.nombre
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/, '');
    XLSX.writeFile(wb, `participantes_${slug}_${hoyStr}.xlsx`);
  };

  // ── Handler corte de caja (resumen en vivo) ─────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Próximo evento highlight */}
      {!loading && proximo && (
        <div style={{
          padding: '16px 20px', borderRadius: 14,
          background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ color: 'var(--ink)', flexShrink: 0 }}><I.calendar size={28} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Próximo evento
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{proximo.nombre}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{fmtFecha(proximo.fecha)}</div>
          </div>
          {proximo.tipo && (
            <span style={{
              fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: TIPO_BG[proximo.tipo] || 'var(--surface-3)',
              color: TIPO_COLOR[proximo.tipo] || 'var(--ink-2)',
            }}>
              {proximo.tipo}
            </span>
          )}
        </div>
      )}

      {/* Events list */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Eventos en Punto de Encuentro</h3>
            <div className="card-sub">{loading ? 'Cargando…' : `${filtered.length} eventos`}</div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { key: 'todos',    label: 'Todos' },
            { key: 'proximos', label: 'Próximos' },
            { key: 'pasados',  label: 'Pasados' },
            { key: 'especial', label: 'Especiales' },
          ].map(opt => (
            <button
              key={opt.key}
              className={`chip${filter === opt.key ? ' active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Cargando eventos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin eventos en esta categoría.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(e => {
              const iso        = toISODate(e.fecha) || '';
              const isPast     = iso < hoyStr;
              const isToday    = iso === hoyStr;
              const pList      = participantesMap[e.id] || [];
              const pCount     = pList.length;
              const isExpanded = expandedId === e.id;
              const costo      = parseFloat(e.costo) || 0;

              return (
                <div key={e.id} style={{
                  borderRadius: 10,
                  border: `1px solid ${isToday ? 'var(--border-strong)' : 'var(--border)'}`,
                  overflow: 'hidden',
                  opacity: isPast ? 0.72 : 1,
                }}>

                  {/* Fila principal */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: isToday ? 'var(--surface-2)' : (TIPO_CELL_BG[e.tipo] || 'var(--surface)'),
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ color: 'var(--muted)', flexShrink: 0 }}><I.pin size={15} /></div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{e.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, display: 'flex', gap: 10 }}>
                        <span>{fmtFechaShort(e.fecha)}</span>
                        {costo > 0 && (
                          <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Costo: {fmtMoney(costo)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isToday && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--black)', color: 'white' }}>
                          Hoy
                        </span>
                      )}
                      {e.tipo && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: TIPO_BG[e.tipo] || 'var(--surface-3)',
                          color: TIPO_COLOR[e.tipo] || 'var(--ink-2)',
                        }}>
                          {e.tipo}
                        </span>
                      )}
                      {isPast && !isToday && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Pasado</span>}
                    </div>
                  </div>

                  {/* Fila acciones */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 12px 7px 16px',
                    background: 'var(--surface)',
                    borderTop: '1px solid var(--border)',
                    gap: 8, flexWrap: 'wrap',
                  }}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'transparent', border: 'none',
                        padding: '4px 6px', borderRadius: 6,
                        fontSize: 12.5, color: 'var(--ink-2)', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <I.users size={13} />
                      <span>{pCount} participante{pCount !== 1 ? 's' : ''}</span>
                      <span style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                        <I.chevR size={11} />
                      </span>
                    </button>
                    {canWrite && (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                        onClick={() => openModal(e)}
                      >
                        <I.plus size={12} /> Registrar participante
                      </button>
                    )}
                    <button
                      className="btn"
                      style={{
                        fontSize: 12, padding: '5px 12px',
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink-2)',
                      }}
                      onClick={() => openCorteModal(e)}
                    >
                      <I.cash size={12} /> Corte
                    </button>
                    <button
                      className="btn"
                      style={{
                        fontSize: 12, padding: '5px 12px',
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--ink-2)',
                      }}
                      onClick={() => descargarExcel(e)}
                      title="Descargar Excel con participantes"
                    >
                      <I.download size={12} /> Excel
                    </button>
                  </div>

                  {/* Lista participantes (expandible) */}
                  {isExpanded && (
                    <div>
                      {pList.length === 0 ? (
                        <div style={{
                          padding: '10px 16px', fontSize: 13, color: 'var(--muted)',
                          borderTop: '1px solid var(--border)', background: 'var(--surface)',
                        }}>
                          Sin participantes registrados. Usa el botón de arriba para agregar.
                        </div>
                      ) : (
                        pList.map((p) => {
                          const pAbonos     = abonosMap[p.id] || [];
                          const totalPagado = pAbonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
                          const saldo       = costo > 0 ? costo - totalPagado : null;
                          const liquidado   = saldo !== null && saldo <= 0;
                          const pExpanded   = expandedParticipantes.has(p.id);

                          return (
                            <div key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px 9px 16px',
                                background: 'var(--white, #fff)',
                                flexWrap: 'wrap',
                              }}>
                                <div style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{p.nombre}</span>
                                  <span style={{
                                    fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, flexShrink: 0,
                                    background: p.tipo_persona === 'invitado' ? 'rgba(245,158,11,0.13)' : 'rgba(16,185,129,0.11)',
                                    color: p.tipo_persona === 'invitado' ? '#B45309' : '#047857',
                                  }}>
                                    {p.tipo_persona === 'invitado' ? 'Invitado' : 'Familia Origen'}
                                  </span>
                                  {p.whatsapp && (
                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>WA: {p.whatsapp}</span>
                                  )}
                                  {p.whatsapp && p.edad && (
                                    <span style={{ fontSize: 11, color: 'var(--border-strong)' }}>·</span>
                                  )}
                                  {p.edad && (
                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.edad} años</span>
                                  )}
                                </div>

                                {costo > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                      {fmtMoney(totalPagado)} / {fmtMoney(costo)}
                                    </span>
                                    <span style={{
                                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                      background: liquidado ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.10)',
                                      color: liquidado ? '#047857' : 'var(--danger)',
                                    }}>
                                      {liquidado ? 'Liquidado' : `Debe ${fmtMoney(saldo)}`}
                                    </span>
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  {pAbonos.length > 0 && (
                                    <button
                                      onClick={() => toggleExpandParticipante(p.id)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        background: 'transparent', border: 'none',
                                        padding: '3px 7px', borderRadius: 6,
                                        fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
                                        fontFamily: 'var(--font-ui)',
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
                                  {canWrite && (
                                    <button
                                      className="btn btn-primary"
                                      style={{ fontSize: 11, padding: '3px 9px' }}
                                      onClick={() => openAbonoModal(p, e)}
                                    >
                                      <I.plus size={11} /> Abono
                                    </button>
                                  )}
                                  {canWrite && (
                                    <button
                                      className="icon-btn"
                                      onClick={() => handleDeleteParticipante(p)}
                                      disabled={deletingId === p.id}
                                      style={{ width: 28, height: 28, color: 'var(--danger)', flexShrink: 0 }}
                                      title="Eliminar participante"
                                    >
                                      <I.trash size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {pExpanded && pAbonos.length > 0 && (
                                <div style={{
                                  padding: '6px 12px 8px 16px',
                                  borderTop: '1px dashed var(--border)',
                                  background: 'var(--surface)',
                                  display: 'flex', flexWrap: 'wrap', gap: 6,
                                }}>
                                  {pAbonos.map(a => (
                                    <div key={a.id} style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      padding: '3px 7px 3px 9px',
                                      borderRadius: 99,
                                      background: 'var(--surface-2)',
                                      border: '1px solid var(--border)',
                                      fontSize: 11.5,
                                    }}>
                                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{fmtMoney(a.monto)}</span>
                                      <span style={{ color: 'var(--muted)' }}>·</span>
                                      <span style={{ color: 'var(--ink-2)', textTransform: 'capitalize' }}>{a.metodo}</span>
                                      <span style={{ color: 'var(--muted)' }}>·</span>
                                      <span style={{ color: 'var(--muted)' }}>{fmtFechaShort(a.fecha)}</span>
                                      {a.comprobante_url && (
                                        <a
                                          href={a.comprobante_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: 'var(--chart-primary)', marginLeft: 2, lineHeight: 1 }}
                                          title="Ver comprobante"
                                        >
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
      </div>

      {/* ── Modal registrar participante ────────────────────────────────────── */}
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

              {/* ── Primer abono (opcional) ── */}
              <div style={{
                borderTop: '1px dashed var(--border)',
                paddingTop: 14,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
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

      {/* ── Modal agregar abono (abonos posteriores) ─────────────────────────── */}
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

      {/* ── Modal corte de caja ──────────────────────────────────────────────── */}
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
                  <div key={p.fecha} style={{
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '7px 14px',
                      background: 'var(--surface-2)',
                      fontWeight: 700, fontSize: 13, color: 'var(--ink)',
                    }}>
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

                {/* Gran total */}
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
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      border: '1.5px solid var(--border-strong)',
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
    </div>
  );
}
