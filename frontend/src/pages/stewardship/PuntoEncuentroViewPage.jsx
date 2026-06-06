import { useState, useEffect } from 'react';
import { calendarioApi, participantesApi } from '../../services/api';
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

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
};

export default function PuntoEncuentroViewPage() {
  const [filter,  setFilter]  = useState('todos');
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  // participantesMap: { [eventoId]: participante[] }
  const [participantesMap, setParticipantesMap] = useState({});
  const [expandedId,       setExpandedId]       = useState(null);
  const [deletingId,       setDeletingId]       = useState(null);

  // Modal
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalEvento, setModalEvento] = useState(null);
  const [form,        setForm]        = useState({ nombre: '', whatsapp: '', edad: '' });
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      calendarioApi.getAll({ en_punto_encuentro: true }),
      participantesApi.getAll(),
    ])
      .then(([evRes, partRes]) => {
        setEventos(evRes.data);
        const map = {};
        partRes.data.forEach(p => {
          if (!map[p.evento_id]) map[p.evento_id] = [];
          map[p.evento_id].push(p);
        });
        setParticipantesMap(map);
      })
      .catch(() => { setEventos([]); setParticipantesMap({}); })
      .finally(() => setLoading(false));
  }, []);

  // Escape para cerrar modal
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModalOpen(false); };
    if (modalOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen]);

  // ── Datos derivados ───────────────────────────────────────────────────────
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

  const proximos          = sorted.filter(e => (toISODate(e.fecha) || '') >= hoyStr).length;
  const totalParticipantes = Object.values(participantesMap).reduce((s, arr) => s + arr.length, 0);
  const proximo           = sorted
    .filter(e => (toISODate(e.fecha) || '') >= hoyStr)
    .sort((a, b) => (toISODate(a.fecha) || '').localeCompare(toISODate(b.fecha) || ''))[0];

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openModal = (evento) => {
    setModalEvento(evento);
    setForm({ nombre: '', whatsapp: '', edad: '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const { data } = await participantesApi.create({
        evento_id: modalEvento.id,
        nombre:    form.nombre,
        whatsapp:  form.whatsapp,
        edad:      form.edad,
      });
      setParticipantesMap(prev => ({
        ...prev,
        [modalEvento.id]: [...(prev[modalEvento.id] || []), data],
      }));
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
    } catch {
      // noop
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total de eventos',      value: loading ? '…' : eventos.length,       sub: 'En Punto de Encuentro', color: 'var(--ink)' },
          { label: 'Próximos eventos',       value: loading ? '…' : proximos,             sub: 'Próximamente',          color: 'var(--chart-primary)' },
          { label: 'Total participantes',    value: loading ? '…' : totalParticipantes,   sub: 'Registrados',           color: 'var(--success, #10B981)' },
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
            <div className="card-sub">
              {loading ? 'Cargando…' : `${filtered.length} eventos`}
            </div>
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

              return (
                <div key={e.id} style={{
                  borderRadius: 10,
                  border: `1px solid ${isToday ? 'var(--border-strong)' : 'var(--border)'}`,
                  overflow: 'hidden',
                  opacity: isPast ? 0.72 : 1,
                }}>

                  {/* Fila principal: nombre + fecha + badges */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: isToday ? 'var(--surface-2)' : 'var(--surface)',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ color: 'var(--muted)', flexShrink: 0 }}>
                      <I.pin size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{e.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{fmtFechaShort(e.fecha)}</div>
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
                      {isPast && !isToday && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Pasado</span>
                      )}
                    </div>
                  </div>

                  {/* Fila de acciones: contar participantes + botón registrar */}
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
                      <span style={{
                        display: 'inline-flex',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s',
                      }}>
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

                  {/* Lista de participantes (expandible) */}
                  {isExpanded && (
                    <div>
                      {pList.length === 0 ? (
                        <div style={{
                          padding: '10px 16px', fontSize: 13, color: 'var(--muted)',
                          borderTop: '1px solid var(--border)',
                          background: 'var(--surface)',
                        }}>
                          Sin participantes registrados. Usa el botón de arriba para agregar.
                        </div>
                      ) : (
                        pList.map((p, idx) => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '9px 16px',
                            borderTop: '1px solid var(--border)',
                            background: idx % 2 === 0 ? 'var(--white, #fff)' : 'var(--surface)',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>
                                {p.nombre}
                              </span>
                              {p.whatsapp && (
                                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 12 }}>
                                  WA: {p.whatsapp}
                                </span>
                              )}
                              {p.edad && (
                                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 12 }}>
                                  {p.edad} años
                                </span>
                              )}
                            </div>
                            <button
                              className="icon-btn"
                              onClick={() => handleDeleteParticipante(p)}
                              disabled={deletingId === p.id}
                              style={{ width: 28, height: 28, color: 'var(--danger)', flexShrink: 0 }}
                              title="Eliminar participante"
                            >
                              <I.trash size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal registrar participante ─────────────────────────────────── */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />

            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Punto de Encuentro</div>
                <h3 className="anf-modal-date">Registrar participante</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  {modalEvento?.nombre}
                </p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setModalOpen(false)}
                style={{ width: 34, height: 34, flexShrink: 0 }}
              >
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Nombre */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Nombre
                  <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 4 }}>*</span>
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
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  WhatsApp
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
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
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Edad
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>
                <input
                  type="number"
                  placeholder="ej. 25"
                  min="1"
                  max="120"
                  value={form.edad}
                  onChange={e => setForm(f => ({ ...f, edad: e.target.value }))}
                  style={inputStyle}
                />
              </div>

            </div>

            {formError && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>
                {formError}
              </p>
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
    </div>
  );
}
