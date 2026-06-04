import { useState } from 'react';
import { dataMaestra, mockGastos } from '../../data/mockData';

// ── Constants ─────────────────────────────────────────────────────────────────

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

const MESES_BAR = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function fmtFecha(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
}

function fmtFechaShort(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  });
}

function mesNombre(isoMes) {
  return new Date(isoMes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());
}

function catLabel(g) {
  return g.categoria_nombre ?? g.categoria ?? '—';
}

// ── Stacked Bar Chart ─────────────────────────────────────────────────────────

const VW = 900, VH = 260;
const PAD = { left: 72, right: 20, top: 20, bottom: 44 };

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
        {/* Grid + Y labels */}
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

        {/* Bars */}
        {barData.map((bar, i) => {
          const bx = toX(i);
          return (
            <g key={i}>
              {/* Stacked segments (IIFE to accumulate stack height) */}
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

              {/* Total label above bar when hovered */}
              {hovered === i && bar.total > 0 && (
                <text
                  x={bx + barW / 2} y={baseY - toH(bar.total) - 7}
                  textAnchor="middle" fontSize={10} fontWeight="700"
                  fill="var(--ink)" fontFamily="var(--font-mono)"
                >
                  {fmt(bar.total)}
                </text>
              )}

              {/* Transparent hover target (full column height) */}
              <rect
                x={bx} y={PAD.top} width={barW} height={chartH}
                fill="transparent" style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
              />

              {/* X axis label */}
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

      {/* Floating tooltip */}
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
              {mesNombre(bar.mes)} 2026
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const hoy = new Date();
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesLabelCap = hoy.toLocaleDateString('es-MX', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  // ── Fila 1 ──
  const ultimoGasto   = [...mockGastos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const gastosMesArr  = mockGastos.filter(g => g.fecha.startsWith(mes));
  const totalMes      = gastosMesArr.reduce((s, g) => s + g.monto, 0);
  const acumuladoAnio = mockGastos.reduce((s, g) => s + g.monto, 0);
  const totalIngresos = dataMaestra.reduce((s, d) => s + d.total_ofrenda, 0);
  const balance       = totalIngresos - acumuladoAnio;

  // ── Fila 2 — por categoría ──
  const catTotals = CATEGORIAS.map(cat => ({
    cat,
    total: mockGastos
      .filter(g => catLabel(g) === cat)
      .reduce((s, g) => s + g.monto, 0),
  }));

  // ── Barras por mes ──
  const barData = MESES_BAR.map(m => {
    const gastos = mockGastos.filter(g => g.fecha.startsWith(m));
    const cats = {};
    CATEGORIAS.forEach(cat => {
      cats[cat] = gastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + g.monto, 0);
    });
    return { mes: m, total: gastos.reduce((s, g) => s + g.monto, 0), cats };
  });
  const yMax = Math.max(Math.ceil(Math.max(...barData.map(b => b.total)) / 5000) * 5000, 5000);

  // ── Tabla ──
  const [mesTabla, setMesTabla] = useState('todos');
  const [catTabla, setCatTabla] = useState('todos');

  const mesesDisponibles = [...new Set(mockGastos.map(g => g.fecha.slice(0, 7)))].sort();

  const tablaData = [...mockGastos]
    .filter(g => mesTabla === 'todos' || g.fecha.startsWith(mesTabla))
    .filter(g => catTabla === 'todos' || catLabel(g) === catTabla)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const tablaTotal = tablaData.reduce((s, g) => s + g.monto, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Fila 1: 4 tarjetas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>

        {/* Último gasto */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Último gasto
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(ultimoGasto.monto)}
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
        </div>

        {/* Mes actual */}
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

        {/* Acumulado año */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Acumulado del año
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(acumuladoAnio)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {mockGastos.length} gastos · 2026
          </div>
        </div>

        {/* Balance */}
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

      {/* ── Gráfica ── */}
      <div className="card" style={{ padding: '20px 20px 16px' }}>
        <div className="card-head" style={{ marginBottom: 20 }}>
          <div>
            <h3 className="card-title">Gastos por mes 2026</h3>
            <div className="card-sub">Barras apiladas por categoría · hover para detalles</div>
          </div>
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
        </div>
        <GastosBarChart barData={barData} yMax={yMax} />
      </div>

      {/* ── Tabla detallada ── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="card-title">Detalle de gastos</h3>
            <div className="card-sub">{tablaData.length} gastos · total {fmt(tablaTotal)}</div>
          </div>
        </div>

        {/* Filtros */}
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
                        {fmt(g.monto)}
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
