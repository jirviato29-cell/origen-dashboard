import { useState, useEffect, useCallback } from 'react';
import { I } from '../../components/Icons';
import { usuariosApi } from '../../services/api';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY_900  = '#112540';
const NAVY_700  = '#244169';
const NAVY_600  = '#305181';
const NAVY_500  = '#3E6499';
const NAVY_100  = '#DCE4EF';
const ORANGE_600 = '#E0561B';
const ORANGE_500 = '#FF6B2B';
const ORANGE_50  = '#FFF4EE';
const GREEN_600  = '#15915A';
const GREEN_50   = '#E6F5EC';
const GRAY_700   = '#3D4654';
const GRAY_500   = '#7A8699';
const GRAY_300   = '#CBD2DC';
const GRAY_200   = '#E2E6EC';
const GRAY_100   = '#EEF1F5';
const GRAY_50    = '#F6F7F9';
const TEAL       = '#5C7A6F';
const TEAL_50    = '#EAF1EE';
const RED_600    = '#D23B36';

// ── Roles config ───────────────────────────────────────────────────────────
const ROLES_LISTA = [
  {
    id: 'anfitriones',
    label: 'Anfitriones',
    desc: 'Gestión de asistencia y bienvenida',
    perms: ['Asistencia', 'Bienvenida'],
    tileBg: ORANGE_50, tileColor: ORANGE_600,
    dotColor: ORANGE_500, avatarBg: ORANGE_500,
  },
  {
    id: 'punto_encuentro',
    label: 'Punto de Encuentro',
    desc: 'Registro y seguimiento de eventos',
    perms: ['Eventos', 'Participantes', 'Cobros'],
    tileBg: TEAL_50, tileColor: TEAL,
    dotColor: TEAL, avatarBg: TEAL,
  },
  {
    id: 'stewardship',
    label: 'Stewardship',
    desc: 'Ofrendas, finanzas y administración',
    perms: ['Ingresos', 'Gastos', 'Balance', 'Reportes'],
    tileBg: NAVY_100, tileColor: NAVY_600,
    dotColor: NAVY_600, avatarBg: NAVY_600,
  },
  {
    id: 'pastor',
    label: 'Pastor Principal',
    desc: 'Vista completa del dashboard',
    perms: ['Todo · solo lectura', 'Dashboard'],
    tileBg: NAVY_900, tileColor: '#fff',
    dotColor: NAVY_900, avatarBg: NAVY_900,
  },
  {
    id: 'administracion',
    label: 'Administración',
    desc: 'Ingresos, gastos y finanzas completas',
    perms: ['Acceso total', 'Usuarios', 'Configuración'],
    tileBg: NAVY_100, tileColor: NAVY_500,
    dotColor: NAVY_500, avatarBg: NAVY_500,
  },
];

const EMPTY_ADD  = { rol: 'anfitriones', clave: '' };
const EMPTY_EDIT = { clave: '' };

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayNombre(nombre) {
  if (!nombre) return '—';
  return nombre.replace(/_(\d+)$/, ' $1').replace(/^[a-z]/, c => c.toUpperCase());
}

