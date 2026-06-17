import { useState, useEffect } from 'react';
import { gastosApi } from '../../services/api';
import { useGastosModal } from '../../context/GastosModalContext';
import { fmtFecha, fmtFechaShort, mesNombre } from '../../utils/fecha';
import { useIsMobile } from '../../utils/useIsMobile';
import { CATEGORIAS, CAT_COLORS, CAT_BG } from '../../utils/categorias';
import { I } from '../../components/Icons';

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}
function fmtNum(n) {
  return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}
function catLabel(g) {
  return g.categoria_nombre ?? g.categoria ?? '—';
}

// ── Sparkline (96×32 inline SVG, same pattern as Ingresos) ────────────────────
function Sparkline({ values, color, filled = false, gradId, gradColor, dashed = false }) {
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
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    +((i / (values.length - 1)) * 100).toFixed(1),
    +(28 - ((v - min) / range) * 26).toFixed(1),
  ]);
  const polyStr = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  const [fx]     = pts[0];
  return (
    <svg style={{ width: 96, height: 32, flexShrink: 0 }} viewBox="0 0 100 32" preserveAspectRatio="none">
      {filled && gradId && (
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={gradColor || color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={gradColor || color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {filled && gradId && (
        <path d={`M${fx},${pts[0][1]} ${pts.slice(1).map(([x,y])=>`L${x},${y}`).join(' ')} L${lx},32 L${fx},32 Z`}
          fill={`url(#${gradId})`} />
      )}
      <polyline points={polyStr} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.6" fill={color} />
    </svg>
  );
}

// ── Horizontal bar chart per category (SVG) ───────────────────────────────────
function GastosCatChart({ catData }) {
  if (catData.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin gastos registrados.
      </div>
    );
  }
  const HVW = 900, HVH = 260;
  const HPAD = { left: 112, right: 110, top: 28, bottom: 8 };
  const chartW = HVW - HPAD.left - HPAD.right;
  const chartH = HVH - HPAD.top  - HPAD.bottom;
  const sorted  = [...catData].sort((a, b) => b.monto - a.monto);
  const maxMonto = Math.max(...sorted.map(c => c.monto));
  const xMax   = Math.max(Math.ceil(maxMonto / 5000) * 5000, 5000);
  const xTicks = Array.from({ length: Math.round(xMax / 5000) + 1 }, (_, i) => i * 5000);
  const n = sorted.length, rowH = chartH / n;
  const barH = Math.min(Math.round(rowH * 0.58), 40);
  const barOffY = (rowH - barH) / 2;
  const toW = v => (v / xMax) * chartW;
  return (
    <svg viewBox={`0 0 ${HVW} ${HVH}`}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {xTicks.map(v => {
        const x = HPAD.left + toW(v);
        return (
          <g key={v}>
            <line x1={x} x2={x} y1={HPAD.top} y2={HPAD.top + chartH}
              stroke="var(--border)" strokeWidth={v === 0 ? 1.2 : 0.65} strokeDasharray={v === 0 ? '' : '3 3'} />
            <text x={x} y={HPAD.top - 8} textAnchor="middle" fontSize={9.5}
              fill="var(--muted)" fontFamily="var(--font-mono)">
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        );
      })}
      {sorted.map(({ cat, monto }, i) => {
        const barY = HPAD.top + i * rowH + barOffY;
        return (
          <g key={cat}>
            <text x={HPAD.left - 10} y={barY + barH / 2 + 4} textAnchor="end"
              fontSize={11.5} fill="var(--ink)" fontWeight="500">{cat}</text>
            <rect x={HPAD.left} y={barY} width={toW(monto)} height={barH}
              fill={CAT_COLORS[cat]} rx={3} />
            <text x={HPAD.left + toW(monto) + 8} y={barY + barH / 2 + 4}
              textAnchor="start" fontSize={11} fill="var(--ink)"
              fontFamily="var(--font-mono)" fontWeight="700">{fmt(monto)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const hoy  = new Date();
  const year = hoy.getFullYear();
  const mes  = `${year}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesLabelCap = hoy.toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());

  const { refreshKey } = useGastosModal();
  const isMobile = useIsMobile();

  const [gastos, setGastos]            = useState([]);
  const [loading, setLoading]          = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);
  const [mesTabla, setMesTabla]        = useState('todos');

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    gastosApi.getAll({ year, pagado: 'true' })
      .then(res => { if (!cancelled) setGastos(res.data || []); })
      .catch(() => { if (!cancelled) setGastos([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, refreshKey]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const sorted      = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimoGasto = sorted[0] ?? null;

  const gastosMesArr  = gastos.filter(g => g.fecha.startsWith(mes));
  const totalMes      = gastosMesArr.reduce((s, g) => s + Number(g.monto), 0);
  const acumuladoAnio = gastos.reduce((s, g) => s + Number(g.monto), 0);

  // Promedio mensual (meses con al menos 1 gasto)
  const mesesConGastos = [...new Set(gastos.map(g => g.fecha.slice(0, 7)))];
  const promedioMensual = mesesConGastos.length > 0
    ? acumuladoAnio / mesesConGastos.length : 0;

  // Category totals
  const catTotals = CATEGORIAS.map(cat => ({
    cat,
    total: gastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0),
  }));
  const catMayor = [...catTotals].sort((a, b) => b.total - a.total)[0];
  const catMayorPct = acumuladoAnio > 0 && catMayor
    ? Math.round(catMayor.total / acumuladoAnio * 100) : 0;

  // Meses del año hasta el actual con gastos
  const curMesNum = hoy.getMonth() + 1;
  const MESES_ALL = Array.from({ length: curMesNum }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );
  const resumenMeses = MESES_ALL
    .map(m => {
      const mGastos = gastos.filter(g => g.fecha.startsWith(m));
      if (mGastos.length === 0) return null;
      const total = mGastos.reduce((s, g) => s + Number(g.monto), 0);
      const cats  = {};
      CATEGORIAS.forEach(cat => {
        const v = mGastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0);
        if (v > 0) cats[cat] = v;
      });
      return { mes: m, label: mesNombre(m), total, cats, count: mGastos.length };
    })
    .filter(Boolean);

  // Chart data
  const catDataAnual = CATEGORIAS
    .map(cat => ({ cat, monto: gastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0) }))
    .filter(c => c.monto > 0);
  const catDataForMes = mesSeleccionado
    ? CATEGORIAS
        .map(cat => ({ cat, monto: gastos.filter(g => g.fecha.startsWith(mesSeleccionado) && catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0) }))
        .filter(c => c.monto > 0)
    : [];

  // Table
  const mesesDisponibles = [...new Set(gastos.map(g => g.fecha.slice(0, 7)))].sort();
  const tablaData = [...gastos]
    .filter(g => mesTabla === 'todos' || g.fecha.startsWith(mesTabla))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const tablaTotal = tablaData.reduce((s, g) => s + Number(g.monto), 0);
  const tablaCount = tablaData.length;

  // Table totband: filtered category mayor
  const tblCatTotals = CATEGORIAS.map(cat => ({
    cat, total: tablaData.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0),
  }));
  const tblCatMayor = [...tblCatTotals].sort((a, b) => b.total - a.total)[0];
  const tblCatPct   = tablaTotal > 0 && tblCatMayor
    ? Math.round(tblCatMayor.total / tablaTotal * 100) : 0;

  // Sparkline data
  const spark1 = sorted.slice(0, 8).reverse().map(g => Number(g.monto)); // Último gasto: recent montos
  const spark2 = gastosMesArr.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(g => Number(g.monto)); // Mes actual
  const spark3 = (() => { let run = 0; return resumenMeses.map(r => { run += r.total; return run; }); })(); // Acumulado
  const spark4 = resumenMeses.map(r => r.total); // Promedio mensual trend

  const chartTitle = mesSeleccionado
    ? `Gastos por categoría — ${mesNombre(mesSeleccionado)} ${year}`
    : `Gastos por categoría — ${year}`;

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Cargando gastos…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI cards (4-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>

        {/* 1 · Último gasto */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Último gasto
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: ultimoGasto ? 'var(--danger)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, color: 'var(--danger)', fontWeight: 600, marginRight: 1, opacity: 0.7 }}>$</span>
              {ultimoGasto ? fmtNum(Number(ultimoGasto.monto)) : '0'}
            </div>
            <Sparkline values={spark1.length >= 2 ? spark1 : null} color="var(--danger)"
              dashed={spark1.length < 2} />
          </div>
          {ultimoGasto ? (
            <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{fmtFecha(ultimoGasto.fecha)}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {ultimoGasto.concepto}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: CAT_BG[catLabel(ultimoGasto)] || 'rgba(0,0,0,0.08)',
                color: CAT_COLORS[catLabel(ultimoGasto)] || 'var(--muted)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[catLabel(ultimoGasto)], flexShrink: 0 }} />
                {catLabel(ultimoGasto)}
              </span>
            </div>
          ) : (
            <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)' }}>
              Sin gastos registrados
            </div>
          )}
        </div>

        {/* 2 · Mes actual */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Mes actual · {mesLabelCap}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1,
              color: gastosMesArr.length === 0 ? 'var(--muted)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, fontWeight: 600, marginRight: 1, color: gastosMesArr.length === 0 ? 'var(--muted)' : 'var(--danger)', opacity: 0.7 }}>$</span>
              {fmtNum(totalMes)}
            </div>
            <Sparkline values={spark2.length >= 2 ? spark2 : null} color="var(--danger)"
              dashed={spark2.length < 2} />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 8 }}>
            <span>{gastosMesArr.length} {gastosMesArr.length === 1 ? 'gasto' : 'gastos'} registrados</span>
          </div>
        </div>

        {/* 3 · Acumulado del año */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Acumulado del año
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, fontWeight: 600, marginRight: 1, color: 'var(--danger)', opacity: 0.7 }}>$</span>
              {fmtNum(acumuladoAnio)}
            </div>
            <Sparkline values={spark3.length >= 2 ? spark3 : null} color="var(--danger)"
              filled gradId="accRed" gradColor="var(--danger)"
              dashed={spark3.length < 2} />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 8 }}>
            <b style={{ color: 'var(--black)' }}>{gastos.length}</b>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>{year}</span>
          </div>
        </div>

        {/* 4 · Promedio mensual */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Promedio mensual
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: 'var(--black)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 600, marginRight: 1 }}>$</span>
              {fmtNum(promedioMensual)}
            </div>
            <Sparkline values={spark4.length >= 2 ? spark4 : null} color="#3E6499"
              dashed={spark4.length < 2} />
          </div>
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 8 }}>
            <span>{mesesConGastos.length} {mesesConGastos.length === 1 ? 'mes' : 'meses'} con registros</span>
          </div>
        </div>
      </div>

      {/* ── Category cards (5-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {catTotals.map(({ cat, total }) => {
          const pct = acumuladoAnio > 0 ? Math.round(total / acumuladoAnio * 100) : 0;
          return (
            <div key={cat} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: CAT_COLORS[cat], flexShrink: 0 }} />
                  {cat}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)' }}>
                  {pct}%
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1, color: 'var(--black)', fontVariantNumeric: 'tabular-nums', marginBottom: 11 }}>
                {fmt(total)}
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--surface)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: CAT_COLORS[cat] }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Grid2: Resumen por mes + Chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', gap: 18, alignItems: 'start' }}>

        {/* Resumen por mes */}
        <div className="card" style={{ padding: '20px 20px 4px' }}>
          <div style={{ marginBottom: 4 }}>
            <h3 className="card-title">Resumen por mes</h3>
            <div className="card-sub">{year} · haz clic en un mes para ver el desglose</div>
          </div>
          {resumenMeses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
              Sin gastos en {year}.
            </div>
          ) : resumenMeses.map((r, idx) => {
            const activo = mesSeleccionado === r.mes;
            const isLast = idx === resumenMeses.length - 1;
            const catEntries = Object.entries(r.cats);
            return (
              <div key={r.mes} style={{
                display: 'flex', flexDirection: 'column', gap: 9,
                padding: '13px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
                background: activo ? 'rgba(255,107,43,0.04)' : 'transparent',
                marginLeft: activo ? -4 : 0, paddingLeft: activo ? 4 : 0,
                borderLeft: activo ? '3px solid var(--chart-secondary)' : 'none',
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

                  {/* Month name */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', width: 62, flexShrink: 0 }}>
                    {r.label}
                  </span>

                  {/* Meta: count + ver detalle + cat breakdown */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      <b style={{ color: 'var(--black)' }}>{r.count}</b> {r.count === 1 ? 'gasto' : 'gastos'}
                    </span>
                    <button
                      onClick={() => toggleMes(r.mes)}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer',
                        color:      activo ? 'white' : 'var(--chart-secondary)',
                        background: activo ? 'var(--chart-secondary)' : '#FFF4EE',
                        border:     activo ? '1px solid var(--chart-secondary)' : '1px solid #FFE4D1',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {activo ? 'Ocultar' : 'Ver detalle'}
                    </button>
                    {catEntries.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 0 }}>
                        {catEntries.map(([cat, val], i) => (
                          <span key={cat}>
                            <span style={{ color: CAT_COLORS[cat], fontWeight: 600 }}>{cat}</span>
                            {' '}{fmt(val)}{i < catEntries.length - 1 ? ' · ' : ''}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>

                  {/* Total (right) */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.03em',
                      color: activo ? 'var(--chart-secondary)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(r.total)}
                    </div>
                  </div>
                </div>

                {/* Full-width stacked category bar */}
                <div style={{ display: 'flex', height: 7, borderRadius: 999, overflow: 'hidden', background: 'var(--surface)', gap: '1.5px' }}>
                  {catEntries.map(([cat, val]) => (
                    <div key={cat} style={{ width: `${Math.round(val / r.total * 100)}%`, background: CAT_COLORS[cat] }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="card-title">{chartTitle}</h3>
              <div className="card-sub">
                {mesSeleccionado
                  ? `${catDataForMes.length} ${catDataForMes.length === 1 ? 'categoría' : 'categorías'} con gastos`
                  : 'Barras horizontales · de mayor a menor'}
              </div>
            </div>
            {mesSeleccionado ? (
              <button onClick={() => setMesSelec(null)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 10px',
                fontSize: 12, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                ← Ver todos los meses
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                {CATEGORIAS.map(cat => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: CAT_COLORS[cat], display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <GastosCatChart catData={mesSeleccionado ? catDataForMes : catDataAnual} />
        </div>
      </div>

      {/* ── Tabla de detalle ── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 12 }}>
          <div>
            <h3 className="card-title">Detalle de gastos</h3>
            <div className="card-sub">{tablaCount} gastos · total {fmt(tablaTotal)}</div>
          </div>
        </div>

        {/* Totals band (3 cols) */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 1, background: 'var(--border)',
          border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
        }}>
          {[
            { label: `Total gastado · ${mesTabla !== 'todos' ? mesNombre(mesTabla) : year}`, value: fmt(tablaTotal), red: true },
            { label: 'Gastos registrados', value: String(tablaCount), red: false },
            { label: 'Categoría mayor', value: tblCatMayor && tblCatMayor.total > 0 ? `${tblCatMayor.cat} · ${tblCatPct}%` : '—', red: false },
          ].map(({ label, value, red }) => (
            <div key={label} style={{ background: 'var(--white, #fff)', padding: '14px 18px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', color: red ? 'var(--danger)' : 'var(--black)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', width: 62, flexShrink: 0 }}>Mes</span>
            {['todos', ...mesesDisponibles].map(m => (
              <button key={m}
                onClick={() => setMesTabla(m)}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
                  background: mesTabla === m ? 'var(--black)' : 'var(--white, #fff)',
                  color:      mesTabla === m ? 'white' : 'var(--muted)',
                  border:     `1px solid ${mesTabla === m ? 'var(--black)' : 'var(--border)'}`,
                  transition: 'background 0.12s, color 0.12s',
                }}>
                {m === 'todos' ? 'Todos' : mesNombre(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Table / Cards */}
        {tablaData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin gastos en este filtro.
          </div>
        ) : isMobile ? (
          /* ── MÓVIL: tarjetas apiladas ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tablaData.map(g => {
              const cat = catLabel(g);
              return (
                <div key={g.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '12px 14px',
                }}>
                  {/* Concepto */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                    {g.concepto}
                  </div>
                  {/* Badge + monto */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                      background: CAT_BG[cat] || 'rgba(0,0,0,0.08)',
                      color: CAT_COLORS[cat] || 'var(--muted)',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[cat], flexShrink: 0 }} />
                      {cat}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: 'var(--danger)', flexShrink: 0 }}>
                      {fmt(Number(g.monto))}
                    </span>
                  </div>
                  {/* Fecha */}
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                    {fmtFechaShort(g.fecha)}
                  </div>
                </div>
              );
            })}
            {/* Fila de totales */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 'var(--r-lg)',
              background: 'var(--surface-2, #f6f7f9)', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>
                {mesTabla === 'todos' ? 'Totales' : `Totales ${mesNombre(mesTabla)}`}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: 'var(--danger)' }}>
                {fmt(tablaTotal)}
              </span>
            </div>
          </div>
        ) : (
          /* ── ESCRITORIO: tabla original ── */
          <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {tablaData.map(g => {
                  const cat = catLabel(g);
                  return (
                    <tr key={g.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {fmtFechaShort(g.fecha)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{g.concepto}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                          background: CAT_BG[cat] || 'rgba(0,0,0,0.08)',
                          color: CAT_COLORS[cat] || 'var(--muted)',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[cat], flexShrink: 0 }} />
                          {cat}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                        {fmt(Number(g.monto))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tbody>
                <tr className="anf-totals-row">
                  <td colSpan={2} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '.08em' }}>
                    {mesTabla === 'todos' ? 'Totales' : `Totales ${mesNombre(mesTabla)}`}
                  </td>
                  <td />
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--danger)', fontSize: 14 }}>
                    {fmt(tablaTotal)}
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
