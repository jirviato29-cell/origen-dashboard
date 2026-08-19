import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi } from '../services/api';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { toISODate } from '../utils/fecha';
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

function toISODateLocal(d) { return d.toISOString().slice(0, 10); }

function formatDateLong(date) {
  return date
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

// ─── Counter rows config ──────────────────────────────────────────────────────
// Cada categoría lleva un contador por género. Los registros viejos no tienen
// desglose: su total plano se conserva hasta que se capture (ver `base`).

const CAMPOS = [
  { key: 'adultos',     label: 'Adultos',     sub: 'Mayores de 18 años',              icon: I.users, color: 'var(--chart-primary)',  bg: 'rgba(0,180,216,0.10)', h: 'Hombres', m: 'Mujeres' },
  { key: 'voluntarios', label: 'Voluntarios', sub: 'Servidores activos hoy',           icon: I.hand,  color: 'var(--ink)',            bg: 'var(--surface-3)',     h: 'Hombres', m: 'Mujeres' },
  { key: 'ninos',       label: 'Niños',       sub: '3 a 12 años · Origen Kids',        icon: I.child, color: 'var(--chart-secondary)', bg: 'rgba(255,107,43,0.10)', h: 'Niños',  m: 'Niñas'   },
  { key: 'bebes',       label: 'Bebés',       sub: '0 a 2 años · Cuna y gateadores',  icon: I.baby,  color: 'var(--muted)',           bg: 'var(--surface-3)',     h: 'Niños',  m: 'Niñas'   },
  { key: 'nuevos',      label: 'Nuevos',      sub: 'Solo Pastor / Líder puede editar', icon: I.heart, color: 'var(--warn)',            bg: 'rgba(202,138,4,0.10)', h: 'Hombres', m: 'Mujeres', locked: true },
];

// Categorías que suman al total: los nuevos NO, ya vienen contados en adultos.
const CAMPOS_DEL_TOTAL = ['adultos', 'voluntarios', 'ninos', 'bebes'];

const EMPTY_FORM = CAMPOS.reduce(
  (acc, { key }) => ({ ...acc, [`${key}_h`]: 0, [`${key}_m`]: 0 }), {}
);
const CERO   = CAMPOS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }),     {});
const NINGUNO = CAMPOS.reduce((acc, { key }) => ({ ...acc, [key]: false }), {});

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function GlobalAsistenciaModal() {
  const { open, closeModal } = useRegistrarModal();

  const sunday     = getTargetSunday();
  const fechaISO   = toISODateLocal(sunday);
  const fechaLabel = formatDateLong(sunday);

  const [form, setForm]       = useState(EMPTY_FORM);
  // Totales planos del registro ya guardado, para no perderlos si se guarda
  // sin capturar el desglose de esa categoría.
  const [base, setBase]       = useState(CERO);
  // Categorías con desglose: las que ya venían desglosadas o las que se tocaron.
  const [desglosado, setDesglosado] = useState(NINGUNO);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);

  const subtotal = (key) => (
    desglosado[key] ? form[`${key}_h`] + form[`${key}_m`] : (base[key] || 0)
  );
  const total = CAMPOS_DEL_TOTAL.reduce((acc, key) => acc + subtotal(key), 0);

  const set = (key, genero, v) => {
    setForm(f => ({ ...f, [`${key}_${genero}`]: Math.max(0, v) }));
    setDesglosado(d => ({ ...d, [key]: true }));
  };

  const loadExisting = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ limit: 20 });
      const found = data.find(r => toISODate(r.fecha) === fechaISO);
      if (!found) {
        setForm(EMPTY_FORM); setBase(CERO); setDesglosado(NINGUNO);
        return;
      }
      setForm(CAMPOS.reduce((acc, { key }) => ({
        ...acc,
        [`${key}_h`]: found[`${key}_h`] || 0,
        [`${key}_m`]: found[`${key}_m`] || 0,
      }), {}));
      setBase(CAMPOS.reduce((acc, { key }) => ({ ...acc, [key]: found[key] || 0 }), {}));
      setDesglosado(CAMPOS.reduce((acc, { key }) => ({
        ...acc,
        [key]: found[`${key}_h`] != null || found[`${key}_m`] != null,
      }), {}));
    } catch {
      setForm(EMPTY_FORM); setBase(CERO); setDesglosado(NINGUNO);
    }
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
      // Por categoría: el desglose capturado, o el total previo tal cual para
      // no borrar lo que ya estaba registrado.
      const body = CAMPOS.reduce((acc, { key }) => (
        desglosado[key]
          ? { ...acc, [`${key}_h`]: form[`${key}_h`], [`${key}_m`]: form[`${key}_m`] }
          : { ...acc, [key]: base[key] || 0 }
      ), { fecha: fechaISO, evento_id: null });

      await asistenciaApi.upsertByFecha(body);
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

            {/* Counter rows — un contador por género */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CAMPOS.map(campo => {
                const Ic = campo.icon;
                return (
                  <div
                    key={campo.key}
                    className={`counter-row${campo.locked ? ' locked' : ''}`}
                    /* Con dos contadores la fila ya no cabe en móvil: que baje
                       en vez de desbordarse. En pantallas anchas no envuelve. */
                    style={{ flexWrap: 'wrap', rowGap: 10 }}
                  >
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
                        <div className="counter-sub" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                          Total {subtotal(campo.key)}
                        </div>
                      </div>
                    </div>
                    <div className="counter-controls" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      {[{ genero: 'h', etiqueta: campo.h }, { genero: 'm', etiqueta: campo.m }].map(({ genero, etiqueta }) => (
                        <div key={genero} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', minWidth: 52, textAlign: 'right' }}>
                            {etiqueta}
                          </span>
                          <button
                            className="cbtn"
                            disabled={campo.locked || saving}
                            onClick={() => set(campo.key, genero, form[`${campo.key}_${genero}`] - 1)}
                            onMouseDown={e => e.preventDefault()}
                            aria-label={`Restar ${etiqueta.toLowerCase()} en ${campo.label.toLowerCase()}`}
                          >
                            <I.minus size={18} />
                          </button>
                          <div className="counter-num">{form[`${campo.key}_${genero}`]}</div>
                          <button
                            className="cbtn plus"
                            disabled={campo.locked || saving}
                            onClick={() => set(campo.key, genero, form[`${campo.key}_${genero}`] + 1)}
                            onMouseDown={e => e.preventDefault()}
                            aria-label={`Sumar ${etiqueta.toLowerCase()} en ${campo.label.toLowerCase()}`}
                          >
                            <I.plus size={18} />
                          </button>
                        </div>
                      ))}
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
