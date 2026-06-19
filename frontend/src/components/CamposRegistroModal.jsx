import { useState, useEffect } from 'react';
import { camposPersonalizadosApi } from '../services/api';
import { I } from './Icons';

const NAVY     = '#112540';
const NAVY_700 = '#244169';
const NAVY_100 = '#DCE4EF';
const RED      = '#D23B36';
const GREEN    = '#15915A';
const GRAY_50  = '#F6F7F9';
const GRAY_100 = '#EEF1F5';
const GRAY_200 = '#E2E6EC';
const GRAY_500 = '#7A8699';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
};

const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

// ── Módulo-level: referencia estable entre renders del padre ─────────────────
function TipoBadge({ tipo }) {
  const map = {
    texto:    { label: 'Texto',    color: NAVY_700,  bg: NAVY_100 },
    numero:   { label: 'Número',   color: '#6B4226', bg: '#FDE8D0' },
    opciones: { label: 'Opciones', color: '#1A5C38', bg: '#D4EDDA' },
  };
  const s = map[tipo] || { label: tipo, color: GRAY_500, bg: GRAY_100 };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, flexShrink: 0,
      background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '.04em',
    }}>
      {s.label}
    </span>
  );
}

// ── Módulo-level: evita que React cree un tipo nuevo en cada render ──────────
function TrashConfirm({ id, confirmBorrarId, borrando, onSetConfirm, onConfirm }) {
  if (confirmBorrarId === id) {
    return (
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onConfirm(id)}
          disabled={borrando}
          style={{
            background: RED, border: 'none', borderRadius: 7, color: 'white',
            cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-ui)', flexShrink: 0,
          }}
        >
          {borrando ? '…' : 'Sí, eliminar'}
        </button>
        <button
          type="button"
          onClick={() => onSetConfirm(null)}
          style={{
            background: 'none', border: `1px solid ${GRAY_200}`, borderRadius: 7,
            color: GRAY_500, cursor: 'pointer', padding: '4px 8px', fontSize: 12,
            fontFamily: 'var(--font-ui)', flexShrink: 0,
          }}
        >
          No
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      title="Eliminar campo del catálogo"
      onClick={() => onSetConfirm(id)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: RED, display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0, opacity: 0.7,
      }}
    >
      <I.trash size={14} />
    </button>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function CamposRegistroModal({ eventoId, eventoNombre, onClose }) {
  const [camposEvento, setCamposEvento] = useState([]);
  const [catalogo,     setCatalogo]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');
  const [savedOk,      setSavedOk]      = useState(false);
  const [dirty,        setDirty]        = useState(false);

  // Crear campo
  const [showCrear,  setShowCrear]  = useState(false);
  const [crearForm,  setCrearForm]  = useState({ nombre: '', tipo: 'texto', opciones: '' });
  const [crearError, setCrearError] = useState('');
  const [creando,    setCreando]    = useState(false);

  // Borrar del catálogo
  const [confirmBorrarId, setConfirmBorrarId] = useState(null);
  const [borrando,        setBorrando]        = useState(false);

  useEffect(() => {
    Promise.all([
      camposPersonalizadosApi.getDeEvento(eventoId),
      camposPersonalizadosApi.getCatalogo(),
    ]).then(([evRes, catRes]) => {
      setCamposEvento(evRes.data);
      setCatalogo(catRes.data);
    }).finally(() => setLoading(false));
  }, [eventoId]);

  const assignedIds = new Set(camposEvento.map(c => c.id));
  const disponibles = catalogo.filter(c => !assignedIds.has(c.id));

  const handleQuitar = (id) => {
    setCamposEvento(prev => prev.filter(c => c.id !== id));
    setSavedOk(false);
    setDirty(true);
  };

  const handleAgregar = (campo) => {
    setCamposEvento(prev => [...prev, campo]);
    setSavedOk(false);
    setDirty(true);
  };

  const handleGuardar = async () => {
    setSaving(true);
    setSaveError('');
    setSavedOk(false);
    try {
      await camposPersonalizadosApi.setDeEvento(eventoId, camposEvento.map(c => c.id));
      setDirty(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err) {
      // dirty permanece true intencionalmente — el usuario puede reintentar
      setSaveError(err?.response?.data?.error || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCrear = async () => {
    setCrearError('');
    const nombre = crearForm.nombre.trim();
    if (!nombre) { setCrearError('El nombre es requerido.'); return; }
    const opciones = crearForm.tipo === 'opciones'
      ? crearForm.opciones.split('\n').map(s => s.trim()).filter(Boolean)
      : [];
    if (crearForm.tipo === 'opciones' && opciones.length === 0) {
      setCrearError('Agrega al menos una opción.'); return;
    }
    setCreando(true);
    try {
      const { data: nuevo } = await camposPersonalizadosApi.crear({
        nombre, tipo: crearForm.tipo, opciones,
      });
      setCatalogo(prev => [...prev, nuevo]);
      setCamposEvento(prev => [...prev, nuevo]);
      setSavedOk(false);
      setDirty(true);
      setCrearForm({ nombre: '', tipo: 'texto', opciones: '' });
      setShowCrear(false);
    } catch (err) {
      if (err?.response?.status === 409) {
        setCrearError('Ya existe un campo con ese nombre.');
      } else {
        setCrearError(err?.response?.data?.error || 'Error al crear.');
      }
    } finally {
      setCreando(false);
    }
  };

  const handleBorrarCatalogo = async (id) => {
    const wasAssigned = camposEvento.some(c => c.id === id);
    setBorrando(true);
    try {
      await camposPersonalizadosApi.borrar(id);
      setCatalogo(prev => prev.filter(c => c.id !== id));
      setCamposEvento(prev => prev.filter(c => c.id !== id));
      if (wasAssigned) { setSavedOk(false); setDirty(true); }
      setConfirmBorrarId(null);
    } catch (err) {
      alert(err?.response?.data?.error || 'Error al eliminar.');
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-grabber" />

        {/* Cabecera */}
        <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="anf-modal-eyebrow">Punto de Encuentro · Campos</div>
            <h3 className="anf-modal-date">Campos del registro</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{eventoNombre}</p>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 34, height: 34, flexShrink: 0 }}>
            <I.x size={16} />
          </button>
        </div>

        {/* Contenido scrollable */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
            Cargando…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Aviso de campos fijos */}
            <div style={{
              borderRadius: 10, background: GRAY_50, padding: '11px 14px',
              border: `1px solid ${GRAY_200}`, fontSize: 13, color: GRAY_500, lineHeight: 1.6,
            }}>
              <span style={{ fontWeight: 700, color: NAVY_700 }}>Campos fijos (siempre incluidos):</span>{' '}
              Nombre, WhatsApp, Edad, Tipo de persona.
              <br />
              <span style={{ fontSize: 12 }}>
                Los campos extra son opcionales y se piden al registrar participantes en este evento.
              </span>
            </div>

            {/* Campos asignados al evento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Campos extra asignados a este evento</label>
              {camposEvento.length === 0 ? (
                <div style={{ fontSize: 13, color: GRAY_500, padding: '8px 0' }}>
                  Sin campos extra — agrega del catálogo o crea uno nuevo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {camposEvento.map((c, i) => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10,
                      border: `1.5px solid ${NAVY_100}`, background: 'white',
                    }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: GRAY_500, minWidth: 18 }}>
                        {i + 1}.
                      </span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                        {c.nombre}
                      </span>
                      <TipoBadge tipo={c.tipo} />
                      <button
                        type="button"
                        title="Quitar de este evento"
                        onClick={() => handleQuitar(c.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: GRAY_500, display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0,
                        }}
                      >
                        <I.x size={14} />
                      </button>
                      <TrashConfirm
                        id={c.id}
                        confirmBorrarId={confirmBorrarId}
                        borrando={borrando}
                        onSetConfirm={setConfirmBorrarId}
                        onConfirm={handleBorrarCatalogo}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agregar del catálogo */}
            {disponibles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>Agregar del catálogo</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {disponibles.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      border: `1.5px solid ${GRAY_200}`, background: GRAY_50,
                    }}>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-2)' }}>{c.nombre}</span>
                      <TipoBadge tipo={c.tipo} />
                      <button
                        type="button"
                        onClick={() => handleAgregar(c)}
                        style={{
                          background: NAVY, border: 'none', borderRadius: 7, color: 'white',
                          cursor: 'pointer', padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          fontFamily: 'var(--font-ui)', flexShrink: 0,
                        }}
                      >
                        + Agregar
                      </button>
                      <TrashConfirm
                        id={c.id}
                        confirmBorrarId={confirmBorrarId}
                        borrando={borrando}
                        onSetConfirm={setConfirmBorrarId}
                        onConfirm={handleBorrarCatalogo}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crear campo nuevo */}
            <div style={{ borderTop: `1px dashed ${GRAY_200}`, paddingTop: 16 }}>
              {!showCrear ? (
                <button
                  type="button"
                  onClick={() => { setShowCrear(true); setCrearError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                    fontSize: 13, fontWeight: 600, color: NAVY_700,
                    background: 'none', border: `1.5px dashed ${NAVY_100}`,
                    borderRadius: 10, padding: '9px 14px', cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  <I.plus size={15} /> Crear campo nuevo en el catálogo
                </button>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  border: `1.5px solid ${NAVY_100}`, borderRadius: 12, padding: 14,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Nuevo campo</span>
                    <button
                      type="button"
                      onClick={() => { setShowCrear(false); setCrearError(''); setCrearForm({ nombre: '', tipo: 'texto', opciones: '' }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY_500, padding: 4 }}
                    >
                      <I.x size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Nombre del campo</label>
                    <input
                      type="text"
                      placeholder="ej. Talla de playera"
                      value={crearForm.nombre}
                      onChange={e => setCrearForm(f => ({ ...f, nombre: e.target.value }))}
                      style={inputStyle}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Tipo de campo</label>
                    <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                      {[
                        { val: 'texto',    label: 'Texto libre' },
                        { val: 'numero',   label: 'Número' },
                        { val: 'opciones', label: 'Opciones' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCrearForm(f => ({ ...f, tipo: opt.val, opciones: '' }))}
                          style={{
                            flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                            background: crearForm.tipo === opt.val ? NAVY : 'var(--surface)',
                            color: crearForm.tipo === opt.val ? 'white' : 'var(--ink-2)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {crearForm.tipo === 'opciones' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>
                        Opciones{' '}
                        <span style={{ textTransform: 'none', fontWeight: 500, fontSize: 11 }}>
                          (una por línea)
                        </span>
                      </label>
                      <textarea
                        placeholder={'S\nM\nL\nXL'}
                        value={crearForm.opciones}
                        onChange={e => setCrearForm(f => ({ ...f, opciones: e.target.value }))}
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  )}

                  {crearError && (
                    <p style={{ margin: 0, fontSize: 12.5, color: RED, textAlign: 'center' }}>
                      {crearError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCrear}
                    disabled={creando || !crearForm.nombre.trim()}
                    style={{
                      padding: '10px 0', borderRadius: 10, border: 'none',
                      background: NAVY, color: 'white', fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      opacity: (creando || !crearForm.nombre.trim()) ? 0.45 : 1,
                    }}
                  >
                    {creando ? 'Creando…' : 'Crear campo y agregar al evento'}
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Footer fijo — siempre visible, no scrolleable ─────────────────── */}

        {/* Error de guardado: visible siempre, justo antes del botón */}
        {saveError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, marginTop: 8,
            background: '#FEF2F2', border: `1.5px solid ${RED}`,
            fontSize: 13, color: RED, fontWeight: 600,
          }}>
            <I.x size={14} style={{ flexShrink: 0 }} />
            {saveError}
          </div>
        )}

        {/* Confirmación de éxito */}
        {savedOk && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, marginTop: 8,
            background: '#E6F5EC', border: `1.5px solid ${GREEN}`,
            fontSize: 13, color: GREEN, fontWeight: 600,
          }}>
            <I.check size={14} style={{ flexShrink: 0 }} />
            Campos guardados correctamente
          </div>
        )}

        <button
          className="btn btn-primary anf-save-btn"
          onClick={handleGuardar}
          disabled={saving || !dirty || loading}
          style={{ opacity: (saving || !dirty || loading) ? 0.45 : 1, marginTop: 8 }}
        >
          <I.check size={16} />
          {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios pendientes'}
        </button>

        {!dirty && !loading && !savedOk && (
          <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: -8 }}>
            Agrega o quita campos extra para activar el guardado
          </p>
        )}
      </div>
    </div>
  );
}
