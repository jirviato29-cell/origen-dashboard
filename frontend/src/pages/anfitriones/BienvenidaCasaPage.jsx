import { useState, useEffect, useCallback } from 'react';
import { visitantesApi } from '../../services/api';
import { fmtFechaShort } from '../../utils/fecha';
import { I } from '../../components/Icons';

// ─── Design tokens ──────────────────────────────────────────────────────────
const NAVY_900 = '#112540';
const NAVY_700 = '#244169';
const NAVY_600 = '#305181';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const ORANGE_600 = '#E0561B';
const ORANGE_500 = '#FF6B2B';
const ORANGE_50  = '#FFF4EE';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';
const TEAL    = '#5C7A6F';
const TEAL_50 = '#EAF1EE';

// ─── Icons ──────────────────────────────────────────────────────────────────
const WaIcon = ({ size = 16, color = TEAL }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

// ─── Helpers ────────────────────────────────────────────────────────────────
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ─── Ediciones (agrega aquí nuevas ediciones con su rango) ──────────────────
const EDICIONES = [
  { id: 'actual', label: 'Actual',                     from: '2026-03-23', to: null         },
  { id: 'mar22',  label: 'Bienvenida del 22 de marzo', from: '2026-01-01', to: '2026-03-22' },
];

function inEdicion(v, ed) {
  if (!v.fecha) return false;
  const d = v.fecha.slice(0, 10);
  if (ed.from && d < ed.from) return false;
  if (ed.to   && d > ed.to)   return false;
  return true;
}

function initials(nombre) {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function relChip(relacion) {
  if (relacion === 'Me interesa seguir')   return { bg: ORANGE_50, color: ORANGE_600, label: 'Me interesa seguir', opacity: 1 };
  if (relacion === 'Solo vengo de visita') return { bg: NAVY_100,  color: NAVY_700,   label: 'Solo vengo de visita', opacity: 1 };
  return { bg: NAVY_100, color: NAVY_700, label: 'Sin definir', opacity: 0.6 };
}

function feChip(fe) {
  if (fe === 'Soy nuevo')    return { bg: TEAL_50,  color: TEAL,    label: 'Soy nuevo' };
  if (fe === 'Soy cristiano') return { bg: NAVY_100, color: NAVY_700, label: 'Soy cristiano' };
  return null;
}

const mkEmpty = () => ({
  fecha: new Date().toISOString().split('T')[0],
  relacion_con_origen: '',
  nombre: '',
  edad: '',
  estado_fe: '',
  whatsapp: '',
  como_se_entero: '',
  acompanantes: '',
  colonia: '',
});

// ─── Shared styles ──────────────────────────────────────────────────────────
const labelSt = {
  fontSize: 11, fontWeight: 700, color: GRAY_500,
  textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4,
};
const inputSt = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 8, border: `1px solid ${GRAY_200}`,
  fontSize: 13.5, color: NAVY_900, outline: 'none', background: '#fff',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon, iconBg, iconColor, value, label, footer, valueColor = NAVY_900 }) {
  const Ic = icon;
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Ic size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: valueColor, letterSpacing: '-.03em', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: GRAY_500, marginTop: 2 }}>{label}</div>
        {footer && (
          <div style={{ fontSize: 11, color: GRAY_300, marginTop: 6, borderTop: `1px solid ${GRAY_100}`, paddingTop: 6 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function VisitanteModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? { ...editing, edad: editing.edad ?? '' } : mkEmpty());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setErr('El nombre es requerido.'); return; }
    setSaving(true);
    setErr('');
    try {
      const payload = {
        fecha:               form.fecha || null,
        relacion_con_origen: form.relacion_con_origen || null,
        nombre:              form.nombre.trim(),
        edad:                form.edad !== '' ? parseInt(form.edad, 10) : null,
        estado_fe:           form.estado_fe || null,
        whatsapp:            form.whatsapp || null,
        como_se_entero:      form.como_se_entero || null,
        acompanantes:        form.acompanantes || null,
        colonia:             form.colonia || null,
      };
      if (editing) await visitantesApi.update(editing.id, payload);
      else         await visitantesApi.create(payload);
      onSaved();
    } catch {
      setErr('Error al guardar. Intenta de nuevo.');
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(11,26,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28, maxWidth: 520, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: NAVY_900 }}>
              {editing ? 'Editar visitante' : 'Nuevo visitante'}
            </div>
            <div style={{ fontSize: 12, color: GRAY_500, marginTop: 2 }}>
              Completa los datos del visitante
            </div>
          </div>
          <button onClick={onClose} style={{
            background: GRAY_50, border: 0, borderRadius: 9, width: 32, height: 32,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GRAY_500,
          }}>
            <I.x size={15} />
          </button>
        </div>

        {err && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 12.5, padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelSt}>Nombre completo *</label>
            <input style={inputSt} type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelSt}>Fecha de visita</label>
              <input style={inputSt} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div>
              <label style={labelSt}>Edad</label>
              <input style={inputSt} type="number" value={form.edad} onChange={e => set('edad', e.target.value)} min="0" max="120" placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label style={labelSt}>Relación con Origen</label>
            <select style={inputSt} value={form.relacion_con_origen} onChange={e => set('relacion_con_origen', e.target.value)}>
              <option value="">— Sin especificar —</option>
              <option value="Me interesa seguir">Me interesa seguir</option>
              <option value="Solo vengo de visita">Solo vengo de visita</option>
            </select>
          </div>

          <div>
            <label style={labelSt}>Estado de fe</label>
            <select style={inputSt} value={form.estado_fe} onChange={e => set('estado_fe', e.target.value)}>
              <option value="">— Sin especificar —</option>
              <option value="Soy nuevo">Soy nuevo</option>
              <option value="Soy cristiano">Soy cristiano</option>
            </select>
          </div>

          <div>
            <label style={labelSt}>WhatsApp</label>
            <input style={inputSt} type="text" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+52 449 000 0000" />
          </div>

          <div>
            <label style={labelSt}>¿Cómo se enteró?</label>
            <input style={inputSt} type="text" value={form.como_se_entero} onChange={e => set('como_se_entero', e.target.value)} placeholder="Redes sociales, amigo, otro..." />
          </div>

          <div>
            <label style={labelSt}>Acompañantes</label>
            <input style={inputSt} type="text" value={form.acompanantes} onChange={e => set('acompanantes', e.target.value)} placeholder="Nombres de quienes lo acompañan" />
          </div>

          <div>
            <label style={labelSt}>Colonia</label>
            <input style={inputSt} type="text" value={form.colonia} onChange={e => set('colonia', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${GRAY_200}`,
              background: '#fff', fontSize: 13.5, fontWeight: 600, color: GRAY_700, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 0,
              background: NAVY_900, color: '#fff', fontSize: 13.5, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar visitante'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BienvenidaCasaPage() {
  const [visitantes, setVisitantes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filtro, setFiltro]         = useState('todos');
  const [page, setPage]             = useState(1);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [edicion, setEdicion]       = useState('actual');
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    try {
      const { data } = await visitantesApi.getAll();
      setVisitantes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Edición activa ────────────────────────────────────────────────────────
  const edDef    = EDICIONES.find(e => e.id === edicion) ?? EDICIONES[0];
  const enEdicion = visitantes.filter(v => inEdicion(v, edDef));

  // ── KPIs (sobre el período seleccionado) ──────────────────────────────────
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const totalCount         = enEdicion.length;
  const quierenSeguirCount = enEdicion.filter(v => v.relacion_con_origen === 'Me interesa seguir').length;
  const nuevosFeCount      = enEdicion.filter(v => v.estado_fe === 'Soy nuevo').length;
  const esteMesCount       = enEdicion.filter(v => {
    if (!v.fecha) return false;
    const d = new Date(v.fecha + 'T00:00:00');
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  const quierenPct = totalCount > 0 ? Math.round((quierenSeguirCount / totalCount) * 100) : 0;

  // ── Filter (dentro del período seleccionado) ─────────────────────────────
  const filtered = enEdicion.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || [v.nombre, v.colonia, v.como_se_entero, v.whatsapp]
      .some(s => s?.toLowerCase().includes(q));
    const matchFiltro =
      filtro === 'todos'      ? true :
      filtro === 'seguir'     ? v.relacion_con_origen === 'Me interesa seguir' :
      filtro === 'visita'     ? v.relacion_con_origen === 'Solo vengo de visita' :
      filtro === 'nuevo'      ? v.estado_fe === 'Soy nuevo' :
      filtro === 'cristiano'  ? v.estado_fe === 'Soy cristiano' : true;
    return matchSearch && matchFiltro;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openNew()    { setEditing(null); setShowModal(true); }
  function openEdit(v)  { setEditing(v);    setShowModal(true); }
  function closeModal() { setShowModal(false); setEditing(null); }
  async function onSaved() { closeModal(); await load(); }

  function openWa(num) {
    if (!num) return;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}`, '_blank');
  }

  function changeEdicion(id) { setEdicion(id); setFiltro('todos'); setSearch(''); setPage(1); }
  function changeFiltro(f)  { setFiltro(f); setPage(1); }
  function changeSearch(v)  { setSearch(v);  setPage(1); }

  const chipSt = (active) => ({
    padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    border: `1px solid ${active ? ORANGE_500 : GRAY_200}`,
    background: active ? ORANGE_50 : '#fff',
    color: active ? ORANGE_600 : GRAY_500,
    cursor: 'pointer',
  });

  const thSt = {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: GRAY_500,
    textTransform: 'uppercase', letterSpacing: '.06em',
    borderBottom: `1px solid ${GRAY_100}`, whiteSpace: 'nowrap',
  };
  const tdSt = { padding: '12px 14px', borderBottom: `1px solid ${GRAY_100}` };

  const emptyCell = <span style={{ color: GRAY_300, fontSize: 12 }}>—</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div style={{
        background: NAVY_900, borderRadius: 16, padding: '28px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,43,.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -30, width: 150, height: 150, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,43,.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: ORANGE_500, marginBottom: 8 }}>
              Registro de visitantes · Origen Aguascalientes
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-.03em', lineHeight: 1.15 }}>
              Bienvenida a Casa
            </h2>
            <p style={{ fontSize: 13, color: NAVY_300, marginTop: 8, marginBottom: 0, maxWidth: 480 }}>
              Lleva el registro de quienes visitan la iglesia por primera vez o de forma recurrente.
            </p>
          </div>
          <button onClick={openNew} style={{
            padding: '11px 20px', borderRadius: 11, border: 0,
            background: ORANGE_500, color: '#fff', fontSize: 13.5, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, alignSelf: 'flex-end',
          }}>
            <I.plus size={15} /> Nuevo visitante
          </button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon={I.users}    iconBg={NAVY_100}  iconColor={NAVY_700}   value={totalCount}        label="Total visitantes"  footer="Todos los registros" />
        <KpiCard icon={I.heart}    iconBg={ORANGE_50} iconColor={ORANGE_600} value={quierenSeguirCount} label="Quieren seguir"    footer={`Del total · ${quierenPct}%`} valueColor={ORANGE_600} />
        <KpiCard icon={I.plus}     iconBg={TEAL_50}   iconColor={TEAL}       value={nuevosFeCount}      label="Nuevos en la fe"   footer="Soy nuevo" />
        <KpiCard icon={I.calendar} iconBg={NAVY_100}  iconColor={NAVY_700}   value={esteMesCount}       label="Este mes"          footer={MESES[thisMonth]} />
      </div>

      {/* ── Selector de edición ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: GRAY_500, textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>
          Edición
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EDICIONES.map(e => {
            const active = edicion === e.id;
            return (
              <button key={e.id} onClick={() => changeEdicion(e.id)} style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: `1px solid ${active ? NAVY_900 : GRAY_200}`,
                background: active ? NAVY_900 : '#fff',
                color: active ? '#fff' : GRAY_500,
                cursor: 'pointer',
              }}>
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>

        {/* Header: search + chips */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${GRAY_100}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: GRAY_300, pointerEvents: 'none' }}>
              <I.search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, colonia, WhatsApp..."
              value={search}
              onChange={e => changeSearch(e.target.value)}
              style={{
                ...inputSt, background: GRAY_50, padding: '8px 10px 8px 32px',
                borderRadius: 9, fontSize: 13,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'todos',     label: 'Todos' },
              { key: 'seguir',    label: 'Me interesa seguir' },
              { key: 'visita',    label: 'Solo de visita' },
              { key: 'nuevo',     label: 'Soy nuevo' },
              { key: 'cristiano', label: 'Soy cristiano' },
            ].map(c => (
              <button key={c.key} onClick={() => changeFiltro(c.key)} style={chipSt(filtro === c.key)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: GRAY_50 }}>
                <th style={thSt}>N°</th>
                <th style={thSt}>Fecha</th>
                <th style={thSt}>Relación con Origen</th>
                <th style={thSt}>Nombre</th>
                <th style={thSt}>Estado de fe</th>
                <th style={thSt}>WhatsApp</th>
                <th style={thSt}>¿Cómo se enteró?</th>
                <th style={thSt}>Acompañantes</th>
                <th style={thSt}>Colonia</th>
                <th style={{ ...thSt, width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: GRAY_300 }}>Cargando...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: GRAY_300 }}>
                  {search || filtro !== 'todos' ? 'Sin resultados para este filtro.' : 'Aún no hay visitantes registrados.'}
                </td></tr>
              ) : paged.map((v, idx) => {
                const rel = relChip(v.relacion_con_origen);
                const fe  = feChip(v.estado_fe);
                const av  = v.estado_fe === 'Soy nuevo' ? ORANGE_500 : NAVY_600;
                const n   = (page - 1) * PAGE_SIZE + idx + 1;
                return (
                  <tr key={v.id} style={{ background: '#fff' }}>
                    {/* N° */}
                    <td style={tdSt}>
                      <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: GRAY_300, fontWeight: 500 }}>
                        {String(n).padStart(2, '0')}
                      </span>
                    </td>
                    {/* Fecha */}
                    <td style={tdSt}>
                      <span style={{ fontSize: 12, color: GRAY_700, whiteSpace: 'nowrap' }}>
                        {v.fecha ? fmtFechaShort(v.fecha) : emptyCell}
                      </span>
                    </td>
                    {/* Relación */}
                    <td style={tdSt}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 6,
                        background: rel.bg, color: rel.color,
                        fontSize: 11.5, fontWeight: 600, opacity: rel.opacity,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: rel.color, flexShrink: 0 }} />
                        {rel.label}
                      </span>
                    </td>
                    {/* Nombre + edad */}
                    <td style={tdSt}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, background: av, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, flexShrink: 0, letterSpacing: '-.02em',
                        }}>{initials(v.nombre)}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: NAVY_900, fontSize: 13 }}>{v.nombre}</div>
                          {v.edad && <div style={{ fontSize: 11.5, color: GRAY_500 }}>{v.edad} años</div>}
                        </div>
                      </div>
                    </td>
                    {/* Estado de fe */}
                    <td style={tdSt}>
                      {fe ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 6,
                          background: fe.bg, color: fe.color,
                          fontSize: 11.5, fontWeight: 600,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: fe.color, flexShrink: 0 }} />
                          {fe.label}
                        </span>
                      ) : emptyCell}
                    </td>
                    {/* WhatsApp */}
                    <td style={tdSt}>
                      {v.whatsapp ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <WaIcon size={13} color={TEAL} />
                          <span style={{ fontSize: 12, color: GRAY_700, fontFamily: "'JetBrains Mono', monospace" }}>
                            {v.whatsapp}
                          </span>
                        </div>
                      ) : emptyCell}
                    </td>
                    {/* Cómo se enteró */}
                    <td style={{ ...tdSt, maxWidth: 200 }}>
                      {v.como_se_entero
                        ? <span style={{ fontSize: 12, color: GRAY_700 }}>{v.como_se_entero}</span>
                        : emptyCell}
                    </td>
                    {/* Acompañantes */}
                    <td style={{ ...tdSt, maxWidth: 220 }}>
                      {v.acompanantes
                        ? <span style={{ fontSize: 11.5, color: GRAY_500 }}>{v.acompanantes}</span>
                        : emptyCell}
                    </td>
                    {/* Colonia */}
                    <td style={tdSt}>
                      {v.colonia
                        ? <span style={{ fontSize: 12, color: GRAY_700 }}>{v.colonia}</span>
                        : emptyCell}
                    </td>
                    {/* Acciones */}
                    <td style={tdSt}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {v.whatsapp && (
                          <button
                            onClick={() => openWa(v.whatsapp)}
                            title="Abrir WhatsApp"
                            style={{
                              width: 30, height: 30, borderRadius: 8,
                              border: `1px solid ${GRAY_200}`, background: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: TEAL,
                            }}
                          >
                            <WaIcon size={14} color={TEAL} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(v)}
                          title="Editar"
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: `1px solid ${GRAY_200}`, background: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: GRAY_500,
                          }}
                        >
                          <I.edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${GRAY_100}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, color: GRAY_500, flexWrap: 'wrap', gap: 10,
        }}>
          <span>
            {filtered.length === 0
              ? 'Sin resultados'
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} visitante${filtered.length !== 1 ? 's' : ''}`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '5px 14px', borderRadius: 20, border: `1px solid ${GRAY_200}`,
                background: '#fff', fontSize: 12.5, fontWeight: 600,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                color: page <= 1 ? GRAY_300 : GRAY_700,
              }}
            >Anterior</button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '5px 14px', borderRadius: 20, border: `1px solid ${GRAY_200}`,
                background: '#fff', fontSize: 12.5, fontWeight: 600,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                color: page >= totalPages ? GRAY_300 : GRAY_700,
              }}
            >Siguiente</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <VisitanteModal editing={editing} onClose={closeModal} onSaved={onSaved} />
      )}
    </div>
  );
}
