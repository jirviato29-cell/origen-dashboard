import { useState, useEffect } from 'react';
import { calendarioApi, tiposEventoApi } from '../services/api';
import { useCalendarioModal } from '../context/CalendarioModalContext';
import { useTiposEvento } from '../context/TiposEventoContext';
import { useAuth, ROLES } from '../context/AuthContext';
import { puedeRegistrar } from '../permissions';
import { I } from './Icons';

// Fallback list while API loads (never shown once context has data)
const TIPOS_FALLBACK = ['Servicio dominical', 'Especial', 'Reunión de hombres', 'Reunión de mujeres', 'Alpha', 'Alpha Youth', 'Kids', 'Santuario'];

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

const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

export default function GlobalCalendarioModal() {
  const { open, initialDate, editingEvent, lockPuntoEncuentro, closeModal, triggerRefresh } = useCalendarioModal();
  const { tipos, reload: reloadTipos } = useTiposEvento();
  const { permisos, role } = useAuth();
  const canWrite = puedeRegistrar(permisos, 'calendario');
  // El rol Punto de Encuentro también puede gestionar los tipos de evento,
  // aunque no tenga permiso de registrar en calendario.
  const canManageTipos = canWrite || role === ROLES.PUNTO_ENCUENTRO;

  const [form,      setForm]      = useState(() => makeEmpty(null));
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [tieneCosto, setTieneCosto] = useState(false);

  // Gestionar tipos state
  const [showGestionar,  setShowGestionar]  = useState(false);
  const [nuevoNombre,    setNuevoNombre]    = useState('');
  const [nuevoColor,     setNuevoColor]     = useState('#3B82F6');
  const [creandoTipo,    setCreandoTipo]    = useState(false);
  const [tipoMsgErr,     setTipoMsgErr]     = useState('');
  const [confirmDelTipo, setConfirmDelTipo] = useState(null);
  const [deletingTipo,   setDeletingTipo]   = useState(false);

  const isEditing = Boolean(editingEvent);
  const canSave   = form.fecha && form.nombre.trim() && form.tipo;

  const tiposDisp = tipos.length > 0 ? tipos.map(t => t.nombre) : TIPOS_FALLBACK;

  // Initialize form + reload types when modal opens; reset gestionar on close
  useEffect(() => {
    if (open) {
      setSaved(false);
      setError('');
      setShowGestionar(false);
      setNuevoNombre('');
      setNuevoColor('#3B82F6');
      setTipoMsgErr('');
      setConfirmDelTipo(null);
      reloadTipos();
      if (editingEvent) {
        const costoNum = parseFloat(editingEvent.costo) || 0;
        setTieneCosto(costoNum > 0);
        setForm({
          fecha:            (editingEvent.fecha || '').slice(0, 10),
          nombre:           editingEvent.nombre || '',
          tipo:             editingEvent.tipo   || '',
          nota:             editingEvent.nota   || '',
          costo:            costoNum > 0 ? String(editingEvent.costo) : '',
          enPuntoEncuentro: Boolean(editingEvent.en_punto_encuentro),
        });
      } else {
        setTieneCosto(false);
        setForm({ ...makeEmpty(initialDate), enPuntoEncuentro: lockPuntoEncuentro });
      }
    }
  }, [open, initialDate, editingEvent, lockPuntoEncuentro, reloadTipos]);

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

  const handleCrearTipo = async () => {
    if (!nuevoNombre.trim()) { setTipoMsgErr('El nombre es requerido.'); return; }
    setCreandoTipo(true);
    setTipoMsgErr('');
    try {
      await tiposEventoApi.create({ nombre: nuevoNombre.trim(), color: nuevoColor });
      await reloadTipos();
      setForm(f => ({ ...f, tipo: nuevoNombre.trim() }));
      setNuevoNombre('');
      setNuevoColor('#3B82F6');
      setShowGestionar(false);
    } catch (err) {
      setTipoMsgErr(err?.response?.data?.error || 'Error al crear el tipo.');
    } finally {
      setCreandoTipo(false);
    }
  };

  const handleDeleteTipo = async (id) => {
    setDeletingTipo(true);
    try {
      const t = tipos.find(x => x.id === id || String(x.id) === String(id));
      await tiposEventoApi.remove(id);
      await reloadTipos();
      setConfirmDelTipo(null);
      if (t && form.tipo === t.nombre) setForm(f => ({ ...f, tipo: '' }));
    } catch {
      // noop
    } finally {
      setDeletingTipo(false);
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

              {/* Fecha */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  style={inputStyle} />
              </div>

              {/* Nombre */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Nombre</label>
                <input type="text" placeholder="ej. Servicio dominical"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  style={inputStyle} />
              </div>

              {/* Tipo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  style={{ ...inputStyle, background: 'white', color: form.tipo ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer' }}>
                  <option value="" disabled>Seleccionar tipo…</option>
                  {tiposDisp.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                {/* Gestionar tipos — canWrite o rol Punto de Encuentro */}
                {canManageTipos && (
                  <div>
                    <button
                      type="button"
                      onClick={() => { setShowGestionar(v => !v); setTipoMsgErr(''); setConfirmDelTipo(null); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 7, padding: '4px 10px', fontSize: 12,
                        color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <I.plus size={11} /> {showGestionar ? 'Cerrar gestión' : 'Gestionar tipos'}
                    </button>

                    {showGestionar && (
                      <div style={{
                        marginTop: 8, border: '1px solid var(--border)',
                        borderRadius: 10, padding: '12px 14px',
                        background: 'var(--surface)',
                      }}>
                        {/* Lista de tipos existentes */}
                        {tipos.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                            {tipos.map(t => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0, border: '1px solid rgba(0,0,0,.1)' }} />
                                <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{t.nombre}</span>
                                {confirmDelTipo === t.id ? (
                                  <div style={{ display: 'flex', gap: 5 }}>
                                    <button
                                      onClick={() => handleDeleteTipo(t.id)}
                                      disabled={deletingTipo}
                                      style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: '#D23B36', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: deletingTipo ? 0.6 : 1 }}
                                    >
                                      {deletingTipo ? '…' : 'Eliminar'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelTipo(null)}
                                      style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--muted)' }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDelTipo(t.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
                                  >
                                    <I.trash size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Nuevo tipo */}
                        <div style={{ borderTop: tipos.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: tipos.length > 0 ? 10 : 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 7 }}>
                            Nuevo tipo
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Nombre del tipo"
                              value={nuevoNombre}
                              onChange={e => setNuevoNombre(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleCrearTipo(); }}
                              style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-ui)' }}
                            />
                            <input
                              type="color"
                              value={nuevoColor}
                              onChange={e => setNuevoColor(e.target.value)}
                              title="Color del tipo"
                              style={{ width: 36, height: 36, padding: 2, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
                            />
                            <button
                              onClick={handleCrearTipo}
                              disabled={creandoTipo}
                              className="btn btn-primary"
                              style={{ padding: '7px 14px', fontSize: 13, flexShrink: 0, opacity: creandoTipo ? 0.6 : 1 }}
                            >
                              {creandoTipo ? '…' : 'Crear'}
                            </button>
                          </div>
                          {tipoMsgErr && (
                            <p style={{ textAlign: 'left', fontSize: 12, color: 'var(--danger)', marginTop: 5, marginBottom: 0 }}>
                              {tipoMsgErr}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nota */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>
                  Nota
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', marginLeft: 6 }}>(opcional)</span>
                </label>
                <textarea placeholder="Notas adicionales…"
                  value={form.nota}
                  onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
              </div>

              {/* ¿Tiene costo? */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>¿Tiene costo?</label>
                <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                  {[
                    { val: false, label: 'No tiene costo' },
                    { val: true,  label: 'Sí tiene costo' },
                  ].map(opt => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => {
                        setTieneCosto(opt.val);
                        if (!opt.val) setForm(f => ({ ...f, costo: '' }));
                      }}
                      style={{
                        flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                        background: tieneCosto === opt.val ? '#112540' : 'var(--surface)',
                        color: tieneCosto === opt.val ? 'white' : 'var(--ink-2)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {tieneCosto && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.costo}
                    onChange={e => setForm(f => ({ ...f, costo: e.target.value }))}
                    style={{ ...inputStyle, width: '50%' }}
                    autoFocus
                  />
                )}
              </div>

              {/* Checkbox Punto de Encuentro */}
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
