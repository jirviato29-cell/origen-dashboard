import { useEffect, useState } from 'react';
import { liderPosicionesApi } from '../../services/api';

// "Posiciones de mi ministerio" (PASO 5, parte 1): el líder define UNA VEZ el
// catálogo de posiciones de su ministerio (nombre + descripción opcional) para
// luego elegirlas al asignar voluntarios (parte 2).
// El ministerio y el campus los resuelve el backend del token, no de aquí.

const NAVY_900   = '#112540';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const GRAY_600   = '#5B6675';
const GRAY_500   = '#7A8699';
const GRAY_200   = '#E2E6EC';
const GRAY_100   = '#EEF1F5';
const GRAY_50    = '#F6F7F9';
const RED        = '#EF4444';
const DANGER      = '#D23B36';
const DANGER_BORDE = '#F3CBC9';

const CSS = `
.pos-head{margin-bottom:14px;}
.pos-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.pos-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;}

.pos-form{border:1px solid ${GRAY_200};border-radius:12px;padding:14px;background:${GRAY_50};margin-bottom:14px;display:flex;flex-direction:column;gap:9px;}
.pos-field{display:flex;flex-direction:column;gap:5px;}
.pos-label{font-size:12px;font-weight:600;color:${NAVY_900};}
.pos-hint{font-weight:400;color:${GRAY_500};}
.pos-input{width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid ${GRAY_200};font-size:13.5px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;}
.pos-input:focus{border-color:${NAVY_900};}
.pos-textarea{width:100%;padding:9px 12px;border-radius:10px;border:1.5px solid ${GRAY_200};font-size:13px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;resize:vertical;min-height:46px;}
.pos-textarea:focus{border-color:${NAVY_900};}
.pos-actions{display:flex;gap:8px;}

.pos-error{padding:11px 13px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:${RED};font-size:12.5px;font-weight:500;margin-bottom:14px;}
.pos-empty{padding:24px 18px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.pos-empty-t{font-size:13.5px;font-weight:700;color:${NAVY_900};}
.pos-empty-s{font-size:12.5px;color:${GRAY_500};margin-top:4px;}
.pos-loading{padding:22px;text-align:center;font-size:13px;color:${GRAY_500};}

.pos-list{display:flex;flex-direction:column;gap:8px;}
.pos-row{display:flex;align-items:flex-start;gap:12px;padding:12px 13px;border:1px solid ${GRAY_200};border-radius:11px;background:#fff;}
.pos-dot{width:8px;height:8px;border-radius:50%;background:${ORANGE_500};flex-shrink:0;margin-top:5px;}
.pos-body{flex:1;min-width:0;}
.pos-nombre{font-size:13.5px;font-weight:700;color:${NAVY_900};letter-spacing:-.01em;overflow-wrap:anywhere;}
.pos-desc{font-size:12px;color:${GRAY_500};margin-top:3px;line-height:1.4;overflow-wrap:anywhere;}
.pos-row-actions{display:flex;gap:7px;flex-shrink:0;}
/* Solo geometría: color/fuente van inline (regla global .app button los pisa). */
.pos-btn{border:1px solid transparent;border-radius:9px;padding:6px 11px;flex-shrink:0;transition:background-color .15s,border-color .15s,color .15s;}
.pos-edit{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;}
`;

// index.css:106 tiene `.app button { font: inherit; color: inherit; }`, que por
// especificidad le gana a las clases y les roba color/peso/tamaño. Por eso los
// botones (y su hover) van con estilo INLINE, igual que en MisVoluntarios.jsx.
const FUENTE_BTN = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontSize: 13,
  fontWeight: 600,
};

const APAGADO = {
  backgroundColor: GRAY_100,
  borderColor:     GRAY_200,
  color:           GRAY_500,
};

// Primario naranja; atenuado cuando está deshabilitado.
const estiloPrimario = (activo, hover) => ({
  ...FUENTE_BTN,
  padding: '9px 14px',
  borderRadius: 10,
  border: '1px solid transparent',
  cursor: activo ? 'pointer' : 'not-allowed',
  ...(activo
    ? {
        backgroundColor: hover ? ORANGE_600 : ORANGE_500,
        borderColor:     hover ? ORANGE_600 : ORANGE_500,
        color: '#fff',
      }
    : APAGADO),
});

