import { useEffect, useState } from 'react';
import { liderPosicionesApi } from '../../services/api';

// "Posiciones de mi ministerio" (PASO 5, parte 1): el líder define UNA VEZ el
// catálogo de posiciones de su ministerio (ej. "Puerta principal", "Recibidor",
// "Cámara 2") para luego elegirlas al asignar voluntarios (parte 2).
// El ministerio y el campus los resuelve el backend del token, no de aquí.

const NAVY_900   = '#112540';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50  = '#FFF4EE';
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

.pos-form{display:flex;gap:8px;align-items:stretch;margin-bottom:14px;flex-wrap:wrap;}
.pos-input{flex:1;min-width:180px;padding:9px 12px;border-radius:10px;border:1.5px solid ${GRAY_200};font-size:13.5px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;}
.pos-input:focus{border-color:${NAVY_900};}

.pos-error{padding:11px 13px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:${RED};font-size:12.5px;font-weight:500;margin-bottom:14px;}
.pos-empty{padding:24px 18px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.pos-empty-t{font-size:13.5px;font-weight:700;color:${NAVY_900};}
.pos-empty-s{font-size:12.5px;color:${GRAY_500};margin-top:4px;}
.pos-loading{padding:22px;text-align:center;font-size:13px;color:${GRAY_500};}

.pos-list{display:flex;flex-direction:column;gap:8px;}
.pos-row{display:flex;align-items:center;gap:12px;padding:11px 13px;border:1px solid ${GRAY_200};border-radius:11px;background:#fff;}
.pos-dot{width:8px;height:8px;border-radius:50%;background:${ORANGE_500};flex-shrink:0;}
.pos-nombre{flex:1;min-width:0;font-size:13.5px;font-weight:700;color:${NAVY_900};letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;}
/* Solo geometría: color/fuente van inline (regla global .app button los pisa). */
.pos-quitar{border:1px solid transparent;border-radius:9px;padding:6px 11px;flex-shrink:0;transition:background-color .15s,border-color .15s,color .15s;}
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

// Destructivo: contorno rojo en reposo, rojo sólido al pasar el cursor.
const estiloQuitar = (activo, hover) => ({
  ...FUENTE_BTN,
  fontSize: 12,
  cursor: activo ? 'pointer' : 'not-allowed',
  ...(activo
    ? {
        backgroundColor: hover ? DANGER : '#fff',
        borderColor:     hover ? DANGER : DANGER_BORDE,
        color:           hover ? '#fff' : DANGER,
      }
    : APAGADO),
});

export default function PosicionesMinisterio() {
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [nombre,   setNombre]   = useState('');
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando]  = useState(null);
  const [hoverAgregar, setHoverAgregar] = useState(false);
  const [hoverQuitar,  setHoverQuitar]  = useState(null);

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

  const listo = nombre.trim().length > 0;
  const agregarActivo = listo && !guardando;

  async function agregar() {
    if (!listo || guardando) return;
    setGuardando(true);
    setError('');
    try {
      const { data } = await liderPosicionesApi.crearPosicion(nombre.trim());
      setLista(l => [...l, data].sort((a, b) =>
        (a.orden - b.orden) || a.nombre.localeCompare(b.nombre)));
      setNombre('');
    } catch (err) {
      // 400 (nombre vacío) / 409 (repetido) traen el motivo del backend.
      setError(err.response?.data?.error || 'No se pudo agregar la posición');
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(p) {
    if (!window.confirm(`¿Seguro que quieres quitar la posición "${p.nombre}"?`)) return;
    setQuitando(p.id);
    setError('');
    try {
      await liderPosicionesApi.borrarPosicion(p.id);
      setLista(l => l.filter(x => x.id !== p.id));
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
        <input
          className="pos-input"
          type="text"
          value={nombre}
          placeholder="Nombre de la posición"
          maxLength={80}
          onChange={(e) => { setNombre(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && agregarActivo) agregar(); }}
        />
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

      {cargando ? (
        <div className="pos-loading">Cargando…</div>
      ) : lista.length === 0 ? (
        <div className="pos-empty">
          <div className="pos-empty-t">Aún no has creado posiciones</div>
          <div className="pos-empty-s">Agrega las de tu ministerio (ej. Puerta principal, Recibidor).</div>
        </div>
      ) : (
        <div className="pos-list">
          {lista.map((p) => (
            <div key={p.id} className="pos-row">
              <span className="pos-dot" />
              <span className="pos-nombre">{p.nombre}</span>
              <button
                className="pos-quitar"
                style={estiloQuitar(quitando !== p.id, hoverQuitar === p.id)}
                onMouseEnter={() => setHoverQuitar(p.id)}
                onMouseLeave={() => setHoverQuitar(null)}
                onClick={() => quitar(p)}
                disabled={quitando === p.id}
              >
                {quitando === p.id ? '…' : 'Quitar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
