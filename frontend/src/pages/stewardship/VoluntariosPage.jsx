import { useState, useEffect, useCallback } from 'react';
import { voluntariosApi, ministeriosApi } from '../../services/api';
import { useMinisterios } from '../../context/MinisteriosContext';
import { fmtFecha } from '../../utils/fecha';
import { I } from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { puedeRegistrar } from '../../permissions';
import { useIsMobile } from '../../utils/useIsMobile';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY     = '#112540';
const NAVY_700 = '#244169';
const NAVY_600 = '#305181';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const ORANGE_600 = '#E0561B';
const ORANGE_50  = '#FFF4EE';
const PURPLE   = '#8466C4';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';

const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

// ── Género heurístico ──────────────────────────────────────────────────────
// Mujeres cuyo primer nombre NO termina en "a" → forzar F
const FORZAR_F = new Set([
  'belen', 'raquel', 'carmen', 'isabel', 'beatriz', 'ester', 'esther',
  'soledad', 'mercedes', 'ines', 'pilar', 'dolores', 'guadalupe',
  'concepcion', 'asuncion', 'lupe', 'abril', 'nube',
  'sarahy', 'jazmin', 'elizabeth', 'nayeli', 'jackeline', 'evelyn',
]);

// Hombres cuyo primer nombre SÍ termina en "a" → forzar M
const FORZAR_M = new Set([
  'elias', 'isaias', 'jeremias', 'matias', 'tobias', 'bautista',
]);

function guessGenero(nombreCompleto) {
  const primer = (nombreCompleto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .split(/\s+/)[0];
  if (!primer) return 'M';
  if (FORZAR_F.has(primer)) return 'F';
  if (FORZAR_M.has(primer)) return 'M';
  return primer.endsWith('a') ? 'F' : 'M';
}

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(nombre) {
  return (nombre || '').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function calcAge(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function isSoon(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  let next = new Date(year, d.getMonth(), d.getDate());
  if (next < today) next = new Date(year + 1, d.getMonth(), d.getDate());
  const diff = Math.round((next - today) / 86400000);
  if (diff > 7) return null;
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  return `en ${diff} días`;
}

// ── Lista de áreas de servicio ─────────────────────────────────────────────
export const MINISTERIOS = [
  'Alabanza Worship',
  'Anfitriones Bienvenida',
  'Foto y Video',
  'Liturgia, Devocionales, Mcs',
  'Oración e Intercesión',
  'Origen Kids',
  'Proyección',
  'Punto de Encuentro',
  'Santa Cena',
  'Santuario',
  'Staff Alpha Anfitrión',
  'Staff de Audio',
  'Staff de Eventos',
  'Staff de Hombres',
  'Staff de Jóvenes Alpha Ados',
  'Staff de Mujeres',
  'Staff Logístico',
  'Staff Mcs',
  'Staff Producción Crew',
  'Staff Producción y carga',
];

const EMPTY_FORM = {
  nombre: '', cumpleanos: '', whatsapp: '', correo: '',
  ministerio1: '', ministerio2: '', ministerio3: '',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block',
};

const sectionHeadStyle = {
  fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2,
};

function optsFor(allMin, exclude1, exclude2) {
  return allMin.filter(m => m !== exclude1 && m !== exclude2);
}

// ── Selector de área ──────────────────────────────────────────────────────
function AreaSelect({ label, value, onChange, available, required }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && ' *'}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}
        required={required}
      >
        <option value="">— elegir —</option>
        {available.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
        {value && !available.includes(value) && (
          <option value={value}>{value}</option>
        )}
      </select>
    </div>
  );
}

// ── Bloque de ministerios ─────────────────────────────────────────────────
function AreasBlock({ form, setForm, showHeader }) {
  const ctx = useMinisterios();
  const lista = (ctx?.ministerios?.length > 0)
    ? ctx.ministerios.map(m => m.nombre)
    : MINISTERIOS;
  const { ministerio1, ministerio2, ministerio3 } = form;
  const opts1 = optsFor(lista, ministerio2, ministerio3);
  const opts2 = optsFor(lista, ministerio1, ministerio3);
  const opts3 = optsFor(lista, ministerio1, ministerio2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showHeader && (
        <div style={{ paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
          <div style={sectionHeadStyle}>Ministerios</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Elige en qué ministerio(s) sirves</div>
        </div>
      )}
      <AreaSelect label="Ministerio 1" value={ministerio1} onChange={v => setForm(p => ({ ...p, ministerio1: v }))} available={opts1} required />
      <AreaSelect label="Ministerio 2" value={ministerio2} onChange={v => setForm(p => ({ ...p, ministerio2: v }))} available={opts2} />
      <AreaSelect label="Ministerio 3" value={ministerio3} onChange={v => setForm(p => ({ ...p, ministerio3: v }))} available={opts3} />
    </div>
  );
}

// ── Modal Editar — PRESERVED EXACTLY ─────────────────────────────────────
function VoluntarioModal({ form, setForm, onSave, onClose, saving, error }) {
  const canSave = form.nombre.trim() && form.ministerio1;

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-grabber" />
        <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="anf-modal-eyebrow">Editar voluntario</div>
            <h3 className="anf-modal-date">{form.nombre}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 34, height: 34 }}>
            <I.x size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre completo *</label>
            <input
              type="text"
              placeholder="Nombre Apellido"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Cumpleaños</label>
              <input
                type="date"
                value={form.cumpleanos}
                onChange={e => setForm(p => ({ ...p, cumpleanos: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input
                type="text"
                placeholder="+52 449 000 0000"
                value={form.whatsapp}
                onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Correo <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--muted)', fontSize: 11.5 }}>(opcional)</span>
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={form.correo}
              onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <AreasBlock form={form} setForm={setForm} showHeader />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: '8px 0 0' }}>{error}</p>
        )}

        <button
          className="btn btn-primary anf-save-btn"
          onClick={onSave}
          disabled={!canSave || saving}
          style={{ opacity: (!canSave || saving) ? 0.45 : 1, marginTop: 8 }}
        >
          <I.check size={16} />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Kiosco: formulario — PRESERVED EXACTLY ────────────────────────────────
