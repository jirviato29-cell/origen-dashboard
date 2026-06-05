import { useState, useEffect } from 'react';
import { ofrendasApi, gastosApi } from '../../services/api';
import { fmtFecha, fmtFechaShort } from '../../utils/fecha';
import { CATEGORIAS, CAT_COLORS } from '../../utils/categorias';
import { SALDO_INICIAL_CAJA } from '../../utils/config';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function mesNombre(isoMes) {
  return new Date(isoMes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());
}

// ── Data builders ─────────────────────────────────────────────────────────────

function buildMonthlyData(ofrendas, gastos) {
  const meses = [...new Set(ofrendas.map(d => d.fecha.slice(0, 7)))].sort();
  return meses.map(mes => {
    const ingMes = ofrendas
      .filter(d => d.fecha.startsWith(mes))
      .reduce((s, d) => s + Number(d.total_ofrenda), 0);
    const gasMes = gastos
      .filter(g => g.fecha.startsWith(mes))
      .reduce((s, g) => s + Number(g.monto), 0);
    return {
      mes,
      label:    mesNombre(mes),
      ingresos: ingMes,
      gastos:   gasMes,
      balance:  ingMes - gasMes,
    };
  });
}

// Una fila por domingo. Gastos asignados al período
// (prevDomingo < fecha_gasto <= domingo_actual).
function buildWeeklyData(ofrendas, gastos) {
  if (ofrendas.length === 0) return [];
  const sorted = [...ofrendas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  let cumIngresos = 0, cumGastos = 0;
  return sorted.map((d, idx) => {
    const prevFecha = idx === 0 ? '' : sorted[idx - 1].fecha;
    const gastosDelPeriodo = gastos
      .filter(g => idx === 0 ? g.fecha <= d.fecha : g.fecha > prevFecha && g.fecha <= d.fecha)
      .reduce((s, g) => s + Number(g.monto), 0);
    cumIngresos += Number(d.total_ofrenda);
    cumGastos   += gastosDelPeriodo;
    return {
      fecha:         d.fecha,
      efectivo:      Number(d.efectivo),
      ingresos:      Number(d.total_ofrenda),
      gastos:        gastosDelPeriodo,
      balanceSemana: Number(d.total_ofrenda) - gastosDelPeriodo,
      cumIngresos,
      cumGastos,
      balance:       cumIngresos - cumGastos,
    };
  });
}

// ── Donut / Pie Chart ─────────────────────────────────────────────────────────

const VW = 500, VH = 260;
const CX = 130, CY = 130, R_OUT = 100, R_IN = 55;

function donutPath(start, end, rOut, rIn) {
  // Full circle: split into two halves to avoid degenerate path
  if (Math.abs(end - start) >= 2 * Math.PI - 0.001) {
    const mid = start + Math.PI;
    return donutPath(start, mid, rOut, rIn) + ' ' + donutPath(mid, end, rOut, rIn);
  }
  const large = end - start > Math.PI ? 1 : 0;
  const x1o = (CX + rOut * Math.cos(start)).toFixed(2), y1o = (CY + rOut * Math.sin(start)).toFixed(2);
  const x2o = (CX + rOut * Math.cos(end)).toFixed(2),   y2o = (CY + rOut * Math.sin(end)).toFixed(2);
  const x2i = (CX + rIn  * Math.cos(end)).toFixed(2),   y2i = (CY + rIn  * Math.sin(end)).toFixed(2);
  const x1i = (CX + rIn  * Math.cos(start)).toFixed(2), y1i = (CY + rIn  * Math.sin(start)).toFixed(2);
  return `M ${x1o} ${y1o} A ${rOut} ${rOut} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rIn} ${rIn} 0 ${large} 0 ${x1i} ${y1i} Z`;
}

function PieChart({ ingresos, gastos: gastosTotal }) {
  const [hovered, setHovered] = useState(null);
  const balance   = ingresos - gastosTotal;
  const isDeficit = balance < 0;

  // Surplus → pie = ingresos,    slices: [gastos, superávit]
  // Deficit → pie = gastosTotal, slices: [ingresos, exceso]
  const total  = isDeficit ? gastosTotal : ingresos;
  const slices = isDeficit
    ? [
        { label: 'Ingresos',  value: ingresos,               color: '#5C7A6F' },
        { label: 'Déficit',   value: gastosTotal - ingresos,  color: '#FF6B2B' },
      ]
    : [
        { label: 'Gastos',    value: gastosTotal,             color: '#FF6B2B' },
        { label: 'Superávit', value: balance,                 color: '#00B4D8' },
      ];

  if (total <= 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin datos para mostrar
      </div>
    );
  }

  let angle = -Math.PI / 2;
  const built = slices.map((s, i) => {
    const sweep = (s.value / total) * 2 * Math.PI;
    const start = angle, end = angle + sweep, mid = angle + sweep / 2;
    angle = end;
    return { ...s, start, end, mid, i };
  });

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      {/* Donut slices */}
      {built.map(s => {
        const active = hovered === s.i;
        const dimmed = hovered !== null && !active;
        const push   = active ? 6 : 0;
        return (
          <path
            key={s.i}
            d={donutPath(s.start, s.end, R_OUT, R_IN)}
            fill={s.color}
            opacity={dimmed ? 0.4 : 1}
            transform={push > 0 ? `translate(${(Math.cos(s.mid) * push).toFixed(2)}, ${(Math.sin(s.mid) * push).toFixed(2)})` : undefined}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={() => setHovered(s.i)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}

      {/* Center text */}
      <text x={CX} y={CY - 8} textAnchor="middle" fontSize={9} fill="#b0a090" fontWeight={600}>
        {isDeficit ? 'DÉFICIT' : 'TOTAL INGRESOS'}
      </text>
      <text x={CX} y={CY + 11} textAnchor="middle" fontSize={13.5} fill="var(--ink)" fontWeight={800} fontFamily="var(--font-mono)">
        {fmt(isDeficit ? Math.abs(balance) : total)}
      </text>

      {/* Legend */}
      {built.map((s, i) => {
        const pct    = Math.round((s.value / total) * 100);
        const ly     = 48 + i * 80;
        const active = hovered === s.i;
        return (
          <g
            key={`leg-${i}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(s.i)}
            onMouseLeave={() => setHovered(null)}
            opacity={hovered !== null && !active ? 0.4 : 1}
          >
            <rect x={268} y={ly} width={11} height={11} rx={2} fill={s.color} />
            <text x={285} y={ly + 10} fontSize={12.5} fill="var(--ink)" fontWeight={active ? 700 : 500}>{s.label}</text>
            <text x={285} y={ly + 28} fontSize={14.5} fill={s.color} fontWeight={800} fontFamily="var(--font-mono)">{fmt(s.value)}</text>
            <text x={285} y={ly + 44} fontSize={11} fill="#b0a090">{pct}% · {isDeficit ? 'de los gastos' : 'de los ingresos'}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BalancePage() {
  const year = new Date().getFullYear();

  const [ofrendas,        setOfrendas] = useState([]);
  const [gastos,          setGastos]   = useState([]);
  const [loading,         setLoading]  = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [ro, rg] = await Promise.all([
          ofrendasApi.getAll({ year }),
          gastosApi.getAll({ year, pagado: 'true' }),
        ]);
        setOfrendas(ro.data || []);
        setGastos(rg.data || []);
      } catch (e) {
        console.error('BalancePage load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando balance…
      </div>
    );
  }

  const weeklyData = buildWeeklyData(ofrendas, gastos);

  // ── KPIs ──
  const totalIngresos = ofrendas.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const totalGastos   = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const balanceNeto   = totalIngresos - totalGastos;
  const totalEfectivo = ofrendas.reduce((s, d) => s + Number(d.efectivo), 0);
  const totalTerminal = ofrendas.reduce((s, d) => s + Number(d.terminal), 0);
  const cajaChica     = SALDO_INICIAL_CAJA + totalEfectivo - totalGastos;

  const pctEfectivo = totalIngresos > 0 ? Math.round(totalEfectivo / totalIngresos * 100) : 0;
  const pctTerminal = totalIngresos > 0 ? Math.round(totalTerminal / totalIngresos * 100) : 0;

  // ── Gastos por categoría ──
  const catTotales = CATEGORIAS.map(cat => ({
    cat,
    total: gastos
      .filter(g => (g.categoria_nombre ?? g.categoria) === cat)
      .reduce((s, g) => s + Number(g.monto), 0),
  }));

  // ── Resumen mensual ──
  const monthlyData = buildMonthlyData(ofrendas, gastos);

  // ── Datos para el pastel ──
  const mesEntry   = mesSeleccionado ? monthlyData.find(m => m.mes === mesSeleccionado) : null;
  const pieIngresos = mesEntry ? mesEntry.ingresos : totalIngresos;
  const pieGastos   = mesEntry ? mesEntry.gastos   : totalGastos;
  const pieTitle    = mesSeleccionado
    ? `Balance ${mesNombre(mesSeleccionado)} ${year}`
    : `Balance ${year}`;

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  // ── Caja de Efectivo ──
  const cajaData = [];
  let saldo = SALDO_INICIAL_CAJA;
  for (const row of weeklyData) {
    const saldoInicial = saldo;
    const saldoFinal   = saldo + row.efectivo - row.gastos;
    cajaData.push({ ...row, saldoInicial, saldoFinal });
    saldo = saldoFinal;
  }
  const cajaRows    = [...cajaData].reverse();
  const saldoEnCaja = cajaData.length > 0 ? cajaData[cajaData.length - 1].saldoFinal : 0;
  const totalGastosWeekly = weeklyData.reduce((s, r) => s + r.gastos, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Fila 1: 4 tarjetas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>

        <div className="card" style={{
          padding: '18px 20px',
          background: cajaChica >= 0 ? 'rgba(79,138,91,0.07)' : 'rgba(180,74,58,0.07)',
        }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Efectivo en caja
          </div>
          <div style={{
            fontSize: 27, fontWeight: 800, marginTop: 10,
            fontFamily: 'var(--font-mono)', lineHeight: 1,
            color: cajaChica >= 0 ? 'var(--good)' : 'var(--danger)',
          }}>
            {cajaChica >= 0 ? '+' : ''}{fmt(cajaChica)}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Acumulado ingresos
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: '#5C7A6F', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalIngresos)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {ofrendas.length} domingos · {year}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Total gastos del año
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalGastos)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {gastos.length} registros · {year}
          </div>
        </div>

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
            {balanceNeto >= 0 ? 'Superávit' : 'Déficit'} acumulado {year}
          </div>
        </div>
      </div>

      {/* ── Fila 2: 3 tarjetas secundarias ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Total efectivo recibido
            </div>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
              background: 'rgba(79,138,91,0.12)', color: 'var(--good)',
            }}>
              {pctEfectivo}%
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--good)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalEfectivo)}
          </div>
          <div style={{ marginTop: 14, height: 5, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${pctEfectivo}%`, borderRadius: 99, background: 'var(--good)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Del total de ofrendas del año</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Total terminal recibido
            </div>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
              background: 'rgba(0,180,216,0.12)', color: 'var(--chart-primary)',
            }}>
              {pctTerminal}%
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--chart-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(totalTerminal)}
          </div>
          <div style={{ marginTop: 14, height: 5, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${pctTerminal}%`, borderRadius: 99, background: 'var(--chart-primary)', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Del total de ofrendas del año</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Gastos por categoría
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...catTotales].sort((a, b) => b.total - a.total).map(({ cat, total }) => {
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

      {/* ── Resumen por mes + Pastel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>

        {/* Resumen por mes */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="card-title">Resumen por mes</h3>
              <div className="card-sub">{year} · haz clic en un mes para ver su detalle</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {monthlyData.map(r => {
              const activo = mesSeleccionado === r.mes;
              return (
                <button
                  key={r.mes}
                  onClick={() => toggleMes(r.mes)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: activo ? 'var(--black)' : 'transparent',
                    color: activo ? 'white' : 'var(--ink)',
                    transition: 'background 0.15s',
                    textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{r.label}</span>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: activo ? 'rgba(255,255,255,0.8)' : '#00B4D8' }}>
                      Ing: {fmt(r.ingresos)}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: activo ? 'rgba(255,255,255,0.65)' : 'var(--danger)' }}>
                      Gas: {fmt(r.gastos)}
                    </div>
                    <div style={{
                      fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 800,
                      color: activo
                        ? (r.balance >= 0 ? '#90d4a8' : '#f4a070')
                        : (r.balance >= 0 ? 'var(--good)' : 'var(--danger)'),
                    }}>
                      {r.balance >= 0 ? '+' : ''}{fmt(r.balance)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pastel */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="card-title" style={{ fontSize: 13 }}>{pieTitle}</h3>
              <div className="card-sub">
                {mesSeleccionado
                  ? `${mesNombre(mesSeleccionado)} · ingresos vs gastos`
                  : `Año completo · ingresos vs gastos`}
              </div>
            </div>
            {mesSeleccionado && (
              <button
                onClick={() => setMesSelec(null)}
                style={{
                  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', flexShrink: 0,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                ← Ver todo el año
              </button>
            )}
          </div>
          <PieChart ingresos={pieIngresos} gastos={pieGastos} />
        </div>
      </div>

      {/* ── Tabla: Caja de Efectivo ── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="card-title">Caja de Efectivo</h3>
            <div className="card-sub">
              {weeklyData.length} domingos · saldo en caja {fmt(saldoEnCaja)}
            </div>
          </div>
        </div>

        {weeklyData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
            Sin registros de ofrendas para {year}.
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Domingo</th>
                  <th style={{ textAlign: 'right' }}>Saldo inicial</th>
                  <th style={{ textAlign: 'right' }}>Ingresos</th>
                  <th style={{ textAlign: 'right' }}>Gastos</th>
                  <th style={{ textAlign: 'right' }}>Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {cajaRows.map(row => (
                  <tr key={row.fecha}>
                    <td style={{ fontWeight: 500 }}>{fmtFecha(row.fecha)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                      {fmt(row.saldoInicial)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {row.efectivo > 0 ? fmt(row.efectivo) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.gastos > 0 ? 'var(--danger)' : 'var(--muted)' }}>
                      {row.gastos > 0 ? fmt(row.gastos) : '—'}
                    </td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: row.saldoFinal < 0 ? 'var(--danger)' : 'var(--ink)',
                    }}>
                      {fmt(row.saldoFinal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tbody>
                <tr className="anf-totals-row">
                  <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    Saldo final {year}
                  </td>
                  <td />
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {fmt(totalEfectivo)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                    {fmt(totalGastosWeekly)}
                  </td>
                  <td style={{
                    textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14,
                    color: saldoEnCaja < 0 ? 'var(--danger)' : 'var(--ink)',
                  }}>
                    {fmt(saldoEnCaja)}
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
