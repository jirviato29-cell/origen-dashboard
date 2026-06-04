import { useState } from 'react';
import { dataMaestra, mockGastos, saldoInicialCaja } from '../../data/mockData';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIAS = ['Operación', 'Alimentos', 'Materiales', 'Eventos', 'Decoración'];

const CAT_COLORS = {
  'Operación':  '#00B4D8',
  'Alimentos':  '#FF6B2B',
  'Materiales': '#1A1A1A',
  'Eventos':    '#6B6B6B',
  'Decoración': '#A3A3A3',
};

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

// ── Pre-compute weekly running totals ─────────────────────────────────────────

function buildWeeklyData() {
  const chronological = [...dataMaestra].sort((a, b) => a.fecha.localeCompare(b.fecha));
  let cumIngresos = 0, cumGastos = 0;
  return chronological.map(d => {
    const gastosDelDia = mockGastos
      .filter(g => g.fecha === d.fecha)
      .reduce((s, g) => s + g.monto, 0);
    cumIngresos += d.total_ofrenda;
    cumGastos   += gastosDelDia;
    return {
      fecha:         d.fecha,
      ingresos:      d.total_ofrenda,
      gastos:        gastosDelDia,
      balanceSemana: d.total_ofrenda - gastosDelDia,
      cumIngresos,
      cumGastos,
      balance:       cumIngresos - cumGastos,
    };
  });
}

// ── Dual-line Chart ───────────────────────────────────────────────────────────

const VW = 900, VH = 320;
const PAD = { left: 82, right: 28, top: 28, bottom: 52 };

function BalanceChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top  - PAD.bottom;

  const yMax = Math.ceil(Math.max(...data.map(d => d.cumIngresos)) / 25000) * 25000;
  const tickInterval = yMax > 80000 ? 25000 : 10000;
  const yTicks = Array.from({ length: Math.floor(yMax / tickInterval) + 1 }, (_, i) => i * tickInterval);

  const toX = i => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = v => PAD.top  + chartH - (v / yMax) * chartH;

  const ptsIng = data.map((d, i) => ({ x: toX(i), y: toY(d.cumIngresos), d, i }));
  const ptsGas = data.map((d, i) => ({ x: toX(i), y: toY(d.cumGastos),   d, i }));

  const pathIng = ptsIng.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const pathGas = ptsGas.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Filled area between the two curves (ingresos → gastos reversed → close)
  const areaPath =
    pathIng + ' ' +
    [...ptsGas].reverse().map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ' Z';

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
              y1={toY(v)}   y2={toY(v)}
              stroke="#ddd5c8" strokeWidth={v === 0 ? 1.2 : 0.65}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text
              x={PAD.left - 10} y={toY(v) + 4}
              textAnchor="end" fontSize={10} fill="#b0a090" fontFamily="var(--font-mono)"
            >
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        ))}

        {/* X axis labels — every 3rd point */}
        {ptsIng.map((p, i) => {
          if (i % 3 !== 0 && i !== ptsIng.length - 1) return null;
          return (
            <text key={i} x={p.x} y={PAD.top + chartH + 18}
              textAnchor="middle" fontSize={9.5} fill="#b0a090">
              {fmtFechaShort(data[i].fecha)}
            </text>
          );
        })}

        {/* End-of-line labels */}
        <text
          x={ptsIng[ptsIng.length - 1].x + 6}
          y={ptsIng[ptsIng.length - 1].y + 4}
          fontSize={9.5} fill="#00B4D8" fontWeight="700" fontFamily="var(--font-mono)"
        >
          {fmt(data[data.length - 1].cumIngresos)}
        </text>
        <text
          x={ptsGas[ptsGas.length - 1].x + 6}
          y={ptsGas[ptsGas.length - 1].y + 4}
          fontSize={9.5} fill="#FF6B2B" fontWeight="700" fontFamily="var(--font-mono)"
        >
          {fmt(data[data.length - 1].cumGastos)}
        </text>

        {/* Area fill between lines */}
        <path d={areaPath} fill="#00B4D8" opacity={0.08} />

        {/* Gastos line — dashed orange */}
        <path d={pathGas} fill="none" stroke="#FF6B2B" strokeWidth={2}
          strokeDasharray="7 4" strokeLinejoin="round" strokeLinecap="round" />

        {/* Ingresos line — solid cyan */}
        <path d={pathIng} fill="none" stroke="#00B4D8" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Vertical hover guide */}
        {hovered !== null && (
          <line
            x1={ptsIng[hovered].x} x2={ptsIng[hovered].x}
            y1={PAD.top} y2={PAD.top + chartH}
            stroke="#888" strokeWidth={1} strokeDasharray="4 3" opacity={0.35}
          />
        )}

        {/* Ingresos circles */}
        {ptsIng.map((p, i) => (
          <circle key={`ing-${i}`} cx={p.x} cy={p.y}
            r={hovered === i ? 6.5 : 4}
            fill={hovered === i ? '#00B4D8' : 'white'}
            stroke="#00B4D8" strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}

        {/* Gastos circles */}
        {ptsGas.map((p, i) => (
          <circle key={`gas-${i}`} cx={p.x} cy={p.y}
            r={hovered === i ? 5 : 3}
            fill={hovered === i ? '#FF6B2B' : 'white'}
            stroke="#FF6B2B" strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const d    = data[hovered];
        const p    = ptsIng[hovered];
        const lPct = (p.x / VW) * 100;
        const tPct = (p.y / VH) * 100;
        const tx   = lPct > 70 ? '-94%' : lPct < 22 ? '6%' : '-50%';
        const ty   = tPct < 28 ? '14%' : '-116%';
        const bal  = d.cumIngresos - d.cumGastos;
        return (
          <div style={{
            position: 'absolute',
            left: `${lPct}%`, top: `${tPct}%`,
            transform: `translate(${tx}, ${ty})`,
            pointerEvents: 'none',
            background: '#1A1A1A', color: 'white',
            borderRadius: 10, padding: '11px 16px',
            fontSize: 12.5, lineHeight: 1.8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
            whiteSpace: 'nowrap', zIndex: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {fmtFecha(d.fecha)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 3, background: '#00B4D8', display: 'inline-block', borderRadius: 2 }} />
                  <span style={{ opacity: 0.65, fontSize: 12 }}>Ing. acumulados</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#00B4D8' }}>{fmt(d.cumIngresos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 3, background: '#FF6B2B', display: 'inline-block', borderRadius: 2, opacity: 0.85 }} />
                  <span style={{ opacity: 0.65, fontSize: 12 }}>Gas. acumulados</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#FF6B2B' }}>{fmt(d.cumGastos)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', gap: 24,
                borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 5, paddingTop: 5,
              }}>
                <span style={{ fontWeight: 700 }}>Balance</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 800,
                  color: bal >= 0 ? '#90d4a8' : '#f4a070',
                }}>
                  {bal >= 0 ? '+' : ''}{fmt(bal)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BalancePage() {
  const weeklyData = buildWeeklyData(); // chronological, 21 rows
  const lastRow    = weeklyData[weeklyData.length - 1];

  // ── Fila 1 ──
  const totalIngresos  = lastRow.cumIngresos;
  const totalGastos    = lastRow.cumGastos;
  const balanceNeto    = totalIngresos - totalGastos;
  const totalEfectivo  = dataMaestra.reduce((s, d) => s + d.efectivo, 0);
  const totalGastosCC  = mockGastos.reduce((s, g) => s + g.monto, 0);
  const cajaChica      = saldoInicialCaja + totalEfectivo - totalGastosCC;

  console.log('[CajaChica] saldoInicialCaja :', saldoInicialCaja);
  console.log('[CajaChica] suma efectivos   :', totalEfectivo);
  console.log('[CajaChica] suma gastos      :', totalGastosCC);
  console.log('[CajaChica] resultado        :', cajaChica);

  // ── Fila 2 ──
  const totalTerminal  = dataMaestra.reduce((s, d) => s + d.terminal, 0);
  const catTotales     = CATEGORIAS.map(cat => ({
    cat,
    total: mockGastos
      .filter(g => (g.categoria_nombre ?? g.categoria) === cat)
      .reduce((s, g) => s + g.monto, 0),
  }));
  const topCat = [...catTotales].sort((a, b) => b.total - a.total)[0];

  // ── Tabla (most recent first) ──
  const tablaData = [...weeklyData].reverse();
  const totalBalanceSemana = weeklyData.reduce((s, r) => s + r.balanceSemana, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Fila 1: 4 tarjetas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>

        {/* Caja chica */}
        <div className="card" style={{
          padding: '18px 20px',
          background: cajaChica >= 0 ? 'rgba(79,138,91,0.07)' : 'rgba(180,74,58,0.07)',
        }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Caja chica actual
          </div>
          <div style={{
            fontSize: 27, fontWeight: 800, marginTop: 10,
            fontFamily: 'var(--font-mono)', lineHeight: 1,
            color: cajaChica >= 0 ? 'var(--good)' : 'var(--danger)',
          }}>
            {cajaChica >= 0 ? '+' : ''}{fmt(cajaChica)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Inicial {fmt(saldoInicialCaja)} + efectivo {fmt(totalEfectivo)} − gastos {fmt(totalGastosCC)}
          </div>
        </div>

        {/* Acumulado ingresos */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Acumulado ingresos
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: '#5C7A6F', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalIngresos)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {dataMaestra.length} domingos · 2026
          </div>
        </div>

        {/* Total gastos */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Total gastos del año
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalGastos)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {mockGastos.length} registros · 2026
          </div>
        </div>

        {/* Balance neto */}
        <div className="card" style={{
          padding: '18px 20px',
          background: balanceNeto >= 0 ? 'rgba(79,138,91,0.10)' : 'rgba(180,74,58,0.10)',
          border: `1.5px solid ${balanceNeto >= 0 ? 'rgba(79,138,91,0.25)' : 'rgba(180,74,58,0.25)'}`,
        }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Balance neto
          </div>
          <div style={{
            fontSize: 27, fontWeight: 800, marginTop: 10,
            fontFamily: 'var(--font-mono)', lineHeight: 1,
            color: balanceNeto >= 0 ? 'var(--good)' : 'var(--danger)',
          }}>
            {balanceNeto >= 0 ? '▲ ' : '▼ '}{fmt(Math.abs(balanceNeto))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {balanceNeto >= 0 ? 'Superávit' : 'Déficit'} acumulado 2026
          </div>
        </div>
      </div>

      {/* ── Fila 2: 3 tarjetas secundarias ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>

        {/* Efectivo */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Total efectivo recibido
            </div>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
              background: 'rgba(79,138,91,0.12)', color: 'var(--good)',
            }}>
              {totalIngresos > 0 ? Math.round(totalEfectivo / totalIngresos * 100) : 0}%
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--good)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalEfectivo)}
          </div>
          <div style={{ marginTop: 14, height: 5, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${Math.round(totalEfectivo / totalIngresos * 100)}%`, borderRadius: 99, background: 'var(--good)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Del total de ofrendas del año</div>
        </div>

        {/* Terminal */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Total terminal recibido
            </div>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
              background: 'rgba(0,180,216,0.12)', color: 'var(--chart-primary)',
            }}>
              {totalIngresos > 0 ? Math.round(totalTerminal / totalIngresos * 100) : 0}%
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--chart-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalTerminal)}
          </div>
          <div style={{ marginTop: 14, height: 5, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${Math.round(totalTerminal / totalIngresos * 100)}%`, borderRadius: 99, background: 'var(--chart-primary)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Del total de ofrendas del año</div>
        </div>

        {/* Mayor categoría de gasto */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Gastos por categoría
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {catTotales.sort((a, b) => b.total - a.total).map(({ cat, total }) => {
              const pct = totalGastos > 0 ? (total / totalGastos) * 100 : 0;
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--ink)', flex: 1 }}>{cat}</span>
                  <div style={{ width: 60, height: 4, borderRadius: 99, background: 'var(--border)', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: CAT_COLORS[cat] }} />
                  </div>
                  <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--muted)', minWidth: 54, textAlign: 'right' }}>
                    {fmt(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Gráfica ── */}
      <div className="card" style={{ padding: '20px 20px 16px' }}>
        <div className="card-head" style={{ marginBottom: 20 }}>
          <div>
            <h3 className="card-title">Balance acumulado 2026 — semana a semana</h3>
            <div className="card-sub">
              {dataMaestra.length} domingos · hover para ver acumulados y balance
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 3, borderRadius: 99, background: '#00B4D8' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Ingresos acum.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 3, borderRadius: 99, background: '#FF6B2B', opacity: 0.8,
                backgroundImage: 'repeating-linear-gradient(90deg, #FF6B2B 0 7px, transparent 7px 11px)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Gastos acum.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 10, borderRadius: 3, background: 'rgba(0,180,216,0.15)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Superávit</span>
            </div>
          </div>
        </div>
        <BalanceChart data={weeklyData} />
      </div>

      {/* ── Tabla semana a semana ── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="card-title">Desglose semana a semana</h3>
            <div className="card-sub">
              {weeklyData.length} domingos · balance final {fmt(balanceNeto)}
            </div>
          </div>
        </div>

        <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="table anf-table">
            <thead>
              <tr>
                <th>Domingo</th>
                <th style={{ textAlign: 'right' }}>Ingresos</th>
                <th style={{ textAlign: 'right' }}>Gastos</th>
                <th style={{ textAlign: 'right' }}>Balance semana</th>
                <th style={{ textAlign: 'right' }}>Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {tablaData.map(row => {
                const isPositive  = row.balanceSemana >= 0;
                const acumPositive = row.balance >= 0;
                return (
                  <tr key={row.fecha}>
                    <td style={{ fontWeight: 500 }}>{fmtFecha(row.fecha)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {fmt(row.ingresos)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.gastos > 0 ? 'var(--danger)' : 'var(--muted)' }}>
                      {row.gastos > 0 ? fmt(row.gastos) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: isPositive ? 'var(--good)' : 'var(--danger)',
                      }}>
                        {isPositive ? '▲ ' : '▼ '}{fmt(Math.abs(row.balanceSemana))}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: acumPositive ? 'var(--good)' : 'var(--danger)',
                    }}>
                      {acumPositive ? '+' : ''}{fmt(row.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tbody>
              <tr className="anf-totals-row">
                <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                  Totales 2026
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {fmt(totalIngresos)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                  {fmt(totalGastos)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                  color: totalBalanceSemana >= 0 ? 'var(--good)' : 'var(--danger)' }}>
                  {totalBalanceSemana >= 0 ? '▲ ' : '▼ '}{fmt(Math.abs(totalBalanceSemana))}
                </td>
                <td style={{
                  textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800,
                  fontSize: 14, color: balanceNeto >= 0 ? 'var(--good)' : 'var(--danger)',
                }}>
                  {balanceNeto >= 0 ? '+' : ''}{fmt(balanceNeto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
