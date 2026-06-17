import { useState } from 'react';
import { visitantesApi } from '../../services/api';
import { I } from '../../components/Icons';

const NAVY_900 = '#112540';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_50  = '#F6F7F9';

const labelSt = {
  fontSize: 11, fontWeight: 700, color: GRAY_500,
  textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4,
};
const inputSt = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 10px', borderRadius: 8, border: `1px solid ${GRAY_200}`,
  fontSize: 13.5, color: NAVY_900, outline: 'none', background: '#fff',
};

const mkEmpty = () => ({
  fecha: new Date().toISOString().split('T')[0],
  relacion_con_origen: '',
  nombre: '',
  edad: '',
  estado_fe: '',
  whatsapp: '',
  como_se_entero: '',
  acompanantes: '',
  acompanantes_num: 0,
  colonia: '',
});

export default function VisitanteModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(
    editing
      ? { ...editing, edad: editing.edad ?? '', acompanantes_num: editing.acompanantes_num ?? 0 }
      : mkEmpty()
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setErr('El nombre es requerido.'); return; }
    setSaving(true);
    setErr('');
    try {
      const payload = {
        fecha:               form.fecha || null,
        relacion_con_origen: form.relacion_con_origen || null,
        nombre:              form.nombre.trim(),
        edad:                form.edad !== '' ? parseInt(form.edad, 10) : null,
        estado_fe:           form.estado_fe || null,
        whatsapp:            form.whatsapp || null,
        como_se_entero:      form.como_se_entero || null,
        acompanantes:        form.acompanantes || null,
        acompanantes_num:    form.acompanantes_num !== '' ? parseInt(form.acompanantes_num, 10) : 0,
        colonia:             form.colonia || null,
      };
      if (editing) await visitantesApi.update(editing.id, payload);
      else         await visitantesApi.create(payload);
      onSaved();
    } catch {
      setErr('Error al guardar. Intenta de nuevo.');
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(11,26,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28, maxWidth: 520, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: NAVY_900 }}>
              {editing ? 'Editar visitante' : 'Nuevo visitante'}
            </div>
            <div style={{ fontSize: 12, color: GRAY_500, marginTop: 2 }}>
              Completa los datos del visitante
            </div>
          </div>
          <button onClick={onClose} style={{
            background: GRAY_50, border: 0, borderRadius: 9, width: 32, height: 32,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GRAY_500,
          }}>
            <I.x size={15} />
          </button>
        </div>

        {err && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', fontSize: 12.5, padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelSt}>Nombre completo *</label>
            <input style={inputSt} type="text" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelSt}>Fecha de visita</label>
              <input style={inputSt} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div>
              <label style={labelSt}>Edad</label>
              <input style={inputSt} type="number" value={form.edad} onChange={e => set('edad', e.target.value)} min="0" max="120" placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label style={labelSt}>Relación con Origen</label>
            <select style={inputSt} value={form.relacion_con_origen} onChange={e => set('relacion_con_origen', e.target.value)}>
              <option value="">— Sin especificar —</option>
              <option value="Me interesa seguir">Me interesa seguir</option>
              <option value="Solo vengo de visita">Solo vengo de visita</option>
            </select>
          </div>

          <div>
            <label style={labelSt}>Estado de fe</label>
            <select style={inputSt} value={form.estado_fe} onChange={e => set('estado_fe', e.target.value)}>
              <option value="">— Sin especificar —</option>
              <option value="Soy nuevo">Soy nuevo</option>
              <option value="Soy cristiano">Soy cristiano</option>
            </select>
          </div>

          <div>
            <label style={labelSt}>WhatsApp</label>
            <input style={inputSt} type="text" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+52 449 000 0000" />
          </div>

          <div>
            <label style={labelSt}>¿Cómo se enteró?</label>
            <input style={inputSt} type="text" value={form.como_se_entero} onChange={e => set('como_se_entero', e.target.value)} placeholder="Redes sociales, amigo, otro..." />
          </div>

          <div>
            <label style={labelSt}>Acompañantes</label>
            <input style={inputSt} type="text" value={form.acompanantes} onChange={e => set('acompanantes', e.target.value)} placeholder="Nombres de quienes lo acompañan" />
          </div>

          <div>
            <label style={labelSt}>¿Cuántos acompañantes?</label>
            <input style={inputSt} type="number" min="0" value={form.acompanantes_num} onChange={e => set('acompanantes_num', e.target.value)} placeholder="0" />
          </div>

          <div>
            <label style={labelSt}>Colonia</label>
            <input style={inputSt} type="text" value={form.colonia} onChange={e => set('colonia', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${GRAY_200}`,
              background: '#fff', fontSize: 13.5, fontWeight: 600, color: GRAY_700, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 0,
              background: NAVY_900, color: '#fff', fontSize: 13.5, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar visitante'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
