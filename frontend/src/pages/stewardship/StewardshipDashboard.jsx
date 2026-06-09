import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { asistenciaApi, ofrendasApi, gastosApi, calendarioApi, participantesApi } from '../../services/api';
import { SALDO_INICIAL_CAJA } from '../../utils/config';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';
import { TIPO_COLOR, TIPO_BG } from '../../utils/tipoEventoColors';

function fmt(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateISO(d) { return d ? String(d).slice(0, 10) : null; }

function fmtDate(d) {
  const iso = toDateISO(d);
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, extra, color, icon: Icon }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, lineHeight: 1.4, maxWidth: '80%' }}>{label}</div>
        <div style={{ color, opacity: 0.75, flexShrink: 0 }}><Icon size={20} /></div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginTop: 10, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{sub}</div>
      {extra && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{extra}</div>}
    </div>
  );
}

function QuickMiniBtn({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)',
        background: 'var(--surface)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        width: '100%', textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
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

function DonutChart({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0 }) {
  const total = adultos + voluntarios + ninos + bebes;
  const cx = 70, cy = 70, r = 54, sw = 18;
  const circ = 2 * Math.PI * r;

  const segments = [
    { value: adultos,     color: '#112540',                label: 'Adultos' },
    { value: voluntarios, color: '#305181',                label: 'Voluntarios' },
    { value: ninos,       color: 'var(--chart-primary)',   label: 'Niños' },
    { value: bebes,       color: 'var(--chart-secondary)', label: 'Bebés' },
  ].filter(s => s.value > 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: 'var(--muted)', fontSize: 13 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={sw}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset + circ / 4}
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted)' }}>total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{seg.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', marginLeft: 'auto', paddingLeft: 10 }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComboChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--muted)', fontSize: 13 }}>
        Sin datos suficientes
      </div>
    );
  }

  const W = 580, H = 160, padL = 10, padR = 10, padT = 12, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n      = data.length;
  const slotW  = chartW / n;
  const barW   = Math.min(slotW * 0.55, 32);

  const maxA = Math.max(...data.map(d => d.asistencia || 0), 1);
  const maxO = Math.max(...data.map(d => d.ofrenda    || 0), 1);

  const scaleA  = v => padT + chartH - (v / maxA) * chartH;
  const scaleO  = v => padT + chartH - (v / maxO) * chartH;
  const xCenter = i => padL + slotW * i + slotW / 2;

  const linePoints = data
    .map((d, i) => `${xCenter(i)},${scaleA(d.asistencia || 0)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {data.map((d, i) => {
        const bh      = ((d.ofrenda || 0) / maxO) * chartH;
        const x       = xCenter(i) - barW / 2;
        const y       = padT + chartH - bh;
        const opacity = 0.5 + 0.45 * (i / Math.max(n - 1, 1));
        return (
          <rect key={i} x={x} y={y} width={barW} height={Math.max(bh, 0)} rx={3}
            fill="var(--chart-primary)" opacity={opacity} />
        );
      })}

      <polyline points={linePoints} fill="none" stroke="var(--chart-secondary)"
        strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {data.map((d, i) => (
        <circle key={i} cx={xCenter(i)} cy={scaleA(d.asistencia || 0)} r={3.5}
          fill="var(--chart-secondary)" />
      ))}

      {data.map((d, i) => (
        <text key={i} x={xCenter(i)} y={H - 4} textAnchor="middle"
          style={{ fontSize: 10, fill: 'var(--muted)' }}>
          {d.label}
        </text>
      ))}
    </svg>
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

  // ── Ofrendas del último servicio ──────────────────────────────────────────
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
      const ofrenda = ofrendas.find(o => toDateISO(o.fecha) === iso);
      const oTotal  = ofrenda
        ? (Number(ofrenda.efectivo) || 0) + (Number(ofrenda.terminal) || 0) + (Number(ofrenda.transferencia) || 0)
        : 0;
      const total   = (row.adultos || 0) + (row.voluntarios || 0) + (row.ninos || 0) + (row.bebes || 0);
      const label   = iso === hoyStr ? 'Hoy' : `S${i + 1}`;
      return { label, asistencia: total, ofrenda: oTotal };
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
        <StatCard label="Asistencia"       value={vAsistencia} sub={subAsist} extra={extraAsist} color="#14b8a6"               icon={I.users} />
        <StatCard label="Ofrendas"         value={vOfrenda}    sub={!loading && ultimaFecha ? fmtDate(ultimaFecha) : D}        color="var(--chart-primary)"   icon={I.coin} />
        <StatCard label="Participación"    value={vParticip}   sub="del último servicio"                                       color="var(--chart-secondary)" icon={I.coin} />
        <StatCard label="Nuevos visitantes" value={vNuevos}    sub="visitantes nuevos"                                         color="var(--warn)"            icon={I.users} />
        <StatCard label="Saldo en caja"    value={vSaldo}      sub={`efectivo disponible · acumulado ${year}`}                  color={!loading && saldoCaja < 0 ? 'var(--danger)' : 'var(--good)'} icon={I.cash} />
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Combo chart */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Asistencia & Ofrendas</h3>
                <div className="card-sub">Últimos {chartData.length} servicios</div>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate(`${base}/asistencia`)}>
                Ver más <I.chevR size={14} />
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <ComboChart data={chartData} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--chart-primary)', opacity: 0.8 }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Ofrendas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 24, height: 2.5, borderRadius: 99, background: 'var(--chart-secondary)' }} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Asistencia</span>
              </div>
            </div>
            {chartData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                {[
                  { lbl: 'Prom. asistencia', val: String(promAsist),             color: 'var(--ink)' },
                  { lbl: 'Prom. ofrenda',    val: `$${fmt(promOfr)}`,            color: 'var(--ink)' },
                  { lbl: 'Mejor servicio',   val: mejorDom ? String(mejorDom.asistencia) : D, color: 'var(--ink)' },
                  { lbl: 'Tendencia',        val: `${tendencia >= 0 ? '+' : ''}${tendencia}`, color: tendencia >= 0 ? 'var(--good)' : 'var(--danger)' },
                ].map(({ lbl, val, color }) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 500 }}>{lbl}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color, marginTop: 2 }}>{val}</div>
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
                  const tipColor = TIPO_COLOR[e.tipo] || 'var(--muted)';
                  const tipBg    = TIPO_BG[e.tipo]    || 'var(--surface-2)';
                  const isPE     = Boolean(e.en_punto_encuentro);
                  const count    = isPE ? participantes.filter(p => p.evento_id === e.id).length : null;
                  const iso      = toDateISO(e.fecha);
                  const dateObj  = iso ? new Date(iso + 'T00:00:00') : null;
                  const dayNum   = dateObj ? dateObj.getDate() : null;
                  const monthAbb = dateObj ? dateObj.toLocaleDateString('es-MX', { month: 'short' }) : null;
                  return (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        flexShrink: 0, width: 44, minHeight: 44,
                        borderRadius: 8, background: tipColor + '18',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${tipColor}33`,
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: tipColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{dayNum ?? '?'}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: tipColor, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{monthAbb ?? ''}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{e.nombre}</span>
                          {isPE && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#14b8a61a', color: '#14b8a6', flexShrink: 0 }}>PE</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
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
                <h3 className="card-title">Desglose asistencia</h3>
                <div className="card-sub">{subAsist}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--muted)' }}>
              <I.users size={32} />
              <div style={{ fontWeight: 600, fontSize: 13 }}>Próximamente</div>
              <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
                Esta sección mostrará los cumpleaños del mes de los miembros de la congregación.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {[
                { label: 'Ingresos',   value: ingresosMes,   color: 'var(--good)',   sign: '+' },
                { label: 'Egresos',    value: egresosMes,    color: 'var(--danger)', sign: '−' },
                { label: 'Por pagar',  value: porPagarTotal, color: 'var(--warn)',   sign: '' },
              ].map(({ label, value, color, sign }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
                    {loading ? '—' : `${sign}$${fmt(value)}`}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Balance</span>
                <span style={{
                  fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)',
                  color: loading ? 'var(--ink)' : balanceMes >= 0 ? 'var(--good)' : 'var(--danger)',
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
              <QuickMiniBtn icon={I.arrowBarDown} label="Ingresos"       color="var(--chart-primary)"   onClick={() => navigate(`${base}/ingresos`)} />
              <QuickMiniBtn icon={I.receipt}      label="Gastos"         color="var(--danger)"          onClick={() => navigate(`${base}/gastos`)} />
              <QuickMiniBtn icon={I.scale}        label="Finanzas"       color="var(--good)"            onClick={() => navigate(`${base}/balance`)} />
              <QuickMiniBtn icon={I.users}        label="Asistencia"     color="#14b8a6"                onClick={() => navigate(`${base}/asistencia`)} />
              <QuickMiniBtn icon={I.pin}          label="Pto. Encuentro" color="var(--muted)"           onClick={() => navigate(`${base}/punto-encuentro`)} />
              <QuickMiniBtn icon={I.calendar}     label="Calendario"     color="var(--warn)"            onClick={() => navigate(`${base}/calendario`)} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
