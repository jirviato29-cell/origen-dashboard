import { useState, useEffect } from 'react';
import { calendarioApi } from '../../services/api';
import { useCalendarioModal } from '../../context/CalendarioModalContext';
import { fmtFecha, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';

const TIPOS = ['Servicio', 'Especial', 'Reunión', 'General'];

const TIPO_COLOR = {
  'Servicio': '#00B4D8',
  'Especial': '#F59E0B',
  'Reunión':  '#8B5CF6',
  'General':  '#10B981',
};

const TIPO_BG = {
  'Servicio': 'rgba(0,180,216,0.12)',
  'Especial': 'rgba(245,158,11,0.12)',
  'Reunión':  'rgba(139,92,246,0.12)',
  'General':  'rgba(16,185,129,0.12)',
};

const DIAS_HEADER = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function buildGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFromParts(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const inputStyle = {
  padding: '7px 10px', borderRadius: 8,
  border: '1.5px solid var(--border)', fontSize: 13.5,
  outline: 'none', fontFamily: 'var(--font-ui)',
  width: '100%', boxSizing: 'border-box',
};

export default function CalendarioPage() {
  const { refreshKey, openModal } = useCalendarioModal();

  const now = new Date();
  const todayISO = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [eventos,   setEventos]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [editError, setEditError] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  useEffect(() => {
    setLoading(true);
    calendarioApi.getAll({ year: viewYear })
      .then(r => setEventos(r.data))
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, [viewYear, refreshKey]);

  const grid = buildGrid(viewYear, viewMonth);

  const eventsByDate = {};
  eventos.forEach(e => {
    const iso = toISODate(e.fecha);
    if (iso) {
      if (!eventsByDate[iso]) eventsByDate[iso] = [];
      eventsByDate[iso].push(e);
    }
  });

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];
  const allSorted = [...eventos].sort((a, b) => toISODate(a.fecha).localeCompare(toISODate(b.fecha)));

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await calendarioApi.remove(id);
      setEventos(prev => prev.filter(e => e.id !== id));
      if (editingId === id) setEditingId(null);
    } catch {
      // noop
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setEditForm({ fecha: toISODate(ev.fecha), nombre: ev.nombre, tipo: ev.tipo, nota: ev.nota || '' });
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editForm.fecha || !editForm.nombre.trim() || !editForm.tipo) {
      setEditError('Completa todos los campos requeridos.'); return;
    }
    setSaving(true);
    try {
      const { data } = await calendarioApi.update(editingId, {
        fecha:  editForm.fecha,
        nombre: editForm.nombre.trim(),
        tipo:   editForm.tipo,
        nota:   editForm.nota.trim() || null,
      });
      setEventos(prev => prev.map(e => e.id === editingId ? data : e));
      setEditingId(null);
    } catch {
      setEditError('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── CALENDARIO MENSUAL ──────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px 20px 16px' }}>

        {/* Navegación de mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button className="icon-btn" onClick={prevMonth} aria-label="Mes anterior">
            <I.back size={16} />
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            {monthLabel}
          </h2>
          <button className="icon-btn" onClick={nextMonth} aria-label="Mes siguiente"
            style={{ transform: 'scaleX(-1)' }}>
            <I.back size={16} />
          </button>
        </div>

        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DIAS_HEADER.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 700,
              color: 'var(--muted)', textTransform: 'uppercase', padding: '4px 0',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Cuadrícula */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {grid.map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = isoFromParts(viewYear, viewMonth, day);
            const dayEvts = eventsByDate[iso] || [];
            const isToday    = iso === todayISO;
            const isSelected = iso === selectedDay;

            return (
              <button key={i} onClick={() => setSelectedDay(isSelected ? null : iso)}
                style={{
                  position: 'relative',
                  padding: '6px 2px 8px',
                  borderRadius: 8,
                  border: isSelected
                    ? '2px solid var(--chart-primary)'
                    : '2px solid transparent',
                  background: isSelected
                    ? 'rgba(0,180,216,0.09)'
                    : isToday
                      ? 'rgba(0,180,216,0.05)'
                      : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  minHeight: 52,
                }}>
                <span style={{
                  fontSize: 13, fontWeight: isToday ? 800 : 500, lineHeight: 1,
                  color: isToday ? 'var(--chart-primary)' : 'var(--ink)',
                }}>
                  {day}
                </span>
                {dayEvts.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {dayEvts.slice(0, 3).map((ev, ei) => (
                      <span key={ei} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: TIPO_COLOR[ev.tipo] || '#888',
                        flexShrink: 0,
                      }} />
                    ))}
                    {dayEvts.length > 3 && (
                      <span style={{ fontSize: 9, color: 'var(--muted)', lineHeight: '6px' }}>
                        +{dayEvts.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda de tipos */}
        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap',
          marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
        }}>
          {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
            <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{tipo}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DÍA SELECCIONADO ────────────────────────────────────────────────── */}
      {selectedDay && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              {fmtFecha(selectedDay)}
            </h3>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12.5, padding: '6px 12px' }}
              onClick={() => openModal(selectedDay)}
            >
              <I.plus size={13} /> Añadir evento
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
              Sin eventos este día.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDayEvents.map(ev => (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: TIPO_BG[ev.tipo] || 'var(--surface)',
                  border: `1px solid ${TIPO_COLOR[ev.tipo] || 'var(--border)'}30`,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: TIPO_COLOR[ev.tipo] || '#888', flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {ev.nombre}
                    </div>
                    {ev.nota && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {ev.nota}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11.5, color: TIPO_COLOR[ev.tipo] || 'var(--muted)',
                    fontWeight: 600, flexShrink: 0,
                  }}>
                    {ev.tipo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LISTA DE EVENTOS ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px 20px 16px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
          Todos los eventos
        </h2>

        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Cargando…</p>
        ) : allSorted.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Sin eventos registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  {['Fecha', 'Nombre', 'Tipo', 'Nota', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 11.5, fontWeight: 700,
                      color: 'var(--muted)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '8px 12px',
                      borderBottom: '1.5px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allSorted.map(ev => (
                  editingId === ev.id ? (
                    <tr key={ev.id} style={{ background: 'var(--surface-2)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="date" value={editForm.fecha}
                          onChange={e => setEditForm(f => ({ ...f, fecha: e.target.value }))}
                          style={inputStyle} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="text" value={editForm.nombre}
                          onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                          style={inputStyle} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select value={editForm.tipo}
                          onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                          style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}>
                          {TIPOS.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="text" value={editForm.nota}
                          onChange={e => setEditForm(f => ({ ...f, nota: e.target.value }))}
                          style={inputStyle} placeholder="(sin nota)" />
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {editError && (
                          <span style={{ fontSize: 11.5, color: 'var(--danger)', marginRight: 8 }}>
                            {editError}
                          </span>
                        )}
                        <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}
                          style={{ fontSize: 12, padding: '5px 10px', marginRight: 6 }}>
                          {saving ? '…' : 'Guardar'}
                        </button>
                        <button className="icon-btn" onClick={() => setEditingId(null)}
                          style={{ width: 28, height: 28 }}>
                          <I.x size={14} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                        {fmtFecha(ev.fecha)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                        {ev.nombre}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                          background: TIPO_BG[ev.tipo] || 'var(--surface)',
                          color: TIPO_COLOR[ev.tipo] || 'var(--ink)',
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: TIPO_COLOR[ev.tipo] || '#888',
                          }} />
                          {ev.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--muted)', maxWidth: 220 }}>
                        {ev.nota || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <button className="icon-btn" onClick={() => startEdit(ev)}
                          style={{ width: 28, height: 28, marginRight: 4 }} title="Editar">
                          <I.edit size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => handleDelete(ev.id)}
                          disabled={deleting === ev.id}
                          style={{ width: 28, height: 28, color: 'var(--danger)' }} title="Eliminar">
                          <I.trash size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
