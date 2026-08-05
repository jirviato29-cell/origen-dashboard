import { useState } from 'react';
import { ministeriosApi } from '../services/api';
import { useMinisterios } from '../context/MinisteriosContext';
import { I } from './Icons';

// Gestor de "Ministerios del campus" (crear / renombrar / recolorear / borrar).
// Reutilizable: vive en el Directorio de voluntarios y también en "Líderes y
// equipos" (espejo), para que no quede escondido. Lee/escribe la MISMA lista del
// campus activo vía MinisteriosContext + ministeriosApi (scoped por X-Campus),
// así que funciona igual en los 3 campus. `onChange` avisa al padre para que
// refresque su propia vista (p. ej. los equipos) tras un cambio.

const GRAY_200 = '#E2E6EC';
const GRAY_500 = '#7A8699';
const NAVY     = '#112540';
const NAVY_300 = '#9CB0CC';
const DEFAULT_COLOR = '#64748B';

export default function GestorMinisterios({ onChange }) {
  const { ministerios, reload } = useMinisterios() || {};

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoColor,  setNuevoColor]  = useState(DEFAULT_COLOR);
  const [creando,     setCreando]     = useState(false);
  const [msgErr,      setMsgErr]      = useState('');

  const [editing,   setEditing]   = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editColor,  setEditColor]  = useState(DEFAULT_COLOR);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  async function refrescar() {
    await reload?.();
    onChange?.();
  }

  async function crear() {
    if (!nuevoNombre.trim()) { setMsgErr('El nombre es requerido.'); return; }
    setCreando(true); setMsgErr('');
    try {
      await ministeriosApi.crear({ nombre: nuevoNombre.trim(), color: nuevoColor });
      await refrescar();
      setNuevoNombre(''); setNuevoColor(DEFAULT_COLOR);
    } catch (err) {
      setMsgErr(err?.response?.data?.error || 'Error al crear.');
    } finally {
      setCreando(false);
    }
  }

  async function actualizar(id) {
    if (!editNombre.trim()) return;
    setSavingEdit(true); setMsgErr('');
    try {
      await ministeriosApi.actualizar(id, { nombre: editNombre.trim(), color: editColor });
      await refrescar();
      setEditing(null); setEditNombre(''); setEditColor(DEFAULT_COLOR);
    } catch (err) {
      setMsgErr(err?.response?.data?.error || 'Error al renombrar.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function borrar(id) {
    setDeleting(true);
    try {
      await ministeriosApi.borrar(id);
      await refrescar();
      setConfirmDel(null);
    } catch {
      // noop
    } finally {
      setDeleting(false);
    }
  }

  const lista = Array.isArray(ministerios) ? ministerios : [];
  const hayLista = lista.length > 0;

  return (
    <div style={{ border: `1px solid ${GRAY_200}`, borderRadius: 10, padding: '14px 16px', background: 'var(--surface)', maxWidth: 540 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: GRAY_500, marginBottom: 10 }}>
        Ministerios del campus
      </div>

      {/* Nuevo ministerio */}
      <div style={{ marginBottom: hayLista ? 12 : 0, paddingBottom: hayLista ? 12 : 0, borderBottom: hayLista ? `1px solid ${GRAY_200}` : 'none' }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <input
            type="color"
            value={nuevoColor}
            onChange={e => setNuevoColor(e.target.value)}
            title="Color del ministerio"
            style={{ width: 32, height: 32, padding: 2, border: `1.5px solid ${GRAY_200}`, borderRadius: 7, cursor: 'pointer', flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Nuevo ministerio…"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') crear(); }}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${GRAY_200}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            onClick={crear}
            disabled={creando}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 13, flexShrink: 0, opacity: creando ? 0.6 : 1 }}
          >
            {creando ? '…' : 'Crear'}
          </button>
        </div>
        {msgErr && (
          <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5, marginBottom: 0 }}>{msgErr}</p>
        )}
      </div>

      {/* Lista existente */}
      {hayLista && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lista.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {editing === m.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    style={{ width: 28, height: 28, padding: 2, border: `1.5px solid ${GRAY_200}`, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <input
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') actualizar(m.id); if (e.key === 'Escape') { setEditing(null); setMsgErr(''); } }}
                    autoFocus
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 7, border: `1.5px solid ${NAVY_300}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={() => actualizar(m.id)}
                    disabled={savingEdit}
                    style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: NAVY, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingEdit ? 0.6 : 1, flexShrink: 0 }}
                  >
                    {savingEdit ? '…' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => { setEditing(null); setMsgErr(''); }}
                    style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${GRAY_200}`, background: 'none', fontSize: 13, cursor: 'pointer', color: GRAY_500, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: m.color || DEFAULT_COLOR, flexShrink: 0, border: '1px solid rgba(0,0,0,.1)' }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{m.nombre}</span>
                  {confirmDel === m.id ? (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button
                        onClick={() => borrar(m.id)}
                        disabled={deleting}
                        style={{ padding: '2px 9px', borderRadius: 6, border: 'none', background: '#D23B36', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
                      >
                        {deleting ? '…' : 'Eliminar'}
                      </button>
                      <button
                        onClick={() => setConfirmDel(null)}
                        style={{ padding: '2px 8px', borderRadius: 6, border: `1px solid ${GRAY_200}`, background: 'none', fontSize: 12, cursor: 'pointer', color: GRAY_500 }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => { setEditing(m.id); setEditNombre(m.nombre); setEditColor(m.color || DEFAULT_COLOR); setMsgErr(''); setConfirmDel(null); }}
                        title="Editar nombre y color"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', color: GRAY_500, display: 'flex', alignItems: 'center' }}
                      >
                        <I.edit size={13} />
                      </button>
                      <button
                        onClick={() => { setConfirmDel(m.id); setEditing(null); }}
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
    </div>
  );
}