// Secundario (fantasma): contorno gris, texto navy; hover fondo gris suave.
const estiloSecundario = (hover) => ({
  ...FUENTE_BTN,
  fontSize: 12,
  padding: '6px 11px',
  borderRadius: 9,
  border: '1px solid',
  cursor: 'pointer',
  backgroundColor: hover ? GRAY_50 : '#fff',
  borderColor:     GRAY_200,
  color:           hover ? NAVY_900 : GRAY_600,
});

// Destructivo: contorno rojo en reposo, rojo sólido al pasar el cursor.
const estiloQuitar = (activo, hover) => ({
  ...FUENTE_BTN,
  fontSize: 12,
  padding: '6px 11px',
  borderRadius: 9,
  border: '1px solid',
  cursor: activo ? 'pointer' : 'not-allowed',
  ...(activo
    ? {
        backgroundColor: hover ? DANGER : '#fff',
        borderColor:     hover ? DANGER : DANGER_BORDE,
        color:           hover ? '#fff' : DANGER,
      }
    : APAGADO),
});

const VACIO = { nombre: '', descripcion: '' };

export default function PosicionesMinisterio() {
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [form,     setForm]     = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando]  = useState(null);
  // Edición inline.
  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState(VACIO);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  // Hover en estado (los colores van inline; un :hover de CSS no los pisa).
  const [hoverAgregar, setHoverAgregar] = useState(false);
  const [hoverBtn,     setHoverBtn]     = useState(null); // `${id}:editar|quitar|guardar|cancelar`

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await liderPosicionesApi.getPosiciones();
        if (vivo) setLista(Array.isArray(data) ? data : []);
      } catch (err) {
        if (vivo) setError(err.response?.data?.error || 'No se pudieron cargar tus posiciones');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const ordenar = (l) => [...l].sort((a, b) =>
    (a.orden - b.orden) || a.nombre.localeCompare(b.nombre));

  const listo = form.nombre.trim().length > 0;
  const agregarActivo = listo && !guardando;

  async function agregar() {
    if (!listo || guardando) return;
    setGuardando(true);
    setError('');
    try {
      const { data } = await liderPosicionesApi.crearPosicion({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
      });
      setLista(l => ordenar([...l, data]));
      setForm(VACIO);
    } catch (err) {
      // 400 (nombre vacío) / 409 (repetido) traen el motivo del backend.
      setError(err.response?.data?.error || 'No se pudo agregar la posición');
    } finally {
      setGuardando(false);
    }
  }

  function abrirEdicion(p) {
    setEditId(p.id);
    setEditForm({ nombre: p.nombre, descripcion: p.descripcion || '' });
    setError('');
  }
  function cancelarEdicion() {
    setEditId(null);
    setEditForm(VACIO);
  }

  const editListo = editForm.nombre.trim().length > 0;

  async function guardarEdicion(id) {
    if (!editListo || guardandoEdit) return;
    setGuardandoEdit(true);
    setError('');
    try {
      const { data } = await liderPosicionesApi.editarPosicion(id, {
        nombre: editForm.nombre.trim(),
        descripcion: editForm.descripcion.trim() || null,
      });
      setLista(l => ordenar(l.map(x => x.id === id ? data : x)));
      cancelarEdicion();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la posición');
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function quitar(p) {
    if (!window.confirm(`¿Seguro que quieres quitar la posición "${p.nombre}"?`)) return;
    setQuitando(p.id);
    setError('');
    try {
      await liderPosicionesApi.borrarPosicion(p.id);
      setLista(l => l.filter(x => x.id !== p.id));
      if (editId === p.id) cancelarEdicion();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo quitar la posición');
    } finally {
      setQuitando(null);
    }
  }

  return (
    <div>
      <style>{CSS}</style>

      <div className="pos-head">
        <h2 className="pos-h2">Posiciones de mi ministerio</h2>
        <div className="pos-h2-note">
          Defínelas una vez (ej. Puerta principal, Recibidor) para luego asignarlas a tu equipo.
        </div>
      </div>

      {error && <div className="pos-error">{error}</div>}

      <div className="pos-form">
        <div className="pos-field">
          <label className="pos-label" htmlFor="pos-nombre">Nombre de la posición</label>
          <input
            id="pos-nombre"
            className="pos-input"
            type="text"
            value={form.nombre}
            placeholder="ej. Puerta principal"
            maxLength={80}
            onChange={(e) => { setForm(f => ({ ...f, nombre: e.target.value })); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && agregarActivo) agregar(); }}
          />
        </div>
        <div className="pos-field">
          <label className="pos-label" htmlFor="pos-desc">
            Descripción <span className="pos-hint">(opcional)</span>
          </label>
          <textarea
            id="pos-desc"
            className="pos-textarea"
            value={form.descripcion}
            placeholder="Qué hace esta posición"
            maxLength={300}
            rows={2}
            onChange={(e) => { setForm(f => ({ ...f, descripcion: e.target.value })); setError(''); }}
          />
        </div>
        <div className="pos-actions">
          <button
            className="pos-add"
            style={estiloPrimario(agregarActivo, hoverAgregar)}
            onMouseEnter={() => setHoverAgregar(true)}
            onMouseLeave={() => setHoverAgregar(false)}
            onClick={agregar}
            disabled={!agregarActivo}
          >
            {guardando ? 'Agregando…' : '+ Agregar posición'}
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="pos-loading">Cargando…</div>
      ) : lista.length === 0 ? (
        <div className="pos-empty">
          <div className="pos-empty-t">Aún no has creado posiciones</div>
          <div className="pos-empty-s">Agrega las de tu ministerio (ej. Puerta principal, Recibidor).</div>
        </div>
      ) : (
        <div className="pos-list">
          {lista.map((p) => {
            if (editId === p.id) {
              const k = `${p.id}:`;
              return (
                <div key={p.id} className="pos-row">
                  <span className="pos-dot" />
                  <div className="pos-edit">
                    <input
                      className="pos-input"
                      type="text"
                      value={editForm.nombre}
                      placeholder="Nombre de la posición"
                      maxLength={80}
                      onChange={(e) => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                    />
                    <textarea
                      className="pos-textarea"
                      value={editForm.descripcion}
                      placeholder="Descripción (opcional)"
                      maxLength={300}
                      rows={2}
                      onChange={(e) => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                    />
                    <div className="pos-actions">
                      <button
                        style={estiloPrimario(editListo && !guardandoEdit, hoverBtn === k + 'guardar')}
                        onMouseEnter={() => setHoverBtn(k + 'guardar')}
                        onMouseLeave={() => setHoverBtn(null)}
                        onClick={() => guardarEdicion(p.id)}
                        disabled={!editListo || guardandoEdit}
                      >
                        {guardandoEdit ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button
                        style={estiloSecundario(hoverBtn === k + 'cancelar')}
                        onMouseEnter={() => setHoverBtn(k + 'cancelar')}
                        onMouseLeave={() => setHoverBtn(null)}
                        onClick={cancelarEdicion}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const k = `${p.id}:`;
            return (
              <div key={p.id} className="pos-row">
                <span className="pos-dot" />
                <div className="pos-body">
                  <div className="pos-nombre">{p.nombre}</div>
                  {p.descripcion && <div className="pos-desc">{p.descripcion}</div>}
                </div>
                <div className="pos-row-actions">
                  <button
                    className="pos-btn"
                    style={estiloSecundario(hoverBtn === k + 'editar')}
                    onMouseEnter={() => setHoverBtn(k + 'editar')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => abrirEdicion(p)}
                  >
                    Editar
                  </button>
                  <button
                    className="pos-btn"
                    style={estiloQuitar(quitando !== p.id, hoverBtn === k + 'quitar')}
                    onMouseEnter={() => setHoverBtn(k + 'quitar')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => quitar(p)}
                    disabled={quitando === p.id}
                  >
                    {quitando === p.id ? '…' : 'Quitar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
