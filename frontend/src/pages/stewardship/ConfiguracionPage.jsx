import { useState } from 'react';
import { I } from '../../components/Icons';

const ROLES_LISTA = [
  { id: 'administracion',  label: 'Administración',     color: 'var(--chart-primary)', desc: 'Ingresos, gastos y finanzas completas' },
  { id: 'pastor',          label: 'Pastor Principal',   color: 'var(--ink)',           desc: 'Vista completa del dashboard' },
  { id: 'anfitriones',     label: 'Anfitriones',        color: 'var(--chart-secondary)', desc: 'Gestión de asistencia y bienvenida' },
  { id: 'punto_encuentro', label: 'Punto de Encuentro', color: 'var(--warn)',        desc: 'Registro y seguimiento de eventos' },
  { id: 'stewardship',     label: 'Stewardship',        color: 'var(--ink)',        desc: 'Ofrendas, finanzas y administración' },
];

const MOCK_USUARIOS_INIT = [
  { id: 1, nombre: 'Ana González',   email: 'ana@origen.mx',     rol: 'anfitriones',     activo: true },
  { id: 2, nombre: 'David Martínez', email: 'pastor@origen.mx',  rol: 'pastor',          activo: true },
  { id: 3, nombre: 'Carlos Reyes',   email: 'admin@origen.mx',   rol: 'administracion',  activo: true },
  { id: 4, nombre: 'María López',    email: 'maria@origen.mx',   rol: 'punto_encuentro', activo: true },
  { id: 5, nombre: 'Jorge Steward',  email: 'jorge@origen.mx',   rol: 'stewardship',     activo: true },
  { id: 6, nombre: 'Laura Sánchez',  email: 'laura@origen.mx',   rol: 'anfitriones',     activo: false },
];

const EMPTY_FORM = { nombre: '', email: '', rol: 'anfitriones', activo: true };

function RolBadge({ rolId }) {
  const r = ROLES_LISTA.find(x => x.id === rolId);
  if (!r) return null;
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
      background: r.color + '1a', color: r.color,
    }}>
      {r.label}
    </span>
  );
}

export default function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState(MOCK_USUARIOS_INIT);
  const [modal, setModal]       = useState(null); // null | 'add' | 'edit'
  const [form,  setForm]        = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = (u) => { setForm({ nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo }); setEditId(u.id); setModal('edit'); };
  const closeModal = () => setModal(null);

  const handleSave = () => {
    if (!form.nombre || !form.email) return;
    if (modal === 'add') {
      const newId = Math.max(...usuarios.map(u => u.id)) + 1;
      setUsuarios(prev => [...prev, { id: newId, ...form }]);
    } else {
      setUsuarios(prev => prev.map(u => u.id === editId ? { ...u, ...form } : u));
    }
    closeModal();
  };

  const toggleActivo = (id) => {
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !u.activo } : u));
  };

  const activos   = usuarios.filter(u => u.activo).length;
  const inactivos = usuarios.filter(u => !u.activo).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        {[
          { label: 'Usuarios activos',   value: activos,            color: 'var(--good)' },
          { label: 'Usuarios inactivos', value: inactivos,          color: 'var(--danger)' },
          { label: 'Roles configurados', value: ROLES_LISTA.length, color: 'var(--ink)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Roles list */}
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

      {/* Users list */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Gestión de usuarios</h3>
            <div className="card-sub">{usuarios.length} usuarios registrados</div>
          </div>
          <div className="card-actions">
            <button className="btn btn-primary" onClick={openAdd}>
              <I.plus size={14} /> Nuevo usuario
            </button>
          </div>
        </div>

        <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginTop: 4 }}>
          <table className="table anf-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{u.email}</td>
                  <td><RolBadge rolId={u.rol} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleActivo(u.id)}
                      style={{
                        fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 99, cursor: 'pointer',
                        border: 'none',
                        background: u.activo ? 'rgba(79,138,91,0.15)' : 'rgba(180,74,58,0.12)',
                        color: u.activo ? 'var(--good)' : 'var(--danger)',
                      }}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => openEdit(u)} title="Editar">
                      <I.edit size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-grabber" />
            <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="anf-modal-eyebrow">{modal === 'add' ? 'Nuevo usuario' : 'Editar usuario'}</div>
                <h3 className="anf-modal-date">{modal === 'add' ? 'Agregar usuario' : form.nombre}</h3>
              </div>
              <button className="icon-btn" onClick={closeModal} style={{ width: 34, height: 34, flexShrink: 0 }}>
                <I.x size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'nombre', label: 'Nombre completo', type: 'text', placeholder: 'Nombre Apellido' },
                { key: 'email',  label: 'Email',           type: 'email', placeholder: 'correo@origen.mx' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1.5px solid var(--border)', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Rol
                </label>
                <select
                  value={form.rol}
                  onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid var(--border)', fontSize: 14,
                    outline: 'none', boxSizing: 'border-box', background: 'white',
                  }}
                >
                  {ROLES_LISTA.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary anf-save-btn"
              onClick={handleSave}
              disabled={!form.nombre || !form.email}
              style={{ opacity: (!form.nombre || !form.email) ? 0.45 : 1, marginTop: 8 }}
            >
              <I.check size={16} />
              {modal === 'add' ? 'Agregar usuario' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
