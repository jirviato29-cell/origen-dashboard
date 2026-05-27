import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../services/api';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { I } from './Icons';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTargetSunday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getDay() === 0 ? 0 : 7 - today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  return sunday;
}

function toISODate(d) { return d.toISOString().slice(0, 10); }

function formatDateLong(date) {
  return date
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

// ─── Counter rows config ──────────────────────────────────────────────────────

const CAMPOS = [
  { key: 'adultos',     label: 'Adultos',     sub: 'Mayores de 18 años',              icon: I.users, color: 'var(--chart-primary)',  bg: 'rgba(0,180,216,0.10)' },
  { key: 'voluntarios', label: 'Voluntarios', sub: 'Servidores activos hoy',           icon: I.hand,  color: 'var(--ink)',            bg: 'var(--surface-3)' },
  { key: 'ninos',       label: 'Niños',       sub: '3 a 12 años · Origen Kids',        icon: I.child, color: 'var(--chart-secondary)', bg: 'rgba(255,107,43,0.10)' },
  { key: 'bebes',       label: 'Bebés',       sub: '0 a 2 años · Cuna y gateadores',  icon: I.baby,  color: 'var(--muted)',           bg: 'var(--surface-3)' },
  { key: 'nuevos',      label: 'Nuevos',      sub: 'Solo Pastor / Líder puede editar', icon: I.heart, color: 'var(--warn)',            bg: 'rgba(202,138,4,0.10)', locked: true },
];

const EMPTY_FORM = { adultos: 0, voluntarios: 0, ninos: 0, bebes: 0, nuevos: 0 };

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function GlobalAsistenciaModal() {
  const { open, closeModal } = useRegistrarModal();

  const sunday     = getTargetSunday();
  const fechaISO   = toISODate(sunday);
  const fechaLabel = formatDateLong(sunday);

  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);

  const total = form.adultos + form.voluntarios + form.ninos + form.bebes;
  const set   = (key, v) => setForm(f => ({ ...f, [key]: Math.max(0, v) }));

  const loadExisting = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ limit: 20 });
      const found = data.find(r => r.fecha === fechaISO);
      setForm(found
        ? { adultos: found.adultos || 0, voluntarios: found.voluntarios || 0,
            ninos: found.ninos || 0, bebes: found.bebes || 0, nuevos: found.nuevos || 0 }
        : EMPTY_FORM
      );
    } catch { setForm(EMPTY_FORM); }
  }, [fechaISO]);

  useEffect(() => {
    if (open) { setSaved(false); loadExisting(); }
  }, [open, loadExisting]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !saved) closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal, saved]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await asistenciaApi.upsertByFecha({ ...form, fecha: fechaISO, evento_id: null });
      window.dispatchEvent(new CustomEvent('asistencia-saved'));
      setSavedTotal(total);
      setSaved(true);
      setTimeout(() => { setSaved(false); closeModal(); }, 2200);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !saved) closeModal(); }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>

        <div className="modal-grabber" />

        {/* ── Success screen ── */}
        {saved ? (
          <div className="anf-success">
            <div className="anf-success-icon"><I.check size={36} /></div>
            <h3>¡Registro guardado!</h3>
            <p>Asistencia del {fechaLabel} registrada correctamente.</p>
            <div className="anf-success-total">
              <span>Total registrado</span>
              <strong>{savedTotal}</strong>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Próximo servicio</div>
                <h3 className="anf-modal-date">{fechaLabel}</h3>
                <p>Registra la asistencia por categoría · Origen Aguascalientes</p>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            {/* Counter rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CAMPOS.map(campo => {
                const Ic = campo.icon;
                return (
                  <div key={campo.key} className={`counter-row${campo.locked ? ' locked' : ''}`}>
                    <div className="counter-meta">
                      <div className="counter-icon" style={{ color: campo.color, background: campo.bg }}>
                        <Ic size={18} />
                      </div>
                      <div>
                        <div className="counter-name">
                          {campo.label}
                          {campo.locked && <span className="lock-badge">🔒 Bloqueado</span>}
                        </div>
                        <div className="counter-sub">{campo.sub}</div>
                      </div>
                    </div>
                    <div className="counter-controls">
                      <button
                        className="cbtn"
                        disabled={campo.locked || saving}
                        onClick={() => set(campo.key, form[campo.key] - 1)}
                        onMouseDown={e => e.preventDefault()}
                        aria-label="Restar"
                      >
                        <I.minus size={18} />
                      </button>
                      <div className="counter-num">{form[campo.key]}</div>
                      <button
                        className="cbtn plus"
                        disabled={campo.locked || saving}
                        onClick={() => set(campo.key, form[campo.key] + 1)}
                        onMouseDown={e => e.preventDefault()}
                        aria-label="Sumar"
                      >
                        <I.plus size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live total */}
            <div className="modal-total">
              <span className="lbl">Total en tiempo real</span>
              <span className="val">{total}</span>
            </div>

            {/* Save button */}
            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={saving || total === 0}
              style={{ opacity: (saving || total === 0) ? 0.45 : 1 }}
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