function initialsForRole(rolId) {
  const r = ROLES_LISTA.find(x => x.id === rolId);
  if (!r) return '??';
  return r.label.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ── Role tile SVG icons ────────────────────────────────────────────────────
function RoleIconSvg({ id }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', width: 20, height: 20 };
  switch (id) {
    case 'anfitriones':
      return <svg {...p}><circle cx="9" cy="9" r="3.2"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round"/><circle cx="17" cy="10" r="2.5"/></svg>;
    case 'punto_encuentro':
      return <svg {...p}><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'stewardship':
      return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h13l3 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/></svg>;
    case 'pastor':
      return <svg {...p}><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.5 7.1 18.2l.9-5.5-4-3.9L9.5 8z" strokeLinejoin="round"/></svg>;
    case 'administracion':
      return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 13H4a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.6V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.4 11H20a2 2 0 1 1 0 4z" strokeLinecap="round"/></svg>;
    default: return null;
  }
}

// ── Modal form styles ──────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const labelStyle = {
  fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

// ── Page ───────────────────────────────────────────────────────────────────
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

  const openAdd = () => { setAddForm(EMPTY_ADD); setFormErr(''); setModal('add'); };

  const openEdit = (u) => { setEditId(u.id); setEditForm(EMPTY_EDIT); setFormErr(''); setModal('edit'); };

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
    } catch { /* noop */ }
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

  // ── KPI derivations ───────────────────────────────────────────────────────
  const activos        = usuarios.filter(u => u.activo).length;
  const inactivos      = usuarios.filter(u => !u.activo).length;
  const rolesConUsers  = new Set(usuarios.map(u => u.rol)).size;

  // ── Style objects ─────────────────────────────────────────────────────────
  const kpiCard  = { background: '#fff', border: `1px solid ${GRAY_200}`, borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(11,26,47,.06)' };
  const kpiLabel = { fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: GRAY_500, marginBottom: 11, display: 'flex', alignItems: 'center', gap: 8 };
  const kpiIc    = { width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: NAVY_100, color: NAVY_700, flexShrink: 0 };
  const kpiVal   = { fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: NAVY_900, fontVariantNumeric: 'tabular-nums' };
  const kpiFoot  = { marginTop: 10, fontSize: 11.5, color: GRAY_500 };
  const th       = { textAlign: 'left', fontSize: 10.5, letterSpacing: '.07em', textTransform: 'uppercase', color: GRAY_500, fontWeight: 700, padding: '12px 16px', background: GRAY_50, borderBottom: `1px solid ${GRAY_200}` };
  const td       = { padding: '13px 16px', color: '#16233A', verticalAlign: 'middle' };

  return (
    <>
      <style>{`
        @media(max-width:1180px){.cfg-kpis{grid-template-columns:1fr!important;}}
        .cfg-kpi{transition:.15s;}
        .cfg-kpi:hover{box-shadow:0 4px 16px rgba(11,26,47,.08),0 1px 3px rgba(11,26,47,.05);transform:translateY(-1px);}
        .cfg-role-row{transition:.13s;}
        .cfg-role-row:hover{border-color:${GRAY_300}!important;box-shadow:0 1px 2px rgba(11,26,47,.06);}
        .cfg-tbl tbody tr:hover td{background:${GRAY_50};}
        .cfg-mini-btn{transition:.13s;}
        .cfg-mini-btn:hover{color:${NAVY_900}!important;background:${GRAY_50}!important;}
        .cfg-mini-btn-del:hover{color:${RED_600}!important;background:#FBEAE9!important;border-color:#FBEAE9!important;}
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="cfg-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>

          <div className="cfg-kpi" style={kpiCard}>
            <div style={kpiLabel}>
              <span style={{ ...kpiIc, background: GREEN_50, color: GREEN_600 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="15" height="15">
                  <path d="M5 12.5l4 4 10-10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Usuarios activos
            </div>
            <div style={{ ...kpiVal, color: GREEN_600 }}>{loading ? '…' : activos}</div>
            <div style={kpiFoot}>con acceso al sistema</div>
          </div>

          <div className="cfg-kpi" style={kpiCard}>
            <div style={kpiLabel}>
              <span style={kpiIc}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
                  <circle cx="12" cy="12" r="8"/>
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
                </svg>
              </span>
              Usuarios inactivos
            </div>
            <div style={kpiVal}>{loading ? '…' : inactivos}</div>
            <div style={kpiFoot}>sin accesos suspendidos</div>
          </div>

          <div className="cfg-kpi" style={kpiCard}>
            <div style={kpiLabel}>
              <span style={kpiIc}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="2.5"/>
                </svg>
              </span>
              Roles configurados
            </div>
            <div style={kpiVal}>{ROLES_LISTA.length}</div>
            <div style={kpiFoot}><b>{rolesConUsers}</b> con usuarios asignados</div>
          </div>
        </div>

        {/* ── Roles del sistema ─────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 18 }}>
            <div>
              <h3 className="card-title">Roles del sistema</h3>
              <div className="card-sub">{ROLES_LISTA.length} roles · define qué puede ver y hacer cada usuario</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12.5 }}>
              <I.plus size={14} /> Nuevo rol
            </button>
          </div>

          {ROLES_LISTA.map((r, i) => {
            const count  = usuarios.filter(u => u.rol === r.id && u.activo).length;
            const isLast = i === ROLES_LISTA.length - 1;
            return (
              <div key={r.id} className="cfg-role-row" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', border: `1px solid ${GRAY_200}`,
                borderRadius: 14, marginBottom: isLast ? 0 : 10, cursor: 'default',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: r.tileBg, color: r.tileColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <RoleIconSvg id={r.id} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: NAVY_900 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: GRAY_500, marginTop: 2 }}>{r.desc}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                    {r.perms.map(p => (
                      <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: GRAY_100, color: GRAY_700 }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                  fontSize: 12.5, fontWeight: 600,
                  color: count > 0 ? NAVY_700 : GRAY_500,
                  background: GRAY_50, border: `1px solid ${GRAY_200}`,
                  padding: '6px 12px', borderRadius: 999,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: count > 0 ? NAVY_900 : GRAY_300 }}>
                    {count}
                  </span>
                  {count === 1 ? 'activo' : 'activos'}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Gestión de usuarios ───────────────────────────────────────────── */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div>
              <h3 className="card-title">Gestión de usuarios</h3>
              <div className="card-sub">
                {loading ? 'Cargando…' : `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''} registrado${usuarios.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <button onClick={openAdd} style={{
              background: NAVY_900, color: '#fff', padding: '9px 16px',
              borderRadius: 10, border: 0, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
            }}>
              <I.plus size={14} /> Nuevo usuario
            </button>
          </div>

          {error && <p style={{ fontSize: 13, color: RED_600, margin: '8px 0 0' }}>{error}</p>}

          <div style={{ border: `1px solid ${GRAY_200}`, borderRadius: 10, overflow: 'hidden', marginTop: 18 }}>
            <table className="cfg-tbl" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Usuario</th>
                  <th style={th}>Rol</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Alta</th>
                  <th style={{ ...th, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: GRAY_300 }}>Cargando…</td></tr>
                ) : usuarios.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: GRAY_300 }}>Sin usuarios registrados</td></tr>
                ) : usuarios.map((u, idx) => {
                  const r       = ROLES_LISTA.find(x => x.id === u.rol);
                  const isLast  = idx === usuarios.length - 1;
                  const rowBdr  = isLast ? 0 : `1px solid ${GRAY_100}`;
                  return (
                    <tr key={u.id}>
                      <td style={{ ...td, borderBottom: rowBdr }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: r?.avatarBg || NAVY_600, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 12,
                          }}>
                            {initialsForRole(u.rol)}
                          </div>
                          <div style={{ fontWeight: 700, color: NAVY_900, fontSize: 13.5 }}>
                            {displayNombre(u.nombre)}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, borderBottom: rowBdr }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: NAVY_700 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: r?.dotColor || NAVY_600, flexShrink: 0 }} />
                          {r?.label || u.rol}
                        </span>
                      </td>
                      <td style={{ ...td, borderBottom: rowBdr }}>
                        <button onClick={() => handleToggle(u.id)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, fontWeight: 700, padding: '4px 11px',
                          borderRadius: 999, cursor: 'pointer', border: 0, fontFamily: 'inherit',
                          background: u.activo ? GREEN_50 : GRAY_100,
                          color: u.activo ? GREEN_600 : GRAY_500,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td style={{ ...td, borderBottom: rowBdr, color: GRAY_700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtDate(u.created_at)}
                      </td>
                      <td style={{ ...td, borderBottom: rowBdr, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="cfg-mini-btn"
                          onClick={() => openEdit(u)}
                          title="Cambiar clave"
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${GRAY_200}`, background: '#fff', color: GRAY_500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 6 }}
                        >
                          <I.edit size={14} />
                        </button>
                        <button
                          className="cfg-mini-btn cfg-mini-btn-del"
                          onClick={() => handleDelete(u)}
                          title="Eliminar"
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${GRAY_200}`, background: '#fff', color: GRAY_500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 6 }}
                        >
                          <I.trash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Modal Agregar ─────────────────────────────────────────────────── */}
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
                    autoFocus
                  />
                  <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>
                    Se guardará hasheada. No la escribas en ningún otro lado.
                  </p>
                </div>
                {formErr && <p style={{ fontSize: 13, color: RED_600, margin: 0 }}>{formErr}</p>}
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

        {/* ── Modal Cambiar clave ───────────────────────────────────────────── */}
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

              {formErr && <p style={{ fontSize: 13, color: RED_600, margin: '4px 0 0' }}>{formErr}</p>}

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
    </>
  );
}
