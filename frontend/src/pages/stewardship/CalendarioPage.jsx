import { useState, useEffect } from 'react';
import { calendarioApi, serviciosDominicalesApi } from '../../services/api';
import { useCalendarioModal } from '../../context/CalendarioModalContext';
import { fmtFecha, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';
import { TIPO_COLOR, TIPO_COLOR_DARK, TIPO_BG, TIPO_CELL_BG } from '../../utils/tipoEventoColors';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';
import { useIsMobile } from '../../utils/useIsMobile';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY     = '#112540';
const NAVY_700 = '#244169';
const NAVY_100 = '#DCE4EF';
const ORANGE   = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50  = '#FFF4EE';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';

// ── Helpers ────────────────────────────────────────────────────────────────
const TIPO_PRIORIDAD = ['Alpha', 'Reunión de mujeres', 'Reunión de hombres', 'Especial', 'Servicio dominical'];
const DIAS_HEADER    = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES       = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function buildGrid(year, month) {
  const firstDow   = new Date(year, month, 1).getDay();
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

function getSundayOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Event pill (used in grid + week view)
function EvPill({ nombre, tipo, dimmed }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, lineHeight: 1.2,
      display: 'flex', alignItems: 'center', gap: 4,
      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      background: dimmed ? GRAY_100 : (TIPO_BG[tipo] || GRAY_100),
      color:      dimmed ? GRAY_500 : (TIPO_COLOR_DARK[tipo] || GRAY_700),
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: dimmed ? GRAY_300 : (TIPO_COLOR[tipo] || GRAY_500) }} />
      {nombre}
    </span>
  );
}

