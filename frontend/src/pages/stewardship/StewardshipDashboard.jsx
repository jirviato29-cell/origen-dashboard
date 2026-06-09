import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { asistenciaApi, ofrendasApi, gastosApi, calendarioApi, participantesApi } from '../../services/api';
import { SALDO_INICIAL_CAJA } from '../../utils/config';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';
import { TIPO_COLOR, TIPO_BG } from '../../utils/tipoEventoColors';

// ── Constants (CSS vars resolved to hex for Recharts SVG attributes) ──────────
const C_PRIMARY   = '#00B4D8'; // --chart-primary
const C_SECONDARY = '#FF6B2B'; // --chart-secondary
const C_MUTED     = '#A3A3A3'; // --muted-2
const C_BORDER    = '#E5E5E5'; // --border
const C_INK       = '#1A1A1A'; // --ink

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateISO(d) { return d ? String(d).slice(0, 10) : null; }

function fmtDate(d) {
  const iso = toDateISO(d);
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Recharts custom tick: "Hoy" in orange ─────────────────────────────────────

function XTickCustom({ x, y, payload }) {
  const isHoy = payload.value === 'Hoy';
  return (
    <text
      x={x} y={y + 14}
      textAnchor="middle"
      fill={isHoy ? C_SECONDARY : C_MUTED}
      fontSize={11}
      fontWeight={isHoy ? 700 : 500}
    >
      {payload.value}
    </text>
  );
}

// ── Recharts custom tooltip ───────────────────────────────────────────────────

function ComboTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: 8,
      padding: '8px 12px', fontSize: 12.5,
      boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 5, color: C_INK }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C_MUTED }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: p.color }}>
            {p.dataKey === 'ofrenda'
              ? `$${Number(p.value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── ComboChart (Recharts ComposedChart) ───────────────────────────────────────

function ComboChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C_MUTED, fontSize: 13 }}>
        Sin datos suficientes
      </div>
    );
  }

  const fmtYLeft = v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={C_BORDER} />

        <XAxis
          dataKey="label"
          tick={<XTickCustom />}
          axisLine={false}
          tickLine={false}
        />

        {/* Left axis: ofrendas (money in k) */}
        <YAxis
          yAxisId="ofrenda"
          orientation="left"
          tickFormatter={fmtYLeft}
          tick={{ fontSize: 10.5, fill: C_MUTED }}
          axisLine={false}
          tickLine={false}
          width={34}
        />

        {/* Right axis: asistencia (people count, hidden) */}
        <YAxis
          yAxisId="asist"
          orientation="right"
          hide
        />

        <Tooltip content={<ComboTooltip />} />

        <Bar
          yAxisId="ofrenda"
          dataKey="ofrenda"
          name="Ofrendas"
          fill={C_PRIMARY}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          opacity={0.85}
        />

        <Line
          yAxisId="asist"
          dataKey="asistencia"
          name="Asistencia"
          stroke={C_SECONDARY}
          strokeWidth={2.5}
          dot={{ fill: C_SECONDARY, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── DonutChart (SVG) with percentages ─────────────────────────────────────────

function DonutChart({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0 }) {
  const total = adultos + voluntarios + ninos + bebes;
  const cx = 65, cy = 65, r = 50, sw = 16;
  const circ = 2 * Math.PI * r;

  const segments = [
    { value: adultos,     color: '#112540',  label: 'Adultos' },
    { value: voluntarios, color: '#305181',  label: 'Voluntarios' },
    { value: ninos,       color: C_PRIMARY,  label: 'Niños' },
    { value: bebes,       color: C_SECONDARY,label: 'Bebés' },
  ].filter(s => s.value > 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 130, color: C_MUTED, fontSize: 13 }}>
        Sin datos
      </div>
    );
  }

  let offset = 0;
  const arcs = segments.map(seg => {
    const dash = (seg.value / total) * circ;
    const gap  = circ - dash;
    const arc  = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={130} height={130} viewBox="0 0 130 130" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C_BORDER} strokeWidth={sw} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={sw}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset + circ / 4}
          />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize={20} fontWeight={800} fill={C_INK} fontFamily="var(--font-mono)">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill={C_MUTED}>total</text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {segments.map(seg => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C_MUTED, flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C_INK, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {seg.value} <span style={{ color: C_MUTED, fontWeight: 500 }}>· {pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, extra, color, icon: Icon }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, lineHeight: 1.4, maxWidth: '80%' }}>{label}</div>
        <div style={{ color, opacity: 0.75, flexShrink: 0 }}><Icon size={20} /></div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{sub}</div>
      {extra && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{extra}</div>}
    </div>
  );
}

// ── QuickMiniBtn ──────────────────────────────────────────────────────────────

function QuickMiniBtn({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        border: `1.5px solid ${C_BORDER}`,
        background: '#fff', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        width: '100%', textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4D4D4'; e.currentTarget.style.background = '#FAFAFA'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C_BORDER;  e.currentTarget.style.background = '#fff'; }}
    >
      <div style={{
        color, width: 32, height: 32, borderRadius: 8,
        background: color + '1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StewardshipDashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const base = '/' + role;

  const isMobile = useIsMobile(640);
  const isTablet = useIsMobile(1100);
  const statCols = isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)';

  const year   = new Date().getFullYear();
  const hoy    = new Date();
  const mes    = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const hoyStr = hoy.toISOString().slice(0, 10);

  // ── State ──────────────────────────────────────────────────────────────────
  const [asistencia,     setAsistencia]     = useState([]);
  const [ofrendas,       setOfrendas]       = useState([]);
  const [gastos,         setGastos]         = useState([]);
  const [gastosPorPagar, setGastosPorPagar] = useState([]);
  const [calendario,     setCalendario]     = useState([]);
  const [participantes,  setParticipantes]  = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ra, ro, rg, rgp, rc, rp] = await Promise.all([
          asistenciaApi.getAll({ year, limit: 200 }),
          ofrendasApi.getAll({ year }),
          gastosApi.getAll({ year, pagado: 'true' }),
          gastosApi.getAll({ year, pagado: 'false' }),
          calendarioApi.getAll({ year }),
          participantesApi.getAll(),
        ]);
        if (!cancelled) {
          setAsistencia(ra.data      || []);
          setOfrendas(ro.data        || []);
          setGastos(rg.data          || []);
          setGastosPorPagar(rgp.data || []);
          setCalendario(rc.data      || []);
          setParticipantes(rp.data   || []);
        }
      } catch { /* keeps empty arrays; cards show — */ }
      finally   { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [year]);

  // ── Último servicio ────────────────────────────────────────────────────────
  const ultimoServicio = [...asistencia].sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
  const ultimaFecha    = ultimoServicio?.fecha ?? null;
  const totalAsist     = ultimoServicio
    ? (ultimoServicio.adultos || 0) + (ultimoServicio.voluntarios || 0)
      + (ultimoServicio.ninos || 0) + (ultimoServicio.bebes || 0)
    : null;

  // ── Ofrenda del último servicio ───────────────────────────────────────────
  const ultimaFechaISO = toDateISO(ultimaFecha);
  const ultimaOfrenda  = ofrendas.find(o => toDateISO(o.fecha) === ultimaFechaISO) ?? null;
  const totalOfrenda   = ultimaOfrenda
    ? (Number(ultimaOfrenda.efectivo)        || 0)
      + (Number(ultimaOfrenda.terminal)      || 0)
      + (Number(ultimaOfrenda.transferencia) || 0)
    : null;
  const participacion = ultimaOfrenda?.participacion ?? null;
  const nuevos        = ultimoServicio?.nuevos        ?? null;

  // ── Saldo en caja ─────────────────────────────────────────────────────────
  const totalEfectivoCaja = ofrendas.reduce((s, o) => s + (Number(o.efectivo)  || 0), 0);
  const totalGastosCaja   = gastos.reduce((s, g)   => s + (Number(g.monto)     || 0), 0);
  const saldoCaja         = SALDO_INICIAL_CAJA + totalEfectivoCaja - totalGastosCaja;

  // ── Resumen del mes ────────────────────────────────────────────────────────
  const ingresosMes   = ofrendas
    .filter(o => toDateISO(o.fecha)?.startsWith(mes))
    .reduce((s, o) => s + (Number(o.efectivo) || 0) + (Number(o.terminal) || 0) + (Number(o.transferencia) || 0), 0);
  const egresosMes    = gastos
    .filter(g => toDateISO(g.fecha)?.startsWith(mes))
    .reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const porPagarTotal = gastosPorPagar.reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const balanceMes    = ingresosMes - egresosMes;

  // ── Chart data (last 8 services) ───────────────────────────────────────────
  const chartData = useMemo(() => {
    const sorted = [...asistencia].sort((a, b) => toDateISO(a.fecha).localeCompare(toDateISO(b.fecha)));
    const last8  = sorted.slice(-8);
    return last8.map((row, i) => {
      const iso     = toDateISO(row.fecha);
      const ofr     = ofrendas.find(o => toDateISO(o.fecha) === iso);
      const oTotal  = ofr
        ? (Number(ofr.efectivo) || 0) + (Number(ofr.terminal) || 0) + (Number(ofr.transferencia) || 0)
        : 0;
      const total   = (row.adultos || 0) + (row.voluntarios || 0) + (row.ninos || 0) + (row.bebes || 0);
      return {
        label:      iso === hoyStr ? 'Hoy' : `S${i + 1}`,
        asistencia: total,
        ofrenda:    oTotal,
      };
    });
  }, [asistencia, ofrendas, hoyStr]);

  const promAsist = chartData.length ? Math.round(chartData.reduce((s, d) => s + d.asistencia, 0) / chartData.length) : 0;
  const promOfr   = chartData.length ? chartData.reduce((s, d) => s + d.ofrenda,    0) / chartData.length : 0;
  const mejorDom  = chartData.reduce((best, d) => d.asistencia > (best?.asistencia ?? 0) ? d : best, null);
  const tendencia = chartData.length >= 2
    ? chartData[chartData.length - 1].asistencia - chartData[chartData.length - 2].asistencia
    : 0;

  // ── Próximos eventos ───────────────────────────────────────────────────────
  const proximosEventos = [...calendario]
    .filter(e => toDateISO(e.fecha) >= hoyStr)
    .sort((a, b) => toDateISO(a.fecha).localeCompare(toDateISO(b.fecha)))
    .slice(0, 5);

  // ── Stat card values ───────────────────────────────────────────────────────
  const D           = '—';
  const vAsistencia = loading ? D : totalAsist    !== null ? String(totalAsist)       : D;
  const vOfrenda    = loading ? D : totalOfrenda  !== null ? `$${fmt(totalOfrenda)}`  : D;
  const vParticip   = loading ? D : participacion !== null ? `${participacion}%`      : D;
  const vNuevos     = loading ? D : nuevos        !== null ? String(nuevos)           : D;
  const vSaldo      = loading ? D : `${saldoCaja >= 0 ? '' : '−'}$${fmt(Math.abs(saldoCaja))}`;
  const subAsist    = !loading && ultimaFecha ? fmtDate(ultimaFecha) : D;
  const extraAsist  = !loading && ultimoServicio
    ? `Ad ${ultimoServicio.adultos ?? 0} · Vol ${ultimoServicio.voluntarios ?? 0} · Niños ${ultimoServicio.ninos ?? 0} · Bbs ${ultimoServicio.bebes ?? 0}`
    : null;
  const mesLabel = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: 14 }}>
        <StatCard label="Asistencia"        value={vAsistencia} sub={subAsist} extra={extraAsist}                         color="#14b8a6"    icon={I.users} />
        <StatCard label="Ofrendas"          value={vOfrenda}    sub={!loading && ultimaFecha ? fmtDate(ultimaFecha) : D}  color={C_PRIMARY}  icon={I.coin} />
        <StatCard label="Participación"     value={vParticip}   sub="del último servicio"                                 color={C_SECONDARY} icon={I.coin} />
        <StatCard label="Nuevos visitantes" value={vNuevos}     sub="visitantes nuevos"                                   color="var(--warn)" icon={I.users} />
        <StatCard
          label="Saldo en caja"
          value={vSaldo}
          sub={`efectivo disponible · acumulado ${year}`}
          color={!loading && saldoCaja < 0 ? 'var(--danger)' : 'var(--good)'}
          icon={I.cash}
        />
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ComboChart */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Asistencia y ofrendas</h3>
                <div className="card-sub">Últimos {chartData.length} servicios</div>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate(`${base}/asistencia`)}>
                Ver más <I.chevR size={14} />
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <ComboChart data={chartData} />
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 10, borderRadius: 3, background: C_PRIMARY, opacity: 0.85 }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Ofrendas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2.5, borderRadius: 99, background: C_SECONDARY }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Asistencia</span>
              </div>
            </div>

            {/* Footer stats */}
            {chartData.length > 0 && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C_BORDER}`,
              }}>
                {[
                  { lbl: 'Prom. asistencia', val: String(promAsist),       clr: C_INK },
                  { lbl: 'Prom. ofrenda',    val: `$${fmt(promOfr)}`,       clr: C_INK },
                  { lbl: 'Mejor servicio',   val: mejorDom ? String(mejorDom.asistencia) : D, clr: C_INK },
                  { lbl: 'Tendencia',
                    val: `${tendencia >= 0 ? '+' : ''}${tendencia}`,
                    clr: tendencia >= 0 ? '#16A34A' : '#DC2626' },
                ].map(({ lbl, val, clr }) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 10.5, color: C_MUTED, fontWeight: 500, marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: clr }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos eventos */}
          {proximosEventos.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">Próximos eventos</h3>
                <button className="btn btn-ghost" onClick={() => navigate(`${base}/calendario`)}>
                  Ver todos <I.chevR size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {proximosEventos.map(e => {
                  const tipColor = TIPO_COLOR[e.tipo] || C_MUTED;
                  const tipBg    = TIPO_BG[e.tipo]    || '#F5F5F5';
                  const isPE     = Boolean(e.en_punto_encuentro);
                  const count    = isPE ? participantes.filter(p => p.evento_id === e.id).length : null;
                  const iso      = toDateISO(e.fecha);
                  const dateObj  = iso ? new Date(iso + 'T00:00:00') : null;
                  const dayNum   = dateObj?.getDate() ?? null;
                  const monthAbb = dateObj?.toLocaleDateString('es-MX', { month: 'short' }) ?? null;
                  return (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--surface)', border: `1px solid ${C_BORDER}`,
                    }}>
                      {/* Date box */}
                      <div style={{
                        flexShrink: 0, width: 44, minHeight: 46,
                        borderRadius: 8,
                        background: tipColor + '18',
                        border: `1.5px solid ${tipColor}33`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: tipColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{dayNum ?? '?'}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: tipColor, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{monthAbb ?? ''}</div>
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{e.nombre}</span>
                          {isPE && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#14b8a61a', color: '#14b8a6', flexShrink: 0 }}>
                              PE
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, flexWrap: 'wrap' }}>
                          {e.tipo && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: tipBg, color: tipColor }}>{e.tipo}</span>
                          )}
                          {count !== null && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{count} registrados</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Donut – desglose asistencia */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Composición de asistencia</h3>
                <div className="card-sub">{subAsist}</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <DonutChart
                adultos={ultimoServicio?.adultos     ?? 0}
                voluntarios={ultimoServicio?.voluntarios ?? 0}
                ninos={ultimoServicio?.ninos          ?? 0}
                bebes={ultimoServicio?.bebes          ?? 0}
              />
            </div>
          </div>

          {/* Cumpleaños – placeholder */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Cumpleaños</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0', color: 'var(--muted)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C_SECONDARY + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_SECONDARY }}>
                <I.users size={22} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Próximamente</div>
              <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 220, lineHeight: 1.5, color: 'var(--muted)' }}>
                Cumpleaños del mes de los miembros de la congregación.
              </div>
            </div>
          </div>

          {/* Resumen del mes */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Resumen del mes</h3>
                <div className="card-sub" style={{ textTransform: 'capitalize' }}>{mesLabel}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate(`${base}/balance`)}>
                Ver <I.chevR size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 10 }}>
              {[
                { label: 'Ingresos',  value: ingresosMes,   color: '#16A34A', sign: '+' },
                { label: 'Egresos',   value: egresosMes,    color: '#DC2626', sign: '−' },
                { label: 'Por pagar', value: porPagarTotal, color: '#CA8A04', sign: '' },
              ].map(({ label, value, color, sign }, idx) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: idx < 2 ? `1px solid ${C_BORDER}` : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
                    {loading ? '—' : `${sign}$${fmt(value)}`}
                  </span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${C_BORDER}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Balance</span>
                <span style={{
                  fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                  color: loading ? C_INK : balanceMes >= 0 ? '#16A34A' : '#DC2626',
                }}>
                  {loading ? '—' : `${balanceMes >= 0 ? '+' : '−'}$${fmt(Math.abs(balanceMes))}`}
                </span>
              </div>
            </div>
          </div>

          {/* Acceso rápido */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Acceso rápido</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
              <QuickMiniBtn icon={I.arrowBarDown} label="Ingresos"       color={C_PRIMARY}    onClick={() => navigate(`${base}/ingresos`)} />
              <QuickMiniBtn icon={I.receipt}      label="Gastos"         color="#DC2626"       onClick={() => navigate(`${base}/gastos`)} />
              <QuickMiniBtn icon={I.scale}        label="Finanzas"       color="#16A34A"       onClick={() => navigate(`${base}/balance`)} />
              <QuickMiniBtn icon={I.users}        label="Asistencia"     color="#14b8a6"       onClick={() => navigate(`${base}/asistencia`)} />
              <QuickMiniBtn icon={I.pin}          label="Pto. Encuentro" color={C_MUTED}       onClick={() => navigate(`${base}/punto-encuentro`)} />
              <QuickMiniBtn icon={I.calendar}     label="Calendario"     color="#CA8A04"       onClick={() => navigate(`${base}/calendario`)} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
