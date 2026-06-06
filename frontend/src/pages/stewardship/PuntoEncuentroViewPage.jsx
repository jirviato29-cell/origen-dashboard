import { useState, useEffect, useRef } from 'react';
import { calendarioApi, participantesApi, abonosApi, comprobanteApi } from '../../services/api';
import { fmtFecha, fmtFechaShort, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';

const TIPO_COLOR = {
  'Servicio dominical': '#B5860D',
  'Especial':           '#F59E0B',
  'Reunión de hombres': '#1E3A8A',
  'Reunión de mujeres': '#7C3AED',
  'Alpha':              '#DC2626',
};
const TIPO_BG = {
  'Servicio dominical': 'rgba(181,134,13,0.12)',
  'Especial':           'rgba(245,158,11,0.12)',
  'Reunión de hombres': 'rgba(30,58,138,0.10)',
  'Reunión de mujeres': 'rgba(124,58,237,0.10)',
  'Alpha':              'rgba(220,38,38,0.10)',
};

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
      if (abonoModalOpen) setAbonoModalOpen(false);
      else if (modalOpen) setModalOpen(false);
    };
    if (modalOpen || abonoModalOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen, abonoModalOpen]);

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

  const proximos           = sorted.filter(e => (toISODate(e.fecha) || '') >= hoyStr).length;
  const totalParticipantes = Object.values(participantesMap).reduce((s, arr) => s + arr.length, 0);
  const proximo            = sorted
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total de eventos',   value: loading ? '…' : eventos.length,     sub: 'En Punto de Encuentro',  color: 'var(--ink)' },
          { label: 'Próximos eventos',    value: loading ? '…' : proximos,           sub: 'Próximamente',           color: 'var(--chart-primary)' },
          { label: 'Total participantes', value: loading ? '…' : totalParticipantes, sub: 'Registrados',            color: 'var(--success, #10B981)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

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
                    background: isToday ? 'var(--surface-2)' : 'var(--surface)',
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
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => openModal(e)}
                    >
                      <I.plus size={12} /> Registrar participante
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
                                <div style={{ flex: 1, minWidth: 140 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{p.nombre}</span>
                                    <span style={{
                                      fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                                      background: p.tipo_persona === 'invitado' ? 'rgba(245,158,11,0.13)' : 'rgba(16,185,129,0.11)',
                                      color: p.tipo_persona === 'invitado' ? '#B45309' : '#047857',
                                    }}>
                                      {p.tipo_persona === 'invitado' ? 'Invitado' : 'Familia Origen'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                                    {p.whatsapp && <span>WA: {p.whatsapp}</span>}
                                    {p.edad && <span>{p.edad} años</span>}
                                  </div>
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
                                  <button
                                    className="btn btn-primary"
                                    style={{ fontSize: 11, padding: '3px 9px' }}
                                    onClick={() => openAbonoModal(p, e)}
                                  >
                                    <I.plus size={11} /> Abono
                                  </button>
                                  <button
                                    className="icon-btn"
                                    onClick={() => handleDeleteParticipante(p)}
                                    disabled={deletingId === p.id}
                                    style={{ width: 28, height: 28, color: 'var(--danger)', flexShrink: 0 }}
                                    title="Eliminar participante"
                                  >
                                    <I.trash size={13} />
                                  </button>
                                </div>
                              </div>

                              {pExpanded && pAbonos.length > 0 && (
                                <div style={{ background: 'var(--surface)' }}>
                                  {pAbonos.map(a => (
                                    <div key={a.id} style={{
                                      display: 'flex', alignItems: 'center', gap: 10,
                                      padding: '6px 16px 6px 32px',
                                      borderTop: '1px dashed var(--border)',
                                      flexWrap: 'wrap',
                                    }}>
                                      <div style={{ flex: 1, minWidth: 120 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{fmtMoney(a.monto)}</span>
                                        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8, textTransform: 'capitalize' }}>{a.metodo}</span>
                                        {a.num_transaccion && (
                                          <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8 }}>#{a.num_transaccion}</span>
                                        )}
                                        {a.comprobante_url && (
                                          <a
                                            href={a.comprobante_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: 11.5, color: 'var(--chart-primary)', marginLeft: 8 }}
                                          >
                                            Comprobante
                                          </a>
                                        )}
                                      </div>
                                      <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>{fmtFechaShort(a.fecha)}</span>
                                      <button
                                        className="icon-btn"
                                        onClick={() => handleDeleteAbono(a)}
                                        disabled={deletingAbonoId === a.id}
                                        style={{ width: 24, height: 24, color: 'var(--danger)', flexShrink: 0 }}
                                        title="Eliminar abono"
                                      >
                                        <I.trash size={12} />
                                      </button>
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
    </div>
  );
}