// Type pill for table
function TipoPill({ tipo }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
      background: TIPO_BG[tipo] || GRAY_100, color: TIPO_COLOR[tipo] || GRAY_700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: TIPO_COLOR[tipo] || GRAY_500 }} />
      {tipo}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const { permisos } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'calendario');
  const isMobile = useIsMobile();
  const { refreshKey, openModal, openEditModal } = useCalendarioModal();

  const now      = new Date();
  const todayISO = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate());

  // ── State ────────────────────────────────────────────────────────────────
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [eventos,   setEventos]   = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const [predicaInput,  setPredicaInput]  = useState('');
  const [savingPredica, setSavingPredica] = useState(false);
  const [deleting,         setDeleting]         = useState(null);
  const [deletingServicio, setDeletingServicio] = useState(null);

  // View mode: 'mes' | 'semana' | 'lista'
  const [viewMode,   setViewMode]   = useState('mes');
  const [weekStart,  setWeekStart]  = useState(() => getSundayOfWeek(new Date()));

  // ── Data loading — PRESERVED EXACTLY ─────────────────────────────────────
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

  useEffect(() => {
    if (selectedDay) {
      const found = servicios.find(s => (s.fecha || '').slice(0, 10) === selectedDay);
      setPredicaInput(found?.predica || '');
    } else {
      setPredicaInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const grid = buildGrid(viewYear, viewMonth);

  const eventsByDate = {};
  eventos.forEach(e => {
    const iso = toISODate(e.fecha);
    if (iso) { if (!eventsByDate[iso]) eventsByDate[iso] = []; eventsByDate[iso].push(e); }
  });

  const serviciosByDate = {};
  servicios.forEach(s => {
    const iso = (s.fecha || '').slice(0, 10);
    if (iso) serviciosByDate[iso] = s;
  });

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  // Week label
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} de ${MESES_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${weekStart.getDate()} de ${MESES_ES[weekStart.getMonth()]} – ${weekEnd.getDate()} de ${MESES_ES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  const periodLabel = viewMode === 'semana' ? weekLabel : monthLabel;

  // ── Navigation — PRESERVED EXACTLY ───────────────────────────────────────
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
  const prevWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d; });

  const handlePrev = () => { if (viewMode === 'semana') prevWeek(); else prevMonth(); };
  const handleNext = () => { if (viewMode === 'semana') nextWeek(); else nextMonth(); };

  // ── KPI calculations ──────────────────────────────────────────────────────
  const mesEventos = eventos.filter(e => {
    const iso = toISODate(e.fecha);
    if (!iso) return false;
    const [y, m] = iso.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth;
  });

  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let dominicalesCount = 0;
  for (let d = 1; d <= daysInViewMonth; d++) {
    if (new Date(viewYear, viewMonth, d).getDay() === 0) dominicalesCount++;
  }
  const alphaCount    = mesEventos.filter(e => e.tipo === 'Alpha').length;
  const especialCount = mesEventos.filter(e => e.tipo === 'Especial').length;
  const totalEventos  = mesEventos.length + dominicalesCount;

  // ── Handlers — PRESERVED EXACTLY ─────────────────────────────────────────
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await calendarioApi.remove(id);
      setEventos(prev => prev.filter(e => e.id !== id));
    } catch { } finally { setDeleting(null); }
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
    } catch { } finally { setSavingPredica(false); }
  };

  const handleDeleteServicio = async (row) => {
    const ok = window.confirm(
      `¿Eliminar la prédica registrada para el ${fmtFecha(row.fecha)}?\n\nEsto borra solo la prédica de ese domingo, no el domingo del calendario.`
    );
    if (!ok) return;
    setDeletingServicio(row.id);
    try {
      await serviciosDominicalesApi.remove(row.id);
      setServicios(prev => prev.filter(s => s.id !== row.id));
    } catch { } finally { setDeletingServicio(null); }
  };

  // ── Mobile list — PRESERVED EXACTLY ──────────────────────────────────────
  const diasSem = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthListItems = (() => {
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const items = [];
    for (let d = 1; d <= total; d++) {
      const iso     = isoFromParts(viewYear, viewMonth, d);
      const dow     = new Date(viewYear, viewMonth, d).getDay();
      const dayAbbr = diasSem[dow];
      if (isDomingo(iso)) {
        const predica = serviciosByDate[iso]?.predica;
        items.push({
          iso, day: d, dayAbbr, tipo: 'Servicio dominical',
          name: predica ? `Servicio dominical — ${predica}` : 'Servicio dominical',
          nota: null,
        });
      }
      (eventsByDate[iso] || []).forEach(ev => {
        items.push({ iso, day: d, dayAbbr, tipo: ev.tipo, name: ev.nombre, nota: ev.nota || null });
      });
    }
    return items;
  })();

  // ── Table rows: eventos + servicios_dominicales combinados ───────────────
  const tableRows = [
    ...eventos.map(ev => ({ ...ev, _isServicio: false })),
    ...servicios
      .filter(s => s.id)
      .map(s => ({
        _isServicio: true,
        id:     s.id,
        fecha:  (s.fecha || '').slice(0, 10),
        nombre: s.predica ? `Servicio — ${s.predica}` : 'Servicio dominical',
        tipo:   'Servicio dominical',
        nota:   s.nota || null,
      })),
  ].sort((a, b) => toISODate(a.fecha).localeCompare(toISODate(b.fecha)));

  // ── View style helpers ────────────────────────────────────────────────────
  const viewTabStyle = (active) => ({
    fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 7, border: 0,
    background: active ? 'white' : 'transparent',
    color: active ? NAVY : GRAY_500,
    cursor: 'pointer', fontFamily: 'var(--font-ui)',
    boxShadow: active ? '0 1px 2px rgba(11,26,47,.06)' : 'none',
    transition: '.12s',
  });

  const calArrow = {
    width: 36, height: 36, borderRadius: 9, border: `1px solid ${GRAY_200}`,
    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: NAVY_700, cursor: 'pointer',
  };

  const miniBtn = {
    width: 30, height: 30, borderRadius: 7, border: `1px solid ${GRAY_200}`,
    background: 'white', color: GRAY_500,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', marginLeft: 5,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 14 }}>

          <div style={{ background: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 7 }}>
                  Eventos este mes
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>{monthLabel}</div>}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {totalEventos}
              </div>
            </div>
            {!isMobile && <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 4 }}>{monthLabel}</div>}
          </div>

          <div style={{ background: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 7 }}>
                  Servicios dominicales
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>cada domingo</div>}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {dominicalesCount}
              </div>
            </div>
            {!isMobile && <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 4 }}>cada domingo</div>}
          </div>

          <div style={{ background: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 7 }}>
                  Grupos en Casa · Alpha
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>eventos Alpha este mes</div>}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {alphaCount}
              </div>
            </div>
            {!isMobile && <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 4 }}>eventos Alpha este mes</div>}
          </div>

          <div style={{ background: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 7 }}>
                  Eventos especiales
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>tipo Especial este mes</div>}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {especialCount}
              </div>
            </div>
            {!isMobile && <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 4 }}>tipo Especial este mes</div>}
          </div>

        </div>
      )}

      {/* ── Calendar card ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px 20px 16px' }}>

        {/* cal-head */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>

          {/* Left: nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={calArrow} onClick={handlePrev} aria-label="Anterior">
              <I.back size={15} />
            </button>
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', color: NAVY, minWidth: 180, textAlign: 'center' }}>
              {periodLabel}
            </span>
            <button style={{ ...calArrow, transform: 'scaleX(-1)' }} onClick={handleNext} aria-label="Siguiente">
              <I.back size={15} />
            </button>
          </div>

          {/* Right: view toggle + registrar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Mes / Semana / Lista toggle */}
            <div style={{ display: 'flex', gap: 6, background: GRAY_100, padding: 3, borderRadius: 9 }}>
              {[
                { key: 'mes',    label: 'Mes'    },
                { key: 'semana', label: 'Semana' },
                { key: 'lista',  label: 'Lista'  },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setViewMode(key)} style={viewTabStyle(viewMode === key)}>
                  {label}
                </button>
              ))}
            </div>

            {canWrite && (
              <button className="btn btn-primary" onClick={() => openModal(selectedDay || todayISO)}>
                <I.plus size={14} /> Registrar evento
              </button>
            )}
          </div>
        </div>

        {/* ── Vista MES ──────────────────────────────────────────────────── */}
        {viewMode === 'mes' && (
          isMobile ? (
            /* Móvil: lista — PRESERVED EXACTLY */
            monthListItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
                Sin eventos este mes.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {monthListItems.map((item, idx) => {
                  const isSel = selectedDay === item.iso;
                  return (
                    <button key={idx} onClick={() => setSelectedDay(isSel ? null : item.iso)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 12px', borderRadius: 10, width: '100%',
                      background: isSel ? 'rgba(0,180,216,0.08)' : (TIPO_CELL_BG[item.tipo] || 'var(--surface)'),
                      border: `1px solid ${isSel ? 'var(--chart-primary)' : 'var(--border)'}`,
                      cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                    }}>
                      <div style={{ width: 40, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: isSel ? 'var(--chart-primary)' : 'var(--ink)' }}>{item.day}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{item.dayAbbr}</div>
                      </div>
                      <div style={{ width: 3, alignSelf: 'stretch', minHeight: 34, borderRadius: 99, background: TIPO_COLOR[item.tipo] || '#888', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.name}</div>
                        {item.nota && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.nota}</div>}
                        <span style={{
                          display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                          background: TIPO_BG[item.tipo] || 'var(--surface-3)', color: TIPO_COLOR[item.tipo] || 'var(--ink-2)',
                        }}>{item.tipo}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            /* Desktop: cuadrícula mensual — un solo grid para alineación perfecta */
            <div style={{ border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {/* DOW header — primeros 7 hijos del mismo grid */}
                {DIAS_HEADER.map((d, i) => (
                  <div key={`h${i}`} style={{
                    padding: '10px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: GRAY_500, background: GRAY_50,
                    borderRight: i < 6 ? `1px solid ${GRAY_300}` : 'none',
                    borderBottom: `1px solid ${GRAY_300}`,
                  }}>{d}</div>
                ))}
                {/* Celdas del mes */}
                {grid.map((day, ci) => {
                  const iso             = day ? isoFromParts(viewYear, viewMonth, day) : null;
                  const dayEvts         = iso ? (eventsByDate[iso] || []) : [];
                  const esDomingo       = iso ? isDomingo(iso) : false;
                  const isToday         = iso === todayISO;
                  const isSelected      = iso !== null && iso === selectedDay;
                  const isPast          = iso !== null && iso <= todayISO;
                  const tiposEnCelda    = new Set(dayEvts.map(ev => ev.tipo));
                  if (esDomingo) tiposEnCelda.add('Servicio dominical');
                  const tipoPrioritario = TIPO_PRIORIDAD.find(t => tiposEnCelda.has(t));

                  let cellBg;
                  if (isSelected) {
                    cellBg = isPast ? `${GRAY_300}40` : `${ORANGE}10`;
                  } else if (!day) {
                    cellBg = 'white';
                  } else if (isPast) {
                    cellBg = GRAY_100;
                  } else if (tipoPrioritario) {
                    cellBg = TIPO_CELL_BG[tipoPrioritario];
                  } else {
                    cellBg = 'white';
                  }

                  return (
                    <div key={ci}
                      onClick={day ? () => setSelectedDay(isSelected ? null : iso) : undefined}
                      style={{
                        minHeight: 46,
                        borderRight: (ci + 1) % 7 !== 0 ? `1px solid ${GRAY_300}` : 'none',
                        borderBottom: `1px solid ${GRAY_300}`,
                        padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 2,
                        cursor: day ? 'pointer' : 'default',
                        background: cellBg,
                        boxShadow: isSelected ? `inset 0 0 0 2px ${isPast ? GRAY_300 : ORANGE}` : 'none',
                        position: 'relative',
                      }}
                    >
                      {day && (
                        <>
                          <div style={{ marginBottom: 1 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22, borderRadius: 6, fontSize: 11.5, fontWeight: 700, lineHeight: 1,
                              background: isToday ? ORANGE : 'transparent',
                              color: isToday ? 'white' : isPast ? GRAY_500 : esDomingo ? ORANGE_600 : NAVY_700,
                            }}>
                              {day}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {esDomingo && (
                              <EvPill
                                nombre={serviciosByDate[iso]?.predica ? `Servicio — ${serviciosByDate[iso].predica}` : 'Servicio dominical'}
                                tipo="Servicio dominical"
                                dimmed={isPast}
                              />
                            )}
                            {dayEvts.map((ev, ei) => (
                              <EvPill key={ei} nombre={ev.nombre} tipo={ev.tipo} dimmed={isPast} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ── Vista SEMANA ───────────────────────────────────────────────── */}
        {viewMode === 'semana' && (
          <div style={{ border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {/* DOW header with day numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: GRAY_50, borderBottom: `1px solid ${GRAY_200}` }}>
              {DIAS_HEADER.map((dow, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                const isT = isoFromParts(d.getFullYear(), d.getMonth(), d.getDate()) === todayISO;
                return (
                  <div key={dow} style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: isT ? ORANGE : GRAY_500 }}>
                      {dow}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isT ? ORANGE : NAVY_700, lineHeight: 1, marginTop: 4 }}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Single row of cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {DIAS_HEADER.map((_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                const iso        = isoFromParts(d.getFullYear(), d.getMonth(), d.getDate());
                const dayEvts    = eventsByDate[iso] || [];
                const esDomingo  = i === 0;
                const isToday    = iso === todayISO;
                const isSelected = iso === selectedDay;

                return (
                  <div key={i}
                    onClick={() => setSelectedDay(isSelected ? null : iso)}
                    style={{
                      minHeight: 130,
                      borderRight: i < 6 ? `1px solid ${GRAY_100}` : 'none',
                      padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 3,
                      background: isSelected ? `${ORANGE}10` : isToday ? ORANGE_50 : 'white',
                      boxShadow: isSelected ? `inset 0 0 0 2px ${ORANGE}` : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {esDomingo && (
                      <EvPill
                        nombre={serviciosByDate[iso]?.predica ? `Servicio — ${serviciosByDate[iso].predica}` : 'Servicio dominical'}
                        tipo="Servicio dominical"
                      />
                    )}
                    {dayEvts.map((ev, ei) => (
                      <EvPill key={ei} nombre={ev.nombre} tipo={ev.tipo} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Vista LISTA ─────────────────────────────────────────────────── */}
        {viewMode === 'lista' && (
          loading ? (
            <p style={{ color: GRAY_500, fontSize: 13.5 }}>Cargando…</p>
          ) : mesEventos.length === 0 ? (
            <p style={{ color: GRAY_500, fontSize: 13.5 }}>Sin eventos registrados este mes.</p>
          ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...mesEventos]
                  .sort((a, b) => toISODate(a.fecha).localeCompare(toISODate(b.fecha)))
                  .map(ev => (
                    <div key={ev.id} style={{ background: 'var(--surface)', border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{ev.nombre}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <TipoPill tipo={ev.tipo} />
                        <span style={{ fontSize: 12, color: GRAY_500, fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(ev.fecha)}</span>
                      </div>
                      {ev.nota && (
                        <div style={{ fontSize: 12, color: GRAY_500, marginBottom: 8 }}>{ev.nota}</div>
                      )}
                      {canWrite && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => openEditModal(ev)} style={{ ...miniBtn, flex: 1, justifyContent: 'center' }} title="Editar">
                            <I.edit size={14} /> <span style={{ fontSize: 12, marginLeft: 4 }}>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            disabled={deleting === ev.id}
                            style={{ ...miniBtn, flex: 1, justifyContent: 'center', color: 'var(--danger)' }}
                            title="Eliminar"
                          >
                            <I.trash size={14} /> <span style={{ fontSize: 12, marginLeft: 4 }}>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
            <div style={{ border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-md)', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: 520 }}>
                <thead>
                  <tr>
                    {['Fecha', 'Nombre', 'Tipo', 'Nota', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: i === 4 ? 'right' : 'left',
                        fontSize: 10.5, letterSpacing: '.07em', textTransform: 'uppercase',
                        color: GRAY_500, fontWeight: 700, padding: '12px 16px',
                        background: GRAY_50, borderBottom: `1px solid ${GRAY_200}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...mesEventos]
                    .sort((a, b) => toISODate(a.fecha).localeCompare(toISODate(b.fecha)))
                    .map(ev => (
                      <tr key={ev.id} style={{ transition: '.1s' }}>
                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, color: GRAY_500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {fmtFecha(ev.fecha)}
                        </td>
                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, fontWeight: 600, color: 'var(--ink)' }}>
                          {ev.nombre}
                        </td>
                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}` }}>
                          <TipoPill tipo={ev.tipo} />
                        </td>
                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, color: GRAY_500, fontSize: 12, maxWidth: 220 }}>
                          {ev.nota || '—'}
                        </td>
                        <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {canWrite && (
                            <>
                              <button onClick={() => openEditModal(ev)} style={miniBtn} title="Editar">
                                <I.edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(ev.id)}
                                disabled={deleting === ev.id}
                                style={{ ...miniBtn, color: 'var(--danger)' }}
                                title="Eliminar"
                              >
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
          )
        )}

        {/* ── Leyenda de tipos ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${GRAY_200}` }}>
          {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
            <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: TIPO_BG[tipo] || color, border: `1px solid ${color}60`, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: GRAY_700, fontWeight: 500 }}>{tipo}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Día seleccionado (mes y semana) — PRESERVED EXACTLY ─────────── */}
      {selectedDay && viewMode !== 'lista' && (
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

            {isDomingo(selectedDay) && (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: TIPO_BG['Servicio dominical'],
                border: `1px solid ${TIPO_COLOR['Servicio dominical']}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIPO_COLOR['Servicio dominical'], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Servicio dominical</div>
                  <span style={{ fontSize: 11.5, color: TIPO_COLOR['Servicio dominical'], fontWeight: 600, flexShrink: 0 }}>Servicio dominical</span>
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

            {selectedDayEvents.map(ev => (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: TIPO_BG[ev.tipo] || 'var(--surface)',
                border: `1px solid ${TIPO_COLOR[ev.tipo] || 'var(--border)'}30`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIPO_COLOR[ev.tipo] || '#888', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{ev.nombre}</div>
                  {ev.nota && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{ev.nota}</div>}
                </div>
                <span style={{ fontSize: 11.5, color: TIPO_COLOR[ev.tipo] || 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>
                  {ev.tipo}
                </span>
                {canWrite && (
                  <button className="icon-btn" onClick={() => openEditModal(ev)}
                    style={{ width: 28, height: 28, flexShrink: 0 }} title="Editar">
                    <I.edit size={14} />
                  </button>
                )}
              </div>
            ))}

            {selectedDayEvents.length === 0 && !isDomingo(selectedDay) && (
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>Sin eventos este día.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tabla todos los eventos (año completo) — solo fuera de lista ─── */}
      {viewMode !== 'lista' && (
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: NAVY }}>
            Todos los eventos · {viewYear}
          </h2>

          {loading ? (
            <p style={{ color: GRAY_500, fontSize: 13.5 }}>Cargando…</p>
          ) : (
            (() => {
              const filas = [
                ...eventos.map(e => ({ ...e, _key: String(e.id), _isServicio: false })),
                ...servicios
                  .filter(s => s.predica && s.predica.trim() !== '')
                  .map(s => ({
                    _key:        `serv-${s.id}`,
                    _isServicio: true,
                    id:          s.id,
                    fecha:       (s.fecha || '').slice(0, 10),
                    nombre:      `Servicio — ${s.predica}`,
                    tipo:        'Servicio dominical',
                    nota:        s.nota || null,
                  })),
              ]
                .filter(e => (toISODate(e.fecha) || e.fecha || '') >= todayISO)
                .sort((a, b) => (toISODate(a.fecha) || a.fecha || '').localeCompare(toISODate(b.fecha) || b.fecha || ''));

              if (filas.length === 0) return (
                <p style={{ color: GRAY_500, fontSize: 13.5 }}>Sin eventos próximos registrados.</p>
              );

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: 520 }}>
                    <thead>
                      <tr>
                        {['Fecha', 'Nombre', 'Tipo', 'Nota', ''].map((h, i) => (
                          <th key={i} style={{
                            textAlign: i === 4 ? 'right' : 'left',
                            fontSize: 10.5, letterSpacing: '.07em', textTransform: 'uppercase',
                            color: GRAY_500, fontWeight: 700, padding: '12px 16px',
                            background: GRAY_50, borderBottom: `1px solid ${GRAY_200}`,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map(ev => (
                        <tr key={ev._key}>
                          <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, color: GRAY_500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            {fmtFecha(ev.fecha)}
                          </td>
                          <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, fontWeight: 600, color: 'var(--ink)' }}>
                            {ev.nombre}
                          </td>
                          <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}` }}>
                            <TipoPill tipo={ev.tipo} />
                          </td>
                          <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, color: GRAY_500, fontSize: 12, maxWidth: 220 }}>
                            {ev.nota || '—'}
                          </td>
                          <td style={{ padding: '13px 16px', borderBottom: `1px solid ${GRAY_100}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {canWrite && (
                              <>
                                <button
                                  onClick={() => ev._isServicio ? setSelectedDay(ev.fecha) : openEditModal(ev)}
                                  style={miniBtn}
                                  title={ev._isServicio ? 'Editar prédica' : 'Editar'}
                                >
                                  <I.edit size={14} />
                                </button>
                                <button
                                  onClick={() => ev._isServicio ? handleDeleteServicio(ev) : handleDelete(ev.id)}
                                  disabled={ev._isServicio ? deletingServicio === ev.id : deleting === ev.id}
                                  style={{ ...miniBtn, color: 'var(--danger)' }}
                                  title={ev._isServicio ? 'Eliminar prédica' : 'Eliminar'}
                                >
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
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
