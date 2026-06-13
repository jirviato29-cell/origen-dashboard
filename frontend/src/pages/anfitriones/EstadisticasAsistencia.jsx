import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../../services/api';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TERRACOTTA = '#00B4D8';
const GREEN      = '#16A34A';
const RED        = '#DC2626';
const GRAY       = '#A3A3A3';

const MES_NOMBRE = { '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre' };
const MES_CORTO  = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => Math.round(n).toLocaleString('es-MX');

function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}
function avgField(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length;
}
function fmtDateShort(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
function fmtTooltipDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).replace(/^\w/, c => c.toUpperCase());
}

// Agrupa registros por mes YYYY-MM y calcula promedios
function buildMonthlyStats(records) {
  const map = {};
  records.forEach(r => {
    const key = r.fecha.slice(0, 7);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, recs]) => {
      const mk = key.slice(5, 7);
      const n  = recs.length;
      return {
        key,
        nombre: MES_NOMBRE[mk] || key,
        corto:  MES_CORTO[mk]  || key,
        n,
        avgAdultos:     Math.round(avgField(recs, 'adultos')),
        avgVoluntarios: Math.round(avgField(recs, 'voluntarios')),
        avgNinos:       Math.round(avgField(recs, 'ninos')),
        avgBebes:       Math.round(avgField(recs, 'bebes')),
        avgTotal:       Math.round(recs.reduce((s, r) => s + rowTotal(r), 0) / n),
      };
    });
}

// Calcula % de crecimiento mes a mes (primer mes = base 0%)
function buildGrowthData(stats) {
  return stats.map((m, i) => {
    if (i === 0) return { ...m, pct: 0, isBase: true };
    const prev = stats[i - 1].avgTotal;
    const pct  = prev > 0 ? Math.round(((m.avgTotal - prev) / prev) * 1000) / 10 : 0;
    return { ...m, pct, isBase: false };
  });
}

