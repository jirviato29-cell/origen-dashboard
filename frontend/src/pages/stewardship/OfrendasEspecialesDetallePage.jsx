import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ofrendasEspecialesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { I } from '../../components/Icons';
import { useIsMobile } from '../../utils/useIsMobile';

const ACCENT  = '#FF6B2B';
const NAVY    = '#112540';
const MUTED   = '#6B6B6B';
const BORDER  = '#E5E5E5';
const SURFACE = '#FFFFFF';
const SURFACE2 = '#FAFAFA';
const RED     = '#DC2626';

const METODOS = ['efectivo', 'terminal', 'transferencia'];
const METODO_LABEL = { efectivo: 'Efectivo', terminal: 'Terminal', transferencia: 'Transferencia' };

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? s : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FORM_VACIO = {
  nombre_persona: '', email: '', whatsapp: '', cantidad: '',
  fecha_entrega: '', pagado: false, metodo: '',
};

const opcionStyle = (activo) => ({
  flex: 1, padding: '9px 6px', borderRadius: 8,
  border: `1.5px solid ${activo ? ACCENT : BORDER}`,
  background: activo ? '#FFF4EE' : 'none',
  color: activo ? ACCENT : MUTED,
  fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.12s',
});

function Estado({ registro }) {
  const pagadoLabel = ['Pagado', METODO_LABEL[registro.metodo] || registro.metodo].filter(Boolean).join(' · ');
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: registro.pagado ? 'var(--good)' : ACCENT }}>
      {registro.pagado ? pagadoLabel : 'Pendiente'}
    </span>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: SURFACE, borderRadius: 16, padding: '28px 28px 24px',
        width: '100%', maxWidth: 460,
        maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box',
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 12.5, fontWeight: 700, color: MUTED,
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-ui)',
  outline: 'none', boxSizing: 'border-box',
};