function KioskForm({ form, setForm, onSave, saving, error }) {
  const canSave = form.nombre.trim() && form.ministerio1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--surface, #faf9f7)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '32px 16px 40px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--accent, #7c5c3a)',
            marginBottom: 10,
          }}>
            Origen Aguascalientes
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', lineHeight: 1.3 }}>
            Directorio de voluntarios,<br />ministerios y cumpleaños
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Llena tus datos y te contactamos pronto.
          </p>
        </div>

        <div style={{
          background: 'white', borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '28px 24px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <label style={labelStyle}>Nombre completo *</label>
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              style={{ ...inputStyle, fontSize: 15 }}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Cumpleaños</label>
              <input
                type="date"
                value={form.cumpleanos}
                onChange={e => setForm(p => ({ ...p, cumpleanos: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input
                type="text"
                placeholder="+52 449 000 0000"
                value={form.whatsapp}
                onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Correo <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--muted)', fontSize: 11.5 }}>(opcional)</span>
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={form.correo}
              onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <AreasBlock form={form} setForm={setForm} showHeader />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: '10px 0 0', textAlign: 'center' }}>{error}</p>
        )}

        <button
          onClick={onSave}
          disabled={!canSave || saving}
          style={{
            width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 12,
            background: canSave && !saving ? 'var(--accent, #7c5c3a)' : 'var(--border)',
            color: canSave && !saving ? 'white' : 'var(--muted)',
            border: 'none', fontSize: 16, fontWeight: 600,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? 'Guardando…' : <><I.check size={18} /> Guardar</>}
        </button>
      </div>
    </div>
  );
}