function fmtPct(pct, isBase) {
  if (isBase) return 'Base';
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

// ─── Gráfica de asistencia semanal ───────────────────────────────────────────

function LineChart({ records }) {
  const [hovered, setHovered] = useState(null);

  const data   = [...records].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const totals = data.map(rowTotal);
  const n      = data.length;
  if (!n) return null;

  const W = 720, H = 260, padL = 44, padR = 20, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const rawMax    = Math.max(...totals, 1);
  const cappedMax = Math.ceil(rawMax / 50) * 50;
  const yTicks    = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(p * cappedMax));

  const xAt = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const yAt = (v) => padT + chartH - (v / cappedMax) * chartH;

  const pts      = data.map((_, i) => `${xAt(i).toFixed(1)},${yAt(totals[i]).toFixed(1)}`).join(' ');
  const linePath = data.map((_, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(totals[i]).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${xAt(n - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L${xAt(0).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  const showLabel = (i) => {
    if (n <= 8) return true;
    if (n <= 14) return i % 2 === 0 || i === n - 1;
    const step = Math.max(1, Math.floor(n / 6));
    return i % step === 0 || i === n - 1;
  };

  const TW = 116, TH = 52;
  const clampTX  = (cx) => Math.min(Math.max(cx - TW / 2, padL), W - padR - TW);
  const above     = (cy) => cy > padT + TH + 18;

  return (
    <div style={{ height: 260 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
        style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="lcGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={TERRACOTTA} stopOpacity="0.18" />
            <stop offset="100%" stopColor={TERRACOTTA} stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="chart-grid">
          {yTicks.map(v => {
            const y = yAt(v);
            return (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} />
                <text x={padL - 8} y={y + 3.5} className="chart-axis" textAnchor="end">{v}</text>
              </g>
            );
          })}
        </g>

        {data.map((d, i) => showLabel(i) && (
          <text key={d.fecha} x={xAt(i)} y={H - padB + 16} className="chart-axis" textAnchor="middle">
            {fmtDateShort(d.fecha)}
          </text>
        ))}

        <path d={areaPath} fill="url(#lcGrad)" />
        <polyline points={pts} fill="none" stroke={TERRACOTTA} strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => {
          const cx    = xAt(i);
          const cy    = yAt(totals[i]);
          const isOn  = hovered === i;
          const isLast = i === n - 1;
          const tx    = clampTX(cx);
          const ab    = above(cy);
          const ty    = ab ? cy - TH - 12 : cy + 12;
          const arrCx = Math.min(Math.max(cx, tx + 10), tx + TW - 10);
          return (
            <g key={d.fecha} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <circle cx={cx} cy={cy} r={18} fill="transparent" />
              <circle cx={cx} cy={cy} r={isOn ? 6 : isLast ? 5 : 3.5}
                fill={isOn || isLast ? TERRACOTTA : '#fff'}
                stroke={TERRACOTTA} strokeWidth="2" />
              {isOn && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={tx+1} y={ty+1} width={TW} height={TH} rx={9} fill="rgba(0,0,0,0.08)" />
                  <rect x={tx} y={ty} width={TW} height={TH} rx={9} fill="#1C1815" />
                  {ab
                    ? <polygon points={`${arrCx-6},${ty+TH} ${arrCx+6},${ty+TH} ${arrCx},${ty+TH+7}`} fill="#1C1815" />
                    : <polygon points={`${arrCx-6},${ty} ${arrCx+6},${ty} ${arrCx},${ty-7}`} fill="#1C1815" />
                  }
                  <text x={tx+TW/2} y={ty+18} textAnchor="middle" fontSize="10.5"
                    fill="rgba(255,255,255,0.62)" fontFamily="var(--font-ui)">{fmtTooltipDate(d.fecha)}</text>
                  <text x={tx+TW/2} y={ty+38} textAnchor="middle" fontSize="16"
                    fontWeight="700" fill="white" fontFamily="var(--font-display)">{totals[i]} asistentes</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Gráfica de crecimiento mensual ──────────────────────────────────────────

function GrowthLineChart({ growthData }) {
  const [hovered, setHovered] = useState(null);
  const n = growthData.length;

  if (n < 2) {
    return (
      <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
        Se necesitan al menos 2 meses de datos para ver el crecimiento.
      </p>
    );
  }

  const W = 720, H = 220, padL = 56, padR = 20, padT = 36, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const pcts   = growthData.map(m => m.pct);
  const rawMin = Math.min(...pcts, 0);
  const rawMax = Math.max(...pcts, 0);
  const span   = Math.max(rawMax - rawMin, 10);

  // Tick interval nicely rounded
  const tickInt = span <= 20 ? 5 : span <= 60 ? 10 : 20;
  const yMin = Math.floor((rawMin - span * 0.22) / tickInt) * tickInt;
  const yMax = Math.ceil( (rawMax + span * 0.22) / tickInt) * tickInt;
  const totalSpan = yMax - yMin || 1;

  const xAt  = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const yAt  = (v) => padT + chartH - ((v - yMin) / totalSpan) * chartH;
  const zeroY = yAt(0);

  // Y ticks
  const yTicks = [];
  for (let v = yMin; v <= yMax + 0.001; v += tickInt) yTicks.push(Math.round(v));

  // Dot color
  const dotColor = (pct, isBase) => isBase ? GRAY : pct > 0 ? GREEN : pct < 0 ? RED : GRAY;

  // Tooltip sizing
  const TW = 148, TH = 60;
  const clampTX = (cx) => Math.min(Math.max(cx - TW / 2, padL), W - padR - TW);
  const above   = (cy) => cy > padT + TH + 16;

  return (
    <div style={{ height: 220 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none"
        style={{ overflow: 'visible', display: 'block' }}>

        {/* Y grid + labels */}
        {yTicks.map(v => {
          const y      = yAt(v);
          const isZero = v === 0;
          return (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y} y2={y}
                stroke={isZero ? 'var(--border-strong)' : 'var(--border)'}
                strokeWidth={isZero ? 1.5 : 1}
                strokeDasharray={isZero ? undefined : '3 4'} />
              <text x={padL - 8} y={y + 4} className="chart-axis" textAnchor="end"
                style={{ fill: isZero ? 'var(--muted)' : 'var(--muted-2)', fontWeight: isZero ? 600 : 400 }}>
                {v > 0 ? '+' : ''}{v}%
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {growthData.map((m, i) => (
          <text key={m.key} x={xAt(i)} y={H - padB + 16} className="chart-axis" textAnchor="middle">
            {m.corto}
          </text>
        ))}

        {/* Colored segments between months */}
        {growthData.slice(1).map((m, i) => {
          const color = dotColor(m.pct, false);
          return (
            <line key={m.key}
              x1={xAt(i).toFixed(1)} y1={yAt(pcts[i]).toFixed(1)}
              x2={xAt(i + 1).toFixed(1)} y2={yAt(pcts[i + 1]).toFixed(1)}
              stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          );
        })}

        {/* Dots + labels + tooltips */}
        {growthData.map((m, i) => {
          const cx    = xAt(i);
          const cy    = yAt(m.pct);
          const isOn  = hovered === i;
          const color = dotColor(m.pct, m.isBase);
          const label = fmtPct(m.pct, m.isBase);
          const tx    = clampTX(cx);
          const ab    = above(cy);
          const ty    = ab ? cy - TH - 12 : cy + 12;
          const arrCx = Math.min(Math.max(cx, tx + 10), tx + TW - 10);

          return (
            <g key={m.key} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}>
              {/* Hit area */}
              <circle cx={cx} cy={cy} r={18} fill="transparent" />

              {/* % label above point (hidden on hover) */}
              {!isOn && (
                <text x={cx} y={cy - 11} textAnchor="middle" fontSize="10" fontWeight="700"
                  fill={color} fontFamily="var(--font-ui)">
                  {label}
                </text>
              )}

              {/* Dot */}
              <circle cx={cx} cy={cy} r={isOn ? 6 : 4.5}
                fill={isOn ? color : '#fff'} stroke={color} strokeWidth="2" />

              {/* Tooltip */}
              {isOn && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={tx+1} y={ty+1} width={TW} height={TH} rx={9} fill="rgba(0,0,0,0.08)" />
                  <rect x={tx} y={ty} width={TW} height={TH} rx={9} fill="#1C1815" />
                  {ab
                    ? <polygon points={`${arrCx-6},${ty+TH} ${arrCx+6},${ty+TH} ${arrCx},${ty+TH+7}`} fill="#1C1815" />
                    : <polygon points={`${arrCx-6},${ty} ${arrCx+6},${ty} ${arrCx},${ty-7}`} fill="#1C1815" />
                  }
                  <text x={tx+TW/2} y={ty+17} textAnchor="middle" fontSize="10.5"
                    fill="rgba(255,255,255,0.62)" fontFamily="var(--font-ui)">
                    {m.nombre} · {m.n} {m.n === 1 ? 'domingo' : 'domingos'}
                  </text>
                  <text x={tx+TW/2} y={ty+35} textAnchor="middle" fontSize="13" fontWeight="700"
                    fill={color} fontFamily="var(--font-ui)">
                    {m.isBase
                      ? `Base: ${m.avgTotal} prom.`
                      : `${m.pct > 0 ? 'Creció' : 'Bajó'} ${Math.abs(m.pct)}%`}
                  </text>
                  <text x={tx+TW/2} y={ty+51} textAnchor="middle" fontSize="10.5"
                    fill="rgba(255,255,255,0.55)" fontFamily="var(--font-ui)">
                    Promedio mensual: {m.avgTotal}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Tabla de promedios mensuales ─────────────────────────────────────────────

function PromedioMensualTable({ monthlyStats, overall }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {monthlyStats.map(m => (
          <div key={m.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
              {m.nombre}
              <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8, fontWeight: 400 }}>
                {m.n} {m.n === 1 ? 'domingo' : 'domingos'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { label: 'Ad', val: m.avgAdultos },
                { label: 'Vol', val: m.avgVoluntarios },
                { label: 'Niños', val: m.avgNinos },
                { label: 'Bebés', val: m.avgBebes },
              ].map(({ label, val }) => (
                <span key={label} style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  <span style={{ fontWeight: 600 }}>{label}:</span> {val}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{m.avgTotal}</span>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2, #f6f7f9)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Promedio general</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{overall.total}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <table className="table anf-table">
        <thead>
          <tr>
            <th>Mes</th>
            <th style={{ textAlign: 'right' }}>Adultos</th>
            <th style={{ textAlign: 'right' }}>Voluntarios</th>
            <th style={{ textAlign: 'right' }}>Niños</th>
            <th style={{ textAlign: 'right' }}>Bebés</th>
            <th style={{ textAlign: 'right', color: 'var(--ink)' }}>Total prom.</th>
          </tr>
        </thead>
        <tbody>
          {monthlyStats.map(m => (
            <tr key={m.key}>
              <td style={{ fontWeight: 500 }}>
                {m.nombre}
                <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8, fontWeight: 400 }}>
                  {m.n} {m.n === 1 ? 'domingo' : 'domingos'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>{m.avgAdultos}</td>
              <td style={{ textAlign: 'right' }}>{m.avgVoluntarios}</td>
              <td style={{ textAlign: 'right' }}>{m.avgNinos}</td>
              <td style={{ textAlign: 'right' }}>{m.avgBebes}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                {m.avgTotal}
              </td>
            </tr>
          ))}
        </tbody>
        <tbody>
          <tr className="anf-totals-row">
            <td style={{ textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
              Promedio general
            </td>
            <td style={{ textAlign: 'right' }}>{overall.adultos}</td>
            <td style={{ textAlign: 'right' }}>{overall.voluntarios}</td>
            <td style={{ textAlign: 'right' }}>{overall.ninos}</td>
            <td style={{ textAlign: 'right' }}>{overall.bebes}</td>
            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--font-display)' }}>
              {overall.total}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EstadisticasAsistencia() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ limit: 200 });
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)' }}>
        Cargando…
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
        Sin datos de asistencia registrados.
      </div>
    );
  }

  const n             = records.length;
  const promAdultos   = avgField(records, 'adultos');
  const promVolunt    = avgField(records, 'voluntarios');
  const promNinos     = avgField(records, 'ninos');
  const promBebes     = avgField(records, 'bebes');
  const promTotal     = records.reduce((s, r) => s + rowTotal(r), 0) / n;

  const last = [...records].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  const metricCards = [
    { label: 'Adultos · Promedio',     value: fmt(promAdultos), last: last.adultos     || 0, icon: I.users, iconBg: 'rgba(0,180,216,0.10)',   iconColor: 'var(--chart-primary)' },
    { label: 'Voluntarios · Promedio', value: fmt(promVolunt),  last: last.voluntarios || 0, icon: I.hand,  iconBg: 'var(--surface-3)',         iconColor: 'var(--ink)' },
    { label: 'Niños · Promedio',       value: fmt(promNinos),   last: last.ninos       || 0, icon: I.child, iconBg: 'rgba(255,107,43,0.10)',   iconColor: 'var(--chart-secondary)' },
    { label: 'Bebés · Promedio',       value: fmt(promBebes),   last: last.bebes       || 0, icon: I.baby,  iconBg: 'var(--surface-3)',         iconColor: 'var(--muted)' },
  ];

  const monthlyStats = buildMonthlyStats(records);
  const growthData   = buildGrowthData(monthlyStats);
  const overall      = {
    adultos:     Math.round(promAdultos),
    voluntarios: Math.round(promVolunt),
    ninos:       Math.round(promNinos),
    bebes:       Math.round(promBebes),
    total:       Math.round(promTotal),
  };

  return (
    <>
      {/* ── Metric cards ── */}
      <section className="metric-grid">
        {metricCards.map((m) => {
          const Ic = m.icon;
          return (
            <div key={m.label} className="metric">
              <div className="metric-head">
                <div className="metric-icon" style={{ background: m.iconBg, color: m.iconColor }}>
                  <Ic size={18} />
                </div>
                <span className="metric-trend"><I.arrowUp size={11} /> Promedio</span>
              </div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value">{m.value}</div>
              <div className="metric-sub">
                <span>Último domingo</span>
                <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{m.last}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Asistencia semanal (line chart) ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Asistencia total por domingo</h3>
            <div className="card-sub">{n} domingos registrados · suma de todas las categorías</div>
          </div>
          <div className="card-actions">
            <button className="tab-pill active">{n} semanas</button>
          </div>
        </div>
        <LineChart records={records} />
      </section>

      {/* ── Crecimiento mensual ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Crecimiento mensual</h3>
            <div className="card-sub">
              % de variación mes a mes · {monthlyStats[0]?.nombre ?? ''} como base
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
              Crecimiento
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, display: 'inline-block' }} />
              Reducción
            </span>
          </div>
        </div>
        <GrowthLineChart growthData={growthData} />
      </section>

      {/* ── Promedio mensual ── */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Promedio mensual</h3>
            <div className="card-sub">Promedio de asistencia por categoría en cada mes</div>
          </div>
        </div>
        <PromedioMensualTable monthlyStats={monthlyStats} overall={overall} />
      </section>
    </>
  );
}
