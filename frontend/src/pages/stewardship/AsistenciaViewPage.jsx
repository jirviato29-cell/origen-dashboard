import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../../services/api';
import { useAsistenciaStewModal } from '../../context/AsistenciaStewModalContext';
import { fmtFecha, mesNombre } from '../../utils/fecha';

// ── Helpers ───────────────────────────────────────────────────────────────────


function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}

// ── Chart constants ───────────────────────────────────────────────────────────

const CAT_LABEL = '#1e40af';
const CAT_VALUE = '#1e3a8a';

const TEAL = '#14b8a6';
const VW   = 900, VH  = 280;
const PAD  = { left: 50, right: 24, top: 24, bottom: 44 };

function DesgloseCat({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0, nuevos = 0 }) {
  const num = { fontFamily: 'var(--font-mono)', color: CAT_VALUE, fontWeight: 700 };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', marginTop: 9, fontSize: 11.5, lineHeight: 1.6 }}>
      <span style={{ color: CAT_LABEL }}>Adultos <span style={num}>{adultos}</span></span>
      <span style={{ color: CAT_LABEL }}>Voluntarios <span style={num}>{voluntarios}</span></span>
      <span style={{ color: CAT_LABEL }}>Niños <span style={num}>{ninos}</span></span>
      <span style={{ color: CAT_LABEL }}>Bebés <span style={num}>{bebes}</span></span>
      {nuevos > 0 && <span style={{ color: CAT_LABEL }}>Nuevos <span style={num}>{nuevos}</span></span>}
    </div>
  );
}

// ── Attendance Area Chart (SVG, igual estilo a Ingresos) ─────────────────────

