import { useState, useEffect } from 'react';
import { gastosApi, ofrendasApi } from '../../services/api';
import { useGastosModal } from '../../context/GastosModalContext';
import { fmtFecha, fmtFechaShort, mesNombre } from '../../utils/fecha';

// ── Constants ─────────────────────────────────────────────────────────────────

const ORANGE = '#F97316';

const CATEGORIAS = ['Operación', 'Alimentos', 'Materiales', 'Eventos', 'Decoración'];

const CAT_COLORS = {
  'Operación':  '#00B4D8',
  'Alimentos':  '#FF6B2B',
  'Materiales': '#1A1A1A',
  'Eventos':    '#6B6B6B',
  'Decoración': '#A3A3A3',
};

const CAT_BG = {
  'Operación':  'rgba(0,180,216,0.12)',
  'Alimentos':  'rgba(255,107,43,0.12)',
  'Materiales': 'rgba(26,26,26,0.08)',
  'Eventos':    'rgba(107,107,107,0.12)',
  'Decoración': 'rgba(163,163,163,0.15)',
};

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function catLabel(g) {
  return g.categoria_nombre ?? g.categoria ?? '—';
}

// ── Shared chart dimensions ───────────────────────────────────────────────────

const VW = 900, VH = 260;
const PAD = { left: 72, right: 20, top: 20, bottom: 44 };

// ── Stacked Bar Chart — todos los meses ──────────────────────────────────────

