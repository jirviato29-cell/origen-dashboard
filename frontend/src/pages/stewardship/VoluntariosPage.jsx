import { useState, useEffect, useCallback } from 'react';
import { voluntariosApi } from '../../services/api';
import { fmtFecha } from '../../utils/fecha';
import { I } from '../../components/Icons';

// ── Edita esta lista para agregar/quitar ministerios ─────────────────────────
export const MINISTERIOS = [
  'Alabanza',
  'Multimedia / Audio',
  'Bienvenida / Anfitriones',
  'Kids',
  'Jóvenes',
  'Intercesión',
  'Logística',
  'Diáconos',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre: '', cumpleanos: '', whatsapp: '',
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

function optsFor(allMin, exclude1, exclude2) {
  return allMin.filter(m => m !== exclude1 && m !== exclude2);
}

// ─── Selector de ministerio ───────────────────────────────────────────────────
function MinisterioSelect({ label, value, onChange, available, required }) {
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

// ─── Modal Editar ─────────────────────────────────────────────────────────────
function VoluntarioModal({ form, setForm, onSave, onClose, saving, error }) {
  const { ministerio1, ministerio2, ministerio3 } = form;

  const opts1 = optsFor(MINISTERIOS, ministerio2, ministerio3);
  const opts2 = optsFor(MINISTERIOS, ministerio1, ministerio3);
  const opts3 = optsFor(MINISTERIOS, ministerio1, ministerio2);

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

          <MinisterioSelect label="Ministerio 1" value={ministerio1} onChange={v => setForm(p => ({ ...p, ministerio1: v }))} available={opts1} required />
          <MinisterioSelect label="Ministerio 2" value={ministerio2} onChange={v => setForm(p => ({ ...p, ministerio2: v }))} available={opts2} />
          <MinisterioSelect label="Ministerio 3" value={ministerio3} onChange={v => setForm(p => ({ ...p, ministerio3: v }))} available={opts3} />
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

// ─── Kiosco: pantalla de formulario ──────────────────────────────────────────
function KioskForm({ form, setForm, onSave, saving, error }) {
  const { ministerio1, ministerio2, ministerio3 } = form;
  const opts1 = optsFor(MINISTERIOS, ministerio2, ministerio3);
  const opts2 = optsFor(MINISTERIOS, ministerio1, ministerio3);
  const opts3 = optsFor(MINISTERIOS, ministerio1, ministerio2);
  const canSave = form.nombre.trim() && form.ministerio1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--surface, #faf9f7)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--accent, #7c5c3a)',
            marginBottom: 10,
          }}>
            Origen Aguascalientes
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>
            Únete al equipo de voluntarios
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Llena tus datos y te contactamos pronto.
          </p>
        </div>

        {/* Tarjeta del formulario */}
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

          <MinisterioSelect label="Ministerio 1" value={ministerio1} onChange={v => setForm(p => ({ ...p, ministerio1: v }))} available={opts1} required />
          <MinisterioSelect label="Ministerio 2" value={ministerio2} onChange={v => setForm(p => ({ ...p, ministerio2: v }))} available={opts2} />
          <MinisterioSelect label="Ministerio 3" value={ministerio3} onChange={v => setForm(p => ({ ...p, ministerio3: v }))} available={opts3} />
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
          {saving ? (
            'Guardando…'
          ) : (
            <><I.check size={18} /> Guardar</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Kiosco: pantalla de agradecimiento ──────────────────────────────────────
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

        {/* Icono */}
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function VoluntariosPage() {
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // Admin modal (solo editar)
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  // Kiosco
  const [kiosk,        setKiosk]        = useState(null); // null | 'form' | 'thanks'
  const [kioskForm,    setKioskForm]    = useState(EMPTY_FORM);
  const [kioskSaving,  setKioskSaving]  = useState(false);
  const [kioskError,   setKioskError]   = useState('');

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

  // ── Admin: abrir edición ──────────────────────────────────────────────────
  const openEdit = (v) => {
    setEditId(v.id);
    setForm({
      nombre:      v.nombre      || '',
      cumpleanos:  v.cumpleanos  ? v.cumpleanos.slice(0, 10) : '',
      whatsapp:    v.whatsapp    || '',
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

  // ── Kiosco: guardar ───────────────────────────────────────────────────────
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

  const openKiosk = () => {
    setKioskForm(EMPTY_FORM);
    setKioskError('');
    setKiosk('form');
  };

  const kioskNext = () => {
    setKioskForm(EMPTY_FORM);
    setKioskError('');
    setKiosk('form');
  };

  return (
    <>
      {/* ── Kiosco (superpone todo) ─────────────────────────────────────── */}
      {kiosk === 'form' && (
        <KioskForm
          form={kioskForm}
          setForm={setKioskForm}
          onSave={handleKioskSave}
          saving={kioskSaving}
          error={kioskError}
        />
      )}
      {kiosk === 'thanks' && (
        <KioskThanks
          onNext={kioskNext}
          onExit={() => setKiosk(null)}
        />
      )}

      {/* ── Vista de administración ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Directorio de voluntarios</h3>
              <div className="card-sub">
                {loading ? 'Cargando…' : `${voluntarios.length} voluntario${voluntarios.length !== 1 ? 's' : ''} registrado${voluntarios.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="card-actions">
              <button className="btn btn-primary" onClick={openKiosk}>
                <I.plus size={14} /> Registrar voluntario
              </button>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--danger)', margin: '8px 0 0' }}>{error}</p>
          )}

          {/* Tabla */}
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginTop: 8 }}>
            <table className="table anf-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cumpleaños</th>
                  <th>WhatsApp</th>
                  <th>Ministerios</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Cargando…</td></tr>
                ) : voluntarios.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sin voluntarios registrados</td></tr>
                ) : (
                  voluntarios.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600, fontSize: 14 }}>{v.nombre}</td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {v.cumpleanos ? fmtFecha(v.cumpleanos) : '—'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>{v.whatsapp || '—'}</td>
                      <td style={{ fontSize: 13 }}>
                        {[v.ministerio1, v.ministerio2, v.ministerio3].filter(Boolean).map((m, i) => (
                          <span key={i} style={{
                            display: 'inline-block', marginRight: 6, marginBottom: 2,
                            fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            color: 'var(--ink-2)',
                          }}>{m}</span>
                        ))}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="icon-btn" onClick={() => openEdit(v)} title="Editar"
                          style={{ width: 28, height: 28, marginRight: 4 }}>
                          <I.edit size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => handleDelete(v)} title="Eliminar"
                          style={{ width: 28, height: 28, color: 'var(--danger)' }}>
                          <I.trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
