import { useState, useEffect } from 'react';
import { gastosApi } from '../../services/api';
import { useGastosModal } from '../../context/GastosModalContext';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';
import { fmtFecha, toISODate } from '../../utils/fecha';
import { CAT_COLORS, CAT_BG, CATEGORIAS } from '../../utils/categorias';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';

// ── Design tokens (matching offline design) ────────────────────────────────
const RED        = '#D23B36';
const RED_SOFT   = '#FBEAE9';
const AMBER      = '#C98A14';
const AMBER_SOFT = '#FBF2DC';
const NAVY       = '#112540';
const NAVY_500   = '#3E6499';
const NAVY_300   = '#9CB0CC';
const NAVY_SOFT  = '#DCE4EF';
const GREEN      = '#15915A';
const GREEN_SOFT = '#E6F5EC';
const GRAY       = '#7A8699';
const GRAY_SOFT  = '#EEF1F5';

// ── Formatters ─────────────────────────────────────────────────────────────
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}
function fmtK(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k';
  return fmt(n);
}

// ── Status classification ──────────────────────────────────────────────────
function todayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDiffDays(fechaVenc) {
  if (!fechaVenc) return null;
  const today = todayLocal();
  const venc = new Date(toISODate(fechaVenc) + 'T00:00:00');
  return Math.round((venc - today) / 86400000);
}

function classifyGasto(g) {
  const d = getDiffDays(g.fecha_vencimiento);
  if (d === null) return 'sin-fecha';
  if (d < 0)     return 'vencido';
  if (d <= 7)    return 'porvencer';
  return 'programado';
}

const STATUS_ORDER = { vencido: 0, porvencer: 1, programado: 2, 'sin-fecha': 3 };
const STATUS_BAR   = { vencido: RED, porvencer: AMBER, programado: NAVY_300, 'sin-fecha': 'var(--border-strong)' };

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, iconEl, iconBg, iconColor, value, valueColor, foot, alertBar }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '16px 18px',
      boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden',
    }}>
      {alertBar && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: alertBar }} />
      )}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: GRAY, marginBottom: isMobile ? 3 : 10,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: iconBg, color: iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {iconEl}
            </span>
            {label}
          </div>
          {isMobile && <div style={{ fontSize: 11.5, color: GRAY }}>{foot}</div>}
        </div>
        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
          color: valueColor || NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {value}
        </div>
      </div>
      {!isMobile && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--surface-3)',
          fontSize: 11.5, color: GRAY,
        }}>
          {foot}
        </div>
      )}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status, diffD }) {
  let label, bg, color;
  if (status === 'vencido') {
    const d = Math.abs(diffD);
    label = `Vencido · ${d} ${d === 1 ? 'día' : 'días'}`;
    bg = RED_SOFT; color = RED;
  } else if (status === 'porvencer') {
    label = diffD === 0 ? 'Vence hoy' : `Vence en ${diffD} ${diffD === 1 ? 'día' : 'días'}`;
    bg = AMBER_SOFT; color = AMBER;
  } else if (status === 'programado') {
    label = `En ${diffD} días`;
    bg = NAVY_SOFT; color = NAVY_500;
  } else {
    label = 'Sin fecha';
    bg = GRAY_SOFT; color = GRAY;
  }
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
      background: bg, color, flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Date block (day + month of fecha_vencimiento) ──────────────────────────
function DateBlock({ fechaVenc }) {
  const base = {
    width: 52, flexShrink: 0, textAlign: 'center',
    background: 'var(--surface-3)', border: '1px solid var(--border)',
    borderRadius: 9, padding: '7px 0 8px',
  };
  if (!fechaVenc) {
    return (
      <div style={base}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--muted)', lineHeight: 1 }}>—</div>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginTop: 3 }}>—</div>
      </div>
    );
  }
  const d = new Date(toISODate(fechaVenc) + 'T00:00:00');
  return (
    <div style={base}>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.03em', color: NAVY, lineHeight: 1 }}>
        {String(d.getDate()).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: GRAY, marginTop: 3 }}>
        {d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '').toUpperCase()}
      </div>
    </div>
  );
}

