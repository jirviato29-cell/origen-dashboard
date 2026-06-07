import { useState, useEffect } from 'react';
import { calendarioApi, serviciosDominicalesApi } from '../../services/api';
import { useCalendarioModal } from '../../context/CalendarioModalContext';
import { fmtFecha, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';
import { TIPO_COLOR, TIPO_BG, TIPO_CELL_BG } from '../../utils/tipoEventoColors';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';

// Prioridad para pintar la celda (de mayor a menor)
const TIPO_PRIORIDAD = ['Alpha', 'Reunión de mujeres', 'Reunión de hombres', 'Especial', 'Servicio dominical'];

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

function isDomingo(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

export default function CalendarioPage() {
  const { permisos } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'calendario');
  const { refreshKey, openModal, openEditModal } = useCalendarioModal();

  const now = new Date();
  const todayISO = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [eventos,   setEventos]   = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const [predicaInput,  setPredicaInput]  = useState('');
  const [savingPredica, setSavingPredica] = useState(false);
  const [deleting,      setDeleting]      = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      calendarioApi.getAll({ year: viewYear }),
      serviciosDominicalesApi.getAll({ year: viewYear }),
    ])
      .then(([evRes, servRes]) => {
        setEventos(evRes.data);
        setServicios(servRes.data);
      })
      .catch(() => { setEventos([]); setServicios([]); })
      .finally(() => setLoading(false));
  }, [viewYear, refreshKey]);

  // Inicializa el campo "predica" al seleccionar un domingo
  useEffect(() => {
    if (selectedDay) {
      const found = servicios.find(s => (s.fecha || '').slice(0, 10) === selectedDay);
      setPredicaInput(found?.predica || '');
    } else {
      setPredicaInput('');
    }
    // servicios omitido intencionalmente: solo inicializar al cambiar día
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const grid = buildGrid(viewYear, viewMonth);

  const eventsByDate = {};
  eventos.forEach(e => {
    const iso = toISODate(e.fecha);
    if (iso) {
      if (!eventsByDate[iso]) eventsByDate[iso] = [];
      eventsByDate[iso].push(e);
    }
  });

  const serviciosByDate = {};
  servicios.forEach(s => {
    const iso = (s.fecha || '').slice(0, 10);
    if (iso) serviciosByDate[iso] = s;
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
    } catch {
      // noop
    } finally {
      setDeleting(null);
    }
  };

  const handleSavePredica = async () => {
    if (!selectedDay) return;
    setSavingPredica(true);
    try {
      const { data } = await serviciosDominicalesApi.upsert({
        fecha:   selectedDay,
        predica: predicaInput.trim() || null,
      });
      setServicios(prev => {
        const exists = prev.some(s => (s.fecha || '').slice(0, 10) === selectedDay);
        if (exists) return prev.map(s => (s.fecha || '').slice(0, 10) === selectedDay ? data : s);
        return [...prev, data];
      });
    } catch {
      // noop
    } finally {
      setSavingPredica(false);
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

        {/* Cuadrícula */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed',
            minWidth: 480,
          }}>
            <thead>
              <tr>
                {DIAS_HEADER.map(d => (
                  <th key={d} style={{
                    border: '1px solid var(--border)',
                    padding: '7px 4px',
                    textAlign: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    background: 'var(--surface)',
                    letterSpacing: '0.04em',
                  }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = [];
                for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
                return rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((day, ci) => {
                      const iso     = day ? isoFromParts(viewYear, viewMonth, day) : null;
                      const dayEvts = iso ? (eventsByDate[iso] || []) : [];
                      const esDomingo  = iso ? isDomingo(iso) : false;
                      const isToday    = iso === todayISO;
                      const isSelected = iso === selectedDay;
                      const tiposEnCelda = new Set(dayEvts.map(ev => ev.tipo));
                      if (esDomingo) tiposEnCelda.add('Servicio dominical');
                      const tipoPrioritario = TIPO_PRIORIDAD.find(t => tiposEnCelda.has(t));

                      return (
                        <td key={ci}
                          onClick={day ? () => setSelectedDay(isSelected ? null : iso) : undefined}
                          style={{
                            border: '1px solid var(--border)',
                            verticalAlign: 'top',
                            padding: '8px 8px 6px',
                            minHeight: 110,
                            height: 'auto',
                            cursor: day ? 'pointer' : 'default',
                            background: isSelected
                              ? 'rgba(0,180,216,0.08)'
                              : !day
                                ? 'var(--surface)'
                                : tipoPrioritario
                                  ? TIPO_CELL_BG[tipoPrioritario]
                                  : 'var(--white, #fff)',
                            boxShadow: isSelected
                              ? 'inset 0 0 0 2px var(--chart-primary)'
                              : 'none',
                          }}
                        >
                          {day && (
                            <>
                              <div style={{ marginBottom: 4 }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  width: 22, height: 22, borderRadius: '50%',
                                  background: isToday ? 'var(--chart-primary)' : 'transparent',
                                  color: isToday ? '#fff' : 'var(--ink)',
                                  fontSize: 12, fontWeight: isToday ? 700 : 500,
                                  lineHeight: 1,
                                }}>
                                  {day}
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Domingo automático */}
                                {esDomingo && (
                                  <span style={{
                                    display: 'block',
                                    fontSize: 10, fontWeight: 600, lineHeight: 1.4,
                                    color: TIPO_COLOR['Servicio dominical'],
                                    background: TIPO_BG['Servicio dominical'],
                                    borderRadius: 3,
                                    padding: '2px 5px',
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                  }}>
                                    {serviciosByDate[iso]?.predica
                                      ? `Servicio dominical — ${serviciosByDate[iso].predica}`
                                      : 'Servicio dominical'}
                                  </span>
                                )}
                                {/* Eventos manuales */}
                                {dayEvts.map((ev, ei) => (
                                  <span key={ei} style={{
                                    display: 'block',
                                    fontSize: 10, fontWeight: 600, lineHeight: 1.4,
                                    color: TIPO_COLOR[ev.tipo] || '#888',
                                    background: TIPO_BG[ev.tipo] || 'transparent',
                                    borderRadius: 3,
                                    padding: '2px 5px',
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                  }}>
                                    {ev.nombre}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
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
            {canWrite && (
              <button
                className="btn btn-primary"
                style={{ fontSize: 12.5, padding: '6px 12px' }}
                onClick={() => openModal(selectedDay)}
              >
                <I.plus size={13} /> Añadir evento
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Servicio dominical — solo domingos */}
            {isDomingo(selectedDay) && (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: TIPO_BG['Servicio dominical'],
                border: `1px solid ${TIPO_COLOR['Servicio dominical']}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: TIPO_COLOR['Servicio dominical'], flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    Servicio dominical
                  </div>
                  <span style={{ fontSize: 11.5, color: TIPO_COLOR['Servicio dominical'], fontWeight: 600, flexShrink: 0 }}>
                    Servicio dominical
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, paddingLeft: 16 }}>
                  <input
                    type="text"
                    placeholder="¿Quién predica? (ej. Ps. Humberto)"
                    value={predicaInput}
                    onChange={e => setPredicaInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSavePredica(); }}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 7,
                      border: '1.5px solid var(--border)', fontSize: 13,
                      outline: 'none', fontFamily: 'var(--font-ui)',
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                    onClick={handleSavePredica}
                    disabled={savingPredica}
                  >
                    {savingPredica ? '…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* Eventos manuales */}
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
                <button className="icon-btn" onClick={() => openEditModal(ev)}
                  style={{ width: 28, height: 28, flexShrink: 0 }} title="Editar">
                  <I.edit size={14} />
                </button>
              </div>
            ))}

            {/* "Sin eventos" solo si no es domingo y no hay eventos manuales */}
            {selectedDayEvents.length === 0 && !isDomingo(selectedDay) && (
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
                Sin eventos este día.
              </p>
            )}
          </div>
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
                      {canWrite && (
                        <>
                          <button className="icon-btn" onClick={() => openEditModal(ev)}
                            style={{ width: 28, height: 28, marginRight: 4 }} title="Editar">
                            <I.edit size={14} />
                          </button>
                          <button className="icon-btn" onClick={() => handleDelete(ev.id)}
                            disabled={deleting === ev.id}
                            style={{ width: 28, height: 28, color: 'var(--danger)' }} title="Eliminar">
                            <I.trash size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
