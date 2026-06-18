import { useState, useEffect } from 'react';
import { calendarioApi } from '../services/api';
import { useCalendarioModal } from '../context/CalendarioModalContext';
import { I } from './Icons';

const TIPOS = ['Servicio dominical', 'Especial', 'Reunión de hombres', 'Reunión de mujeres', 'Alpha', 'Alpha Youth', 'Kids', 'Santuario'];

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatDateLong(iso) {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

const makeEmpty = (date) => ({ fecha: date || todayISO(), nombre: '', tipo: '', nota: '', costo: '', enPuntoEncuentro: false });

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
};

export default function GlobalCalendarioModal() {
  const { open, initialDate, editingEvent, lockPuntoEncuentro, closeModal, triggerRefresh } = useCalendarioModal();

  const [form,      setForm]      = useState(() => makeEmpty(null));
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [savedData, setSavedData] = useState(null);

  const isEditing = Boolean(editingEvent);
  const canSave = form.fecha && form.nombre.trim() && form.tipo;

  useEffect(() => {
    if (open) {
      setSaved(false);
      setError('');
      if (editingEvent) {
        setForm({
          fecha:             (editingEvent.fecha || '').slice(0, 10),
          nombre:            editingEvent.nombre || '',
          tipo:              editingEvent.tipo   || '',
          nota:              editingEvent.nota   || '',
          costo:             editingEvent.costo != null ? String(editingEvent.costo) : '',
          enPuntoEncuentro:  Boolean(editingEvent.en_punto_encuentro),
        });
      } else {
        setForm({ ...makeEmpty(initialDate), enPuntoEncuentro: lockPuntoEncuentro });
      }
    }
  }, [open, initialDate, editingEvent, lockPuntoEncuentro]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !saved) closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal, saved]);

  const handleSave = async () => {
    if (!form.fecha)         { setError('La fecha es requerida.'); return; }
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return; }
    if (!form.tipo)          { setError('Selecciona un tipo.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        fecha:              form.fecha,
        nombre:             form.nombre.trim(),
        tipo:               form.tipo,
        nota:               form.nota.trim() || null,
        costo:              form.costo ? parseFloat(form.costo) : 0,
        en_punto_encuentro: form.enPuntoEncuentro,
      };
      if (isEditing) {
        await calendarioApi.update(editingEvent.id, payload);
      } else {
        await calendarioApi.create(payload);
      }
      setSavedData({ fecha: form.fecha, nombre: form.nombre.trim(), tipo: form.tipo });
      setSaved(true);
      triggerRefresh();
      setTimeout(() => { setSaved(false); closeModal(); }, 2200);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar. Inténtalo de nuevo.');
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
            <h3>{isEditing ? '¡Evento actualizado!' : '¡Evento registrado!'}</h3>
            <p>{formatDateLong(savedData.fecha)}</p>
            <div className="anf-success-total">
              <span>{savedData.nombre}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
              {savedData.tipo}
            </div>
          </div>
        ) : (
          <>
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Stewardship · Calendario</div>
                <h3 className="anf-modal-date">{isEditing ? 'Editar evento' : 'Registrar evento'}</h3>
                <p>Origen Aguascalientes</p>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha</label>
                <input type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre</label>
                <input type="text" placeholder="ej. Servicio dominical"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
                <select value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  style={{ ...inputStyle, background: 'white', color: form.tipo ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer' }}>
                  <option value="" disabled>Seleccionar tipo…</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Nota
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>
                <textarea placeholder="Notas adicionales…"
                  value={form.nota}
                  onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Costo del evento
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.costo}
                  onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
                  style={{ ...inputStyle, width: '50%' }}
                />
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: form.enPuntoEncuentro ? 'rgba(0,180,216,0.07)' : 'var(--surface)',
                border: `1.5px solid ${form.enPuntoEncuentro ? 'var(--chart-primary)' : 'var(--border)'}`,
                cursor: lockPuntoEncuentro ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: lockPuntoEncuentro ? 0.75 : 1,
              }}>
                <input
                  type="checkbox"
                  checked={form.enPuntoEncuentro}
                  disabled={lockPuntoEncuentro}
                  onChange={lockPuntoEncuentro ? undefined : e => setForm(f => ({ ...f, enPuntoEncuentro: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: lockPuntoEncuentro ? 'default' : 'pointer', accentColor: 'var(--chart-primary)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                    Mandar a Punto de Encuentro
                    {lockPuntoEncuentro && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginLeft: 6 }}>(fijo)</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    El evento aparecerá también en la vista de Punto de Encuentro
                  </div>
                </div>
              </label>

            </div>

            {error && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>
                {error}
              </p>
            )}

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={saving || !canSave}
              style={{ opacity: (saving || !canSave) ? 0.45 : 1, marginTop: 4 }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : isEditing ? 'Actualizar evento' : 'Guardar evento'}
            </button>

            {!canSave && !error && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
                Completa todos los campos para guardar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