function GastosBarChart({ barData, yMax }) {
  const [hovered, setHovered] = useState(null);

  const chartW  = VW - PAD.left - PAD.right;
  const chartH  = VH - PAD.top  - PAD.bottom;
  const baseY   = PAD.top + chartH;
  const groupW  = chartW / barData.length;
  const barW    = Math.round(groupW * 0.58);
  const barOffX = (groupW - barW) / 2;

  const toX = i => PAD.left + i * groupW + barOffX;
  const toH = v => (v / yMax) * chartH;

  const yTicks = Array.from({ length: Math.round(yMax / 5000) + 1 }, (_, i) => i * 5000);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} x2={VW - PAD.right}
              y1={baseY - toH(v)} y2={baseY - toH(v)}
              stroke="#ddd5c8" strokeWidth={v === 0 ? 1.2 : 0.65}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text
              x={PAD.left - 10} y={baseY - toH(v) + 4}
              textAnchor="end" fontSize={10} fill="#b0a090" fontFamily="var(--font-mono)"
            >
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        ))}

        {barData.map((bar, i) => {
          const bx = toX(i);
          return (
            <g key={i}>
              {(() => {
                let stack = 0;
                return CATEGORIAS.map(cat => {
                  const monto = bar.cats[cat] || 0;
                  if (monto === 0) return null;
                  const h  = toH(monto);
                  const ry = baseY - stack - h;
                  stack += h;
                  return (
                    <rect
                      key={cat}
                      x={bx} y={ry} width={barW} height={h}
                      fill={CAT_COLORS[cat]}
                      opacity={hovered === null || hovered === i ? 1 : 0.3}
                      style={{ transition: 'opacity 0.14s' }}
                    />
                  );
                });
              })()}

              {hovered === i && bar.total > 0 && (
                <text
                  x={bx + barW / 2} y={baseY - toH(bar.total) - 7}
                  textAnchor="middle" fontSize={10} fontWeight="700"
                  fill="var(--ink)" fontFamily="var(--font-mono)"
                >
                  {fmt(bar.total)}
                </text>
              )}

              <rect
                x={bx} y={PAD.top} width={barW} height={chartH}
                fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
              />

              <text
                x={bx + barW / 2} y={baseY + 19}
                textAnchor="middle" fontSize={10.5}
                fill={hovered === i ? '#3a2a1a' : '#b0a090'}
                fontWeight={hovered === i ? '600' : '400'}
              >
                {mesNombre(bar.mes)}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && (() => {
        const bar  = barData[hovered];
        const bx   = toX(hovered);
        const lPct = (bx + barW / 2) / VW * 100;
        const tPct = bar.total > 0 ? (baseY - toH(bar.total)) / VH * 100 : 10;
        const tx   = lPct > 72 ? '-94%' : lPct < 20 ? '6%' : '-50%';
        return (
          <div
            style={{
              position: 'absolute',
              left: `${lPct}%`, top: `${tPct}%`,
              transform: `translate(${tx}, -114%)`,
              pointerEvents: 'none',
              background: '#1A1A1A', color: 'white',
              borderRadius: 10, padding: '11px 15px',
              fontSize: 12.5, lineHeight: 1.8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
              whiteSpace: 'nowrap', zIndex: 20,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {mesNombre(bar.mes)}
            </div>
            {CATEGORIAS.map(cat => {
              const monto = bar.cats[cat] || 0;
              if (monto === 0) return null;
              return (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: CAT_COLORS[cat], display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ opacity: 0.72, fontSize: 12 }}>{cat}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(monto)}</span>
                </div>
              );
            })}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 6, paddingTop: 6,
              display: 'flex', justifyContent: 'space-between', gap: 20,
            }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#f4a070' }}>{fmt(bar.total)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Simple Bar Chart — por categoría (mes seleccionado) ──────────────────────

function GatosCatBarChart({ catData }) {
  const [hovered, setHovered] = useState(null);

  if (catData.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin gastos registrados en este mes.
      </div>
    );
  }

  const chartW  = VW - PAD.left - PAD.right;
  const chartH  = VH - PAD.top  - PAD.bottom;
  const baseY   = PAD.top + chartH;
  const groupW  = chartW / catData.length;
  const barW    = Math.round(groupW * 0.54);
  const barOffX = (groupW - barW) / 2;

  const maxMonto = Math.max(...catData.map(c => c.monto));
  const yMax     = Math.max(Math.ceil(maxMonto / 5000) * 5000, 5000);
  const yTicks   = Array.from({ length: Math.round(yMax / 5000) + 1 }, (_, i) => i * 5000);

  const toX = i => PAD.left + i * groupW + barOffX;
  const toH = v => (v / yMax) * chartH;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={PAD.left} x2={VW - PAD.right}
              y1={baseY - toH(v)} y2={baseY - toH(v)}
              stroke="#ddd5c8" strokeWidth={v === 0 ? 1.2 : 0.65}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text
              x={PAD.left - 10} y={baseY - toH(v) + 4}
              textAnchor="end" fontSize={10} fill="#b0a090" fontFamily="var(--font-mono)"
            >
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        ))}

        {catData.map(({ cat, monto }, i) => {
          const bx = toX(i);
          const h  = toH(monto);
          return (
            <g key={cat}>
              <rect
                x={bx} y={baseY - h} width={barW} height={h}
                fill={CAT_COLORS[cat]}
                opacity={hovered === null || hovered === i ? 1 : 0.3}
                style={{ transition: 'opacity 0.14s' }}
              />
              {hovered === i && (
                <text
                  x={bx + barW / 2} y={baseY - h - 7}
                  textAnchor="middle" fontSize={10} fontWeight="700"
                  fill="var(--ink)" fontFamily="var(--font-mono)"
                >
                  {fmt(monto)}
                </text>
              )}
              <rect
                x={bx} y={PAD.top} width={barW} height={chartH}
                fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
              />
              <text
                x={bx + barW / 2} y={baseY + 19}
                textAnchor="middle" fontSize={10.5}
                fill={hovered === i ? '#3a2a1a' : '#b0a090'}
                fontWeight={hovered === i ? '600' : '400'}
              >
                {cat}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && catData[hovered] && (() => {
        const { cat, monto } = catData[hovered];
        const bx   = toX(hovered);
        const lPct = (bx + barW / 2) / VW * 100;
        const tPct = (baseY - toH(monto)) / VH * 100;
        const tx   = lPct > 72 ? '-94%' : lPct < 20 ? '6%' : '-50%';
        return (
          <div
            style={{
              position: 'absolute',
              left: `${lPct}%`, top: `${tPct}%`,
              transform: `translate(${tx}, -114%)`,
              pointerEvents: 'none',
              background: '#1A1A1A', color: 'white',
              borderRadius: 10, padding: '11px 15px',
              fontSize: 12.5, lineHeight: 1.8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
              whiteSpace: 'nowrap', zIndex: 20,
            }}
          >
            <div style={{
              fontWeight: 700, marginBottom: 6, fontSize: 13,
              color: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2,
                background: CAT_COLORS[cat], display: 'inline-block', flexShrink: 0,
              }} />
              {cat}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
              <span style={{ opacity: 0.7, fontSize: 12 }}>Gasto</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f4a070' }}>
                {fmt(monto)}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const hoy  = new Date();
  const year = hoy.getFullYear();
  const mes  = `${year}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesLabelCap = hoy.toLocaleDateString('es-MX', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  const { refreshKey } = useGastosModal();

  const [gastos, setGastos]               = useState([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [mesSeleccionado, setMesSelec]    = useState(null);

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      gastosApi.getAll({ year }),
      ofrendasApi.resumenAnual(year),
    ]).then(([gRes, oRes]) => {
      if (cancelled) return;
      setGastos(gRes.data || []);
      const ing = (oRes.data || []).reduce((s, r) => s + Number(r.total_ofrenda || 0), 0);
      setTotalIngresos(ing);
    }).catch(() => {
      if (!cancelled) { setGastos([]); setTotalIngresos(0); }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [year, refreshKey]);

  // ── Fila 1 ──
  const ultimoGasto   = gastos.length > 0
    ? [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
    : null;
  const gastosMesArr  = gastos.filter(g => g.fecha.startsWith(mes));
  const totalMes      = gastosMesArr.reduce((s, g) => s + Number(g.monto), 0);
  const acumuladoAnio = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const balance       = totalIngresos - acumuladoAnio;

  // ── Fila 2 — por categoría ──
  const catTotals = CATEGORIAS.map(cat => ({
    cat,
    total: gastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0),
  }));

  // ── Meses del año hasta el actual ──
  const curMesNum = hoy.getMonth() + 1;
  const MESES_BAR = Array.from({ length: curMesNum }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );

  // ── Resumen por mes (izquierda) ──
  const resumenMeses = MESES_BAR
    .map(m => {
      const mGastos = gastos.filter(g => g.fecha.startsWith(m));
      const total   = mGastos.reduce((s, g) => s + Number(g.monto), 0);
      const cats    = {};
      CATEGORIAS.forEach(cat => {
        const v = mGastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0);
        if (v > 0) cats[cat] = v;
      });
      return { mes: m, label: mesNombre(m), total, cats, count: mGastos.length };
    })
    .filter(r => r.count > 0);

  // ── Datos para la gráfica ──
  const barData = MESES_BAR.map(m => {
    const mGastos = gastos.filter(g => g.fecha.startsWith(m));
    const cats = {};
    CATEGORIAS.forEach(cat => {
      cats[cat] = mGastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0);
    });
    return { mes: m, total: mGastos.reduce((s, g) => s + Number(g.monto), 0), cats };
  });
  const yMax = Math.max(
    Math.ceil(Math.max(...barData.map(b => b.total), 0) / 5000) * 5000,
    5000
  );

  // Datos de categorías para el mes seleccionado
  const catDataForMes = mesSeleccionado
    ? CATEGORIAS
        .map(cat => ({
          cat,
          monto: gastos
            .filter(g => g.fecha.startsWith(mesSeleccionado) && catLabel(g) === cat)
            .reduce((s, g) => s + Number(g.monto), 0),
        }))
        .filter(c => c.monto > 0)
    : [];

  const chartTitle = mesSeleccionado
    ? `Gastos por categoría — ${mesNombre(mesSeleccionado)} ${year}`
    : `Gastos por mes ${year}`;
  const chartSub = mesSeleccionado
    ? `${catDataForMes.length} ${catDataForMes.length === 1 ? 'categoría' : 'categorías'} con gastos · hover para detalles`
    : 'Barras apiladas por categoría · hover para detalles';

  // ── Tabla ──
  const [mesTabla, setMesTabla] = useState('todos');
  const [catTabla, setCatTabla] = useState('todos');

  const mesesDisponibles = [...new Set(gastos.map(g => g.fecha.slice(0, 7)))].sort();

  const tablaData = [...gastos]
    .filter(g => mesTabla === 'todos' || g.fecha.startsWith(mesTabla))
    .filter(g => catTabla === 'todos' || catLabel(g) === catTabla)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const tablaTotal = tablaData.reduce((s, g) => s + Number(g.monto), 0);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando gastos…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Fila 1: 4 tarjetas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Último gasto
          </div>
          {ultimoGasto ? (
            <>
              <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {fmt(Number(ultimoGasto.monto))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{fmtFecha(ultimoGasto.fecha)}</div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>
                  {ultimoGasto.concepto.length > 34
                    ? ultimoGasto.concepto.slice(0, 34) + '…'
                    : ultimoGasto.concepto}
                </div>
                <span style={{
                  display: 'inline-block', marginTop: 6,
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                  background: CAT_BG[catLabel(ultimoGasto)] || 'rgba(0,0,0,0.08)',
                  color: CAT_COLORS[catLabel(ultimoGasto)] || 'var(--muted)',
                }}>
                  {catLabel(ultimoGasto)}
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Sin gastos registrados</div>
          )}
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Mes actual ({mesLabelCap})
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalMes)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {gastosMesArr.length} {gastosMesArr.length === 1 ? 'gasto' : 'gastos'} registrados
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Acumulado del año
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(acumuladoAnio)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {gastos.length} gastos · {year}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '18px 20px',
            background: balance >= 0 ? 'rgba(79,138,91,0.08)' : 'rgba(180,74,58,0.08)',
          }}
        >
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Balance neto
          </div>
          <div style={{
            fontSize: 27, fontWeight: 800, marginTop: 10,
            fontFamily: 'var(--font-mono)', lineHeight: 1,
            color: balance >= 0 ? 'var(--good)' : 'var(--danger)',
          }}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {balance >= 0 ? 'Superávit' : 'Déficit'} · ingresos {fmt(totalIngresos)}
          </div>
        </div>
      </div>

      {/* ── Fila 2: 5 tarjetas por categoría ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
        {catTotals.map(({ cat, total }) => {
          const pct = acumuladoAnio > 0 ? Math.round((total / acumuladoAnio) * 100) : 0;
          return (
            <div key={cat} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: CAT_COLORS[cat],
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {cat}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                  background: CAT_BG[cat], color: CAT_COLORS[cat],
                }}>
                  {pct}%
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {fmt(total)}
              </div>
              <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: 'var(--border)' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: CAT_COLORS[cat], opacity: 0.8 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Fila 3: Resumen por mes (izq) + Gráfica (der) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>

        {/* Resumen por mes */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="card-title">Resumen por mes</h3>
              <div className="card-sub">{year} · haz clic en un mes para ver el desglose</div>
            </div>
          </div>

          {resumenMeses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
              Sin gastos registrados en {year}.
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
                      background: activo ? 'rgba(249,115,22,0.07)' : 'transparent',
                      color: 'var(--ink)', border: 'none',
                      borderLeft: activo ? `3px solid ${ORANGE}` : '3px solid transparent',
                      width: '100%', textAlign: 'left',
                      transition: 'background 0.15s, border-left-color 0.15s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{r.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {r.count} {r.count === 1 ? 'gasto' : 'gastos'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
                        {Object.entries(r.cats).map(([cat, val], idx, arr) => (
                          <span key={cat}>
                            <span style={{ color: CAT_COLORS[cat], fontWeight: 600 }}>{cat}</span>
                            {' '}{fmt(val)}{idx < arr.length - 1 ? ' · ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                        color: activo ? ORANGE : 'var(--danger)',
                      }}>
                        {fmt(r.total)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfica */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 20 }}>
            <div>
              <h3 className="card-title">{chartTitle}</h3>
              <div className="card-sub">{chartSub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {mesSeleccionado ? (
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
                  ← Ver todos los meses
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {CATEGORIAS.map(cat => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 2,
                        background: CAT_COLORS[cat], display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{cat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {mesSeleccionado
            ? <GatosCatBarChart catData={catDataForMes} />
            : <GastosBarChart barData={barData} yMax={yMax} />
          }
        </div>
      </div>

      {/* ── Tabla detallada ── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="card-title">Detalle de gastos</h3>
            <div className="card-sub">{tablaData.length} gastos · total {fmt(tablaTotal)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>Mes</span>
            <button className={`chip${mesTabla === 'todos' ? ' active' : ''}`} onClick={() => setMesTabla('todos')}>Todos</button>
            {mesesDisponibles.map(m => (
              <button key={m} className={`chip${mesTabla === m ? ' active' : ''}`} onClick={() => setMesTabla(m)}>
                {mesNombre(m)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>Categoría</span>
            <button className={`chip${catTabla === 'todos' ? ' active' : ''}`} onClick={() => setCatTabla('todos')}>Todas</button>
            {CATEGORIAS.map(cat => (
              <button key={cat} className={`chip${catTabla === cat ? ' active' : ''}`} onClick={() => setCatTabla(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {tablaData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin gastos en este filtro.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
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
                      <td style={{ fontWeight: 500 }}>{g.concepto}</td>
                      <td>
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                          background: CAT_BG[cat] || 'rgba(0,0,0,0.08)',
                          color: CAT_COLORS[cat] || 'var(--muted)',
                          whiteSpace: 'nowrap',
                        }}>
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
                  <td colSpan={2} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    {mesTabla === 'todos' && catTabla === 'todos'
                      ? 'Totales'
                      : `Totales${mesTabla !== 'todos' ? ` ${mesNombre(mesTabla)}` : ''}${catTabla !== 'todos' ? ` · ${catTabla}` : ''}`}
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
