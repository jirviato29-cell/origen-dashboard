import { useState, useEffect } from 'react';
import { ofrendasApi, gastosApi, campusApi } from '../../services/api';
import { fmtFecha } from '../../utils/fecha';
import { CATEGORIAS, CAT_COLORS } from '../../utils/categorias';
import { useIsMobile } from '../../utils/useIsMobile';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, ResponsiveContainer, LabelList } from 'recharts';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY     = '#112540';
const NAVY_700 = '#244169';
const NAVY_600 = '#305181';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const GREEN    = '#15915A';
const GREEN_400= '#3DD68C';
const RED      = '#D23B36';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';
const ORANGE   = '#FF6B2B';
const ORANGE_50= '#FFF4EE';
const ORANGE_100='#FFE5D6';

// ── Formatters ─────────────────────────────────────────────────────────────
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function mesNombre(isoMes) {
  return new Date(isoMes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());
}

// ── Data builders (unchanged logic) ───────────────────────────────────────
function buildMonthlyData(ofrendas, gastos) {
  const meses = [...new Set(ofrendas.map(d => d.fecha.slice(0, 7)))].sort();
  return meses.map(mes => {
    const ingMes = ofrendas
      .filter(d => d.fecha.startsWith(mes))
      .reduce((s, d) => s + Number(d.total_ofrenda), 0);
    const gasMes = gastos
      .filter(g => g.fecha.startsWith(mes))
      .reduce((s, g) => s + Number(g.monto), 0);
    return { mes, label: mesNombre(mes), ingresos: ingMes, gastos: gasMes, balance: ingMes - gasMes };
  });
}

// ── Bar chart ──────────────────────────────────────────────────────────────
function fmtK(v) {
  const absK = Math.abs(v) / 1000;
  const sign = v >= 0 ? '+' : '-';
  return sign + (absK >= 10 ? Math.round(absK) : absK.toFixed(1)) + 'k';
}

function BarValueLabel({ x, y, width, height, value }) {
  if (!value) return null;
  const isPos = value >= 0;
  const cx = x + width / 2;
  const cy = isPos ? y - 5 : y + Math.abs(height) + 13;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="auto"
      fill={isPos ? GREEN : RED} fontSize={10} fontWeight={700}>
      {fmtK(value)}
    </text>
  );
}

function BalanceBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin datos para mostrar
      </div>
    );
  }
  const chartData = data.map(r => ({ name: r.label.slice(0, 3), balance: r.balance, label: r.label }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: GRAY_500 }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={v => v === 0 ? '$0' : `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v) / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: GRAY_500 }} axisLine={false} tickLine={false} width={44}
        />
        <Tooltip
          formatter={(value) => [fmt(value), 'Saldo']}
          labelFormatter={(name) => { const d = chartData.find(x => x.name === name); return d?.label || name; }}
          contentStyle={{ fontSize: 12.5, borderRadius: 8, border: `1px solid ${GRAY_200}` }}
        />
        <ReferenceLine y={0} stroke={GRAY_300} strokeWidth={1.5} />
        <Bar dataKey="balance" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.balance >= 0 ? GREEN : RED} />
          ))}
          <LabelList dataKey="balance" content={BarValueLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Reusable KPI card ──────────────────────────────────────────────────────
function KpiCard({ label, value, valueSuffix, foot, feature = false, valColor }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      background: feature ? NAVY : 'var(--surface)',
      border: `1px solid ${feature ? NAVY : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '18px 20px',
      boxShadow: 'var(--shadow-sm)', transition: '.15s',
    }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: feature ? NAVY_300 : GRAY_500, marginBottom: isMobile ? 3 : 11 }}>
            {label}
          </div>
          {isMobile && <div style={{ fontSize: 11.5, color: feature ? NAVY_300 : GRAY_500 }}>{foot}</div>}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: valColor, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {value}
        </div>
      </div>
      {!isMobile && (
        <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${feature ? 'rgba(255,255,255,0.12)' : GRAY_100}`, fontSize: 11.5, color: feature ? NAVY_300 : GRAY_500 }}>
          {foot}
        </div>
      )}
    </div>
  );
}

// ── Method (payment method) card ───────────────────────────────────────────
function MethodCard({ label, value, pct, barColor, valColor }) {
  const isMobile = useIsMobile();
  const pctBadgeBg    = pct === 0 ? GRAY_100 : NAVY_100;
  const pctBadgeColor = pct === 0 ? GRAY_500  : NAVY_700;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isMobile ? 3 : 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: GRAY_500 }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: pctBadgeBg, color: pctBadgeColor }}>{pct}%</span>
          </div>
          {isMobile && <div style={{ fontSize: 11, color: GRAY_500 }}>del total de ofrendas del año</div>}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: valColor, flexShrink: 0 }}>
          <span style={{ fontSize: 16, opacity: 0.6 }}>$</span>
          {Math.round(value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
        </div>
      </div>
      {!isMobile && (
        <>
          <div style={{ height: 7, borderRadius: 999, background: GRAY_100, overflow: 'hidden', marginTop: 11 }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: barColor }} />
          </div>
          <div style={{ fontSize: 11, color: GRAY_500, marginTop: 8 }}>del total de ofrendas del año</div>
        </>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function BalancePage() {
  const year = new Date().getFullYear();
  const isMobile = useIsMobile();

  const [ofrendas,          setOfrendas]          = useState([]);
  const [gastos,            setGastos]            = useState([]);
  const [gastosEfectivoAgs, setGastosEfectivoAgs] = useState([]);
  const [saldoInicial,      setSaldoInicial]      = useState(0);
  const [loading,           setLoading]           = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [ro, rg, rgEfectivo, rcampus] = await Promise.all([
          ofrendasApi.getAll({ year }),
          gastosApi.getAll({ year, pagado: 'true' }),
          gastosApi.getAll({ year, pagado: 'true', metodo_pago: 'efectivo_ags' }),
          campusApi.getAll(),
        ]);
        setOfrendas(ro.data || []);
        setGastos(rg.data || []);
        setGastosEfectivoAgs(rgEfectivo.data || []);
        const activo = localStorage.getItem('campus_activo') || 'ags';
        const cd     = (rcampus.data || []).find(c => c.id === activo);
        setSaldoInicial(Number(cd?.saldo_inicial ?? 0));
      } catch (e) {
        console.error('BalancePage load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
      Cargando balance…
    </div>
  );

  // ── Aggregates ──
  const totalIngresos        = ofrendas.reduce((s, d) => s + Number(d.total_ofrenda), 0);
  const totalGastos          = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const totalGastosEfAgs     = gastosEfectivoAgs.reduce((s, g) => s + Number(g.monto), 0);
  const balanceNeto          = totalIngresos - totalGastos;
  const totalEfectivo        = ofrendas.reduce((s, d) => s + Number(d.efectivo),           0);
  const totalTerminal        = ofrendas.reduce((s, d) => s + Number(d.terminal),           0);
  const totalTransferencia   = ofrendas.reduce((s, d) => s + Number(d.transferencia || 0), 0);
  const cajaChica            = saldoInicial + totalEfectivo - totalGastosEfAgs;

  const pctEfectivo      = totalIngresos > 0 ? Math.round(totalEfectivo      / totalIngresos * 100) : 0;
  const pctTerminal      = totalIngresos > 0 ? Math.round(totalTerminal      / totalIngresos * 100) : 0;
  const pctTransferencia = totalIngresos > 0 ? 100 - pctEfectivo - pctTerminal                      : 0;

  const catTotales = CATEGORIAS.map(cat => ({
    cat,
    total: gastos.filter(g => (g.categoria_nombre ?? g.categoria) === cat).reduce((s, g) => s + Number(g.monto), 0),
  }));

  const monthlyData = buildMonthlyData(ofrendas, gastos);
  const toggleMes   = m => setMesSelec(prev => prev === m ? null : m);

  // ── Caja de Efectivo · Estado de cuenta (movimiento por movimiento) ──────────
  // Fuente EXCLUSIVA: ofrendas (campo efectivo) + gastosEfectivoAgs (gastos con
  // metodo_pago='efectivo_ags' y pagado=true). NO se mezclan gastos generales ni
  // ofrendas especiales (descuadraría). La suma es conmutativa: el último
  // acumulado da el mismo saldo en caja sin importar el orden de despliegue.
  const TIPO_ORDEN = { ingreso: 0, gasto: 1 };
  const movimientos = [
    ...ofrendas
      .filter(o => Number(o.efectivo) > 0)
      .map(o => ({
        id: o.id, fecha: o.fecha, tipo: 'ingreso',
        concepto: 'Ofrenda en efectivo', monto: Number(o.efectivo),
      })),
    ...gastosEfectivoAgs.map(g => ({
      id: g.id, fecha: g.fecha, tipo: 'gasto',
      concepto: g.concepto || g.categoria_nombre || g.categoria || 'Gasto',
      monto: -Number(g.monto),
    })),
  ].sort((a, b) => {
    const fa = (a.fecha || '').slice(0, 10);
    const fb = (b.fecha || '').slice(0, 10);
    if (fa !== fb) return fa.localeCompare(fb);                            // cronológico ascendente
    if (a.tipo !== b.tipo) return TIPO_ORDEN[a.tipo] - TIPO_ORDEN[b.tipo]; // ingresos antes que gastos
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));          // desempate estable por id
  });

  // Acumulado en orden ASCENDENTE arrancando en la apertura (saldoInicial).
  let acumulado = saldoInicial;
  const movimientosConSaldo = movimientos.map(m => {
    acumulado += m.monto;
    return { ...m, saldo: acumulado };
  });
  const saldoEnCaja = movimientosConSaldo.length > 0
    ? movimientosConSaldo[movimientosConSaldo.length - 1].saldo
    : saldoInicial;

  // Para mostrar: más reciente ARRIBA. Solo se invierte la vista; el acumulado
  // ya quedó calculado en orden ascendente (no se recalcula al revés).
  const movimientosRows = [...movimientosConSaldo].reverse();

  // ── Validación temporal: el acumulado final debe igualar el KPI cajaChica ──
  console.log(
    '[Caja de Efectivo] acumulado final:', Math.round(saldoEnCaja),
    '· cajaChica (KPI):', Math.round(cajaChica),
    '· coincide:', Math.round(saldoEnCaja) === Math.round(cajaChica),
  );

  // Arrow icon for Balance neto card
  const ArrowUp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="20" height="20"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
  const ArrowDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="20" height="20"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── KPIs (4 tarjetas) ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 14 }}>

        {/* Efectivo en caja */}
        <KpiCard
          label="Efectivo en caja"
          value={<>{cajaChica >= 0 ? <span style={{ fontSize: 18, color: '#3DD68C', fontWeight: 600 }}>+$</span> : <span style={{ fontSize: 18, color: RED, fontWeight: 600 }}>−$</span>}{Math.abs(Math.round(cajaChica)).toLocaleString('es-MX')}</>}
          valColor={cajaChica >= 0 ? GREEN : RED}
          foot="Disponible hoy"
        />

        {/* Acumulado ingresos */}
        <KpiCard
          label="Acumulado ingresos"
          value={<><span style={{ fontSize: 18, color: '#3DD68C', fontWeight: 600 }}>$</span>{Math.round(totalIngresos).toLocaleString('es-MX')}</>}
          valColor={GREEN}
          foot={<><b style={{ color: NAVY }}>{ofrendas.length}</b> domingos · {year}</>}
        />

        {/* Total gastos */}
        <KpiCard
          label="Total gastos del año"
          value={<><span style={{ fontSize: 18, color: '#F2635E', fontWeight: 600 }}>$</span>{Math.round(totalGastos).toLocaleString('es-MX')}</>}
          valColor={RED}
          foot={<><b style={{ color: NAVY }}>{gastos.length}</b> registros · {year}</>}
        />

        {/* Balance neto — feature card (navy) */}
        <div style={{
          background: NAVY, border: `1px solid ${NAVY}`,
          borderRadius: 'var(--r-lg)', padding: '18px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: NAVY_300, marginBottom: isMobile ? 3 : 11 }}>
                Balance neto
              </div>
              {isMobile && <div style={{ fontSize: 11.5, color: NAVY_300 }}>Balance neto acumulado {year}</div>}
            </div>
            <div style={{
              fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
              color: balanceNeto >= 0 ? GREEN_400 : RED,
              fontVariantNumeric: 'tabular-nums',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ color: balanceNeto >= 0 ? GREEN_400 : RED }}>
                {balanceNeto >= 0 ? <ArrowUp /> : <ArrowDown />}
              </span>
              <span>
                <span style={{ fontSize: 18, fontWeight: 600, color: balanceNeto >= 0 ? 'rgba(61,214,140,0.7)' : 'rgba(242,99,94,0.7)' }}>$</span>
                {Math.abs(Math.round(balanceNeto)).toLocaleString('es-MX')}
              </span>
            </div>
          </div>
          {!isMobile && (
            <div style={{ marginTop: 11, paddingTop: 11, borderTop: 'rgba(255,255,255,0.12) 1px solid', fontSize: 11.5, color: NAVY_300 }}>
              Balance neto acumulado {year}
            </div>
          )}
        </div>
      </div>

      {/* ── Métodos de pago + Gastos por categoría ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 14 }}>

        <MethodCard label="Efectivo recibido"    value={totalEfectivo}      pct={pctEfectivo}      barColor={NAVY}     valColor={NAVY} />
        <MethodCard label="Terminal recibido"    value={totalTerminal}      pct={pctTerminal}      barColor={NAVY_600} valColor={NAVY_700} />
        <MethodCard label="Transferencia"        value={totalTransferencia} pct={pctTransferencia} barColor={NAVY_300} valColor={NAVY_300} />

        {/* Gastos por categoría */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: 13 }}>
            Gastos por categoría
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[...catTotales].sort((a, b) => b.total - a.total).map(({ cat, total }) => {
              const pct = totalGastos > 0 ? (total / totalGastos) * 100 : 0;
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: CAT_COLORS[cat], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#3D4654', fontWeight: 500, flex: 1, minWidth: 0 }}>{cat}</span>
                  <div style={{ width: 54, height: 5, borderRadius: 999, background: GRAY_100, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: CAT_COLORS[cat] }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums', width: 58, textAlign: 'right' }}>
                    {fmt(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Resumen por mes + Gráfica ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.15fr', gap: 14, alignItems: 'stretch' }}>

        {/* Resumen mensual */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 4 }}>
            <div>
              <h3 className="card-title">Resumen por mes</h3>
              <div className="card-sub">{year} · haz clic en un mes para ver su detalle</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {monthlyData.map((r, idx) => {
              const activo = mesSeleccionado === r.mes;
              const isLast = idx === monthlyData.length - 1;
              return (
                <div key={r.mes} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 8px',
                  borderBottom: isLast ? 'none' : `1px solid ${GRAY_100}`,
                  background: activo ? NAVY : 'transparent',
                  borderRadius: activo ? 8 : 0,
                  transition: 'background .15s',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: activo ? 'white' : NAVY, width: 70, flexShrink: 0 }}>
                    {r.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, flexWrap: 'wrap' }}>
                    <span style={{ color: activo ? 'rgba(61,214,140,0.9)' : GREEN, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Ing: {fmt(r.ingresos)}
                    </span>
                    <span style={{ color: activo ? 'rgba(242,99,94,0.8)' : RED, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Gas: {fmt(r.gastos)}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                    color: activo
                      ? (r.balance >= 0 ? '#3DD68C' : '#F2635E')
                      : (r.balance >= 0 ? GREEN : RED),
                  }}>
                    {r.balance >= 0 ? '+' : ''}{fmt(r.balance)}
                  </span>
                  <button onClick={() => toggleMes(r.mes)} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer', flexShrink: 0,
                    color: activo ? 'white' : ORANGE,
                    background: activo ? 'rgba(255,255,255,0.12)' : ORANGE_50,
                    border: `1px solid ${activo ? 'rgba(255,255,255,0.20)' : ORANGE_100}`,
                  }}>
                    {activo ? 'Cerrar' : 'Ver detalle'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfica de barras */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="card-title">Balance {year}</h3>
              <div className="card-sub">Saldo neto por mes · verde positivo / rojo negativo</div>
            </div>
          </div>
          <BalanceBarChart data={monthlyData} />
        </div>
      </div>

      {/* ── Caja de Efectivo ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="card-title">Caja de Efectivo</h3>
            <div className="card-sub">
              {movimientosConSaldo.length} movimientos · saldo en caja {fmt(saldoEnCaja)}
            </div>
          </div>
        </div>

        {movimientosConSaldo.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
            Sin movimientos de efectivo para {year}.
          </div>
        ) : (
          <>
            {/* Banda de totales — 3-col grid con separadores */}
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 1, background: GRAY_200,
              border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-md)',
              overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                { label: 'Total ingresos efectivo', value: totalEfectivo,      valColor: GREEN },
                { label: 'Total gastos',            value: totalGastosEfAgs,   valColor: RED   },
                { label: 'Saldo en caja',           value: saldoEnCaja,        valColor: saldoEnCaja < 0 ? RED : NAVY },
              ].map(({ label, value, valColor }) => (
                <div key={label} style={{ background: 'var(--surface)', padding: '14px 18px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GRAY_500, marginBottom: 5 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: valColor }}>
                    {fmt(value)}
                  </div>
                </div>
              ))}
            </div>

            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {movimientosRows.map(m => (
                  <div key={`${m.tipo}-${m.id}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{fmtFecha(m.fecha)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: m.saldo < 0 ? RED : NAVY }}>{fmt(m.saldo)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12.5, color: GRAY_500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.concepto}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, flexShrink: 0, color: m.tipo === 'ingreso' ? GREEN : RED }}>
                        {m.tipo === 'ingreso' ? '+' : '−'}{fmt(Math.abs(m.monto))}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Apertura — punto de partida cronológico */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2, #f6f7f9)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Saldo inicial · apertura</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: NAVY }}>{fmt(saldoInicial)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2, #f6f7f9)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Saldo en caja {year}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: saldoEnCaja < 0 ? RED : NAVY }}>{fmt(saldoEnCaja)}</span>
                </div>
              </div>
            ) : (
            <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)' }}>
              <table className="table anf-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th style={{ textAlign: 'right' }}>Entrada</th>
                    <th style={{ textAlign: 'right' }}>Salida</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosRows.map(m => (
                    <tr key={`${m.tipo}-${m.id}`}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtFecha(m.fecha)}</td>
                      <td style={{ color: '#3D4654' }}>{m.concepto}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: GREEN, fontWeight: 600 }}>
                        {m.tipo === 'ingreso' ? fmt(m.monto) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: RED, fontWeight: 600 }}>
                        {m.tipo === 'gasto' ? fmt(Math.abs(m.monto)) : '—'}
                      </td>
                      <td style={{
                        textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800,
                        color: m.saldo < 0 ? RED : NAVY,
                      }}>
                        {fmt(m.saldo)}
                      </td>
                    </tr>
                  ))}
                  {/* Fila de apertura (saldo inicial) — punto de partida cronológico */}
                  <tr style={{ background: GRAY_50 }}>
                    <td style={{ fontWeight: 700 }}>—</td>
                    <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.06em', color: GRAY_500 }}>
                      Saldo inicial · apertura
                    </td>
                    <td style={{ textAlign: 'right', color: GRAY_500 }}>—</td>
                    <td style={{ textAlign: 'right', color: GRAY_500 }}>—</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: NAVY }}>
                      {fmt(saldoInicial)}
                    </td>
                  </tr>
                </tbody>
                <tbody>
                  <tr className="anf-totals-row">
                    <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                      Saldo en caja {year}
                    </td>
                    <td />
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: GREEN }}>
                      {fmt(totalEfectivo)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: RED }}>
                      {fmt(totalGastosEfAgs)}
                    </td>
                    <td style={{
                      textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14,
                      color: saldoEnCaja < 0 ? RED : NAVY,
                    }}>
                      {fmt(saldoEnCaja)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
