import { useState, useEffect } from 'react';
import { asistenciaApi } from '../services/api';
import { useAsistenciaStewModal } from '../context/AsistenciaStewModalContext';
import { fmtFecha } from '../utils/fecha';
import { I } from './Icons';

function getLastSunday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getDay();
  const d = new Date(today);
  d.setDate(today.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

// Cada categoría se captura desglosada por género. Los registros viejos no
// tienen desglose: en ese caso se conserva su total plano (ver `base`).
const CAMPOS = [
  { key: 'adultos',     label: 'Adultos',     sub: 'Mayores de 18 años',       h: 'Hombres', m: 'Mujeres' },
  { key: 'voluntarios', label: 'Voluntarios', sub: 'Servidores activos hoy',   h: 'Hombres', m: 'Mujeres' },
  { key: 'ninos',       label: 'Niños',       sub: '3 a 12 años · Origen Kids', h: 'Niños',  m: 'Niñas'   },
  { key: 'bebes',       label: 'Bebés',       sub: '0 a 2 años',                h: 'Niños',  m: 'Niñas'   },
  { key: 'nuevos',      label: 'Nuevos',      sub: 'Visitantes nuevos',        h: 'Hombres', m: 'Mujeres' },
];

// Categorías que suman al total: los nuevos NO, ya vienen contados en adultos.
const CAMPOS_DEL_TOTAL = ['adultos', 'voluntarios', 'ninos', 'bebes'];

const EMPTY = CAMPOS.reduce(
  (acc, { key }) => ({ ...acc, [`${key}_h`]: '', [`${key}_m`]: '' }),
  { fecha: '' }
);
const BASE_CERO = CAMPOS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {});

export default function GlobalAsistenciaStewModal() {
  const { open, closeModal, record, triggerRefresh } = useAsistenciaStewModal();
  const isEdit = !!record?.id;

  const [form, setForm]     = useState(EMPTY);
  // Totales planos del registro cargado. Sirven para NO perderlos si se edita
  // un registro viejo (sin desglose) y se guarda sin capturar hombres/mujeres.
  const [base, setBase]     = useState(BASE_CERO);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Una categoría está desglosada en el form si se escribió hombres o mujeres.
  const tieneDesglose = (key) => form[`${key}_h`] !== '' || form[`${key}_m`] !== '';

  // Subtotal de la fila: el desglose capturado o, si no hay, el total previo.
  const subtotal = (key) => (
    tieneDesglose(key)
      ? (Number(form[`${key}_h`]) || 0) + (Number(form[`${key}_m`]) || 0)
      : (Number(base[key]) || 0)
  );

  const total = CAMPOS_DEL_TOTAL.reduce((acc, key) => acc + subtotal(key), 0);

  // El registro que se edita no traía desglose en ninguna categoría.
  const sinDesglosePrevio = isEdit && CAMPOS.every(
    ({ key }) => record[`${key}_h`] == null && record[`${key}_m`] == null
  );

  useEffect(() => {
    if (open) {
      setSaved(false);
      // Solo poblamos el form cuando es un registro real (tiene id). Así, si por
      // error llega algo que no es un registro (p. ej. un evento de click), no
      // intentamos hacer .slice sobre una fecha undefined y NO truena.
      if (record?.id) {
        setForm(CAMPOS.reduce((acc, { key }) => ({
          ...acc,
          [`${key}_h`]: record[`${key}_h`] == null ? '' : String(record[`${key}_h`]),
          [`${key}_m`]: record[`${key}_m`] == null ? '' : String(record[`${key}_m`]),
        }), { fecha: (record.fecha || '').slice(0, 10) }));
        setBase(CAMPOS.reduce((acc, { key }) => ({ ...acc, [key]: record[key] ?? 0 }), {}));
      } else {
        setForm({ ...EMPTY, fecha: getLastSunday() });
        setBase(BASE_CERO);
      }
    }
  }, [open, record]);

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
      // Por categoría: si se capturó desglose se manda (el backend calcula el
      // total desde ahí); si no, se manda el total previo tal cual para no
      // borrar lo que ya estaba registrado.
      const body = CAMPOS.reduce((acc, { key }) => (
        tieneDesglose(key)
          ? { ...acc, [`${key}_h`]: Number(form[`${key}_h`]) || 0,
                      [`${key}_m`]: Number(form[`${key}_m`]) || 0 }
          : { ...acc, [key]: Number(base[key]) || 0 }
      ), { fecha: form.fecha });

      if (isEdit) {
        await asistenciaApi.update(record.id, body);
      } else {
        await asistenciaApi.upsertByFecha(body);
        window.dispatchEvent(new CustomEvent('asistencia-saved'));
      }
      triggerRefresh();
      setSaved(true);
      setTimeout(() => { setSaved(false); closeModal(); }, 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const labelCategoria = {
    display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5,
  };
  const labelGenero = {
    display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--muted)',
    marginBottom: 3,
  };

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
            <h3>{isEdit ? '¡Asistencia actualizada!' : '¡Registro guardado!'}</h3>
            <p>Asistencia del {fmtFecha(form.fecha)} {isEdit ? 'actualizada' : 'registrada'} correctamente.</p>
            <div className="anf-success-total">
              <span>Total registrado</span>
              <strong>{total}</strong>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">{isEdit ? 'Editando registro' : 'Stewardship'}</div>
                <h3 className="anf-modal-date">{isEdit ? 'Editar asistencia' : 'Registrar Asistencia'}</h3>
                <p>{isEdit ? `Registro del ${fmtFecha(record.fecha)}` : 'Origen · el total se calcula automáticamente'}</p>
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

              {sinDesglosePrevio && (
                <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                  Este registro se capturó sin desglose por género. Si dejas hombres y
                  mujeres vacíos, se conservan los totales actuales.
                </p>
              )}

              {/* Campos por categoría: hombres, mujeres y subtotal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CAMPOS.map(({ key, label, sub, h, m }) => (
                  <div key={key}>
                    <label style={labelCategoria}>
                      {label}
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 400, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0, marginTop: 1 }}>
                        {sub}
                      </span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 52px', gap: 8, alignItems: 'end' }}>
                      <div>
                        <span style={labelGenero}>{h}</span>
                        <input
                          type="number"
                          className="input"
                          min="0"
                          placeholder="0"
                          value={form[`${key}_h`]}
                          onChange={e => set(`${key}_h`, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <span style={labelGenero}>{m}</span>
                        <input
                          type="number"
                          className="input"
                          min="0"
                          placeholder="0"
                          value={form[`${key}_m`]}
                          onChange={e => set(`${key}_m`, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{
                        fontSize: 15, fontWeight: 700, color: 'var(--ink)', textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums', paddingBottom: 10,
                      }}>
                        = {subtotal(key)}
                      </div>
                    </div>
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
              {saving ? 'Guardando…' : isEdit ? 'Actualizar registro' : 'Guardar registro'}
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