function AttendanceAreaChart({ data, onPointClick }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin suficientes datos para mostrar la gráfica
      </div>
    );
  }

  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.value));
  const yStep  = maxVal > 400 ? 100 : maxVal > 200 ? 50 : 25;
  const yMax   = Math.ceil(maxVal / yStep) * yStep || yStep;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const toX = i => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = v => PAD.top + chartH - (v / yMax) * chartH;
  const pts  = data.map((d, i) => ({ x: toX(i), y: toY(d.value), d }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="asistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={TEAL} stopOpacity="0.22" />
            <stop offset="100%" stopColor={TEAL} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={VW - PAD.right} y1={toY(v)} y2={toY(v)}
              stroke="#ddd5c8" strokeWidth={v === 0 ? 1.2 : 0.65} strokeDasharray={v === 0 ? '' : '3 3'} />
            <text x={PAD.left - 8} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#b0a090" fontFamily="var(--font-mono)">
              {v}
            </text>
          </g>
        ))}

        <line x1={PAD.left} x2={VW - PAD.right} y1={PAD.top + chartH} y2={PAD.top + chartH} stroke="#ddd5c8" strokeWidth={1} />

        {pts.map((p, i) => (
          <text key={i} x={p.x} y={PAD.top + chartH + 16} textAnchor="middle" fontSize={10} fill="#b0a090">
            {p.d.label}
          </text>
        ))}

        <path d={areaPath} fill="url(#asistGrad)" />
        <path d={linePath} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {hovered !== null && (
          <line x1={pts[hovered].x} x2={pts[hovered].x} y1={PAD.top} y2={PAD.top + chartH}
            stroke={TEAL} strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />
        )}

        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y}
            r={hovered === i ? 6.5 : 4}
            fill={hovered === i ? TEAL : 'white'}
            stroke={TEAL} strokeWidth={2}
            style={{ cursor: onPointClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHovered(i)}
            onClick={() => onPointClick && onPointClick(i)}
          />
        ))}
      </svg>

      {hovered !== null && (() => {
        const p    = pts[hovered];
        const lPct = (p.x / VW) * 100;
        const tPct = (p.y / VH) * 100;
        const tx   = lPct > 72 ? '-92%' : lPct < 20 ? '8%' : '-50%';
        const ty   = tPct < 30 ? '14%' : '-115%';
        return (
          <div style={{
            position: 'absolute', left: `${lPct}%`, top: `${tPct}%`,
            transform: `translate(${tx}, ${ty})`, pointerEvents: 'none',
            background: '#1A1A1A', color: 'white', borderRadius: 10,
            padding: '10px 14px', fontSize: 12.5, lineHeight: 1.7,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap', zIndex: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 3, color: 'rgba(255,255,255,0.9)' }}>
              {p.d.label}
            </div>
            <div style={{ color: TEAL, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>
              {p.d.value} asistentes
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AttendanceChart({ resumenMeses, mesSeleccionado, records, onMonthSelect }) {
  if (mesSeleccionado) {
    const data = records
      .filter(r => r.fecha.startsWith(mesSeleccionado))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(r => ({ label: String(parseInt(r.fecha.slice(8), 10)), value: rowTotal(r) }));
    return <AttendanceAreaChart data={data} />;
  }
  const data = resumenMeses.map(r => ({ label: r.label.slice(0, 3), value: r.total, mes: r.mes }));
  return (
    <AttendanceAreaChart
      data={data}
      onPointClick={(i) => onMonthSelect(data[i].mes)}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AsistenciaViewPage() {
  const { refreshKey } = useAsistenciaStewModal();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const n           = records.length;
  const promedio    = n > 0 ? Math.round(records.reduce((s, r) => s + rowTotal(r), 0) / n) : 0;
  const maximo      = n > 0 ? Math.max(...records.map(rowTotal)) : 0;

  const promAdultos     = n > 0 ? Math.round(records.reduce((s, r) => s + (r.adultos     || 0), 0) / n) : 0;
  const promVoluntarios = n > 0 ? Math.round(records.reduce((s, r) => s + (r.voluntarios || 0), 0) / n) : 0;
  const promNinos       = n > 0 ? Math.round(records.reduce((s, r) => s + (r.ninos       || 0), 0) / n) : 0;
  const promBebes       = n > 0 ? Math.round(records.reduce((s, r) => s + (r.bebes       || 0), 0) / n) : 0;
  const promNuevos      = n > 0 ? Math.round(records.reduce((s, r) => s + (r.nuevos      || 0), 0) / n) : 0;

  const hoy           = new Date();
  const mesActual     = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesActualLabel = mesNombre(mesActual);

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

  const mesActualData = resumenMeses.find(m => m.mes === mesActual) || null;

  // ── Tabla totals (must be before donutSource) ─────────────────────────────
  const totAdultos     = records.reduce((s, r) => s + (r.adultos     || 0), 0);
  const totVoluntarios = records.reduce((s, r) => s + (r.voluntarios || 0), 0);
  const totNinos       = records.reduce((s, r) => s + (r.ninos       || 0), 0);
  const totBebes       = records.reduce((s, r) => s + (r.bebes       || 0), 0);
  const totNuevos      = records.reduce((s, r) => s + (r.nuevos      || 0), 0);
  const totTotal       = records.reduce((s, r) => s + rowTotal(r), 0);

  const chartTitle = mesSeleccionado
    ? `Domingos de ${mesNombre(mesSeleccionado)}`
    : `Total por mes · ${year}`;
  const chartSub = mesSeleccionado
    ? `${resumenMeses.find(r => r.mes === mesSeleccionado)?.count || 0} domingos · haz clic en ← para volver`
    : `${resumenMeses.length} meses · haz clic en una barra para ver sus domingos`;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── A: tarjetas ── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

          {/* Último domingo */}
          <div className="card" style={{ padding: '16px 18px', background: '#f0fdfa', border: '2px solid #2dd4bf', boxShadow: '0 2px 10px rgba(45,212,191,0.18)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Último domingo</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#5eead4', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {totalUltimo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {ultimo ? fmtFecha(ultimo.fecha) : '—'}
            </div>
            {ultimo && (
              <DesgloseCat
                adultos={ultimo.adultos || 0} voluntarios={ultimo.voluntarios || 0}
                ninos={ultimo.ninos || 0} bebes={ultimo.bebes || 0}
              />
            )}
          </div>

          {/* Mes actual */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{mesActualLabel}</div>
            {mesActualData ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2dd4bf', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  {mesActualData.total}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {mesActualData.count} {mesActualData.count === 1 ? 'domingo' : 'domingos'}
                </div>
                <DesgloseCat
                  adultos={mesActualData.adultos} voluntarios={mesActualData.voluntarios}
                  ninos={mesActualData.ninos} bebes={mesActualData.bebes}
                />
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Sin registros aún</div>
            )}
          </div>

          {/* Promedio */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Promedio</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#14b8a6', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {promedio}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n} domingos</div>
            <DesgloseCat
              adultos={promAdultos} voluntarios={promVoluntarios}
              ninos={promNinos} bebes={promBebes}
            />
          </div>

          {/* Máximo histórico */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Máximo histórico</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0d9488', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {maximo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Total asistentes</div>
          </div>

          {/* Total del año */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Total del año</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f766e', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {totTotal}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n} domingos · {year}</div>
            <DesgloseCat
              adultos={totAdultos} voluntarios={totVoluntarios}
              ninos={totNinos} bebes={totBebes}
            />
          </div>

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
                          {[
                            { label: 'Adultos',     v: r.adultos },
                            { label: 'Vol.',        v: r.voluntarios },
                            { label: 'Niños',       v: r.ninos },
                            { label: 'Bebés',       v: r.bebes },
                            ...(r.nuevos > 0 ? [{ label: 'Nuevos', v: r.nuevos }] : []),
                          ].map(({ label, v }) => (
                            <span key={label} style={{ color: CAT_LABEL }}>
                              {label} <span style={{ fontFamily: 'var(--font-mono)', color: CAT_VALUE, fontWeight: 700 }}>{v}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Derecha: Gráfica de barras */}
          <div className="card" style={{ padding: '20px 20px 16px' }}>
            <div className="card-head chart-head" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">{chartTitle}</h3>
                <div className="card-sub">{chartSub}</div>
              </div>
              {mesSeleccionado && (
                <button
                  onClick={() => setMesSelec(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  ← Ver todo el año
                </button>
              )}
            </div>
            <AttendanceChart
              resumenMeses={resumenMeses}
              mesSeleccionado={mesSeleccionado}
              records={records}
              onMonthSelect={(mes) => setMesSelec(mes)}
            />
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

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin registros disponibles.
          </div>
        ) : (
          <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)' }}>
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
                {records.map((r, i) => {
                  const total = rowTotal(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        {fmtFecha(r.fecha)}
                        {i === 0 && (
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
