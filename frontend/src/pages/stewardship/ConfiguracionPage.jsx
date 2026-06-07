import { useState, useEffect, useCallback } from 'react';
import { I } from '../../components/Icons';
import { usuariosApi } from '../../services/api';

const ROLES_LISTA = [
  { id: 'anfitriones',     label: 'Anfitriones',        color: 'var(--chart-secondary)', desc: 'Gestión de asistencia y bienvenida' },
  { id: 'punto_encuentro', label: 'Punto de Encuentro', color: 'var(--warn)',             desc: 'Registro y seguimiento de eventos' },
  { id: 'stewardship',     label: 'Stewardship',        color: 'var(--chart-primary)',    desc: 'Ofrendas, finanzas y administración' },
  { id: 'pastor',          label: 'Pastor Principal',   color: 'var(--ink)',              desc: 'Vista completa del dashboard' },
  { id: 'administracion',  label: 'Administración',     color: 'var(--ink)',              desc: 'Ingresos, gastos y finanzas completas' },
];

const EMPTY_ADD  = { rol: 'anfitriones', clave: '' };
const EMPTY_EDIT = { clave: '' };

function RolBadge({ rolId }) {
  const r = ROLES_LISTA.find(x => x.id === rolId);
  if (!r) return <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rolId}</span>;
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
      background: r.color + '1a', color: r.color,
    }}>
      {r.label}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

export default function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [modal,    setModal]    = useState(null); // null | 'add' | 'edit'
  const [editId,   setEditId]   = useState(null);
  const [addForm,  setAddForm]  = useState(EMPTY_ADD);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usuariosApi.getAll();
      setUsuarios(data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const closeModal = () => { setModal(null); setFormErr(''); };

  const openAdd = () => {
    setAddForm(EMPTY_ADD);
    setFormErr('');
    setModal('add');
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setEditForm(EMPTY_EDIT);
    setFormErr('');
    setModal('edit');
  };

  const handleAdd = async () => {
    if (!addForm.clave.trim()) { setFormErr('La clave no puede estar vacía'); return; }
    setSaving(true); setFormErr('');
    try {
      const { data } = await usuariosApi.create({ rol: addForm.rol, clave: addForm.clave.trim() });
      setUsuarios(prev => [...prev, data]);
      closeModal();
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClave = async () => {
    if (!editForm.clave.trim()) { setFormErr('Escribe la nueva clave'); return; }
    setSaving(true); setFormErr('');
    try {
      await usuariosApi.cambiarClave(editId, editForm.clave.trim());
      closeModal();
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Error al cambiar clave');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await usuariosApi.toggle(id);
      setUsuarios(prev => prev.map(u => u.id === id ? data : u));
    } catch {
      // noop — no bloquear UI por error de toggle
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`¿Eliminar el usuario "${u.nombre}" (${u.rol})?`)) return;
    try {
      await usuariosApi.remove(u.id);
      setUsuarios(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      alert(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const activos   = usuarios.filter(u => u.activo).length;
  const inactivos = usuarios.filter(u => !u.activo).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        {[
          { label: 'Usuarios activos',   value: loading ? '…' : activos,            color: 'var(--good)'   },
          { label: 'Usuarios inactivos', value: loading ? '…' : inactivos,          color: 'var(--danger)' },
          { label: 'Roles configurados', value: ROLES_LISTA.length,                 color: 'var(--ink)'    },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Roles del sistema ──────────────────────────────────────────── */}
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">Roles del sistema</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {ROLES_LISTA.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--surface)',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.desc}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {usuarios.filter(u => u.rol === r.id && u.activo).length} activos
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gestión de usuarios ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Gestión de usuarios</h3>
            <div className="card-sub">
              {loading ? 'Cargando…' : `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''} registrado${usuarios.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="card-actions">
            <button className="btn btn-primary" onClick={openAdd}>
              <I.plus size={14} /> Nuevo usuario
            </button>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: '8px 0 0' }}>{error}</p>
        )}

        <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginTop: 8 }}>
          <table className="table anf-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Rol</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th>Alta</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Cargando…</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Sin usuarios registrados</td></tr>
              ) : (
                usuarios.map(u => (
                  <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.55 }}>
                    <td style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>#{u.id}</td>
                    <td><RolBadge rolId={u.rol} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggle(u.id)}
                        style={{
                          fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                          cursor: 'pointer', border: 'none',
                          background: u.activo ? 'rgba(79,138,91,0.15)' : 'rgba(180,74,58,0.12)',
                          color: u.activo ? 'var(--good)' : 'var(--danger)',
                        }}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn" onClick={() => openEdit(u)} title="Cambiar clave"
                        style={{ width: 28, height: 28, marginRight: 4 }}>
                        <I.edit size={14} />
                      </button>
                      <button className="icon-btn" onClick={() => handleDelete(u)} title="Eliminar"
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

      {/* ── Modal Agregar ──────────────────────────────────────────────── */}
      {modal === 'add' && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Nuevo usuario</div>
                <h3 className="anf-modal-date">Agregar usuario</h3>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Rol</label>
                <select
                  value={addForm.rol}
                  onChange={e => setAddForm(p => ({ ...p, rol: e.target.value }))}
                  style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}
                >
                  {ROLES_LISTA.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Clave de acceso</label>
                <input
                  type="text"
                  placeholder="ej. ana00"
                  value={addForm.clave}
                  onChange={e => { setAddForm(p => ({ ...p, clave: e.target.value })); setFormErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>
                  Se guardará hasheada. No la escribas en ningún otro lado.
                </p>
              </div>

              {formErr && <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{formErr}</p>}
            </div>

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleAdd}
              disabled={!addForm.clave.trim() || saving}
              style={{ opacity: (!addForm.clave.trim() || saving) ? 0.45 : 1, marginTop: 8 }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : 'Agregar usuario'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Cambiar clave ────────────────────────────────────────── */}
      {modal === 'edit' && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">Usuario #{editId}</div>
                <h3 className="anf-modal-date">Cambiar clave</h3>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={labelStyle}>Nueva clave</label>
              <input
                type="text"
                placeholder="Nueva clave de acceso"
                value={editForm.clave}
                onChange={e => { setEditForm(p => ({ ...p, clave: e.target.value })); setFormErr(''); }}
                onKeyDown={e => e.key === 'Enter' && handleEditClave()}
                style={inputStyle}
                autoFocus
              />
              <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>
                Se re-hasheará automáticamente. La clave anterior quedará inválida.
              </p>
            </div>

            {formErr && <p style={{ fontSize: 13, color: 'var(--danger)', margin: '4px 0 0' }}>{formErr}</p>}

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleEditClave}
              disabled={!editForm.clave.trim() || saving}
              style={{ opacity: (!editForm.clave.trim() || saving) ? 0.45 : 1, marginTop: 8 }}
            >
              <I.check size={16} />
              {saving ? 'Guardando…' : 'Guardar nueva clave'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
