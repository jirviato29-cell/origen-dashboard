import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../../services/api';
import { useAsistenciaStewModal } from '../../context/AsistenciaStewModalContext';
import { fmtFecha, mesNombre } from '../../utils/fecha';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY     = '#112540';
const NAVY_700 = '#244169';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const ORANGE   = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const GREEN    = '#15915A';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';

// ── Helpers ────────────────────────────────────────────────────────────────
function rowTotal(r) {
  return (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
}

// ── Desglose de categorías ────────────────────────────────────────────────
function DesgloseCat({ adultos = 0, voluntarios = 0, ninos = 0, bebes = 0, nuevos = 0, feature = false }) {
  const borderColor = feature ? 'rgba(255,255,255,0.12)' : GRAY_100;
  const labelColor  = feature ? NAVY_300 : GRAY_500;
  const boldColor   = feature ? 'white'  : NAVY_700;
  return (
    <div style={{
      marginTop: 9, paddingTop: 9, borderTop: `1px solid ${borderColor}`,
      fontSize: 11, color: labelColor, display: 'flex', gap: 8, flexWrap: 'wrap',
    }}>
      <span>Ad <b style={{ color: boldColor, fontWeight: 700 }}>{adultos}</b></span>
      <span>Vol <b style={{ color: boldColor, fontWeight: 700 }}>{voluntarios}</b></span>
      <span>Niños <b style={{ color: boldColor, fontWeight: 700 }}>{ninos}</b></span>
      <span>Bebés <b style={{ color: boldColor, fontWeight: 700 }}>{bebes}</b></span>
      {nuevos > 0 && (
        <span style={{ color: ORANGE_600, fontWeight: 700 }}>
          Nuevos <b style={{ color: ORANGE_600 }}>{nuevos}</b>
        </span>
      )}
    </div>
  );
}

// ── SVG Area Chart ─────────────────────────────────────────────────────────
const VW  = 900, VH  = 280;
const PAD = { left: 48, right: 24, top: 28, bottom: 44 };

function AttendanceAreaChart({ data, onPointClick }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin suficientes datos para mostrar la gráfica
      </div>
    );
  }

  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.value));
  const yStep  = maxVal > 400 ? 100 : maxVal > 200 ? 50 : 25;
  const yMax   = Math.ceil(maxVal / yStep) * yStep || yStep;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const toX = i => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = v => PAD.top + chartH - (v / yMax) * chartH;
  const pts  = data.map((d, i) => ({ x: toX(i), y: toY(d.value), d }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="asistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={NAVY} stopOpacity="0.16" />
            <stop offset="100%" stopColor={NAVY} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={VW - PAD.right} y1={toY(v)} y2={toY(v)}
              stroke={GRAY_100} strokeWidth={v === 0 ? 1.2 : 1} />
            <text x={PAD.left - 8} y={toY(v) + 4} textAnchor="end" fontSize={10}
              fill={GRAY_500} fontFamily="var(--font-mono)">
              {v}
            </text>
          </g>
        ))}

        <line x1={PAD.left} x2={VW - PAD.right} y1={PAD.top + chartH} y2={PAD.top + chartH}
          stroke={GRAY_200} strokeWidth={1} />

        {/* X-axis labels — last point in orange */}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={PAD.top + chartH + 16} textAnchor="middle" fontSize={10}
            fill={i === pts.length - 1 ? ORANGE : GRAY_500}
            fontWeight={i === pts.length - 1 ? 700 : 400}>
            {p.d.label}
          </text>
        ))}

        {/* Area + Line */}
        <path d={areaPath} fill="url(#asistGrad)" />
        <path d={linePath} fill="none" stroke={NAVY} strokeWidth={2.8}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover crosshair */}
        {hovered !== null && (
          <line x1={pts[hovered].x} x2={pts[hovered].x} y1={PAD.top} y2={PAD.top + chartH}
            stroke={NAVY} strokeWidth={1} strokeDasharray="4 3" opacity={0.3} />
        )}

        {/* Data points — last point in orange */}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          const color  = isLast ? ORANGE : NAVY;
          const r      = hovered === i ? 6.5 : (isLast ? 5.5 : 4);
          return (
            <circle key={i} cx={p.x} cy={p.y} r={r}
              fill={hovered === i ? color : 'white'}
              stroke={color} strokeWidth={2.4}
              style={{ cursor: onPointClick ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovered(i)}
              onClick={() => onPointClick && onPointClick(i)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const p    = pts[hovered];
        const lPct = (p.x / VW) * 100;
        const tPct = (p.y / VH) * 100;
        const tx   = lPct > 72 ? '-92%' : lPct < 20 ? '8%' : '-50%';
        const ty   = tPct < 30 ? '14%' : '-115%';
        return (
          <div style={{
            position: 'absolute', left: `${lPct}%`, top: `${tPct}%`,
            transform: `translate(${tx}, ${ty})`, pointerEvents: 'none',
            background: '#1A1A1A', color: 'white', borderRadius: 10,
            padding: '10px 14px', fontSize: 12.5, lineHeight: 1.7,
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap', zIndex: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 3, color: 'rgba(255,255,255,0.9)' }}>
              {p.d.label}
            </div>
            <div style={{ color: ORANGE, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>
              {p.d.value} asistentes
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AttendanceChart({ resumenMeses, mesSeleccionado, records, onMonthSelect }) {
  if (mesSeleccionado) {
    const data = records
      .filter(r => r.fecha.startsWith(mesSeleccionado))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(r => ({ label: String(parseInt(r.fecha.slice(8), 10)), value: rowTotal(r) }));
    return <AttendanceAreaChart data={data} />;
  }
  const data = resumenMeses.map(r => ({ label: r.label.slice(0, 3), value: r.total, mes: r.mes }));
  return (
    <AttendanceAreaChart
      data={data}
      onPointClick={(i) => onMonthSelect(data[i].mes)}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AsistenciaViewPage() {
  const { refreshKey } = useAsistenciaStewModal();
  const [records,        setRecords] = useState([]);
  const [loading,        setLoading] = useState(true);
  const [mesSeleccionado, setMesSelec] = useState(null);

  const year = new Date().getFullYear();
  const isMobile = useIsMobile();

  const load = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ year, limit: 200 });
      setRecords([...data].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener('asistencia-saved', h);
    return () => window.removeEventListener('asistencia-saved', h);
  }, [load]);

  const toggleMes = m => setMesSelec(prev => prev === m ? null : m);

  // ── Agregados ──────────────────────────────────────────────────────────
  const ultimo      = records[0];
  const totalUltimo = ultimo ? rowTotal(ultimo) : 0;
  const n           = records.length;
  const promedio    = n > 0 ? Math.round(records.reduce((s, r) => s + rowTotal(r), 0) / n) : 0;
  const maximo      = n > 0 ? Math.max(...records.map(rowTotal)) : 0;
  const maximoRecord= n > 0 ? records.reduce((best, r) => rowTotal(r) > rowTotal(best) ? r : best, records[0]) : null;
  const diffDelRecord = maximo > 0 && totalUltimo < maximo ? maximo - totalUltimo : 0;

  const promAdultos     = n > 0 ? Math.round(records.reduce((s, r) => s + (r.adultos     || 0), 0) / n) : 0;
  const promVoluntarios = n > 0 ? Math.round(records.reduce((s, r) => s + (r.voluntarios || 0), 0) / n) : 0;
  const promNinos       = n > 0 ? Math.round(records.reduce((s, r) => s + (r.ninos       || 0), 0) / n) : 0;
  const promBebes       = n > 0 ? Math.round(records.reduce((s, r) => s + (r.bebes       || 0), 0) / n) : 0;

  const hoy            = new Date();
  const mesActual      = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesActualLabel = mesNombre(mesActual);

  // ── Resumen por mes ────────────────────────────────────────────────────
  const mesesDisponibles = [...new Set(records.map(r => r.fecha.slice(0, 7)))].sort();
  const resumenMeses = mesesDisponibles.map(m => {
    const rows = records.filter(r => r.fecha.startsWith(m));
    const adultos     = rows.reduce((s, r) => s + (r.adultos     || 0), 0);
    const voluntarios = rows.reduce((s, r) => s + (r.voluntarios || 0), 0);
    const ninos       = rows.reduce((s, r) => s + (r.ninos       || 0), 0);
    const bebes       = rows.reduce((s, r) => s + (r.bebes       || 0), 0);
    const nuevos      = rows.reduce((s, r) => s + (r.nuevos      || 0), 0);
    const total       = adultos + voluntarios + ninos + bebes;
    return { mes: m, label: mesNombre(m), total, adultos, voluntarios, ninos, bebes, nuevos, count: rows.length };
  });

  const mesActualData = resumenMeses.find(m => m.mes === mesActual) || null;

  // ── Totales de tabla ───────────────────────────────────────────────────
  const totAdultos     = records.reduce((s, r) => s + (r.adultos     || 0), 0);
  const totVoluntarios = records.reduce((s, r) => s + (r.voluntarios || 0), 0);
  const totNinos       = records.reduce((s, r) => s + (r.ninos       || 0), 0);
  const totBebes       = records.reduce((s, r) => s + (r.bebes       || 0), 0);
  const totNuevos      = records.reduce((s, r) => s + (r.nuevos      || 0), 0);
  const totTotal       = records.reduce((s, r) => s + rowTotal(r), 0);

  // ── Chart footer stats ─────────────────────────────────────────────────
  const promMensual = resumenMeses.length > 0
    ? Math.round(resumenMeses.reduce((s, r) => s + r.total, 0) / resumenMeses.length)
    : 0;
  const mejorMes = resumenMeses.length > 0
    ? resumenMeses.reduce((b, r) => r.total > b.total ? r : b, resumenMeses[0])
    : null;
  const primerMesData = resumenMeses[0];
  const ultimoMesData = resumenMeses[resumenMeses.length - 1];
  const promPrimerMes = (primerMesData?.count ?? 0) > 0 ? primerMesData.total / primerMesData.count : 0;
  const promUltimoMes = (ultimoMesData?.count  ?? 0) > 0 ? ultimoMesData.total  / ultimoMesData.count  : 0;
  const crecPct = primerMesData && ultimoMesData && primerMesData.mes !== ultimoMesData.mes && promPrimerMes > 0
    ? Math.round((promUltimoMes - promPrimerMes) / promPrimerMes * 100)
    : null;
  const crecLabel = primerMesData && ultimoMesData && primerMesData.mes !== ultimoMesData.mes
    ? `${primerMesData.label.slice(0, 3)}–${ultimoMesData.label.slice(0, 3)}`
    : null;

  // ── Chart head text ────────────────────────────────────────────────────
  const chartTitle = mesSeleccionado
    ? `Domingos de ${mesNombre(mesSeleccionado)}`
    : `Total por mes · ${year}`;
  const chartSub = mesSeleccionado
    ? `${resumenMeses.find(r => r.mes === mesSeleccionado)?.count || 0} domingos · haz clic en ← para volver`
    : `${resumenMeses.length} meses · haz clic en un punto para ver sus domingos`;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Cargando…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── KPIs (5 tarjetas) ─────────────────────────────────────────────── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: 14 }}>

          {/* Último domingo — feature (navy oscuro) */}
          <div style={{
            background: NAVY, border: `1px solid ${NAVY}`,
            borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 8 : 0,
            }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: NAVY_300, marginBottom: isMobile ? 3 : 9 }}>
                  Último domingo
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: NAVY_300 }}>{ultimo ? fmtFecha(ultimo.fecha) : '—'}</div>}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'white', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {totalUltimo}
              </div>
            </div>
            {!isMobile && (
              <div style={{ fontSize: 11.5, color: NAVY_300, marginTop: 7 }}>
                {ultimo ? fmtFecha(ultimo.fecha) : '—'}
              </div>
            )}
            {ultimo && (
              <DesgloseCat feature
                adultos={ultimo.adultos || 0} voluntarios={ultimo.voluntarios || 0}
                ninos={ultimo.ninos || 0}     bebes={ultimo.bebes || 0}
                nuevos={ultimo.nuevos || 0}
              />
            )}
          </div>

          {/* Mes actual */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 8 : 0,
            }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 9 }}>
                  {mesActualLabel}
                </div>
                {isMobile && mesActualData && (
                  <div style={{ fontSize: 11.5, color: GRAY_500 }}>
                    {mesActualData.count} {mesActualData.count === 1 ? 'domingo' : 'domingos'}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: mesActualData ? NAVY : GRAY_500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {mesActualData ? mesActualData.total : '—'}
              </div>
            </div>
            {!isMobile && mesActualData && (
              <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 7 }}>
                {mesActualData.count} {mesActualData.count === 1 ? 'domingo' : 'domingos'}
              </div>
            )}
            {!isMobile && !mesActualData && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Sin registros aún</div>
            )}
            {mesActualData && (
              <DesgloseCat
                adultos={mesActualData.adultos} voluntarios={mesActualData.voluntarios}
                ninos={mesActualData.ninos}     bebes={mesActualData.bebes}
                nuevos={mesActualData.nuevos}
              />
            )}
          </div>

          {/* Promedio */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 8 : 0,
            }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 9 }}>
                  Promedio
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>{n} domingos</div>}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {promedio}
              </div>
            </div>
            {!isMobile && <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 7 }}>{n} domingos</div>}
            <DesgloseCat
              adultos={promAdultos} voluntarios={promVoluntarios}
              ninos={promNinos}     bebes={promBebes}
            />
          </div>

          {/* Máximo histórico */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 8 : 0,
            }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 9 }}>
                  Máximo histórico
                </div>
                {isMobile && maximoRecord && (
                  <div style={{ fontSize: 11.5, color: GRAY_500 }}>{fmtFecha(maximoRecord.fecha)}</div>
                )}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {maximo}
              </div>
            </div>
            {!isMobile && maximoRecord && (
              <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 7 }}>
                {fmtFecha(maximoRecord.fecha)}
              </div>
            )}
            {diffDelRecord > 0 && (
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${GRAY_100}`, fontSize: 11, color: GRAY_500, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>A <b style={{ color: NAVY_700, fontWeight: 700 }}>{diffDelRecord}</b> del récord hoy</span>
              </div>
            )}
          </div>

          {/* Total del año */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 8 : 0,
            }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: isMobile ? 3 : 9 }}>
                  Total del año
                </div>
                {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>{n} domingos · {year}</div>}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {totTotal.toLocaleString('es-MX')}
              </div>
            </div>
            {!isMobile && (
              <div style={{ fontSize: 11.5, color: GRAY_500, marginTop: 7 }}>
                {n} domingos · {year}
              </div>
            )}
            <DesgloseCat
              adultos={totAdultos} voluntarios={totVoluntarios}
              ninos={totNinos}     bebes={totBebes}
            />
          </div>

        </div>
      )}

      {/* ── Resumen por mes + Gráfica ─────────────────────────────────────── */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 14, alignItems: 'stretch' }}>

          {/* Izquierda: Resumen por mes */}
          <div className="card">
            <div className="card-head" style={{ marginBottom: 4 }}>
              <div>
                <h3 className="card-title">Resumen por mes</h3>
                <div className="card-sub">{year} · total de asistencia · clic para filtrar la gráfica</div>
              </div>
            </div>

            {resumenMeses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
                Sin registros en {year}.
              </div>
            ) : (
              <div>
                {resumenMeses.map((r, idx) => {
                  const activo = mesSeleccionado === r.mes;
                  const isLast = idx === resumenMeses.length - 1;
                  return (
                    <div
                      key={r.mes}
                      onClick={() => toggleMes(r.mes)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        padding: '12px 10px',
                        borderBottom: isLast ? 'none' : `1px solid ${GRAY_100}`,
                        cursor: 'pointer',
                        background: activo ? GRAY_50 : 'transparent',
                        borderLeft: activo ? `3px solid ${NAVY}` : '3px solid transparent',
                        margin: activo ? '0 -10px 0 -10px' : '0',
                        paddingLeft: activo ? 13 : 10,
                        borderRadius: activo ? 8 : 0,
                        transition: 'background .13s',
                      }}
                    >
                      {/* Fila: nombre + domingos + total */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: activo ? NAVY : NAVY }}>
                          {r.label}
                        </span>
                        <span style={{ fontSize: 11, color: GRAY_500, fontWeight: 500 }}>
                          {r.count} dom.
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                          {r.total}
                        </span>
                      </div>
                      {/* Desglose */}
                      <div style={{ fontSize: 11, color: GRAY_500, display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                        <span>Adultos <b style={{ color: NAVY_700, fontWeight: 700 }}>{r.adultos}</b></span>
                        <span>Vol <b style={{ color: NAVY_700, fontWeight: 700 }}>{r.voluntarios}</b></span>
                        <span>Niños <b style={{ color: NAVY_700, fontWeight: 700 }}>{r.ninos}</b></span>
                        <span>Bebés <b style={{ color: NAVY_700, fontWeight: 700 }}>{r.bebes}</b></span>
                        {r.nuevos > 0 && (
                          <span style={{ color: ORANGE_600, fontWeight: 700 }}>
                            Nuevos {r.nuevos}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Derecha: Gráfica */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-head chart-head" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title">{chartTitle}</h3>
                <div className="card-sub">{chartSub}</div>
              </div>
              {mesSeleccionado && (
                <button
                  onClick={() => setMesSelec(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: `1px solid ${GRAY_200}`,
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, color: GRAY_500, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  ← Ver todo el año
                </button>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 220 }}>
              <AttendanceChart
                resumenMeses={resumenMeses}
                mesSeleccionado={mesSeleccionado}
                records={records}
                onMonthSelect={(mes) => setMesSelec(mes)}
              />
            </div>

            {/* Chart footer — solo en vista anual */}
            {!mesSeleccionado && resumenMeses.length > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 14, paddingTop: 14, borderTop: `1px solid ${GRAY_100}`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: GRAY_500, fontWeight: 600 }}>Promedio mensual</span>
                  <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                    {promMensual}
                  </span>
                </div>
                {mejorMes && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: GRAY_500, fontWeight: 600 }}>Mejor mes</span>
                    <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                      {mejorMes.label.slice(0, 3)} · {mejorMes.total}
                    </span>
                  </div>
                )}
                {crecPct !== null && crecLabel && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 11, color: GRAY_500, fontWeight: 600 }}>Crecimiento {crecLabel}</span>
                    <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: crecPct >= 0 ? GREEN : '#D23B36' }}>
                      {crecPct >= 0 ? '▲' : '▼'} {Math.abs(crecPct)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Historial de asistencia ───────────────────────────────────────── */}

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Historial de asistencia</h3>
            {!loading && (
              <div className="card-sub">{records.length} domingos registrados · solo lectura</div>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin registros disponibles.
          </div>
        ) : (
          <>
            {/* Banda de totales — estilo Caja de Efectivo */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 1, background: GRAY_200,
              border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-md)',
              overflow: 'hidden', marginBottom: 16,
            }}>
              {[
                { label: 'Adultos',     value: totAdultos,     highlight: false },
                { label: 'Voluntarios', value: totVoluntarios, highlight: false },
                { label: 'Niños',       value: totNinos,       highlight: false },
                { label: 'Bebés',       value: totBebes,       highlight: false },
                { label: 'Total',       value: totTotal,       highlight: true  },
              ].map(({ label, value, highlight }) => (
                <div key={label} style={{ background: highlight ? NAVY_100 : 'var(--surface)', padding: '14px 18px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GRAY_500, marginBottom: 5 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: NAVY }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

          <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)' }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Domingo</th>
                  <th style={{ textAlign: 'right' }}>Adultos</th>
                  <th style={{ textAlign: 'right' }}>Voluntarios</th>
                  <th style={{ textAlign: 'right' }}>Niños</th>
                  <th style={{ textAlign: 'right' }}>Bebés</th>
                  <th style={{ textAlign: 'right', color: ORANGE_600 }}>Nuevos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const total = rowTotal(r);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        {fmtFecha(r.fecha)}
                        {i === 0 && (
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                            background: NAVY_100, color: NAVY_700, marginLeft: 8,
                          }}>
                            Más reciente
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: NAVY_700, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.adultos   ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: NAVY_700, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.voluntarios ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: NAVY_700, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.ninos     ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: NAVY_700, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.bebes     ?? '—'}</td>
                      <td style={{ textAlign: 'right', color: ORANGE_600, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {r.nuevos > 0 ? r.nuevos : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tbody>
                <tr className="anf-totals-row">
                  <td style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    Totales
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: NAVY_700 }}>{totAdultos}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: NAVY_700 }}>{totVoluntarios}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: NAVY_700 }}>{totNinos}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: NAVY_700 }}>{totBebes}</td>
                  <td style={{ textAlign: 'right', color: ORANGE_600, fontWeight: 700 }}>{totNuevos || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: NAVY, fontSize: 14 }}>
                    {totTotal.toLocaleString('es-MX')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
