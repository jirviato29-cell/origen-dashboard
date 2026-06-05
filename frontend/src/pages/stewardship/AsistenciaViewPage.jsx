import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../../services/api';
import { useAsistenciaStewModal } from '../../context/AsistenciaStewModalContext';
import { fmtFecha, fmtFechaShort, mesNombre } from '../../utils/fecha';
import { I } from '../../components/Icons';

// ── Helpers ───────────────────────────────────────────────────────────────────


function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}

// ── Chart constants ───────────────────────────────────────────────────────────

const SEG_COLORS = {
  adultos:     '#00B4D8',
  voluntarios: '#64748B',
  ninos:       '#F97316',
  bebes:       '#D4B896',
};

const LEGEND = [
  { key: 'adultos',     label: 'Adultos',     color: SEG_COLORS.adultos },
  { key: 'voluntarios', label: 'Voluntarios', color: SEG_COLORS.voluntarios },
  { key: 'ninos',       label: 'Niños',       color: SEG_COLORS.ninos },
  { key: 'bebes',       label: 'Bebés',       color: SEG_COLORS.bebes },
];

const VW = 900, VH = 320;
const PAD = { left: 42, right: 14, top: 24, bottom: 60 };
const BAR_FILL = 0.68; // fraction of slot used by bar

// ── Stacked Bar Chart ─────────────────────────────────────────────────────────

function StackedBarChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin registros para mostrar
      </div>
    );
  }

  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;
  const n      = data.length;
  const slotW  = chartW / n;
  const barW   = slotW * BAR_FILL;
  const barOff = (slotW - barW) / 2;

  const maxVal = Math.max(...data.map(rowTotal), 1);
  const rawStep = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const yStep = Math.ceil(rawStep / magnitude) * magnitude || 10;
  const yMax  = Math.ceil(maxVal / yStep) * yStep;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const toX  = i  => PAD.left + i * slotW + barOff;
  const toY  = v  => PAD.top + chartH - (v / yMax) * chartH;
  const toHt = v  => (v / yMax) * chartH;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines + Y labels */}
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} x2={VW - PAD.right}
              y1={toY(v)}   y2={toY(v)}
              stroke="#ddd5c8"
              strokeWidth={v === 0 ? 1.2 : 0.65}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text
              x={PAD.left - 6} y={toY(v) + 4}
              textAnchor="end" fontSize={9.5} fill="#b0a090"
              fontFamily="var(--font-mono)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x     = toX(i);
          const isHov = hovered === i;

          // Build segments bottom→top
          let curY = PAD.top + chartH;
          const segs = LEGEND.map(({ key, color }) => {
            const val = d[key] || 0;
            if (val === 0) return null;
            const h = toHt(val);
            curY -= h;
            return { key, color, y: curY, h };
          }).filter(Boolean);

          return (
            <g
              key={d.fecha || i}
              onMouseEnter={() => setHovered(i)}
              style={{ cursor: 'pointer' }}
            >
              {segs.map((s, si) => (
                <rect
                  key={s.key}
                  x={x} y={s.y}
                  width={barW} height={s.h}
                  fill={s.color}
                  opacity={isHov ? 1 : 0.80}
                  rx={si === segs.length - 1 ? 3 : 0}
                />
              ))}
              <text
                x={x + barW / 2}
                y={PAD.top + chartH + 15}
                textAnchor="middle"
                fontSize={n > 12 ? 7.5 : n > 8 ? 9 : 10}
                fill="#b0a090"
                style={{ userSelect: 'none' }}
              >
                {fmtFechaShort(d.fecha)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const d     = data[hovered];
        const total = rowTotal(d);
        const cx    = toX(hovered) + barW / 2;
        const lPct  = (cx / VW) * 100;
        const tPct  = 8;
        const tx    = lPct > 74 ? '-92%' : lPct < 18 ? '4%' : '-50%';
        return (
          <div style={{
            position: 'absolute', left: `${lPct}%`, top: `${tPct}%`,
            transform: `translate(${tx}, 0)`, pointerEvents: 'none',
            background: '#1A1A1A', color: 'white', borderRadius: 10,
            padding: '10px 14px', fontSize: 12.5, lineHeight: 1.75,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap', zIndex: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 13 }}>
              {fmtFecha(d.fecha)}
            </div>
            {LEGEND.map(({ key, label, color }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.78, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{d[key] || 0}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', gap: 18,
              borderTop: '1px solid rgba(255,255,255,0.14)', marginTop: 5, paddingTop: 5,
            }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fdba74' }}>{total}</span>
            </div>
            {(d.nuevos || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, fontSize: 11.5, opacity: 0.65 }}>
                <span>Nuevos</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{d.nuevos}</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AsistenciaViewPage() {
  const { refreshKey } = useAsistenciaStewModal();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [mesSeleccionado, setMesSelec] = useState(null);

  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ year, limit: 200 });
      setRecords([...data].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener('asistencia-saved', h);
    return () => window.removeEventListener('asistencia-saved', h);
  }, [load]);

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const ultimo      = records[0];
  const totalUltimo = ultimo ? rowTotal(ultimo) : 0;
  const promedio    = records.length > 0
    ? Math.round(records.reduce((s, r) => s + rowTotal(r), 0) / records.length)
    : 0;
  const maximo = records.length > 0 ? Math.max(...records.map(rowTotal)) : 0;

  // ── Resumen por mes (SUMA + desglose) ────────────────────────────────────
  const mesesDisponibles = [...new Set(records.map(r => r.fecha.slice(0, 7)))].sort();
  const resumenMeses = mesesDisponibles.map(m => {
    const rows = records.filter(r => r.fecha.startsWith(m));
    const adultos     = rows.reduce((s, r) => s + (r.adultos     || 0), 0);
    const voluntarios = rows.reduce((s, r) => s + (r.voluntarios || 0), 0);
    const ninos       = rows.reduce((s, r) => s + (r.ninos       || 0), 0);
    const bebes       = rows.reduce((s, r) => s + (r.bebes       || 0), 0);
    const nuevos      = rows.reduce((s, r) => s + (r.nuevos      || 0), 0);
    const total       = adultos + voluntarios + ninos + bebes;
    return { mes: m, label: mesNombre(m), total, adultos, voluntarios, ninos, bebes, nuevos, count: rows.length };
  });

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = mesSeleccionado
    ? [...records].filter(r => r.fecha.startsWith(mesSeleccionado)).sort((a, b) => a.fecha.localeCompare(b.fecha))
    : [...records].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const chartTitle = mesSeleccionado
    ? `Asistencia ${mesNombre(mesSeleccionado)} ${year}`
    : `Asistencia ${year}`;
  const chartSub = `${chartData.length} domingo${chartData.length !== 1 ? 's' : ''} · pasa el mouse sobre cada barra`;

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const filtered = search
    ? records.filter(r =>
        fmtFecha(r.fecha).toLowerCase().includes(search.toLowerCase()) ||
        r.fecha.includes(search)
      )
    : records;

  const totAdultos     = records.reduce((s, r) => s + (r.adultos     || 0), 0);
  const totVoluntarios = records.reduce((s, r) => s + (r.voluntarios || 0), 0);
  const totNinos       = records.reduce((s, r) => s + (r.ninos       || 0), 0);
  const totBebes       = records.reduce((s, r) => s + (r.bebes       || 0), 0);
  const totNuevos      = records.reduce((s, r) => s + (r.nuevos      || 0), 0);
  const totTotal       = records.reduce((s, r) => s + rowTotal(r), 0);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── A: 3 tarjetas ── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
          {[
            { label: 'Último domingo',   value: totalUltimo, sub: ultimo ? fmtFecha(ultimo.fecha) : '—', color: 'var(--chart-primary)' },
            { label: 'Promedio',         value: promedio,    sub: `${records.length} domingos`,          color: 'var(--ink)' },
            { label: 'Máximo histórico', value: maximo,      sub: 'Total asistentes',                    color: 'var(--warn)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── B: 2 columnas ── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>

          {/* Izquierda: Resumen por mes (suma) */}
          <div className="card" style={{ padding: '20px 20px 16px' }}>
            <div className="card-head" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-title">Resumen por mes</h3>
                <div className="card-sub">{year} · total de asistencia · clic para filtrar la gráfica</div>
              </div>
            </div>

            {resumenMeses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
                Sin registros en {year}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {resumenMeses.map(r => {
                  const activo = mesSeleccionado === r.mes;
                  return (
                    <button
                      key={r.mes}
                      onClick={() => toggleMes(r.mes)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px 10px 10px', borderRadius: 8, cursor: 'pointer',
                        background: activo ? 'rgba(0,180,216,0.07)' : 'transparent',
                        color: 'var(--ink)', border: 'none',
                        borderLeft: activo ? '3px solid var(--chart-primary)' : '3px solid transparent',
                        width: '100%', textAlign: 'left',
                        transition: 'background 0.15s, border-left-color 0.15s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{r.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.count} dom.</span>
                          <span style={{
                            marginLeft: 'auto', fontSize: 17, fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: activo ? 'var(--chart-primary)' : 'var(--ink)',
                          }}>
                            {r.total}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', fontSize: 11.5 }}>
                          <span style={{ color: SEG_COLORS.adultos, fontWeight: 600 }}>
                            Adultos <span style={{ fontFamily: 'var(--font-mono)' }}>{r.adultos}</span>
                          </span>
                          <span style={{ color: SEG_COLORS.voluntarios, fontWeight: 600 }}>
                            Vol. <span style={{ fontFamily: 'var(--font-mono)' }}>{r.voluntarios}</span>
                          </span>
                          <span style={{ color: SEG_COLORS.ninos, fontWeight: 600 }}>
                            Niños <span style={{ fontFamily: 'var(--font-mono)' }}>{r.ninos}</span>
                          </span>
                          <span style={{ color: '#a08060', fontWeight: 600 }}>
                            Bebés <span style={{ fontFamily: 'var(--font-mono)' }}>{r.bebes}</span>
                          </span>
                          {r.nuevos > 0 && (
                            <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
                              Nuevos <span style={{ fontFamily: 'var(--font-mono)' }}>{r.nuevos}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Derecha: Gráfica de barras apiladas */}
          <div className="card" style={{ padding: '20px 20px 16px' }}>
            <div className="card-head chart-head" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">{chartTitle}</h3>
                <div className="card-sub">{chartSub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {mesSeleccionado && (
                  <button
                    onClick={() => setMesSelec(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '4px 10px',
                      fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ← Ver todo el año
                  </button>
                )}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {LEGEND.map(({ key, label, color }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <StackedBarChart data={chartData} />
          </div>
        </div>
      )}

      {/* ── C: Historial ── */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Historial de asistencia</h3>
            {!loading && (
              <div className="card-sub">{records.length} domingos registrados · solo lectura</div>
            )}
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <I.search size={16} />
            <input
              placeholder="Buscar por fecha…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={`chip${!search ? ' active' : ''}`} onClick={() => setSearch('')}>
            Todos
          </button>
        </div>

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin registros disponibles.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Domingo</th>
                  <th style={{ textAlign: 'right' }}>Adultos</th>
                  <th style={{ textAlign: 'right' }}>Voluntarios</th>
                  <th style={{ textAlign: 'right' }}>Niños</th>
                  <th style={{ textAlign: 'right' }}>Bebés</th>
                  <th style={{ textAlign: 'right', color: 'var(--warn)' }}>Nuevos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const total = rowTotal(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        {fmtFecha(r.fecha)}
                        {i === 0 && !search && (
                          <span className="cat-pill" style={{ marginLeft: 8 }}>Más reciente</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{r.adultos   ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.voluntarios ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.ninos     ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{r.bebes     ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--warn)', fontWeight: 600 }}>
                        {r.nuevos > 0 ? r.nuevos : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!search && (
                <tbody>
                  <tr className="anf-totals-row">
                    <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                      Totales
                    </td>
                    <td style={{ textAlign: 'right' }}>{totAdultos}</td>
                    <td style={{ textAlign: 'right' }}>{totVoluntarios}</td>
                    <td style={{ textAlign: 'right' }}>{totNinos}</td>
                    <td style={{ textAlign: 'right' }}>{totBebes}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{totNuevos || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>
                      {totTotal}
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
