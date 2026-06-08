import { useState, useEffect } from 'react';
import { gastosApi } from '../../services/api';
import { useGastosModal } from '../../context/GastosModalContext';
import { fmtFecha, fmtFechaShort, mesNombre } from '../../utils/fecha';
import { CATEGORIAS, CAT_COLORS, CAT_BG } from '../../utils/categorias';

// ── Constants ─────────────────────────────────────────────────────────────────

const ORANGE = '#F97316';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function catLabel(g) {
  return g.categoria_nombre ?? g.categoria ?? '—';
}

// ── Horizontal Bar Chart — por categoría ─────────────────────────────────────

function GastosCatHBarChart({ catData }) {
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

  const sorted    = [...catData].sort((a, b) => b.monto - a.monto);
  const maxMonto  = Math.max(...sorted.map(c => c.monto));
  const xMax      = Math.max(Math.ceil(maxMonto / 5000) * 5000, 5000);
  const xTicks    = Array.from({ length: Math.round(xMax / 5000) + 1 }, (_, i) => i * 5000);

  const n       = sorted.length;
  const rowH    = chartH / n;
  const barH    = Math.min(Math.round(rowH * 0.58), 40);
  const barOffY = (rowH - barH) / 2;

  const toW = v => (v / xMax) * chartW;

  return (
    <svg
      viewBox={`0 0 ${HVW} ${HVH}`}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      {xTicks.map(v => {
        const x = HPAD.left + toW(v);
        return (
          <g key={v}>
            <line
              x1={x} x2={x}
              y1={HPAD.top} y2={HPAD.top + chartH}
              stroke="#ddd5c8"
              strokeWidth={v === 0 ? 1.2 : 0.65}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text
              x={x} y={HPAD.top - 8}
              textAnchor="middle" fontSize={9.5} fill="#b0a090"
              fontFamily="var(--font-mono)"
            >
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        );
      })}

      {sorted.map(({ cat, monto }, i) => {
        const barY = HPAD.top + i * rowH + barOffY;
        const barW = toW(monto);
        return (
          <g key={cat}>
            <text
              x={HPAD.left - 10}
              y={barY + barH / 2 + 4}
              textAnchor="end"
              fontSize={11.5}
              fill="#3a2a1a"
              fontWeight="500"
            >
              {cat}
            </text>
            <rect
              x={HPAD.left} y={barY}
              width={barW} height={barH}
              fill={CAT_COLORS[cat]}
              rx={3}
            />
            <text
              x={HPAD.left + barW + 8}
              y={barY + barH / 2 + 4}
              textAnchor="start"
              fontSize={11}
              fill="#3a2a1a"
              fontFamily="var(--font-mono)"
              fontWeight="700"
            >
              {fmt(monto)}
            </text>
          </g>
        );
      })}
    </svg>
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

  const [gastos, setGastos]            = useState([]);
  const [loading, setLoading]          = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);

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

  // ── Fila 1 ──
  const ultimoGasto   = gastos.length > 0
    ? [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
    : null;
  const gastosMesArr  = gastos.filter(g => g.fecha.startsWith(mes));
  const totalMes      = gastosMesArr.reduce((s, g) => s + Number(g.monto), 0);
  const acumuladoAnio = gastos.reduce((s, g) => s + Number(g.monto), 0);

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

  // Datos de categorías: anual y por mes seleccionado
  const catDataAnual = CATEGORIAS
    .map(cat => ({
      cat,
      monto: gastos.filter(g => catLabel(g) === cat).reduce((s, g) => s + Number(g.monto), 0),
    }))
    .filter(c => c.monto > 0);

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
    : `Gastos por categoría — ${year}`;
  const chartSub = mesSeleccionado
    ? `${catDataForMes.length} ${catDataForMes.length === 1 ? 'categoría' : 'categorías'} con gastos`
    : `Barras horizontales · de mayor a menor`;

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

      {/* ── Fila 1: 3 tarjetas ── */}
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
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--danger)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(acumuladoAnio)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {gastos.length} gastos · {year}
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
          <div className="card-head chart-head" style={{ marginBottom: 20 }}>
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
          <GastosCatHBarChart catData={mesSeleccionado ? catDataForMes : catDataAnual} />
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