// ── Kiosco: agradecimiento — PRESERVED EXACTLY ────────────────────────────
function KioskThanks({ onNext, onExit }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--surface, #faf9f7)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{ maxWidth: 460 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--accent, #7c5c3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <I.check size={34} color="white" />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px', lineHeight: 1.25 }}>
          Mil gracias por ser parte<br />de esta familia.
        </h1>

        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 28px', fontWeight: 500 }}>
          Origen — tu iglesia, tu casa, tu familia.
        </p>

        <p style={{
          fontSize: 13.5, color: 'var(--muted)', fontStyle: 'italic',
          lineHeight: 1.8, margin: '0 0 36px',
          padding: '16px 20px',
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          "Cada uno de ustedes ha recibido un don para servir a los demás. Úsenlo bien,
          como buenos administradores de la gracia de Dios en sus diferentes formas."
          <br />
          <span style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--ink-2)' }}>
            — 1 Pedro 4:10 (TPT)
          </span>
        </p>

        <button
          onClick={onNext}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: 'var(--accent, #7c5c3a)', color: 'white',
            border: 'none', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14,
          }}
        >
          Registrar otro voluntario
        </button>

        <button
          onClick={onExit}
          style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function VoluntariosPage() {
  const { permisos } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'voluntarios');
  const isMobile = useIsMobile();

  const { ministerios, reload: reloadMinisterios } = useMinisterios() || {};

  const [voluntarios, setVoluntarios] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const [kiosk,       setKiosk]       = useState(null);
  const [kioskForm,   setKioskForm]   = useState(EMPTY_FORM);
  const [kioskSaving, setKioskSaving] = useState(false);
  const [kioskError,  setKioskError]  = useState('');

  const [search, setSearch] = useState('');

  // ── Estado panel gestión ministerios ───────────────────────────────────
  const [showGestionar,  setShowGestionar]  = useState(false);
  const [nuevoMinNombre, setNuevoMinNombre] = useState('');
  const [creandoMin,     setCreandoMin]     = useState(false);
  const [minMsgErr,      setMinMsgErr]      = useState('');
  const [confirmDelMin,  setConfirmDelMin]  = useState(null);
  const [deletingMin,    setDeletingMin]    = useState(false);
  const [editingMin,     setEditingMin]     = useState(null);
  const [editMinNombre,  setEditMinNombre]  = useState('');
  const [savingMinEdit,  setSavingMinEdit]  = useState(false);

  const fetchVoluntarios = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await voluntariosApi.getAll();
      setVoluntarios(data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cargar voluntarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVoluntarios(); }, [fetchVoluntarios]);

  const openEdit = (v) => {
    setEditId(v.id);
    setForm({
      nombre:      v.nombre      || '',
      cumpleanos:  v.cumpleanos  ? v.cumpleanos.slice(0, 10) : '',
      whatsapp:    v.whatsapp    || '',
      correo:      v.correo      || '',
      ministerio1: v.ministerio1 || '',
      ministerio2: v.ministerio2 || '',
      ministerio3: v.ministerio3 || '',
    });
    setFormErr('');
    setModal(true);
  };
  const closeModal = () => setModal(false);

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.ministerio1) {
      setFormErr('Nombre y Ministerio 1 son obligatorios');
      return;
    }
    setSaving(true); setFormErr('');
    try {
      const { data } = await voluntariosApi.update(editId, form);
      setVoluntarios(prev => prev.map(v => v.id === editId ? data : v));
      closeModal();
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`¿Eliminar a "${v.nombre}"?`)) return;
    try {
      await voluntariosApi.remove(v.id);
      setVoluntarios(prev => prev.filter(x => x.id !== v.id));
    } catch (e) {
      alert(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleKioskSave = async () => {
    if (!kioskForm.nombre.trim() || !kioskForm.ministerio1) {
      setKioskError('Nombre y Ministerio 1 son obligatorios');
      return;
    }
    setKioskSaving(true); setKioskError('');
    try {
      const { data } = await voluntariosApi.create(kioskForm);
      setVoluntarios(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setKiosk('thanks');
    } catch (e) {
      setKioskError(e.response?.data?.error || 'Error al guardar');
    } finally {
      setKioskSaving(false);
    }
  };

  const openKiosk = () => { setKioskForm(EMPTY_FORM); setKioskError(''); setKiosk('form'); };
  const kioskNext = () => { setKioskForm(EMPTY_FORM); setKioskError(''); setKiosk('form'); };

  // ── Handlers gestión ministerios ─────────────────────────────────────────
  const handleCrearMin = async () => {
    if (!nuevoMinNombre.trim()) { setMinMsgErr('El nombre es requerido.'); return; }
    setCreandoMin(true); setMinMsgErr('');
    try {
      await ministeriosApi.crear({ nombre: nuevoMinNombre.trim() });
      await reloadMinisterios();
      setNuevoMinNombre('');
    } catch (err) {
      setMinMsgErr(err?.response?.data?.error || 'Error al crear.');
    } finally {
      setCreandoMin(false);
    }
  };

  const handleActualizarMin = async (id) => {
    if (!editMinNombre.trim()) return;
    setSavingMinEdit(true); setMinMsgErr('');
    try {
      await ministeriosApi.actualizar(id, { nombre: editMinNombre.trim() });
      await reloadMinisterios();
      setEditingMin(null); setEditMinNombre('');
    } catch (err) {
      setMinMsgErr(err?.response?.data?.error || 'Error al renombrar.');
    } finally {
      setSavingMinEdit(false);
    }
  };

  const handleBorrarMin = async (id) => {
    setDeletingMin(true);
    try {
      await ministeriosApi.borrar(id);
      await reloadMinisterios();
      setConfirmDelMin(null);
    } catch {
      // noop
    } finally {
      setDeletingMin(false);
    }
  };

  // ── KPI calculations ─────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = today.getMonth();
  const nextMonth = (thisMonth + 1) % 12;

  // Voluntarios total
  const totalVol = voluntarios.length;

  // Ministerios distintos
  const ministeriosSet = new Set(
    voluntarios.flatMap(v => [v.ministerio1, v.ministerio2, v.ministerio3].filter(Boolean))
  );
  const ministeriosCount = ministeriosSet.size;

  // Cumpleaños: este mes + el próximo
  const bdayEntries = voluntarios
    .filter(v => v.cumpleanos)
    .map(v => {
      const iso = v.cumpleanos.slice(0, 10);
      const d = new Date(iso + 'T00:00:00');
      if (isNaN(d)) return null;
      const m = d.getMonth();
      const day = d.getDate();
      let nextBday = new Date(today.getFullYear(), m, day);
      if (nextBday < today) nextBday = new Date(today.getFullYear() + 1, m, day);
      return { v, month: m, day, nextBday, iso };
    })
    .filter(e => e && (e.month === thisMonth || e.month === nextMonth))
    .sort((a, b) => a.nextBday - b.nextBday);

  const bdayCount     = bdayEntries.length;
  const proximoBday   = bdayEntries[0];
  const bdayFooter    = proximoBday
    ? `${proximoBday.v.nombre.split(' ')[0]} el ${proximoBday.day} de ${MESES_ES[proximoBday.month]}`
    : 'Sin cumpleaños próximos';

  // Jóvenes / Adultos (< 30 / >= 30)
  const conFecha     = voluntarios.filter(v => v.cumpleanos);
  const jovenesCount = conFecha.filter(v => { const a = calcAge(v.cumpleanos.slice(0, 10)); return a !== null && a < 30; }).length;
  const adultosCount = conFecha.filter(v => { const a = calcAge(v.cumpleanos.slice(0, 10)); return a !== null && a >= 30; }).length;
  const ageTotal     = jovenesCount + adultosCount;
  const jovenesPct   = ageTotal > 0 ? Math.round(jovenesCount / ageTotal * 100) : 0;
  const adultosPct   = ageTotal > 0 ? 100 - jovenesPct : 0;

  // Filtered + sorted list (por mes/día de cumpleaños, sin fecha al final)
  const filtered = voluntarios
    .filter(v => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const texto = [v.nombre, v.whatsapp, v.ministerio1, v.ministerio2, v.ministerio3, v.correo]
        .filter(Boolean).join(' ').toLowerCase();
      return texto.includes(q);
    })
    .sort((a, b) => {
      const toMD = iso => {
        if (!iso) return null;
        const d = new Date(iso.slice(0, 10) + 'T00:00:00');
        if (isNaN(d)) return null;
        return d.getMonth() * 100 + d.getDate();
      };
      const ma = toMD(a.cumpleanos);
      const mb = toMD(b.cumpleanos);
      if (ma === null && mb === null) return 0;
      if (ma === null) return 1;
      if (mb === null) return -1;
      return ma - mb;
    });

  // ── KPI card style helpers ───────────────────────────────────────────────
  const kpiCard = {
    background: 'var(--surface)', border: `1px solid ${GRAY_200}`,
    borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
  };
  const kpiLabel = (extra = {}) => ({
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
    color: GRAY_500, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7,
    ...extra,
  });
  const kpiIcon = (bg = NAVY_100, color = NAVY_700) => ({
    width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: bg, color, flexShrink: 0,
  });
  const kpiVal = {
    fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
    color: NAVY, fontVariantNumeric: 'tabular-nums',
  };
  const kpiFootStyle = { marginTop: 9, fontSize: 11.5, color: GRAY_500 };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {kiosk === 'form' && (
        <KioskForm form={kioskForm} setForm={setKioskForm} onSave={handleKioskSave} saving={kioskSaving} error={kioskError} />
      )}
      {kiosk === 'thanks' && (
        <KioskThanks onNext={kioskNext} onExit={() => setKiosk(null)} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: 14 }}>

            {/* Voluntarios */}
            <div style={kpiCard}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
                <div>
                  <div style={kpiLabel({ marginBottom: isMobile ? 3 : 9 })}>
                    <span style={kpiIcon()}><I.users size={15} /></span>
                    Voluntarios
                  </div>
                  {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>{totalVol === 1 ? 'registrado' : 'registrados en el directorio'}</div>}
                </div>
                <div style={{ ...kpiVal, flexShrink: 0 }}>{totalVol}</div>
              </div>
              {!isMobile && <div style={kpiFootStyle}>{totalVol === 1 ? 'registrado' : 'registrados en el directorio'}</div>}
            </div>

            {/* Ministerios */}
            <div style={kpiCard}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
                <div>
                  <div style={kpiLabel({ marginBottom: isMobile ? 3 : 9 })}>
                    <span style={kpiIcon()}><I.pin size={15} /></span>
                    Ministerios
                  </div>
                  {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>áreas distintas activas</div>}
                </div>
                <div style={{ ...kpiVal, flexShrink: 0 }}>{ministeriosCount}</div>
              </div>
              {!isMobile && <div style={kpiFootStyle}>áreas distintas activas</div>}
            </div>

            {/* Cumpleaños */}
            <div style={kpiCard}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
                <div>
                  <div style={kpiLabel({ marginBottom: isMobile ? 3 : 9 })}>
                    <span style={kpiIcon(ORANGE_50, ORANGE_600)}><I.calendar size={15} /></span>
                    Cumpleaños · {MESES_ES[thisMonth]}
                  </div>
                  {isMobile && <div style={{ fontSize: 11.5, color: GRAY_500 }}>{bdayFooter}</div>}
                </div>
                <div style={{ ...kpiVal, flexShrink: 0 }}>{bdayCount}</div>
              </div>
              {!isMobile && <div style={kpiFootStyle}>{bdayFooter}</div>}
            </div>

            {/* Jóvenes / Adultos */}
            <div style={kpiCard}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 8 : 0 }}>
                <div>
                  <div style={kpiLabel({ marginBottom: isMobile ? 3 : 9 })}>
                    <span style={kpiIcon()}><I.users size={15} /></span>
                    Jóvenes / Adultos
                  </div>
                  {isMobile && (
                    <div style={{ fontSize: 11.5, color: GRAY_500 }}>
                      {ageTotal > 0 ? `${jovenesPct}% jóvenes · ${adultosPct}% adultos` : 'sin fechas de nacimiento'}
                    </div>
                  )}
                </div>
                <div style={{ ...kpiVal, display: 'flex', alignItems: 'baseline', gap: 5, flexShrink: 0 }}>
                  {jovenesCount}
                  <span style={{ color: GRAY_300, fontSize: 20, fontWeight: 600 }}>/ {adultosCount}</span>
                </div>
              </div>
              {!isMobile && (
                <div style={kpiFootStyle}>
                  {ageTotal > 0 ? `${jovenesPct}% jóvenes · ${adultosPct}% adultos` : 'sin fechas de nacimiento'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tabla principal ──────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 14 }}>
            <div>
              <h3 className="card-title">Directorio de voluntarios</h3>
              <div className="card-sub">
                {loading ? 'Cargando…' : `${filtered.length} de ${totalVol} voluntario${totalVol !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="card-actions">
              {canWrite && (
                <button
                  className="btn"
                  style={{ border: `1px solid ${GRAY_200}`, background: 'white', color: GRAY_700, fontSize: 13 }}
                  onClick={() => { setShowGestionar(v => !v); setMinMsgErr(''); setConfirmDelMin(null); setEditingMin(null); setNuevoMinNombre(''); }}
                >
                  <I.pin size={13} /> {showGestionar ? 'Cerrar gestión' : 'Gestionar ministerios'}
                </button>
              )}
              {canWrite && (
                <button className="btn btn-primary" onClick={openKiosk}>
                  <I.plus size={14} /> Registrar voluntario
                </button>
              )}
            </div>
          </div>

          {/* ── Panel gestión ministerios ─────────────────────────────────── */}
          {showGestionar && canWrite && (
            <div style={{
              marginBottom: 14, border: `1px solid ${GRAY_200}`,
              borderRadius: 10, padding: '14px 16px',
              background: 'var(--surface)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: GRAY_500, marginBottom: 10 }}>
                Ministerios del campus
              </div>

              {/* Lista existente */}
              {(ministerios?.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                  {ministerios.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {editingMin === m.id ? (
                        <>
                          <input
                            value={editMinNombre}
                            onChange={e => setEditMinNombre(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleActualizarMin(m.id); if (e.key === 'Escape') { setEditingMin(null); setMinMsgErr(''); } }}
                            autoFocus
                            style={{ flex: 1, padding: '5px 9px', borderRadius: 7, border: `1.5px solid ${NAVY_300}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                          />
                          <button
                            onClick={() => handleActualizarMin(m.id)}
                            disabled={savingMinEdit}
                            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: NAVY, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingMinEdit ? 0.6 : 1 }}
                          >
                            {savingMinEdit ? '…' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => { setEditingMin(null); setMinMsgErr(''); }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${GRAY_200}`, background: 'none', fontSize: 12, cursor: 'pointer', color: GRAY_500 }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{m.nombre}</span>
                          {confirmDelMin === m.id ? (
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button
                                onClick={() => handleBorrarMin(m.id)}
                                disabled={deletingMin}
                                style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#D23B36', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: deletingMin ? 0.6 : 1 }}
                              >
                                {deletingMin ? '…' : 'Eliminar'}
                              </button>
                              <button
                                onClick={() => setConfirmDelMin(null)}
                                style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${GRAY_200}`, background: 'none', fontSize: 12, cursor: 'pointer', color: GRAY_500 }}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => { setEditingMin(m.id); setEditMinNombre(m.nombre); setMinMsgErr(''); setConfirmDelMin(null); }}
                                title="Renombrar"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', color: GRAY_500, display: 'flex', alignItems: 'center' }}
                              >
                                <I.edit size={13} />
                              </button>
                              <button
                                onClick={() => { setConfirmDelMin(m.id); setEditingMin(null); }}
                                title="Eliminar (los voluntarios conservan su dato)"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', color: GRAY_500, display: 'flex', alignItems: 'center' }}
                              >
                                <I.trash size={13} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Nuevo ministerio */}
              <div style={{ borderTop: (ministerios?.length > 0) ? `1px solid ${GRAY_200}` : 'none', paddingTop: (ministerios?.length > 0) ? 10 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: GRAY_500, marginBottom: 7 }}>
                  Nuevo ministerio
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Nombre del ministerio"
                    value={nuevoMinNombre}
                    onChange={e => setNuevoMinNombre(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCrearMin(); }}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${GRAY_200}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={handleCrearMin}
                    disabled={creandoMin}
                    className="btn btn-primary"
                    style={{ padding: '7px 14px', fontSize: 13, flexShrink: 0, opacity: creandoMin ? 0.6 : 1 }}
                  >
                    {creandoMin ? '…' : 'Crear'}
                  </button>
                </div>
                {minMsgErr && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5, marginBottom: 0 }}>
                    {minMsgErr}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Toolbar: buscador + chips */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {/* Buscador */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 220 }}>
              <div style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: GRAY_500, pointerEvents: 'none', display: 'flex',
              }}>
                <I.search size={15} />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, ministerio o WhatsApp…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9,
                  border: `1.5px solid ${GRAY_200}`, fontSize: 13,
                  outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box',
                }}
              />
            </div>

          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
          )}

          {/* Tabla */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: GRAY_500 }}>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: GRAY_500 }}>
              {search.trim() ? 'Sin resultados para esta búsqueda' : 'Sin voluntarios registrados'}
            </div>
          ) : isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(v => {
                const iso  = v.cumpleanos ? v.cumpleanos.slice(0, 10) : null;
                const age  = iso ? calcAge(iso) : null;
                const soon = iso ? isSoon(iso) : null;
                const mins = [v.ministerio1, v.ministerio2, v.ministerio3].filter(Boolean);
                return (
                  <div key={v.id} style={{ background: 'var(--surface)', border: `1px solid ${GRAY_200}`, borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: guessGenero(v.nombre) === 'F' ? PURPLE : NAVY_600,
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12,
                      }}>{initials(v.nombre)}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{v.nombre}</div>
                        {age !== null && <div style={{ fontSize: 11, color: GRAY_500 }}>{age} años</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: GRAY_700, marginBottom: 6 }}>
                      {iso ? (
                        <>
                          <span style={{ fontWeight: 600, color: GRAY_500 }}>Cumple: </span>
                          {fmtFecha(iso)}
                          {soon && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: ORANGE_600, background: ORANGE_50, padding: '1px 7px', borderRadius: 5 }}>{soon}</span>}
                        </>
                      ) : null}
                      {v.whatsapp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width={12} height={12} style={{ color: '#25D366', flexShrink: 0 }}>
                            <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm5.5 14.3c-.2.6-1.2 1.1-1.7 1.2-.4 0-.9.1-2.8-.6-2.3-.8-3.8-3.1-3.9-3.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2.1.4 0 .6l-.5.7.5.8c.6.9 1.3 1.5 2.2 1.9.3.1.5.1.7-.1l.5-.7c.2-.2.4-.2.6-.1l1.8.8c.2.1.4.2.4.4-.1.8-.3 1.8-.6 2z"/>
                          </svg>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: GRAY_700 }}>{v.whatsapp}</span>
                        </div>
                      )}
                    </div>
                    {mins.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                        {mins.map((m, i) => (
                          <span key={i} style={{
                            fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap',
                            background: i === 0 ? ORANGE_50 : NAVY_100, color: i === 0 ? ORANGE_600 : NAVY_700,
                          }}>{m}</span>
                        ))}
                      </div>
                    )}
                    {v.correo && <div style={{ fontSize: 12, color: GRAY_700, marginBottom: 8 }}>{v.correo}</div>}
                    {canWrite && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button onClick={() => openEdit(v)} title="Editar" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, borderRadius: 7, border: `1px solid ${GRAY_200}`, background: 'white', color: GRAY_500, cursor: 'pointer', fontSize: 12 }}>
                          <I.edit size={13} /> Editar
                        </button>
                        <button onClick={() => handleDelete(v)} title="Eliminar" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, borderRadius: 7, border: `1px solid ${GRAY_200}`, background: 'white', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>
                          <I.trash size={13} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
          <div className="tbl-wrap" style={{ borderRadius: 10, border: `1px solid ${GRAY_200}` }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cumpleaños</th>
                  <th>WhatsApp</th>
                  <th>Correo</th>
                  <th>Ministerios</th>
                  {canWrite && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                    const iso     = v.cumpleanos ? v.cumpleanos.slice(0, 10) : null;
                    const age     = iso ? calcAge(iso) : null;
                    const soon    = iso ? isSoon(iso) : null;
                    const mins    = [v.ministerio1, v.ministerio2, v.ministerio3].filter(Boolean);

                    return (
                      <tr key={v.id}>
                        {/* Nombre + avatar + edad */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: guessGenero(v.nombre) === 'F' ? PURPLE : NAVY_600,
                              color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 12,
                            }}>
                              {initials(v.nombre)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: NAVY, fontSize: 13.5, lineHeight: 1.3 }}>
                                {v.nombre}
                              </div>
                              {age !== null && (
                                <div style={{ fontSize: 11, color: GRAY_500, marginTop: 1 }}>
                                  {age} años
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cumpleaños + soon badge */}
                        <td>
                          {iso ? (
                            <span style={{ color: GRAY_700, fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>
                              {fmtFecha(iso)}
                              {soon && (
                                <span style={{
                                  display: 'inline-block', marginLeft: 6,
                                  fontSize: 10, fontWeight: 700,
                                  color: ORANGE_600, background: ORANGE_50,
                                  padding: '1px 7px', borderRadius: 5,
                                }}>
                                  {soon}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: GRAY_300 }}>—</span>
                          )}
                        </td>

                        {/* WhatsApp */}
                        <td>
                          {v.whatsapp ? (
                            <span style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: 12, color: GRAY_700,
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                              <svg viewBox="0 0 24 24" fill="currentColor" width={12} height={12} style={{ color: '#25D366', flexShrink: 0 }}>
                                <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm5.5 14.3c-.2.6-1.2 1.1-1.7 1.2-.4 0-.9.1-2.8-.6-2.3-.8-3.8-3.1-3.9-3.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2.1.4 0 .6l-.5.7.5.8c.6.9 1.3 1.5 2.2 1.9.3.1.5.1.7-.1l.5-.7c.2-.2.4-.2.6-.1l1.8.8c.2.1.4.2.4.4-.1.8-.3 1.8-.6 2z"/>
                              </svg>
                              {v.whatsapp}
                            </span>
                          ) : (
                            <span style={{ color: GRAY_300 }}>—</span>
                          )}
                        </td>

                        {/* Correo */}
                        <td>
                          {v.correo
                            ? <span style={{ fontSize: 12, color: GRAY_700, fontWeight: 500 }}>{v.correo}</span>
                            : <span style={{ color: GRAY_300 }}>—</span>
                          }
                        </td>

                        {/* Ministerios */}
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {mins.map((m, i) => (
                              <span key={i} style={{
                                fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                                whiteSpace: 'nowrap',
                                background: i === 0 ? ORANGE_50  : NAVY_100,
                                color:      i === 0 ? ORANGE_600 : NAVY_700,
                              }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Acciones */}
                        {canWrite && (
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => openEdit(v)}
                              title="Editar"
                              style={{
                                width: 30, height: 30, borderRadius: 7, marginRight: 6,
                                border: `1px solid ${GRAY_200}`, background: 'white', color: GRAY_500,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <I.edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(v)}
                              title="Eliminar"
                              style={{
                                width: 30, height: 30, borderRadius: 7,
                                border: `1px solid ${GRAY_200}`, background: 'white', color: 'var(--danger)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <I.trash size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Modal editar */}
        {modal && (
          <VoluntarioModal
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onClose={closeModal}
            saving={saving}
            error={formErr}
          />
        )}
      </div>
    </>
  );
}