// ── Donut SVG (pure SVG, no Recharts) ─────────────────────────────────────
function DonutSVG({ segments, total }) {
  const R    = 51.5;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <g transform="rotate(-90 60 60)" fill="none" strokeWidth="17">
        <circle cx="60" cy="60" r={R} stroke={NAVY_SOFT} />
        {segments.filter(s => s.total > 0).map(s => {
          const dash = total > 0 ? (s.total / total) * CIRC : 0;
          const thisOffset = -offset;
          offset += dash;
          return (
            <circle key={s.cat} cx="60" cy="60" r={R}
              stroke={CAT_COLORS[s.cat] || NAVY_500}
              strokeDasharray={`${dash.toFixed(2)} ${CIRC.toFixed(2)}`}
              strokeDashoffset={thisOffset.toFixed(2)}
            />
          );
        })}
      </g>
    </svg>
  );
}

// ── Método de pago badge ───────────────────────────────────────────────────
const METODO_CFG = {
  efectivo_ags: { label: 'Efectivo Aguascalientes', color: NAVY_500, bg: NAVY_SOFT  },
  gdl:          { label: 'Transferencia Guadalajara',  color: AMBER,    bg: AMBER_SOFT },
  donacion:     { label: 'Donación',     color: GREEN,    bg: GREEN_SOFT },
  efectivo:     { label: 'Efectivo',     color: NAVY_300, bg: NAVY_SOFT  },
};
function MetodoBadge({ metodo }) {
  const cfg = METODO_CFG[metodo] || METODO_CFG.efectivo;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function GastosPorPagarPage() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { refreshKey, openModal } = useGastosModal();
  const { permisos } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'gastos');
  const isMobile = useIsMobile();
  const isTablet = useIsMobile(1100);

  const [pendientes, setPendientes] = useState([]);
  const [pagadosMes, setPagadosMes] = useState([]);
  const [pagadosAll, setPagadosAll] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagando,    setPagando]    = useState(null);
  const [localKey,   setLocalKey]   = useState(0);
  const [openMenu,   setOpenMenu]   = useState(null);
  const [editGasto,  setEditGasto]  = useState(null);
  const [editForm,   setEditForm]   = useState({ concepto: '', monto: '', categoria: '', fecha_vencimiento: '' });
  const [guardando,  setGuardando]  = useState(false);
  const [editHoverId,   setEditHoverId]   = useState(null);
  const [deleteGasto,   setDeleteGasto]   = useState(null);
  const [eliminando,    setEliminando]    = useState(false);
  const [deleteHoverId, setDeleteHoverId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      gastosApi.getAll({ pagado: 'false' }),
      gastosApi.getAll({ pagado: 'true', year, month }),
      gastosApi.getAll({ pagado: 'true', year }),
    ])
      .then(([rPend, rMes, rAll]) => {
        if (!cancelled) {
          setPendientes(rPend.data || []);
          setPagadosMes(rMes.data || []);
          setPagadosAll(rAll.data || []);
        }
      })
      .catch(() => { if (!cancelled) { setPendientes([]); setPagadosMes([]); setPagadosAll([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month, refreshKey, localKey]);

  const handlePagar = async (id, metodo_pago = 'efectivo_ags') => {
    setOpenMenu(null);
    setPagando(id);
    try {
      await gastosApi.pagar(id, metodo_pago);
      setLocalKey(k => k + 1);
    } catch (err) {
      console.error('Error al marcar como pagado:', err);
    } finally {
      setPagando(null);
    }
  };

  function handleEditOpen(g) {
    setEditGasto(g);
    setEditForm({
      concepto: g.concepto ?? '',
      monto: g.monto ?? '',
      categoria: g.categoria_nombre ?? g.categoria ?? CATEGORIAS[0],
      fecha_vencimiento: g.fecha_vencimiento ? toISODate(g.fecha_vencimiento) : '',
    });
  }

  function handleEditClose() {
    if (guardando) return;
    setEditGasto(null);
  }

  function handleDeleteOpen(g) {
    setDeleteGasto(g);
  }

  function handleDeleteClose() {
    if (eliminando) return;
    setDeleteGasto(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteGasto || eliminando) return;
    setEliminando(true);
    try {
      await gastosApi.remove(deleteGasto.id);
      setDeleteGasto(null);
      setLocalKey(k => k + 1);
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
    } finally {
      setEliminando(false);
    }
  }

  async function handleEditSave() {
    if (!editGasto || guardando) return;
    setGuardando(true);
    try {
      await gastosApi.update(editGasto.id, {
        fecha: toISODate(editGasto.fecha),
        concepto: editForm.concepto.trim(),
        categoria: editForm.categoria,
        monto: Number(editForm.monto),
        fecha_vencimiento: editForm.fecha_vencimiento || null,
      });
      setEditGasto(null);
      setLocalKey(k => k + 1);
    } catch (err) {
      console.error('Error al guardar gasto:', err);
    } finally {
      setGuardando(false);
    }
  }

  // Classify + sort pending
  const classified = pendientes.map(g => ({
    ...g,
    _status: classifyGasto(g),
    _diffD:  getDiffDays(g.fecha_vencimiento),
  }));
  const sorted = [...classified].sort((a, b) => {
    const so = STATUS_ORDER[a._status] - STATUS_ORDER[b._status];
    if (so !== 0) return so;
    if (a.fecha_vencimiento && b.fecha_vencimiento)
      return a.fecha_vencimiento.localeCompare(b.fecha_vencimiento);
    return a.fecha.localeCompare(b.fecha);
  });

  // KPI aggregates
  const totalPendiente = pendientes.reduce((s, g) => s + Number(g.monto), 0);

  // Per-method totals for current year (derived from pagadosAll)
  const pagadosEfectivoAgs = pagadosAll.filter(g => g.metodo_pago === 'efectivo_ags');
  const pagadosGdl         = pagadosAll.filter(g => g.metodo_pago === 'gdl');
  const pagadosDonacion    = pagadosAll.filter(g => g.metodo_pago === 'donacion');
  const totalEfectivoAgs   = pagadosEfectivoAgs.reduce((s, g) => s + Number(g.monto), 0);
  const totalGdl           = pagadosGdl.reduce((s, g) => s + Number(g.monto), 0);
  const totalDonacion      = pagadosDonacion.reduce((s, g) => s + Number(g.monto), 0);

  // Aging groups (only non-empty)
  const agingGroups = [
    { st: 'vencido',    label: 'Vencido',                  color: RED },
    { st: 'porvencer',  label: 'Por vencer · 0–7 días',    color: AMBER },
    { st: 'programado', label: 'Programado · 8–30 días',   color: NAVY_300 },
    { st: 'sin-fecha',  label: 'Sin fecha de vencimiento', color: 'var(--border-strong)' },
  ].map(g => ({
    ...g,
    total: classified.filter(c => c._status === g.st).reduce((s, c) => s + Number(c.monto), 0),
    count: classified.filter(c => c._status === g.st).length,
  })).filter(g => g.count > 0);

  // Donut segments by categoria
  const catMap = {};
  pendientes.forEach(g => {
    const cat = g.categoria_nombre ?? g.categoria ?? 'Otro';
    catMap[cat] = (catMap[cat] || 0) + Number(g.monto);
  });
  const catSegments = Object.entries(catMap)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total);

  // Paid history
  const sortedPagados   = [...pagadosAll].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const totalPagadosAll = pagadosAll.reduce((s, g) => s + Number(g.monto), 0);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
      Cargando gastos por pagar…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {openMenu !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpenMenu(null)} />
      )}

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          label="Total por pagar"
          iconEl={<I.wallet size={15} />}
          iconBg={RED_SOFT} iconColor={RED}
          value={fmt(totalPendiente)} valueColor={RED}
          foot={<><b style={{ color: NAVY }}>{pendientes.length}</b> {pendientes.length === 1 ? 'gasto pendiente' : 'gastos pendientes'} · {year}</>}
          alertBar={RED}
        />
        <KpiCard
          label="Efectivo Aguascalientes"
          iconEl={<I.cash size={15} />}
          iconBg={NAVY_SOFT} iconColor={NAVY_500}
          value={fmt(totalEfectivoAgs)} valueColor={NAVY}
          foot={<><b style={{ color: NAVY }}>{pagadosEfectivoAgs.length}</b> {pagadosEfectivoAgs.length === 1 ? 'pago' : 'pagos'} · {year}</>}
        />
        <KpiCard
          label="Transferencia GDL"
          iconEl={<I.coin size={15} />}
          iconBg={AMBER_SOFT} iconColor={AMBER}
          value={fmt(totalGdl)} valueColor={NAVY}
          foot={<><b style={{ color: NAVY }}>{pagadosGdl.length}</b> {pagadosGdl.length === 1 ? 'pago' : 'pagos'} · {year}</>}
        />
        <KpiCard
          label="Donación"
          iconEl={<I.heart size={15} />}
          iconBg={GREEN_SOFT} iconColor={GREEN}
          value={fmt(totalDonacion)} valueColor={NAVY}
          foot={<><b style={{ color: NAVY }}>{pagadosDonacion.length}</b> {pagadosDonacion.length === 1 ? 'pago' : 'pagos'} · {year}</>}
        />
      </div>

      {/* ── Analítica: Antigüedad + Dona ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: 14, alignItems: 'stretch' }}>

        {/* Antigüedad de saldos */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Antigüedad de saldos</h3>
              <div className="card-sub">Distribución de lo pendiente · {fmt(totalPendiente)}</div>
            </div>
          </div>
          {totalPendiente === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0 12px' }}>Sin gastos pendientes.</p>
          ) : (
            <>
              <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', gap: 2, background: 'var(--surface-3)', marginTop: 18 }}>
                {agingGroups.map(g => (
                  <div key={g.st} style={{ width: `${(g.total / totalPendiente * 100).toFixed(1)}%`, background: g.color, height: '100%' }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 16 }}>
                {agingGroups.map(g => (
                  <div key={g.st} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto auto', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: g.color, display: 'block' }} />
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{g.label}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{g.count} {g.count === 1 ? 'gasto' : 'gastos'}</span>
                    <span style={{ fontSize: 13, color: NAVY, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 72, textAlign: 'right' }}>{fmt(g.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pendiente por categoría */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Pendiente por categoría</h3>
              <div className="card-sub">{catSegments.length} {catSegments.length === 1 ? 'categoría' : 'categorías'}</div>
            </div>
          </div>
          {catSegments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '28px 0 12px' }}>Sin datos.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <DonutSVG segments={catSegments} total={totalPendiente} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: NAVY, lineHeight: 1 }}>{fmtK(totalPendiente)}</div>
                  <div style={{ fontSize: 10, color: GRAY, fontWeight: 600, marginTop: 2 }}>total</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
                {catSegments.map(c => (
                  <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[c.cat] || NAVY_500, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, flex: 1 }}>{c.cat}</span>
                    <span style={{ fontSize: 12.5, color: NAVY, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pendientes ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Gastos pendientes de pago</h3>
            <div className="card-sub">
              {sorted.length} {sorted.length === 1 ? 'gasto' : 'gastos'} · {fmt(totalPendiente)} · ordenados por vencimiento
            </div>
          </div>
          {canWrite && (
            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => openModal(false)}>
              <I.plus size={14} /> Registrar por pagar
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin gastos pendientes registrados.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {sorted.map(g => {
              const cat       = g.categoria_nombre ?? g.categoria ?? '—';
              const isPagando = pagando === g.id;
              return (
                <div key={g.id} style={{
                  display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 0 : 14,
                  padding: '14px 16px 14px 18px',
                  border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)', position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', left: 0, top: 12, bottom: 12,
                    width: 3, borderRadius: '0 3px 3px 0',
                    background: STATUS_BAR[g._status],
                  }} />

                  {isMobile ? (
                    <>
                      {/* Móvil fila 1: fecha + monto + editar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <DateBlock fechaVenc={g.fecha_vencimiento} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: RED,
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            −{fmt(Number(g.monto))}
                          </span>
                          {canWrite && (
                            <button
                              title="Editar gasto"
                              onClick={() => handleEditOpen(g)}
                              onMouseEnter={() => setEditHoverId(g.id)}
                              onMouseLeave={() => setEditHoverId(null)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                border: `1px solid ${editHoverId === g.id ? '#FF6B2B' : 'var(--border-strong)'}`,
                                background: 'var(--surface)',
                                color: editHoverId === g.id ? '#FF6B2B' : NAVY,
                                cursor: 'pointer', transition: 'border-color .12s, color .12s',
                              }}
                            >
                              <I.edit size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Móvil fila 2: concepto completo */}
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>
                        {g.concepto}
                      </div>
                      {/* Móvil fila 3: badge de status */}
                      <div style={{ marginBottom: 7 }}>
                        <StatusBadge status={g._status} diffD={g._diffD} />
                      </div>
                      {/* Móvil fila 4: categoría */}
                      <div style={{ marginBottom: canWrite ? 10 : 0 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 6,
                          background: CAT_BG[cat] || 'rgba(0,0,0,0.06)',
                          color: CAT_COLORS[cat] || 'var(--muted)',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[cat] || 'var(--muted)', flexShrink: 0 }} />
                          {cat}
                        </span>
                      </div>
                      {/* Móvil fila 5: eliminar + marcar pagado */}
                      {canWrite && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            title="Eliminar gasto"
                            onClick={() => handleDeleteOpen(g)}
                            onMouseEnter={() => setDeleteHoverId(g.id)}
                            onMouseLeave={() => setDeleteHoverId(null)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                              border: `1px solid ${deleteHoverId === g.id ? RED : 'var(--border-strong)'}`,
                              background: 'var(--surface)',
                              color: deleteHoverId === g.id ? RED : NAVY,
                              cursor: 'pointer', transition: 'border-color .12s, color .12s',
                            }}
                          >
                            <I.trash size={16} />
                          </button>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <button
                              disabled={isPagando}
                              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                width: '100%', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8,
                                border: '1px solid var(--border-strong)', background: 'var(--surface)',
                                color: NAVY_500, cursor: isPagando ? 'not-allowed' : 'pointer',
                                opacity: isPagando ? 0.5 : 1, transition: 'background .12s, color .12s', whiteSpace: 'nowrap',
                              }}
                            >
                              <I.check size={14} />
                              {isPagando ? 'Guardando…' : 'Marcar pagado ▾'}
                            </button>
                            {openMenu === g.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
                                background: 'var(--surface)', border: '1px solid var(--border-strong)',
                                borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                overflow: 'hidden', minWidth: 170,
                              }}>
                                {[
                                  { value: 'efectivo_ags', label: 'Efectivo Aguascalientes', color: NAVY_500, bg: NAVY_SOFT  },
                                  { value: 'gdl',          label: 'Transferencia Guadalajara',  color: AMBER,    bg: AMBER_SOFT },
                                  { value: 'donacion',     label: 'Donación',     color: GREEN,    bg: GREEN_SOFT },
                                ].map((m, mi, arr) => (
                                  <button key={m.value} onClick={() => handlePagar(g.id, m.value)} style={{
                                    display: 'flex', alignItems: 'center', gap: 9,
                                    width: '100%', padding: '10px 14px', border: 'none',
                                    borderBottom: mi < arr.length - 1 ? '1px solid var(--border)' : 'none',
                                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                    fontSize: 13, fontWeight: 600, color: m.color,
                                  }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Escritorio: layout horizontal original */}
                      <DateBlock fechaVenc={g.fecha_vencimiento} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{g.concepto}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 6,
                            background: CAT_BG[cat] || 'rgba(0,0,0,0.06)',
                            color: CAT_COLORS[cat] || 'var(--muted)',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[cat] || 'var(--muted)', flexShrink: 0 }} />
                            {cat}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={g._status} diffD={g._diffD} />
                      <span style={{
                        fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: RED,
                        fontVariantNumeric: 'tabular-nums', flexShrink: 0, width: 96, textAlign: 'right',
                      }}>
                        −{fmt(Number(g.monto))}
                      </span>
                      {canWrite && (
                        <>
                          <button
                            title="Editar gasto"
                            onClick={() => handleEditOpen(g)}
                            onMouseEnter={() => setEditHoverId(g.id)}
                            onMouseLeave={() => setEditHoverId(null)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                              border: `1px solid ${editHoverId === g.id ? '#FF6B2B' : 'var(--border-strong)'}`,
                              background: 'var(--surface)',
                              color: editHoverId === g.id ? '#FF6B2B' : NAVY,
                              cursor: 'pointer',
                              transition: 'border-color .12s, color .12s',
                            }}
                          >
                            <I.edit size={16} />
                          </button>
                          <button
                            title="Eliminar gasto"
                            onClick={() => handleDeleteOpen(g)}
                            onMouseEnter={() => setDeleteHoverId(g.id)}
                            onMouseLeave={() => setDeleteHoverId(null)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                              border: `1px solid ${deleteHoverId === g.id ? RED : 'var(--border-strong)'}`,
                              background: 'var(--surface)',
                              color: deleteHoverId === g.id ? RED : NAVY,
                              cursor: 'pointer',
                              transition: 'border-color .12s, color .12s',
                            }}
                          >
                            <I.trash size={16} />
                          </button>
                        </>
                      )}
                      {canWrite && (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            disabled={isPagando}
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8,
                              border: '1px solid var(--border-strong)', background: 'var(--surface)',
                              color: NAVY_500, cursor: isPagando ? 'not-allowed' : 'pointer',
                              flexShrink: 0, opacity: isPagando ? 0.5 : 1,
                              transition: 'background .12s, color .12s', whiteSpace: 'nowrap',
                            }}
                          >
                            <I.check size={14} />
                            {isPagando ? 'Guardando…' : 'Marcar pagado ▾'}
                          </button>
                          {openMenu === g.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
                              background: 'var(--surface)', border: '1px solid var(--border-strong)',
                              borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                              overflow: 'hidden', minWidth: 170,
                            }}>
                              {[
                                { value: 'efectivo_ags', label: 'Efectivo Aguascalientes', color: NAVY_500, bg: NAVY_SOFT  },
                                { value: 'gdl',          label: 'Transferencia Guadalajara',  color: AMBER,    bg: AMBER_SOFT },
                                { value: 'donacion',     label: 'Donación',     color: GREEN,    bg: GREEN_SOFT },
                              ].map((m, mi, arr) => (
                                <button key={m.value} onClick={() => handlePagar(g.id, m.value)} style={{
                                  display: 'flex', alignItems: 'center', gap: 9,
                                  width: '100%', padding: '10px 14px', border: 'none',
                                  borderBottom: mi < arr.length - 1 ? '1px solid var(--border)' : 'none',
                                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                  fontSize: 13, fontWeight: 600, color: m.color,
                                }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Historial: gastos pagados (año) ───────────────────────────────── */}
      <div className="card">
        <div className="card-head" style={{ marginBottom: sortedPagados.length > 0 ? 0 : 16 }}>
          <div>
            <h3 className="card-title">Gastos pagados</h3>
            <div className="card-sub">
              {sortedPagados.length} {sortedPagados.length === 1 ? 'gasto' : 'gastos'} · {fmt(totalPagadosAll)}
            </div>
          </div>
        </div>
        {sortedPagados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            Sin gastos pagados registrados.
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {sortedPagados.map(g => {
              const cat = g.categoria_nombre ?? g.categoria ?? '—';
              return (
                <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{g.concepto}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                      background: CAT_BG[cat] || 'rgba(0,0,0,0.08)',
                      color: CAT_COLORS[cat] || 'var(--muted)', whiteSpace: 'nowrap',
                    }}>{cat}</span>
                    <MetodoBadge metodo={g.metodo_pago} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: RED, marginLeft: 'auto', flexShrink: 0 }}>{fmt(Number(g.monto))}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{fmtFecha(g.fecha)}</div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2, #f6f7f9)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Total pagado</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: RED }}>{fmt(totalPagadosAll)}</span>
            </div>
          </div>
        ) : (
          <div className="tbl-wrap" style={{ borderRadius: 10, border: '1px solid var(--border)', marginTop: 16 }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Método</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {sortedPagados.map(g => {
                  const cat = g.categoria_nombre ?? g.categoria ?? '—';
                  return (
                    <tr key={g.id}>
                      <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtFecha(g.fecha)}</td>
                      <td style={{ fontWeight: 500 }}>{g.concepto}</td>
                      <td>
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                          background: CAT_BG[cat] || 'rgba(0,0,0,0.08)',
                          color: CAT_COLORS[cat] || 'var(--muted)', whiteSpace: 'nowrap',
                        }}>
                          {cat}
                        </span>
                      </td>
                      <td><MetodoBadge metodo={g.metodo_pago} /></td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: RED }}>
                        {fmt(Number(g.monto))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tbody>
                <tr className="anf-totals-row">
                  <td colSpan={4} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '0.08em' }}>
                    Total pagado
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: RED, fontSize: 14 }}>
                    {fmt(totalPagadosAll)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal confirmar eliminación ──────────────────────────────────── */}
      {deleteGasto && (
        <div
          onClick={handleDeleteClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.38)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: 16,
              padding: '28px 28px 24px', width: '100%', maxWidth: 400,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: 0 }}>¿Eliminar este gasto?</h2>
              <button
                onClick={handleDeleteClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY, padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <I.x size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{deleteGasto.concepto}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: RED, letterSpacing: '-0.02em' }}>
                −{fmt(Number(deleteGasto.monto))}
              </div>
            </div>

            <p style={{ fontSize: 13, color: GRAY, margin: '0 0 22px' }}>
              Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={handleDeleteClose}
                disabled={eliminando}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: 'none', background: 'none',
                  fontSize: 13.5, fontWeight: 600, color: GRAY,
                  cursor: eliminando ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={eliminando}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  border: 'none', background: RED,
                  fontSize: 13.5, fontWeight: 600, color: '#fff',
                  cursor: eliminando ? 'not-allowed' : 'pointer',
                  opacity: eliminando ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity .12s',
                }}
              >
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar gasto ────────────────────────────────────────────── */}
      {editGasto && (
        <div
          onClick={handleEditClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.38)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: 16,
              padding: '28px 28px 24px', width: '100%', maxWidth: 440,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: 0 }}>Editar gasto</h2>
              <button
                onClick={handleEditClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY, padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <I.x size={18} />
              </button>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 5 }}>
                  Concepto
                </label>
                <input
                  type="text"
                  value={editForm.concepto}
                  onChange={e => setEditForm(f => ({ ...f, concepto: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    fontSize: 14, color: NAVY,
                    fontFamily: 'inherit', background: 'var(--surface)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 5 }}>
                  Monto
                </label>
                <input
                  type="number"
                  value={editForm.monto}
                  onChange={e => setEditForm(f => ({ ...f, monto: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    fontSize: 14, color: Number(editForm.monto) < 0 ? RED : NAVY,
                    fontFamily: 'inherit', background: 'var(--surface)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 5 }}>
                  Categoría
                </label>
                <select
                  value={editForm.categoria}
                  onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    fontSize: 14, color: NAVY,
                    fontFamily: 'inherit', background: 'var(--surface)',
                    outline: 'none',
                  }}
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 5 }}>
                  Fecha de vencimiento{' '}
                  <span style={{ fontWeight: 400 }}>(vacío = sin fecha)</span>
                </label>
                <input
                  type="date"
                  value={editForm.fecha_vencimiento}
                  onChange={e => setEditForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--border-strong)',
                    fontSize: 14, color: NAVY,
                    fontFamily: 'inherit', background: 'var(--surface)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleEditClose}
                disabled={guardando}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: 'none', background: 'none',
                  fontSize: 13.5, fontWeight: 600, color: GRAY,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={guardando || !editForm.concepto.trim() || !editForm.monto}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  border: 'none', background: NAVY,
                  fontSize: 13.5, fontWeight: 600, color: '#fff',
                  cursor: (guardando || !editForm.concepto.trim() || !editForm.monto) ? 'not-allowed' : 'pointer',
                  opacity: (guardando || !editForm.concepto.trim() || !editForm.monto) ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity .12s',
                }}
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