export default function OfrendasEspecialesDetallePage() {
  const { id }   = useParams();
  const { role } = useAuth();
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const base       = '/' + role;

  const [ofrenda,    setOfrenda]    = useState(null);
  const [registros,  setRegistros]  = useState([]);
  const [total,      setTotal]      = useState(0);
  const [subtotales, setSubtotales] = useState({});
  const [loading,    setLoading]    = useState(true);

  // Modal registrar / editar
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editando,   setEditando]   = useState(null); // null = crear, objeto = editar
  const [form,       setForm]       = useState(FORM_VACIO);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  // Modal confirmar borrar
  const [borrarId,   setBorrarId]   = useState(null);
  const [borrando,   setBorrando]   = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [listRes, detRes] = await Promise.all([
        ofrendasEspecialesApi.getAll(),
        ofrendasEspecialesApi.getRegistros(id),
      ]);
      const all = listRes.data?.data || [];
      const found = all.find(o => String(o.id) === String(id));
      setOfrenda(found || null);
      setRegistros(detRes.data?.data || []);
      setTotal(Number(detRes.data?.total) || 0);
      setSubtotales(detRes.data?.subtotales || {});
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setFormError('');
    setModalOpen(true);
  };

  const abrirEditar = (reg) => {
    setEditando(reg);
    setForm({
      nombre_persona: reg.nombre_persona,
      email: reg.email || '',
      whatsapp: reg.whatsapp || '',
      cantidad: String(reg.cantidad),
      fecha_entrega: reg.fecha_entrega ? String(reg.fecha_entrega).slice(0, 10) : '',
      pagado: Boolean(reg.pagado),
      metodo: reg.metodo || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const cerrarModal = () => { setModalOpen(false); setEditando(null); };

  const guardar = async () => {
    if (!form.nombre_persona.trim()) { setFormError('Nombre requerido.'); return; }
    // Al editar, un registro antiguo puede no tener estos datos.
    const exigir = (campo) => !editando || Boolean(editando[campo]);
    if (exigir('email') && !form.email.trim()) { setFormError('Email requerido.'); return; }
    if (exigir('whatsapp') && !form.whatsapp.trim()) { setFormError('WhatsApp requerido.'); return; }
    if (!(Number(form.cantidad) > 0)) { setFormError('El compromiso debe ser mayor a 0.'); return; }
    if (exigir('fecha_entrega') && !form.fecha_entrega) { setFormError('Fecha de entrega requerida.'); return; }
    if (form.pagado && !METODOS.includes(form.metodo)) { setFormError('Elige un método de pago.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const body = {
        nombre_persona: form.nombre_persona.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        cantidad: Number(form.cantidad),
        fecha_entrega: form.fecha_entrega,
        pagado: form.pagado,
        ...(form.pagado ? { metodo: form.metodo } : {}),
      };
      if (editando) {
        await ofrendasEspecialesApi.updateRegistro(editando.id, body);
      } else {
        await ofrendasEspecialesApi.createRegistro(id, body);
      }
      setModalOpen(false);
      cargar();
    } catch (e) {
      setFormError(e?.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarBorrar = async () => {
    setBorrando(true);
    try {
      await ofrendasEspecialesApi.deleteRegistro(borrarId);
      setBorrarId(null);
      cargar();
    } catch {
      // silencioso
    } finally {
      setBorrando(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: MUTED }}>Cargando…</div>;
  }

  // ── Desglose por método (debe sumar exactamente el total) ────────────────────
  // El total y los subtotales del backend cuentan solo registros pagados.
  // `otros` absorbe cualquier pagado con método fuera de los 3 (null/raro) para
  // que el desglose SIEMPRE sume el total y no se "pierda" dinero.
  const desgEfectivo      = Number(subtotales.efectivo) || 0;
  const desgTerminal      = Number(subtotales.terminal) || 0;
  const desgTransferencia = Number(subtotales.transferencia) || 0;
  const desgOtros         = total - desgEfectivo - desgTerminal - desgTransferencia;

  const desglose = [
    { label: 'Efectivo',      value: desgEfectivo,      show: true },
    { label: 'Terminal',      value: desgTerminal,      show: true },
    { label: 'Transferencia', value: desgTransferencia, show: desgTransferencia > 0.005 },
    { label: 'Otros',         value: desgOtros,         show: desgOtros > 0.005 },
  ].filter(c => c.show);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Breadcrumb + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate(`${base}/ofrendas-especiales`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'none', border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: '6px 12px',
            fontSize: 13, color: MUTED, cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}
        >
          <I.back size={14} /> Volver
        </button>
        <span style={{ color: BORDER }}>·</span>
        <span style={{ fontSize: 13.5, color: MUTED, fontWeight: 500 }}>Ofrendas especiales</span>
        <span style={{ color: BORDER }}>·</span>
        <span style={{ fontSize: 13.5, color: NAVY, fontWeight: 700 }}>
          {ofrenda?.nombre || `Ofrenda #${id}`}
        </span>
      </div>

      {/* Total hero card */}
      <div style={{
        background: NAVY, borderRadius: 16, padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        boxShadow: '0 4px 20px rgba(17,37,64,0.15)',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CB0CC', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
            Total recaudado
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#3DD68C', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(total)}
          </div>
          <div style={{ fontSize: 13, color: '#9CB0CC', marginTop: 8 }}>
            {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
          </div>

          {/* Desglose por método — suma exactamente el total */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {desglose.map(c => (
              <div key={c.label} style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 6,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '6px 12px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#9CB0CC' }}>
                  {c.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(c.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={abrirCrear}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: ACCENT, color: '#fff',
            border: 'none', borderRadius: 10,
            padding: isMobile ? '10px 14px' : '12px 20px',
            fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            boxShadow: '0 2px 10px rgba(255,107,43,0.35)',
          }}
        >
          <I.plus size={16} />
          {!isMobile && 'Registrar ofrenda'}
        </button>
      </div>

      {/* Tabla de registros */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>Registros</h3>
          </div>
        </div>

        {registros.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: MUTED }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: SURFACE2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', color: '#C5CBD4',
            }}>
              <I.coin size={22} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>Sin registros aún</div>
            <div style={{ fontSize: 13 }}>Usa "Registrar ofrenda" para agregar el primer registro.</div>
          </div>
        ) : isMobile ? (
          // Mobile cards
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {registros.map(r => (
              <div key={r.id} style={{
                background: SURFACE2, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: NAVY }}>{r.nombre_persona}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(r.cantidad)}</div>
                </div>
                <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 3, overflowWrap: 'anywhere' }}>
                  <div>WhatsApp: {r.whatsapp || '—'}</div>
                  <div>Email: {r.email || '—'}</div>
                  <div>Fecha de entrega: {fmtDate(r.fecha_entrega)}</div>
                  <div><Estado registro={r} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => abrirEditar(r)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 7, border: `1px solid ${BORDER}`,
                    background: 'none', fontSize: 12.5, color: MUTED, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}>
                    <I.edit size={12} /> Editar
                  </button>
                  <button onClick={() => setBorrarId(r.id)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 7, border: `1px solid #FECACA`,
                    background: '#FEF2F2', fontSize: 12.5, color: RED, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}>
                    <I.trash size={12} /> Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop table
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: SURFACE2 }}>
                {['Nombre / Familia', 'WhatsApp', 'Email', 'Compromiso', 'Fecha de entrega', 'Estado', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 14px', textAlign: i === 3 ? 'right' : 'left',
                    fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.07em', color: MUTED,
                    borderBottom: `1px solid ${BORDER}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: idx < registros.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 600, color: NAVY }}>
                    {r.nombre_persona}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13.5, color: MUTED, whiteSpace: 'nowrap' }}>{r.whatsapp || '—'}</td>
                  <td style={{ padding: '13px 14px', fontSize: 13.5, color: MUTED, overflowWrap: 'anywhere' }}>{r.email || '—'}</td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', fontSize: 16, fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(r.cantidad)}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 13.5, color: MUTED, whiteSpace: 'nowrap' }}>{fmtDate(r.fecha_entrega)}</td>
                  <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}><Estado registro={r} /></td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button onClick={() => abrirEditar(r)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6, border: `1px solid ${BORDER}`,
                        background: 'none', fontSize: 12, color: MUTED, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}>
                        <I.edit size={11} /> Editar
                      </button>
                      <button onClick={() => setBorrarId(r.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6, border: `1px solid #FECACA`,
                        background: '#FEF2F2', fontSize: 12, color: RED, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}>
                        <I.trash size={11} /> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal registrar / editar */}
      <Modal open={modalOpen} onClose={cerrarModal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: NAVY }}>
            {editando ? 'Editar registro' : 'Registrar ofrenda'}
          </h3>
          <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <I.x size={20} />
          </button>
        </div>

        <Field label="Nombre / Familia">
          <input
            autoFocus
            value={form.nombre_persona}
            onChange={e => { setForm(f => ({ ...f, nombre_persona: e.target.value })); setFormError(''); }}
            placeholder="Nombre o familia"
            style={inputStyle}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormError(''); }}
            placeholder="correo@ejemplo.com"
            style={inputStyle}
          />
        </Field>

        <Field label="WhatsApp">
          <input
            type="tel"
            value={form.whatsapp}
            onChange={e => { setForm(f => ({ ...f, whatsapp: e.target.value })); setFormError(''); }}
            placeholder="10 dígitos"
            style={inputStyle}
          />
        </Field>

        <Field label="Mi compromiso total">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.cantidad}
            onChange={e => { setForm(f => ({ ...f, cantidad: e.target.value })); setFormError(''); }}
            placeholder="0.00"
            style={inputStyle}
          />
        </Field>

        <Field label="Fecha en que lo entregaré">
          <input
            type="date"
            value={form.fecha_entrega}
            onChange={e => { setForm(f => ({ ...f, fecha_entrega: e.target.value })); setFormError(''); }}
            style={inputStyle}
          />
        </Field>

        <Field label="Pagado">
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ valor: false, label: 'No' }, { valor: true, label: 'Sí' }].map(op => (
              <button
                key={op.label}
                onClick={() => { setForm(f => ({ ...f, pagado: op.valor })); setFormError(''); }}
                style={opcionStyle(form.pagado === op.valor)}
              >
                {op.label}
              </button>
            ))}
          </div>
        </Field>

        {form.pagado && (
          <Field label="Método de pago">
            <div style={{ display: 'flex', gap: 8 }}>
              {METODOS.map(m => (
                <button
                  key={m}
                  onClick={() => { setForm(f => ({ ...f, metodo: m })); setFormError(''); }}
                  style={opcionStyle(form.metodo === m)}
                >
                  {METODO_LABEL[m]}
                </button>
              ))}
            </div>
          </Field>
        )}

        {formError && <div style={{ fontSize: 12.5, color: RED, marginBottom: 14 }}>{formError}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={cerrarModal} style={{
            padding: '9px 18px', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'none', fontSize: 13.5, fontWeight: 600, color: MUTED, cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: ACCENT, color: '#fff',
            fontSize: 13.5, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, fontFamily: 'var(--font-ui)',
          }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </Modal>

      {/* Modal confirmar borrar */}
      <Modal open={borrarId !== null} onClose={() => setBorrarId(null)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#FEF2F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: RED,
          }}>
            <I.trash size={22} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: NAVY }}>¿Borrar registro?</h3>
          <p style={{ margin: '0 0 24px', fontSize: 13.5, color: MUTED }}>Esta acción no se puede deshacer.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => setBorrarId(null)} style={{
              padding: '9px 18px', borderRadius: 8, border: `1px solid ${BORDER}`,
              background: 'none', fontSize: 13.5, fontWeight: 600, color: MUTED, cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}>
              Cancelar
            </button>
            <button onClick={confirmarBorrar} disabled={borrando} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: RED, color: '#fff',
              fontSize: 13.5, fontWeight: 700,
              cursor: borrando ? 'not-allowed' : 'pointer',
              opacity: borrando ? 0.7 : 1, fontFamily: 'var(--font-ui)',
            }}>
              {borrando ? 'Borrando…' : 'Sí, borrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
