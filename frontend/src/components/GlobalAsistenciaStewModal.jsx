import { useState, useEffect } from 'react';
import { asistenciaApi } from '../services/api';
import { useAsistenciaStewModal } from '../context/AsistenciaStewModalContext';
import { fmtFecha } from '../utils/fecha';
import { I } from './Icons';

function getLastSunday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getDay(); // 0=Dom, 1=Lun...
  const d = new Date(today);
  d.setDate(today.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

const EMPTY = { fecha: '', adultos: '', voluntarios: '', ninos: '', bebes: '', nuevos: '' };

const CAMPOS = [
  { key: 'adultos',     label: 'Adultos',     sub: 'Mayores de 18 años' },
  { key: 'voluntarios', label: 'Voluntarios', sub: 'Servidores activos hoy' },
  { key: 'ninos',       label: 'Niños',       sub: '3 a 12 años · Origen Kids' },
  { key: 'bebes',       label: 'Bebés',       sub: '0 a 2 años' },
  { key: 'nuevos',      label: 'Nuevos',      sub: 'Visitantes nuevos' },
];

export default function GlobalAsistenciaStewModal() {
  const { open, closeModal, triggerRefresh } = useAsistenciaStewModal();

  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const total =
    (Number(form.adultos)     || 0) +
    (Number(form.voluntarios) || 0) +
    (Number(form.ninos)       || 0) +
    (Number(form.bebes)       || 0);

  useEffect(() => {
    if (open) {
      setSaved(false);
      setForm({ ...EMPTY, fecha: getLastSunday() });
    }
  }, [open]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && !saved) closeModal(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [closeModal, saved]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.fecha) return;
    setSaving(true);
    try {
      await asistenciaApi.upsertByFecha({
        fecha:       form.fecha,
        adultos:     Number(form.adultos)     || 0,
        voluntarios: Number(form.voluntarios) || 0,
        ninos:       Number(form.ninos)       || 0,
        bebes:       Number(form.bebes)       || 0,
        nuevos:      Number(form.nuevos)      || 0,
      });
      window.dispatchEvent(new CustomEvent('asistencia-saved'));
      triggerRefresh();
      setSaved(true);
      setTimeout(() => { setSaved(false); closeModal(); }, 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !saved) closeModal(); }}
    >
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-grabber" />

        {saved ? (
          <div className="anf-success">
            <div className="anf-success-icon"><I.check size={36} /></div>
            <h3>¡Registro guardado!</h3>
            <p>Asistencia del {fmtFecha(form.fecha)} registrada correctamente.</p>
            <div className="anf-success-total">
              <span>Total registrado</span>
              <strong>{total}</strong>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Stewardship</div>
                <h3 className="anf-modal-date">Registrar Asistencia</h3>
                <p>Origen Aguascalientes · el total se calcula automáticamente</p>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Fecha */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Fecha
                </label>
                <input
                  type="date"
                  className="input"
                  value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Campos numéricos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {CAMPOS.map(({ key, label, sub }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {label}
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 400, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0, marginTop: 1 }}>
                        {sub}
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      placeholder="0"
                      value={form[key]}
                      onChange={e => set(key, e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-total">
              <span className="lbl">Total asistentes (calculado)</span>
              <span className="val">{total}</span>
            </div>

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={saving || !form.fecha || total === 0}
              style={{ opacity: saving || !form.fecha || total === 0 ? 0.45 : 1 }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : 'Guardar registro'}
            </button>

            {total === 0 && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
                Ingresa al menos una persona para guardar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
