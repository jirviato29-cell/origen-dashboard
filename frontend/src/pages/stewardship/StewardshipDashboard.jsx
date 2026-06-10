import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { asistenciaApi, ofrendasApi, gastosApi, calendarioApi, participantesApi, voluntariosApi } from '../../services/api';
import { SALDO_INICIAL_CAJA } from '../../utils/config';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';
import { TIPO_COLOR, TIPO_BG } from '../../utils/tipoEventoColors';

// ── Design tokens (exact values from Origen_Dashboard__offline_.html) ─────────
const D_NAVY_950  = '#0B1A2F';
const D_NAVY_900  = '#112540';
const D_NAVY_800  = '#1A3354';
const D_NAVY_600  = '#305181';
const D_NAVY_300  = '#9CB0CC';
const D_NAVY_100  = '#DCE4EF';
const D_ORANGE    = '#FF6B2B';
const D_ORANGE_50 = '#FFF4EE';
const D_GRAY_700  = '#3D4654';
const D_GRAY_500  = '#7A8699';
const D_GRAY_200  = '#E2E6EC';
const D_GRAY_100  = '#EEF1F5';
const D_GRAY_50   = '#F6F7F9';
const D_GREEN_600 = '#15915A';
const D_GREEN_400 = '#3DD68C';
const D_RED_600   = '#D23B36';
const D_AMBER_600 = '#C98A14';
const D_CYAN      = '#00B4D8'; // chart primary

const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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

// ── Recharts: custom X tick ───────────────────────────────────────────────────

function XTickHoy({ x, y, payload }) {
  const isHoy = payload.value === 'Hoy';
  return (
    <text
      x={x} y={y + 14}
      textAnchor="middle"
      fill={isHoy ? D_ORANGE : D_GRAY_500}
      fontSize={10}
      fontWeight={isHoy ? 700 : 500}
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
    >
      {payload.value}
    </text>
  );
}

// ── Recharts: custom dot — white ring + last dot solid orange ─────────────────

function makeLineDot(dataLen) {
  return function LineDot({ cx, cy, index }) {
    if (cx == null || cy == null) return null;
    const isLast = index === dataLen - 1;
    return isLast
      ? <circle key={index} cx={cx} cy={cy} r={5}   fill={D_ORANGE} />
      : <circle key={index} cx={cx} cy={cy} r={3.2} fill="#fff" stroke={D_ORANGE} strokeWidth={2.5} />;
  };
}

// ── Recharts: custom tooltip ──────────────────────────────────────────────────

function ComboTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${D_GRAY_200}`, borderRadius: 10,
      padding: '8px 13px', fontSize: 12.5,
      boxShadow: '0 4px 16px rgba(11,26,47,.10)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: D_NAVY_900, fontSize: 13 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0, opacity: p.dataKey === 'ofrenda' ? 0.85 : 1 }} />
          <span style={{ fontSize: 11.5, color: D_GRAY_500 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: D_NAVY_900 }}>
            {p.dataKey === 'ofrenda'
              ? `$${Number(p.value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── ComboChart ────────────────────────────────────────────────────────────────

function ComboChart({ data }) {
  const lineDot = useMemo(() => makeLineDot(data.length), [data.length]);

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: D_GRAY_500, fontSize: 13 }}>
        Sin datos suficientes
      </div>
    );
  }

  const fmtYLeft = v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid
          vertical={false}
          stroke={D_GRAY_100}
          strokeDasharray="0"
          strokeWidth={1}
        />
        <XAxis
          dataKey="label"
          tick={<XTickHoy />}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="ofrenda"
          orientation="left"
          tickFormatter={fmtYLeft}
          tick={{ fontSize: 10, fill: D_GRAY_500, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <YAxis yAxisId="asist" orientation="right" hide />
        <Tooltip content={<ComboTooltip />} />

        <Bar yAxisId="ofrenda" dataKey="ofrenda" name="Ofrendas" radius={[4, 4, 0, 0]} maxBarSize={38}>
          {data.map((_, i) => (
            <Cell key={i} fill={D_NAVY_600} opacity={i === data.length - 1 ? 1 : 0.55} />
          ))}
        </Bar>

        <Line
          yAxisId="asist"
          dataKey="asistencia"
          name="Asistencia"
          stroke={D_ORANGE}
          strokeWidth={2.6}
          dot={lineDot}
          activeDot={{ r: 5, fill: D_ORANGE, strokeWidth: 0 }}
          type="linear"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── DonutChart (SVG — fiel al diseño) ─────────────────────────────────────────

function DonutChart({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0 }) {
  const total = adultos + voluntarios + ninos + bebes;
  const r = 54, cx = 64, cy = 64, sw = 18;
  const circ = 2 * Math.PI * r;

  const segments = [
    { value: adultos,     color: D_NAVY_900, label: 'Adultos' },
    { value: voluntarios, color: D_NAVY_600, label: 'Voluntarios' },
    { value: ninos,       color: D_CYAN,     label: 'Niños' },
    { value: bebes,       color: D_ORANGE,   label: 'Bebés' },
  ].filter(s => s.value > 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128, color: D_GRAY_500, fontSize: 13 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      {/* SVG donut — exact match to design (rotate -90) */}
      <div style={{ position: 'relative', flexShrink: 0, width: 128, height: 128 }}>
        <svg width={128} height={128} viewBox="0 0 128 128">
          <g transform={`rotate(-90 ${cx} ${cy})`} fill="none" strokeWidth={sw}>
            <circle cx={cx} cy={cy} r={r} stroke={D_NAVY_100} strokeWidth={sw} />
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth={sw}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
          </g>
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', color: D_NAVY_900, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 10.5, color: D_GRAY_500, fontWeight: 600, marginTop: 2 }}>total</div>
        </div>
      </div>

      {/* Legend — name + value + % */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        {segments.map(seg => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: D_GRAY_700, fontWeight: 500, flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: D_NAVY_900, fontVariantNumeric: 'tabular-nums' }}>{seg.value}</span>
              <span style={{ fontSize: 11, color: D_GRAY_500, width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, extra, feature = false, icon: Icon }) {
  return (
    <div style={{
      background: feature ? D_NAVY_900 : '#fff',
      border: `1px solid ${feature ? D_NAVY_900 : D_GRAY_200}`,
      borderRadius: 14,
      padding: '18px 18px 16px',
      boxShadow: '0 1px 2px rgba(11,26,47,.06)',
      transition: '.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: feature ? D_NAVY_300 : D_GRAY_500 }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: feature ? 'rgba(255,107,43,.16)' : D_ORANGE_50,
          border: `1px solid ${feature ? 'rgba(255,107,43,.3)' : '#FFE5D6'}`,
          color: feature ? '#FF8A52' : D_ORANGE,
          flexShrink: 0,
        }}>
          <Icon size={17} />
        </div>
      </div>
      <div style={{
        fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
        color: feature ? D_GREEN_400 : D_NAVY_900,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        marginTop: 11, paddingTop: 10,
        borderTop: `1px solid ${feature ? 'rgba(255,255,255,.10)' : D_GRAY_100}`,
        fontSize: 11, color: feature ? D_NAVY_300 : D_GRAY_500,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
      }}>
        <span>{sub}</span>
        {extra && <span>{extra}</span>}
      </div>
    </div>
  );
}

// ── QuickMiniBtn — icon bg navy-900 (first 2: orange) ────────────────────────

function QuickMiniBtn({ icon: Icon, label, onClick, accent = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        padding: '13px 6px', borderRadius: 10,
        border: `1px solid ${hovered ? D_NAVY_600 : D_GRAY_200}`,
        background: hovered ? D_GRAY_50 : '#fff',
        cursor: 'pointer', transition: '.13s', width: '100%',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: accent ? D_ORANGE : D_NAVY_900,
        color: '#fff', flexShrink: 0,
      }}>
        <Icon size={17} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: D_NAVY_900, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
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
  const [voluntarios,    setVoluntarios]    = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ra, ro, rg, rgp, rc, rp, rv] = await Promise.all([
          asistenciaApi.getAll({ year, limit: 200 }),
          ofrendasApi.getAll({ year }),
          gastosApi.getAll({ year, pagado: 'true' }),
          gastosApi.getAll({ year, pagado: 'false' }),
          calendarioApi.getAll({ year }),
          participantesApi.getAll(),
          voluntariosApi.getAll(),
        ]);
        if (!cancelled) {
          setAsistencia(ra.data      || []);
          setOfrendas(ro.data        || []);
          setGastos(rg.data          || []);
          setGastosPorPagar(rgp.data || []);
          setCalendario(rc.data      || []);
          setParticipantes(rp.data   || []);
          setVoluntarios(rv.data     || []);
        }
      } catch { /* keeps empty arrays; cards show — */ }
      finally   { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [year]);

  // ── Cumpleaños de este mes ─────────────────────────────────────────────────
  const bdayThisMonth = useMemo(() => {
    const mesActual = hoy.getMonth();
    return voluntarios
      .filter(v => v.cumpleanos)
      .map(v => {
        const iso = v.cumpleanos.slice(0, 10);
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d)) return null;
        return { nombre: v.nombre, ministerio1: v.ministerio1, day: d.getDate(), month: d.getMonth() };
      })
      .filter(e => e && e.month === mesActual)
      .sort((a, b) => a.day - b.day);
  }, [voluntarios, hoy]);

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
      const iso    = toDateISO(row.fecha);
      const ofr    = ofrendas.find(o => toDateISO(o.fecha) === iso);
      const oTotal = ofr
        ? (Number(ofr.efectivo) || 0) + (Number(ofr.terminal) || 0) + (Number(ofr.transferencia) || 0)
        : 0;
      const total  = (row.adultos || 0) + (row.voluntarios || 0) + (row.ninos || 0) + (row.bebes || 0);
      return { label: iso === hoyStr ? 'Hoy' : `S${i + 1}`, asistencia: total, ofrenda: oTotal };
    });
  }, [asistencia, ofrendas, hoyStr]);

  const promAsist = chartData.length ? Math.round(chartData.reduce((s, d) => s + d.asistencia, 0) / chartData.length) : 0;
  const promOfr   = chartData.length ? chartData.reduce((s, d) => s + d.ofrenda, 0) / chartData.length : 0;
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
  const D_VAL     = '—';
  const vAsistencia = loading ? D_VAL : totalAsist    !== null ? String(totalAsist)       : D_VAL;
  const vOfrenda    = loading ? D_VAL : totalOfrenda  !== null ? `$${fmt(totalOfrenda)}`  : D_VAL;
  const vParticip   = loading ? D_VAL : participacion !== null ? `${participacion}%`      : D_VAL;
  const vNuevos     = loading ? D_VAL : nuevos        !== null ? String(nuevos)           : D_VAL;
  const vSaldo      = loading ? D_VAL : `$${fmt(Math.abs(saldoCaja))}`;
  const subAsist    = !loading && ultimaFecha ? fmtDate(ultimaFecha) : D_VAL;
  const extraAsist  = !loading && ultimoServicio
    ? `Ad ${ultimoServicio.adultos ?? 0} · Vol ${ultimoServicio.voluntarios ?? 0} · Niños ${ultimoServicio.ninos ?? 0} · Bbs ${ultimoServicio.bebes ?? 0}`
    : undefined;
  const mesLabel = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const cardStyle = { background: '#fff', border: `1px solid ${D_GRAY_200}`, borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 2px rgba(11,26,47,.06)' };
  const cardTitleStyle = { fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: D_NAVY_900, margin: 0 };
  const seeAllStyle = { fontSize: 12.5, fontWeight: 600, color: D_ORANGE, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'none', border: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: 14 }}>
        <StatCard label="Asistencia"        value={vAsistencia} sub={subAsist}          extra={extraAsist}     icon={I.users} />
        <StatCard label="Ofrendas"          value={vOfrenda}    sub="del último servicio"                      icon={I.coin} />
        <StatCard label="Participación"     value={vParticip}   sub="del último servicio"                      icon={I.coin} />
        <StatCard label="Nuevos visitantes" value={vNuevos}     sub="visitantes nuevos"                        icon={I.users} />
        <StatCard label="Saldo en caja"     value={vSaldo}      sub={`efectivo · acumulado ${year}`} feature   icon={I.cash} />
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.62fr 1fr', gap: 18, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Combo chart */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
              <h3 style={cardTitleStyle}>Asistencia y ofrendas</h3>
              <button style={seeAllStyle} onClick={() => navigate(`${base}/asistencia`)}>
                Ver más <I.chevR size={13} />
              </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: D_GRAY_500, fontWeight: 600 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: D_NAVY_600, opacity: 0.85, display: 'inline-block' }} />
                Ofrendas
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: D_GRAY_500, fontWeight: 600 }}>
                <span style={{ width: 16, height: 3, borderRadius: 2, background: D_ORANGE, display: 'inline-block' }} />
                Asistencia
              </span>
            </div>

            <ComboChart data={chartData} />

            {/* Footer stats */}
            {chartData.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D_GRAY_100}` }}>
                {[
                  { l: 'Asistencia promedio', v: String(promAsist), green: false },
                  { l: 'Ofrenda promedio',    v: `$${fmt(promOfr)}`, green: true },
                  { l: 'Mejor domingo',       v: mejorDom ? String(mejorDom.asistencia) : '—', green: false },
                  { l: 'Tendencia 8 sem.',    v: tendencia >= 0 ? `▲ ${tendencia}` : `▼ ${Math.abs(tendencia)}`, green: tendencia >= 0 },
                ].map(({ l, v, green }) => (
                  <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: D_GRAY_500, fontWeight: 600 }}>{l}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: green ? D_GREEN_600 : D_NAVY_900, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos eventos */}
          {proximosEventos.length > 0 && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                <h3 style={cardTitleStyle}>Próximos eventos</h3>
                <button style={seeAllStyle} onClick={() => navigate(`${base}/calendario`)}>
                  Ver todos <I.chevR size={13} />
                </button>
              </div>
              {proximosEventos.map(e => {
                const isPE     = Boolean(e.en_punto_encuentro);
                const count    = isPE ? participantes.filter(p => p.evento_id === e.id).length : null;
                const iso      = toDateISO(e.fecha);
                const dateObj  = iso ? new Date(iso + 'T00:00:00') : null;
                const dayNum   = dateObj?.getDate() ?? null;
                const monthAbb = dateObj?.toLocaleDateString('es-MX', { month: 'short' }) ?? null;
                const borderColor = isPE ? D_ORANGE : D_NAVY_600;
                return (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${D_GRAY_200}`,
                    borderLeft: `3px solid ${borderColor}`,
                    background: '#fff', marginBottom: 10, position: 'relative',
                    transition: '.13s',
                  }}>
                    {/* Date box */}
                    <div style={{ width: 54, flexShrink: 0, textAlign: 'center' }}>
                      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', color: D_NAVY_900, lineHeight: 1 }}>{dayNum ?? '?'}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: D_GRAY_500, marginTop: 3 }}>{monthAbb ?? ''}</div>
                    </div>
                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: D_NAVY_900, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        {e.nombre}
                        {isPE && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: '#FFF4EE', color: '#E0561B', border: '1px solid #FFE5D6' }}>
                            Pto. Encuentro
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        {e.tipo && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: D_NAVY_100, color: '#244169' }}>
                            {e.tipo}
                          </span>
                        )}
                        {count !== null && (
                          <span style={{ fontSize: 10.5, color: D_GRAY_500 }}>{count} registrados</span>
                        )}
                      </div>
                    </div>
                    {/* Registered count (right) */}
                    {count !== null && (
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 19, fontWeight: 800, color: count === 0 ? D_GRAY_200 : D_NAVY_900, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
                        <div style={{ fontSize: 10.5, color: D_GRAY_500, fontWeight: 600, marginTop: 3 }}>registrados</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Donut */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
              <h3 style={cardTitleStyle}>Composición de asistencia</h3>
            </div>
            <DonutChart
              adultos={ultimoServicio?.adultos     ?? 0}
              voluntarios={ultimoServicio?.voluntarios ?? 0}
              ninos={ultimoServicio?.ninos          ?? 0}
              bebes={ultimoServicio?.bebes          ?? 0}
            />
          </div>

          {/* Cumpleaños de este mes */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={cardTitleStyle}>Cumpleaños de este mes</h3>
              {bdayThisMonth.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#244169', background: D_NAVY_100, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  {MESES_ES[hoy.getMonth()].charAt(0).toUpperCase() + MESES_ES[hoy.getMonth()].slice(1)} · {bdayThisMonth.length}
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ color: D_GRAY_500, fontSize: 13, padding: '14px 0' }}>Cargando…</div>
            ) : bdayThisMonth.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: D_GRAY_100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D_GRAY_500 }}>
                  <I.users size={20} />
                </div>
                <div style={{ fontSize: 13, color: D_GRAY_500 }}>Nadie cumple años este mes</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const todayDay = hoy.getDate();
                  const proxIdx  = bdayThisMonth.findIndex(p => p.day > todayDay);
                  return bdayThisMonth.map((p, i) => {
                    const isHoy    = p.day === todayDay;
                    const isProx   = !isHoy && i === proxIdx;
                    const initials = (p.nombre || '').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
                    const diasFaltan = p.day - todayDay;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: (isHoy || isProx) ? D_ORANGE : D_NAVY_600,
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: D_NAVY_900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.nombre}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: D_GRAY_500, marginTop: 1 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <rect x="3" y="10" width="18" height="11" rx="2"/><path d="M3 10h18"/><path d="M8 10V7"/><path d="M12 10V7"/><path d="M16 10V7"/><circle cx="8" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="16" cy="6" r="1"/>
                            </svg>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.day} de {MESES_ES[p.month]}{p.ministerio1 ? ` · ${p.ministerio1}` : ''}
                            </span>
                          </div>
                        </div>
                        {isHoy && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#E0561B', background: D_ORANGE_50, borderRadius: 20, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            ¡Hoy!
                          </span>
                        )}
                        {isProx && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#244169', background: D_NAVY_100, borderRadius: 20, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            en {diasFaltan} días
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Resumen del mes */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
              <div>
                <h3 style={cardTitleStyle}>Resumen del mes</h3>
              </div>
              <button style={seeAllStyle} onClick={() => navigate(`${base}/balance`)}>
                Ver <I.chevR size={13} />
              </button>
            </div>

            {[
              { label: 'Ingresos',  dot: D_GREEN_600, amt: loading ? '—' : `+ $${fmt(ingresosMes)}`,   cls: 'pos' },
              { label: 'Egresos',   dot: D_RED_600,   amt: loading ? '—' : `− $${fmt(egresosMes)}`,    cls: 'neg' },
              { label: 'Por pagar', dot: D_AMBER_600, amt: loading ? '—' : `− $${fmt(porPagarTotal)}`, cls: 'neg' },
            ].map(({ label, dot, amt, cls }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${D_GRAY_100}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: D_GRAY_700, fontWeight: 500 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                  {label}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: cls === 'pos' ? D_GREEN_600 : D_RED_600 }}>
                  {amt}
                </span>
              </div>
            ))}

            {/* Balance row — dark navy */}
            <div style={{ marginTop: 14, background: D_NAVY_900, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, color: D_NAVY_300, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Balance neto
              </span>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: loading ? D_NAVY_300 : balanceMes >= 0 ? D_GREEN_400 : '#FF8A52', fontVariantNumeric: 'tabular-nums' }}>
                {loading ? '—' : `${balanceMes >= 0 ? '+' : '−'} $${fmt(Math.abs(balanceMes))}`}
              </span>
            </div>
          </div>

          {/* Acceso rápido */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={cardTitleStyle}>Acceso rápido</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
              <QuickMiniBtn icon={I.arrowBarDown} label="Ingresos"       accent onClick={() => navigate(`${base}/ingresos`)} />
              <QuickMiniBtn icon={I.receipt}      label="Gastos"         accent onClick={() => navigate(`${base}/gastos`)} />
              <QuickMiniBtn icon={I.scale}        label="Finanzas"       onClick={() => navigate(`${base}/balance`)} />
              <QuickMiniBtn icon={I.users}        label="Asistencia"     onClick={() => navigate(`${base}/asistencia`)} />
              <QuickMiniBtn icon={I.pin}          label="Pto. Encuentro" onClick={() => navigate(`${base}/punto-encuentro`)} />
              <QuickMiniBtn icon={I.calendar}     label="Calendario"     onClick={() => navigate(`${base}/calendario`)} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
