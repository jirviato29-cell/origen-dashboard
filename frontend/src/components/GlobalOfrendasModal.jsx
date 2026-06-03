import { useState, useEffect, useCallback } from 'react';
import { asistenciaApi, ofrendasApi } from '../services/api';
import { useOfrendasModal } from '../context/OfrendasModalContext';
import { I } from './Icons';

function getLastSunday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysBack = today.getDay() === 0 ? 0 : today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - daysBack);
  return sunday;
}

function toISODate(d) { return d.toISOString().slice(0, 10); }

function formatDateLong(date) {
  return date
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

const EMPTY = { efectivo: '', tarjeta: '', cantidad: '' };

export default function GlobalOfrendasModal() {
  const { open, closeModal } = useOfrendasModal();

  const sunday     = getLastSunday();
  const fechaISO   = toISODate(sunday);
  const fechaLabel = formatDateLong(sunday);

  const [form, setForm]           = useState(EMPTY);
  const [asistentes, setAsistentes] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [savedData, setSavedData] = useState(null);

  const efectivo  = parseFloat(form.efectivo)  || 0;
  const tarjeta   = parseFloat(form.tarjeta)   || 0;
  const cantidad  = parseInt(form.cantidad, 10) || 0;
  const total     = efectivo + tarjeta;
  const participacion = asistentes && asistentes > 0 && cantidad > 0
    ? ((cantidad / asistentes) * 100).toFixed(1)
    : null;

  const loadAsistencia = useCallback(async () => {
    try {
      const { data } = await asistenciaApi.getAll({ limit: 200 });
      const record = data.find(r => r.fecha === fechaISO);
      if (record) {
        const tot = (record.adultos || 0) + (record.voluntarios || 0) +
                    (record.ninos || 0) + (record.bebes || 0);
        setAsistentes(tot);
      } else {
        // Use most recent record as fallback
        const sorted = [...data].sort((a, b) => b.fecha.localeCompare(a.fecha));
        if (sorted.length > 0) {
          const r = sorted[0];
          const tot = (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
          setAsistentes(tot);
        } else {
          setAsistentes(null);
        }
      }
    } catch {
      setAsistentes(null);
    }
  }, [fechaISO]);

  useEffect(() => {
    if (open) { setSaved(false); setForm(EMPTY); loadAsistencia(); }
  }, [open, loadAsistencia]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !saved) closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal, saved]);

  const handleSave = async () => {
    if (total <= 0) return;
    setSaving(true);
    try {
      await ofrendasApi.create({
        fecha:         fechaISO,
        efectivo:      efectivo,
        terminal:      tarjeta,
        total_ofrenda: total,
        ofrendas:      cantidad,
        participacion: participacion ? parseFloat(participacion) : 0,
        ofrenda_especial: 0,
      });
      setSavedData({ total, efectivo, tarjeta, cantidad, participacion });
      setSaved(true);
      setTimeout(() => { setSaved(false); closeModal(); }, 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !saved) closeModal(); }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>

        <div className="modal-grabber" />

        {saved ? (
          <div className="anf-success">
            <div className="anf-success-icon"><I.check size={36} /></div>
            <h3>¡Ofrenda registrada!</h3>
            <p>Registro del {fechaLabel} guardado correctamente.</p>
            <div className="anf-success-total">
              <span>Total registrado</span>
              <strong>${savedData?.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            </div>
            {savedData?.participacion && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
                {savedData.cantidad} ofrendantes · {savedData.participacion}% de participación
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Último servicio dominical</div>
                <h3 className="anf-modal-date">{fechaLabel}</h3>
                <p>Registra las ofrendas y diezmos · Origen Aguascalientes</p>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Efectivo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Efectivo
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.efectivo}
                    onChange={e => setForm(f => ({ ...f, efectivo: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px 10px 26px', borderRadius: 10,
                      border: '1.5px solid var(--border)', fontSize: 16, fontFamily: 'var(--font-mono)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Tarjeta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Tarjeta / Terminal
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.tarjeta}
                    onChange={e => setForm(f => ({ ...f, tarjeta: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px 10px 26px', borderRadius: 10,
                      border: '1.5px solid var(--border)', fontSize: 16, fontFamily: 'var(--font-mono)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Total automático */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: 'var(--black)', border: '1.5px solid var(--black)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'white' }}>
                  ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Cantidad de ofrendas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Cantidad de ofrendas
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>
                    personas / sobres
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid var(--border)', fontSize: 16, fontFamily: 'var(--font-mono)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Participación */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 10, background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Participación</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {asistentes !== null ? `${asistentes} asistentes registrados` : 'Sin datos de asistencia'}
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: participacion ? 'var(--good)' : 'var(--muted)' }}>
                  {participacion ? `${participacion}%` : '—'}
                </div>
              </div>
            </div>

            <div className="modal-total" style={{ marginTop: 4 }}>
              <span className="lbl">Total en tiempo real</span>
              <span className="val">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={saving || total <= 0}
              style={{ opacity: (saving || total <= 0) ? 0.45 : 1 }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : 'Guardar registro'}
            </button>

            {total <= 0 && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
                Ingresa al menos un monto para guardar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
