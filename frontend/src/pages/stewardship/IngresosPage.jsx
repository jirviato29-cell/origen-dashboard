import { useState, useEffect } from 'react';
import { ofrendasApi, gastosApi, asistenciaApi } from '../../services/api';
import { fmtFecha, fmtFechaShort, mesNombre, toISODate } from '../../utils/fecha';
import { useIsMobile } from '../../utils/useIsMobile';
import { useOfrendasModal } from '../../context/OfrendasModalContext';
import { I } from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';

// Navy mid-tones not in global CSS vars
const NAVY_600   = '#305181';
const NAVY_300   = '#9CB0CC';
const GREEN_600  = '#15915A';
const GREEN_400  = '#3DD68C';
const NAVY_500   = '#3E6499';

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}
function fmtNum(n) {
  return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

// ── Sparkline SVG (96×32, no axes, preserveAspectRatio="none") ─────────────────
function Sparkline({ values, color, filled = false, gradId, gradColor, dashed = false }) {
  const W = 100, H = 32, TOP = 2, BOT = 30;

  if (dashed || !values || values.length === 0) {
    return (
      <svg style={{ width: 96, height: 32, flexShrink: 0 }} viewBox="0 0 100 32" preserveAspectRatio="none">
        <line x1="0" y1="16" x2="100" y2="16" stroke={color} strokeWidth={2}
          strokeDasharray="3 4" strokeLinecap="round" />
      </svg>
    );
  }

  if (values.length === 1) {
    return (
      <svg style={{ width: 96, height: 32, flexShrink: 0 }} viewBox="0 0 100 32" preserveAspectRatio="none">
        <line x1="0" y1="16" x2="100" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx="100" cy="16" r="2.6" fill={color} />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = BOT - ((v - min) / range) * (BOT - TOP);
    return [+x.toFixed(1), +y.toFixed(1)];
  });
  const polyStr = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  const [fx]     = pts[0];

  return (
    <svg style={{ width: 96, height: 32, flexShrink: 0 }} viewBox="0 0 100 32" preserveAspectRatio="none">
      {filled && gradId && (
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={gradColor || color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={gradColor || color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {filled && gradId && (
        <path d={`M${fx},${pts[0][1]} ${pts.slice(1).map(([x,y]) => `L${x},${y}`).join(' ')} L${lx},32 L${fx},32 Z`}
          fill={`url(#${gradId})`} />
      )}
      <polyline points={polyStr} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.6" fill={color} />
    </svg>
  );
}

// ── Big line chart (full-width area below grid2) ───────────────────────────────
const VW = 900, VH = 280;
const PAD = { left: 88, right: 20, top: 24, bottom: 50 };

function LineChart({ data }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin suficientes datos para mostrar la gráfica
      </div>
    );
  }

  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.total));
  const yStep  = maxVal > 20000 ? 10000 : 5000;
  const yMax   = Math.ceil(maxVal / yStep) * yStep || yStep;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const toX = i => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = v => PAD.top + chartH - (v / yMax) * chartH;
  const pts  = data.map((d, i) => ({ x: toX(i), y: toY(d.total), d }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    `${linePath} ` +
    `L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} ` +
    `L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}>
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={VW - PAD.right} y1={toY(v)} y2={toY(v)}
              stroke="var(--border)" strokeWidth={v === 0 ? 1.2 : 0.7} strokeDasharray={v === 0 ? '' : '3 4'} />
            <text x={PAD.left - 10} y={toY(v) + 4} textAnchor="end" fontSize={10}
              fill="var(--muted)" fontFamily="var(--font-mono)">
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={VW - PAD.right} y1={PAD.top + chartH} y2={PAD.top + chartH}
          stroke="var(--border)" strokeWidth={1} />
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={PAD.top + chartH + 16} textAnchor="middle" fontSize={10} fill="var(--muted)">
            {p.d.label}
          </text>
        ))}
        <path d={areaPath} fill="var(--chart-secondary)" opacity={0.10} />
        <path d={linePath} fill="none" stroke="var(--chart-secondary)" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />
        {hovered !== null && (
          <line x1={pts[hovered].x} x2={pts[hovered].x} y1={PAD.top} y2={PAD.top + chartH}
            stroke="var(--chart-secondary)" strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y}
            r={hovered === i ? 6.5 : 4}
            fill={hovered === i ? 'var(--chart-secondary)' : 'white'}
            stroke="var(--chart-secondary)" strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)} />
        ))}
      </svg>

      {hovered !== null && (() => {
        const p = pts[hovered], d = p.d;
        const lPct = (p.x / VW) * 100, tPct = (p.y / VH) * 100;
        const tx = lPct > 72 ? '-92%' : lPct < 20 ? '8%' : '-50%';
        const ty = tPct < 30 ? '14%' : '-115%';
        return (
          <div style={{
            position: 'absolute', left: `${lPct}%`, top: `${tPct}%`,
            transform: `translate(${tx}, ${ty})`, pointerEvents: 'none',
            background: 'var(--black)', color: 'white', borderRadius: 10,
            padding: '10px 14px', fontSize: 12.5, lineHeight: 1.75,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap', zIndex: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
              {d.label}{d.count > 1 ? ` · ${d.count} domingos` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
                <span style={{ opacity: 0.6, fontSize: 12 }}>Efectivo</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(d.efectivo)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
                <span style={{ opacity: 0.6, fontSize: 12 }}>Terminal</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(d.terminal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 4, paddingTop: 4 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fdba74' }}>{fmt(d.total)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const [ofrendas,   setOfrendas]   = useState([]);
  const [gastos,     setGastos]     = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [mesSeleccionado, setMesSelec]      = useState(null);
  const [tablaMesFiltro,  setTablaMesFiltro] = useState(null);
  const isMobile      = useIsMobile();
  const { openModal } = useOfrendasModal();
  const { permisos }  = useAuth();
  const canWrite      = puedeRegistrar(permisos, 'ingresos');

  const year = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      try {
        const [ro, rg, ra] = await Promise.all([
          ofrendasApi.getAll({ year }),
          gastosApi.getAll({ year, pagado: 'true' }),
          asistenciaApi.getAll({ year }),
        ]);
        setOfrendas(ro.data);
        setGastos(rg.data);
        setAsistencia(ra.data);
      } catch (e) {
        console.error('IngresosPage load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const hoy         = new Date();
  const mesActual   = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesLabelCap = hoy.toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());

  const sorted        = [...ofrendas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimoDomingo = sorted[0];

  const asistByFecha = Object.fromEntries(asistencia.map(r => [toISODate(r.fecha), r]));

  const uSobres = Number(ultimoDomingo?.ofrendas ?? 0);
  const uAsist  = asistByFecha[toISODate(ultimoDomingo?.fecha)];
  const uDenom  = (uAsist?.adultos ?? 0) + (uAsist?.voluntarios ?? 0);
  const participacionUltimo = (uSobres > 0 && uDenom > 0)
    ? Math.round(uSobres / uDenom * 100) : null;

  let totalSobresAnio = 0, totalDenomAnio = 0;
  ofrendas.filter(d => Number(d.ofrendas ?? 0) > 0).forEach(d => {
    const a   = asistByFecha[toISODate(d.fecha)];
    const den = (a?.adultos ?? 0) + (a?.voluntarios ?? 0);
    if (den > 0) { totalSobresAnio += Number(d.ofrendas); totalDenomAnio += den; }
  });
  const promedioParticipacion = totalDenomAnio > 0
    ? Math.round(totalSobresAnio / totalDenomAnio * 100) : null;

  const ofrendasMesActual  = ofrendas.filter(d => d.fecha.startsWith(mesActual));
  const totalMesActual     = ofrendasMesActual.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const acumuladoAnio      = ofrendas.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const totalEfectivo      = ofrendas.reduce((s, d) => s + Number(d.efectivo), 0);
  const totalTerminal      = ofrendas.reduce((s, d) => s + Number(d.terminal), 0);
  const totalTransferencia = ofrendas.reduce((s, d) => s + Number(d.transferencia || 0), 0);
  const totalCombinado     = totalEfectivo + totalTerminal + totalTransferencia;
  const pctEfectivo        = totalCombinado > 0 ? Math.round(totalEfectivo      / totalCombinado * 100) : 0;
  const pctTerminal        = totalCombinado > 0 ? Math.round(totalTerminal      / totalCombinado * 100) : 0;
  const pctTransferencia   = totalCombinado > 0 ? 100 - pctEfectivo - pctTerminal : 0;
  const totalOfrendasAnio  = ofrendas.reduce((s, d) => s + Number(d.ofrendas ?? 0), 0);

  const mesesDisponibles = [...new Set(ofrendas.map(d => d.fecha.slice(0, 7)))].sort();
  const resumenMeses = mesesDisponibles.map(m => {
    const rows = ofrendas.filter(d => d.fecha.startsWith(m));
    let sobresM = 0, denomM = 0;
    rows.filter(d => Number(d.ofrendas ?? 0) > 0).forEach(d => {
      const a   = asistByFecha[toISODate(d.fecha)];
      const den = (a?.adultos ?? 0) + (a?.voluntarios ?? 0);
      if (den > 0) { sobresM += Number(d.ofrendas); denomM += den; }
    });
    const efM = rows.reduce((s, d) => s + Number(d.efectivo), 0);
    const teM = rows.reduce((s, d) => s + Number(d.terminal), 0);
    const trM = rows.reduce((s, d) => s + Number(d.transferencia || 0), 0);
    return {
      mes:         m,
      label:       mesNombre(m),
      total:       rows.reduce((s, d) => s + Number(d.total_ofrenda), 0),
      efectivo:    efM,
      terminal:    teM,
      transfer:    trM,
      count:       rows.length,
      ofrendasM:   rows.reduce((s, d) => s + Number(d.ofrendas ?? 0), 0),
      participMes: denomM > 0 ? Math.round(sobresM / denomM * 100) : null,
    };
  });

  // ── Sparkline data ────────────────────────────────────────────────────────
  // Card 1: last 6 domingo totals (chronological)
  const spark1 = sorted.slice(0, 6).reverse().map(d => Number(d.total_ofrenda));

  // Card 2: monthly participation % (last 6 months with data)
  const spark2 = resumenMeses
    .filter(r => r.participMes !== null)
    .slice(-6)
    .map(r => r.participMes);

  // Card 3: current month domingo totals (or dashed if none)
  const spark3 = ofrendasMesActual
    .slice().sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(d => Number(d.total_ofrenda));

  // Card 4: cumulative total per month (running sum)
  let running = 0;
  const spark4 = resumenMeses.map(r => { running += r.total; return running; });

  const chartData = mesSeleccionado
    ? [...ofrendas]
        .filter(d => d.fecha.startsWith(mesSeleccionado))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map(d => ({
          label:    fmtFechaShort(d.fecha),
          total:    Number(d.total_ofrenda),
          efectivo: Number(d.efectivo),
          terminal: Number(d.terminal),
          count:    1,
        }))
    : resumenMeses;

  const chartTitle = mesSeleccionado
    ? `Ingresos por domingo — ${mesNombre(mesSeleccionado)} ${year}`
    : `Ingresos por mes ${year}`;
  const hint = isMobile ? 'toca cada punto para ver el detalle' : 'pasa el mouse sobre cada punto';
  const chartSub = mesSeleccionado
    ? `${chartData.length} ${chartData.length === 1 ? 'domingo' : 'domingos'} · ${hint}`
    : `${chartData.length} ${chartData.length === 1 ? 'mes' : 'meses'} · ${hint}`;

  const tablaData = [...ofrendas]
    .filter(d => tablaMesFiltro ? d.fecha.startsWith(tablaMesFiltro) : true)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const tablaEfectivo      = tablaData.reduce((s, d) => s + Number(d.efectivo), 0);
  const tablaTerminal      = tablaData.reduce((s, d) => s + Number(d.terminal), 0);
  const tablaTransferencia = tablaData.reduce((s, d) => s + Number(d.transferencia || 0), 0);
  const tablaOfrendas      = tablaData.reduce((s, d) => s + Number(d.ofrendas ?? 0), 0);
  const tablaParticipMes   = tablaMesFiltro
    ? (resumenMeses.find(r => r.mes === tablaMesFiltro)?.participMes ?? null) : null;
  const tablaRows = tablaData.map(d => {
    const a   = asistByFecha[toISODate(d.fecha)];
    const den = (a?.adultos ?? 0) + (a?.voluntarios ?? 0);
    const sob = Number(d.ofrendas ?? 0);
    return { ...d, participDom: (sob > 0 && den > 0) ? Math.round(sob / den * 100) : null };
  });

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
      Cargando registros…
    </div>
  );
  if (!ultimoDomingo) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
      Sin registros de ofrendas para {year}.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI cards (4-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>

        {/* 1 · Último domingo */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Último domingo
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: 'var(--black)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 600, marginRight: 1 }}>$</span>
              {fmtNum(Number(ultimoDomingo.total_ofrenda))}
            </div>
            <Sparkline values={spark1} color="var(--chart-secondary)" />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Efectivo <b style={{ color: 'var(--black)' }}>{fmt(Number(ultimoDomingo.efectivo))}</b></span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Terminal <b style={{ color: 'var(--black)' }}>{fmt(Number(ultimoDomingo.terminal))}</b></span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Sobres <b style={{ color: 'var(--black)' }}>{Number(ultimoDomingo.ofrendas ?? 0)}</b></span>
          </div>
        </div>

        {/* 2 · Promedio participación */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Promedio de participación
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: 'var(--black)', fontVariantNumeric: 'tabular-nums' }}>
              {promedioParticipacion !== null ? promedioParticipacion : '—'}
              {promedioParticipacion !== null && (
                <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 600 }}>%</span>
              )}
            </div>
            <Sparkline values={spark2.length >= 2 ? spark2 : null} color={NAVY_500}
              dashed={spark2.length < 2} />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <span>Total de ofrendas del año: <b style={{ color: 'var(--black)' }}>{totalOfrendasAnio}</b></span>
          </div>
        </div>

        {/* 3 · Mes actual */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Mes actual · {mesLabelCap}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1,
              color: spark3.length === 0 ? 'var(--muted)' : 'var(--black)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 600, marginRight: 1 }}>$</span>
              {fmtNum(totalMesActual)}
            </div>
            <Sparkline values={spark3.length >= 2 ? spark3 : null}
              color="var(--chart-secondary)" dashed={spark3.length < 2} />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <span>
              {ofrendasMesActual.length === 0
                ? `${mesLabelCap} aún sin registros`
                : `${ofrendasMesActual.length} ${ofrendasMesActual.length === 1 ? 'domingo' : 'domingos'} registrados`}
            </span>
          </div>
        </div>

        {/* 4 · Acumulado del año */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Acumulado del año
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: GREEN_600, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, color: GREEN_400, fontWeight: 600, marginRight: 1 }}>$</span>
              {fmtNum(acumuladoAnio)}
            </div>
            <Sparkline values={spark4.length >= 2 ? spark4 : null} color={GREEN_600}
              filled gradId="accGrad" gradColor={GREEN_600}
              dashed={spark4.length < 2} />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <b style={{ color: 'var(--black)' }}>{ofrendas.length}</b>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>{year}</span>
          </div>
        </div>
      </div>

      {/* ── Method totals (3-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

        {/* Efectivo */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total efectivo del año</div>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: 'rgba(17,37,64,0.08)', color: 'var(--black)' }}>
              {pctEfectivo}%
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: 'var(--black)', fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
            <span style={{ fontSize: 18, opacity: 0.6 }}>$</span>{fmtNum(totalEfectivo)}
          </div>
          <div style={{ position: 'relative', height: 8, borderRadius: 999, background: '#E2E6EC' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pctEfectivo}%`, borderRadius: 999, background: 'var(--black)' }} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 9 }}>{pctEfectivo}% del total recaudado en el año</div>
        </div>

        {/* Terminal */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total terminal del año</div>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: 'rgba(48,81,129,0.10)', color: NAVY_600 }}>
              {pctTerminal}%
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: NAVY_600, fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
            <span style={{ fontSize: 18, opacity: 0.6 }}>$</span>{fmtNum(totalTerminal)}
          </div>
          <div style={{ position: 'relative', height: 8, borderRadius: 999, background: '#E2E6EC' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pctTerminal}%`, borderRadius: 999, background: NAVY_600 }} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 9 }}>{pctTerminal}% del total recaudado en el año</div>
        </div>

        {/* Transferencias */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total transferencias del año</div>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: 'rgba(156,176,204,0.18)', color: 'var(--muted)' }}>
              {pctTransferencia}%
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: NAVY_300, fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
            <span style={{ fontSize: 18, opacity: 0.6 }}>$</span>{fmtNum(totalTransferencia)}
          </div>
          <div style={{ position: 'relative', height: 8, borderRadius: 999, background: '#E2E6EC' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pctTransferencia}%`, borderRadius: 999, background: NAVY_300 }} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 9 }}>{pctTransferencia}% del total recaudado en el año</div>
        </div>
      </div>

      {/* ── Grid2: month list + chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', gap: 18, alignItems: 'start' }}>

        {/* Month list */}
        <div className="card" style={{ padding: '20px 20px 4px' }}>
          <div style={{ marginBottom: 4 }}>
            <h3 className="card-title">Resumen por mes</h3>
            <div className="card-sub">{year} · haz clic en un mes para ver el detalle</div>
          </div>
          {resumenMeses.map((r, idx) => {
            const activo = mesSeleccionado === r.mes;
            const totM   = r.efectivo + r.terminal + r.transfer;
            const pctEfM = totM > 0 ? Math.round(r.efectivo / totM * 100) : 0;
            const pctTeM = totM > 0 ? Math.round(r.terminal / totM * 100) : 0;
            const pctTrM = totM > 0 ? 100 - pctEfM - pctTeM : 0;
            const isLast = idx === resumenMeses.length - 1;
            return (
              <div key={r.mes} style={{
                display: 'flex', flexDirection: 'column', gap: 9,
                padding: '13px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
                background: activo ? 'rgba(255,107,43,0.04)' : 'transparent',
                marginLeft: activo ? -4 : 0,
                paddingLeft: activo ? 4 : 0,
                borderLeft: activo ? '3px solid var(--chart-secondary)' : 'none',
                transition: 'background 0.15s',
              }}>
                {/* Top line: name | meta | right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

                  {/* Month name — fixed 62px */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', width: 62, flexShrink: 0 }}>
                    {r.label}
                  </span>

                  {/* Meta: count + ver detalle btn + ofrendas/% */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      <b style={{ color: 'var(--black)' }}>{r.count}</b> dom.
                    </span>
                    <button
                      onClick={() => toggleMes(r.mes)}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer',
                        color:       activo ? 'white'                   : 'var(--chart-secondary)',
                        background:  activo ? 'var(--chart-secondary)'  : '#FFF4EE',
                        border:      activo ? '1px solid var(--chart-secondary)' : '1px solid #FFE4D1',
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                      }}
                    >
                      {activo ? 'Ocultar' : 'Ver detalle'}
                    </button>
                    {r.ofrendasM > 0 && r.participMes !== null && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        <b style={{ color: 'var(--black)' }}>{r.ofrendasM}</b> ofrendas · <b style={{ color: 'var(--black)' }}>{r.participMes}%</b>
                      </span>
                    )}
                  </div>

                  {/* Right: total + efectivo/terminal breakdown */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.03em', color: activo ? 'var(--chart-secondary)' : 'var(--black)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(r.total)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Efectivo {fmt(r.efectivo)} · Terminal {fmt(r.terminal)}
                    </div>
                  </div>
                </div>

                {/* Full-width stacked bar */}
                <div style={{ display: 'flex', height: 7, borderRadius: 999, overflow: 'hidden', background: '#DCE4EF' }}>
                  {totM > 0 && <>
                    <div style={{ width: `${pctEfM}%`, background: 'var(--black)' }} />
                    <div style={{ width: `${pctTeM}%`, background: '#DCE4EF' }} />
                    <div style={{ width: `${pctTrM}%`, background: '#E2E6EC' }} />
                  </>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Line chart */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 16 }}>
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
                  fontSize: 12, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                ← Ver todos los meses
              </button>
            )}
          </div>
          <LineChart data={chartData} />
        </div>
      </div>

      {/* ── Tabla de detalle ── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 12 }}>
          <div>
            <h3 className="card-title">Detalle de ingresos — {tablaMesFiltro ? mesNombre(tablaMesFiltro) : year}</h3>
            <div className="card-sub">{tablaData.length} {tablaData.length === 1 ? 'domingo' : 'domingos'}</div>
          </div>
          {canWrite && (
            <button className="btn btn-primary" onClick={() => openModal(null)}>
              <I.plus size={14} /><span className="topbar-btn-label"> Registrar Ofrenda</span>
            </button>
          )}
        </div>

        {/* Month chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <button
            onClick={() => setTablaMesFiltro(null)}
            style={{
              padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: tablaMesFiltro === null ? 'var(--chart-secondary)' : 'var(--surface)',
              color: tablaMesFiltro === null ? 'white' : 'var(--muted)',
              border: `1px solid ${tablaMesFiltro === null ? 'var(--chart-secondary)' : 'var(--border)'}`,
              transition: 'background 0.15s, color 0.15s',
            }}
          >Todos</button>
          {mesesDisponibles.map(m => (
            <button key={m}
              onClick={() => setTablaMesFiltro(prev => prev === m ? null : m)}
              style={{
                padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tablaMesFiltro === m ? 'var(--chart-secondary)' : 'var(--surface)',
                color: tablaMesFiltro === m ? 'white' : 'var(--muted)',
                border: `1px solid ${tablaMesFiltro === m ? 'var(--chart-secondary)' : 'var(--border)'}`,
                transition: 'background 0.15s, color 0.15s',
              }}
            >{mesNombre(m)}</button>
          ))}
        </div>

        {/* Totals band */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, marginBottom: 12, overflow: 'hidden',
        }}>
          {[
            { label: 'Efectivo',       value: tablaEfectivo,                                     color: 'var(--black)' },
            { label: 'Terminal',       value: tablaTerminal,                                     color: NAVY_600 },
            { label: 'Transferencias', value: tablaTransferencia,                                color: NAVY_300 },
            { label: 'Total',          value: tablaEfectivo + tablaTerminal + tablaTransferencia, color: GREEN_600 },
          ].map(({ label, value, color }, i, arr) => (
            <div key={label} style={{ padding: '10px 16px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color }}>{fmt(value)}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)' }}>
          <table className="table anf-table">
            <thead>
              <tr>
                <th>Domingo</th>
                <th style={{ textAlign: 'right' }}>Efectivo</th>
                <th style={{ textAlign: 'right' }}>Terminal</th>
                <th style={{ textAlign: 'right' }}>Transferencia</th>
                <th style={{ textAlign: 'right' }}>Ofrendas</th>
                <th style={{ textAlign: 'right' }}>Participación</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tablaRows.map(d => (
                <tr key={d.fecha}>
                  <td style={{ fontWeight: 500 }}>{fmtFecha(d.fecha)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--black)' }}>{fmt(Number(d.efectivo))}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: NAVY_600 }}>{fmt(Number(d.terminal))}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: NAVY_300 }}>{fmt(Number(d.transferencia || 0))}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number(d.ofrendas ?? 0) || '—'}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.participDom !== null ? `${d.participDom}%` : '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {canWrite && (
                      <button onClick={() => openModal(d)} className="edit-btn-row"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '3px 8px',
                          fontSize: 11.5, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1,
                        }}>
                        <I.edit size={11} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tbody>
              <tr className="anf-totals-row">
                <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '.08em' }}>
                  Totales {tablaMesFiltro ? mesNombre(tablaMesFiltro) : year}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--black)' }}>{fmt(tablaEfectivo)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: NAVY_600 }}>{fmt(tablaTerminal)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: NAVY_300 }}>{fmt(tablaTransferencia)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{tablaOfrendas || '—'}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--chart-secondary)', fontSize: 14 }}>
                  {tablaParticipMes !== null ? `${tablaParticipMes}%` : '—'}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
