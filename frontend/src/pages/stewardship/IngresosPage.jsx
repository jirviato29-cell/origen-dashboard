import { useState, useEffect } from 'react';
import { ofrendasApi, gastosApi, asistenciaApi } from '../../services/api';
import { fmtFecha, fmtFechaShort, mesNombre, toISODate } from '../../utils/fecha';
import { useIsMobile } from '../../utils/useIsMobile';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function fmtParticipSub(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '').replace(/\s{2,}/g, ' ').trim()
    .replace(/^\w/, c => c.toUpperCase());
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
// Datos esperados: [{ label, total, efectivo, terminal, count }]

const ORANGE = '#F97316';
const VW = 900, VH = 300;
const PAD = { left: 92, right: 24, top: 28, bottom: 54 };

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

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.total), d }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} ` +
    `L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} ` +
    `L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`;

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
              x1={PAD.left} x2={VW - PAD.right} y1={toY(v)} y2={toY(v)}
              stroke="#ddd5c8" strokeWidth={v === 0 ? 1.2 : 0.65}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text x={PAD.left - 10} y={toY(v) + 4} textAnchor="end" fontSize={10} fill="#b0a090" fontFamily="var(--font-mono)">
              {v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
            </text>
          </g>
        ))}

        <line x1={PAD.left} x2={VW - PAD.right} y1={PAD.top + chartH} y2={PAD.top + chartH} stroke="#ddd5c8" strokeWidth={1} />

        {pts.map((p, i) => (
          <text key={i} x={p.x} y={PAD.top + chartH + 18} textAnchor="middle" fontSize={10} fill="#b0a090">
            {p.d.label}
          </text>
        ))}

        <path d={areaPath} fill={ORANGE} opacity={0.12} />
        <path d={linePath} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {hovered !== null && (
          <line
            x1={pts[hovered].x} x2={pts[hovered].x} y1={PAD.top} y2={PAD.top + chartH}
            stroke={ORANGE} strokeWidth={1} strokeDasharray="4 3" opacity={0.4}
          />
        )}

        {pts.map((p, i) => (
          <circle
            key={i} cx={p.x} cy={p.y}
            r={hovered === i ? 6.5 : 4}
            fill={hovered === i ? ORANGE : 'white'}
            stroke={ORANGE} strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}
      </svg>

      {hovered !== null && (() => {
        const p    = pts[hovered];
        const d    = p.d;
        const lPct = (p.x / VW) * 100;
        const tPct = (p.y / VH) * 100;
        const tx   = lPct > 72 ? '-92%' : lPct < 20 ? '8%' : '-50%';
        const ty   = tPct < 30 ? '14%' : '-115%';
        return (
          <div style={{
            position: 'absolute', left: `${lPct}%`, top: `${tPct}%`,
            transform: `translate(${tx}, ${ty})`, pointerEvents: 'none',
            background: '#1A1A1A', color: 'white', borderRadius: 10,
            padding: '11px 15px', fontSize: 12.5, lineHeight: 1.75,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap', zIndex: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {d.label}{d.count > 1 ? ` · ${d.count} domingos` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                <span style={{ opacity: 0.6, fontSize: 12 }}>Efectivo</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(d.efectivo)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                <span style={{ opacity: 0.6, fontSize: 12 }}>Terminal</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(d.terminal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 5, paddingTop: 5 }}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const [ofrendas,   setOfrendas]   = useState([]);
  const [gastos,     setGastos]     = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);
  const isMobile = useIsMobile();

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

  const hoy         = new Date();
  const mesActual   = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesLabelCap = hoy.toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());

  const sorted        = [...ofrendas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimoDomingo = sorted[0];

  // Participación: sobres ÷ (adultos + voluntarios) × 100
  // toISODate normaliza fechas de cualquier formato (Date object, ISO timestamp, DATE string)
  const asistByFecha = Object.fromEntries(asistencia.map(r => [toISODate(r.fecha), r]));

  const uSobres = Number(ultimoDomingo?.ofrendas ?? 0);
  const uAsist  = asistByFecha[toISODate(ultimoDomingo?.fecha)];
  const uDenom  = (uAsist?.adultos ?? 0) + (uAsist?.voluntarios ?? 0);
  const participacionUltimo = (uSobres > 0 && uDenom > 0)
    ? Math.round(uSobres / uDenom * 100)
    : null;

  // Promedio del año — método agregado: suma sobres / suma (adultos+voluntarios)
  let totalSobresAnio = 0, totalDenomAnio = 0;
  ofrendas
    .filter(d => Number(d.ofrendas ?? 0) > 0)
    .forEach(d => {
      const a   = asistByFecha[toISODate(d.fecha)];
      const den = (a?.adultos ?? 0) + (a?.voluntarios ?? 0);
      if (den > 0) { totalSobresAnio += Number(d.ofrendas); totalDenomAnio += den; }
    });
  const promedioParticipacion = totalDenomAnio > 0
    ? Math.round(totalSobresAnio / totalDenomAnio * 100)
    : null;

  const ofrendasMesActual = ofrendas.filter(d => d.fecha.startsWith(mesActual));
  const totalMesActual    = ofrendasMesActual.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const acumuladoAnio     = ofrendas.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const totalGastos       = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalEfectivo     = ofrendas.reduce((s, d) => s + Number(d.efectivo), 0);
  const totalTerminal     = ofrendas.reduce((s, d) => s + Number(d.terminal), 0);
  const totalCombinado    = totalEfectivo + totalTerminal;
  const pctEfectivo       = totalCombinado > 0 ? Math.round((totalEfectivo / totalCombinado) * 100) : 0;
  const pctTerminal       = 100 - pctEfectivo;

  // Resumen mensual
  const mesesDisponibles = [...new Set(ofrendas.map(d => d.fecha.slice(0, 7)))].sort();
  const resumenMeses = mesesDisponibles.map(m => {
    const rows = ofrendas.filter(d => d.fecha.startsWith(m));
    let sobresM = 0, denomM = 0;
    rows
      .filter(d => Number(d.ofrendas ?? 0) > 0)
      .forEach(d => {
        const a   = asistByFecha[toISODate(d.fecha)];
        const den = (a?.adultos ?? 0) + (a?.voluntarios ?? 0);
        if (den > 0) { sobresM += Number(d.ofrendas); denomM += den; }
      });
    return {
      mes:         m,
      label:       mesNombre(m),
      total:       rows.reduce((s, d) => s + Number(d.total_ofrenda), 0),
      efectivo:    rows.reduce((s, d) => s + Number(d.efectivo), 0),
      terminal:    rows.reduce((s, d) => s + Number(d.terminal), 0),
      count:       rows.length,
      ofrendasM:   rows.reduce((s, d) => s + Number(d.ofrendas ?? 0), 0),
      participMes: denomM > 0 ? Math.round(sobresM / denomM * 100) : null,
    };
  });

  const totalOfrendasAnio = ofrendas.reduce((s, d) => s + Number(d.ofrendas ?? 0), 0);

  // Gráfica: mensual por defecto; por domingo cuando hay mes seleccionado
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

  const chartLegend = mesSeleccionado ? 'Total por domingo' : 'Total mensual';

  // Tabla del acordeón
  const tablaData = mesSeleccionado
    ? [...ofrendas]
        .filter(d => d.fecha.startsWith(mesSeleccionado))
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const tablaEfectivo    = tablaData.reduce((s, d) => s + Number(d.efectivo), 0);
  const tablaTerminal    = tablaData.reduce((s, d) => s + Number(d.terminal), 0);
  const tablaTotal       = tablaData.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const tablaOfrendas    = tablaData.reduce((s, d) => s + Number(d.ofrendas ?? 0), 0);
  const tablaParticipMes = resumenMeses.find(r => r.mes === mesSeleccionado)?.participMes ?? null;
  const tablaRows = tablaData.map(d => {
    const a   = asistByFecha[toISODate(d.fecha)];
    const den = (a?.adultos ?? 0) + (a?.voluntarios ?? 0);
    const sob = Number(d.ofrendas ?? 0);
    return { ...d, participDom: (sob > 0 && den > 0) ? Math.round(sob / den * 100) : null };
  });

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Cargando registros…</div>;
  }
  if (!ultimoDomingo) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Sin registros de ofrendas para {year}.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Fila 1: 3 tarjetas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>

        {/* Último domingo — un escalón más grande que las otras dos */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Último domingo
          </div>
          <div style={{ fontSize: 31, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {fmt(Number(ultimoDomingo.total_ofrenda))}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 7 }}>
            {fmtFecha(ultimoDomingo.fecha)}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
            <span style={{ color: 'var(--muted)' }}>
              Efectivo <strong style={{ color: 'var(--ink)' }}>{fmt(Number(ultimoDomingo.efectivo))}</strong>
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ color: 'var(--muted)' }}>
              Terminal <strong style={{ color: 'var(--ink)' }}>{fmt(Number(ultimoDomingo.terminal))}</strong>
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ color: 'var(--muted)' }}>
              Sobres <strong style={{ color: 'var(--ink)' }}>{Number(ultimoDomingo.ofrendas ?? 0)}</strong>
            </span>
            {participacionUltimo !== null && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ color: 'var(--muted)' }}>
                  Participación <strong style={{ color: 'var(--ink)' }}>{participacionUltimo}%</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Promedio de participación */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Promedio de participación en ofrendas
          </div>
          <div style={{ fontSize: 31, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {promedioParticipacion !== null ? `${promedioParticipacion}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 7 }}>
            Total de ofrendas del año: <strong style={{ color: 'var(--ink)' }}>{totalOfrendasAnio}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mes actual ({mesLabelCap})</div>
          <div style={{ fontSize: 27, fontWeight: 800, color: '#5C7A6F', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{fmt(totalMesActual)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {ofrendasMesActual.length === 0
              ? `${mesLabelCap} aún sin registros`
              : `${ofrendasMesActual.length} ${ofrendasMesActual.length === 1 ? 'domingo' : 'domingos'} registrados`}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Acumulado del año</div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{fmt(acumuladoAnio)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{ofrendas.length} domingos · {year}</div>
        </div>

      </div>

      {/* ── Fila 2: efectivo + terminal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total efectivo del año</div>
            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: 'rgba(79,138,91,0.12)', color: 'var(--good)' }}>{pctEfectivo}%</span>
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--good)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{fmt(totalEfectivo)}</div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${pctEfectivo}%`, borderRadius: 99, background: 'var(--good)', opacity: 0.85 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{pctEfectivo}% del total recaudado en el año</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total terminal del año</div>
            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: 'rgba(0,180,216,0.12)', color: 'var(--chart-primary)' }}>{pctTerminal}%</span>
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--chart-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{fmt(totalTerminal)}</div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${pctTerminal}%`, borderRadius: 99, background: 'var(--chart-primary)', opacity: 0.85 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{pctTerminal}% del total recaudado en el año</div>
        </div>
      </div>

      {/* ── Fila 3: Resumen por mes (izq) + Gráfica (der) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>

        {/* Resumen por mes */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="card-title">Resumen por mes</h3>
              <div className="card-sub">{year} · haz clic en un mes para ver el detalle</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {resumenMeses.map(r => {
              const activo = mesSeleccionado === r.mes;
              return (
                <button
                  key={r.mes}
                  onClick={() => toggleMes(r.mes)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '4px 12px',
                    padding: '10px 12px 10px 10px', borderRadius: 8, cursor: 'pointer',
                    background: activo ? 'rgba(249,115,22,0.07)' : 'transparent',
                    color: 'var(--ink)',
                    border: 'none',
                    borderLeft: activo ? `3px solid ${ORANGE}` : '3px solid transparent',
                    transition: 'background 0.15s, border-left-color 0.15s',
                  }}
                >
                  {/* Izquierda */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.count} dom.</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                      background: activo ? ORANGE : 'var(--border)',
                      color: activo ? 'white' : 'var(--muted)',
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                      {activo ? 'Ocultar' : 'Ver detalle'}
                    </span>
                  </div>

                  {/* Centro */}
                  <div style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
                    {r.ofrendasM > 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        <strong style={{ color: 'var(--ink)' }}>{r.ofrendasM}</strong> ofrendas
                        {r.participMes !== null && (
                          <> · <strong style={{ color: 'var(--ink)' }}>{r.participMes}%</strong></>
                        )}
                      </span>
                    ) : null}
                  </div>

                  {/* Derecha */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: activo ? ORANGE : 'var(--ink)' }}>
                      {fmt(r.total)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      Efectivo {fmt(r.efectivo)} · Terminal {fmt(r.terminal)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gráfica */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div className="card-head chart-head" style={{ marginBottom: 20 }}>
            <div>
              <h3 className="card-title">{chartTitle}</h3>
              <div className="card-sub">{chartSub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  ← Ver todos los meses
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 28, height: 3, borderRadius: 99, background: ORANGE, opacity: 0.85 }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{chartLegend}</span>
              </div>
            </div>
          </div>
          <LineChart data={chartData} />
        </div>
      </div>

      {/* ── Acordeón: detalle por domingo ── */}
      {mesSeleccionado && (
        <div className="card">
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="card-title">Detalle de ingresos — {mesNombre(mesSeleccionado)}</h3>
              <div className="card-sub">{tablaData.length} {tablaData.length === 1 ? 'domingo' : 'domingos'}</div>
            </div>
            <button
              onClick={() => setMesSelec(null)}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 12px', fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✕ Cerrar
            </button>
          </div>
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Domingo</th>
                  <th style={{ textAlign: 'right' }}>Efectivo</th>
                  <th style={{ textAlign: 'right' }}>Terminal</th>
                  <th style={{ textAlign: 'right' }}>Ofrendas</th>
                  <th style={{ textAlign: 'right' }}>Participación</th>
                </tr>
              </thead>
              <tbody>
                {tablaRows.map(d => (
                  <tr key={d.fecha}>
                    <td style={{ fontWeight: 500 }}>{fmtFecha(d.fecha)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(Number(d.efectivo))}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(Number(d.terminal))}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(d.ofrendas ?? 0) || '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {d.participDom !== null ? `${d.participDom}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tbody>
                <tr className="anf-totals-row">
                  <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    Totales {mesNombre(mesSeleccionado)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(tablaEfectivo)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(tablaTerminal)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{tablaOfrendas || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: ORANGE, fontSize: 14 }}>
                    {tablaParticipMes !== null ? `${tablaParticipMes}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
