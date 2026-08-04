import { useEffect, useState } from 'react';
import { liderVoluntariosApi } from '../../services/api';

// "Mis voluntarios": el líder da de alta voluntarios nuevos y el backend les
// crea ficha + cuenta. La clave son los últimos 4 de su WhatsApp y se muestra
// en claro aquí para que el líder se la pase.

const NAVY_900 = '#112540';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50 = '#FFF4EE';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50 = '#F6F7F9';
const RED = '#EF4444';
const DANGER = '#D23B36';
const DANGER_BORDE = '#F3CBC9';
const GREEN_50 = '#ECFDF5';
const GREEN_700 = '#047857';
const GRAY_BORDE = '#E5E7EB';   // borde de botón inactivo (pedido explícito)
const READONLY_BG = '#F9FAFB';  // fondo de los campos en modo solo lectura

const CSS = `
.mv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.mv-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.mv-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;}
.mv-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;border:1px solid transparent;background:${NAVY_900};color:#fff;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s,border-color .15s;}
.mv-btn:hover{background:#1B3A63;}
.mv-btn:disabled{background:${GRAY_100};color:${GRAY_500};cursor:not-allowed;}
.mv-btn-ghost{background:transparent;color:${GRAY_500};border:1px solid ${GRAY_200};}
.mv-btn-ghost:hover{background:${GRAY_50};color:${NAVY_900};}

.mv-flash{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:11px;background:${GREEN_50};border:1px solid #A7F3D0;margin-bottom:14px;}
.mv-flash-txt{font-size:13px;color:${GREEN_700};font-weight:600;}
.mv-flash-clave{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;font-weight:800;letter-spacing:.14em;color:${GREEN_700};}
.mv-flash-x{margin-left:auto;background:none;border:0;color:${GREEN_700};cursor:pointer;font-size:16px;line-height:1;padding:0 2px;}

.mv-error{padding:11px 13px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:${RED};font-size:12.5px;font-weight:500;margin-bottom:14px;}
.mv-empty{padding:26px 18px;text-align:center;border:1px dashed ${GRAY_200};border-radius:12px;background:${GRAY_50};}
.mv-empty-t{font-size:13.5px;font-weight:700;color:${NAVY_900};}
.mv-empty-s{font-size:12.5px;color:${GRAY_500};margin-top:4px;}
.mv-loading{padding:22px;text-align:center;font-size:13px;color:${GRAY_500};}

.mv-list{display:flex;flex-direction:column;gap:8px;}
.mv-row{display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid ${GRAY_200};border-radius:11px;background:#fff;}
.mv-avatar{width:34px;height:34px;border-radius:10px;background:${ORANGE_50};color:${ORANGE_600};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;}
.mv-info{flex:1;min-width:0;}
.mv-nombre{font-size:13.5px;font-weight:700;color:${NAVY_900};letter-spacing:-.01em;}
.mv-meta{font-size:11.5px;color:${GRAY_500};margin-top:2px;display:flex;flex-wrap:wrap;gap:4px 10px;}
.mv-clave-box{display:flex;flex-direction:column;align-items:center;padding:5px 11px;border-radius:9px;background:${ORANGE_50};border:1px solid #FFD9C7;flex-shrink:0;}
.mv-clave-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ORANGE_600};}
.mv-clave-val{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;font-weight:800;letter-spacing:.14em;color:${ORANGE_600};}
/* Solo geometría: el color y la fuente van inline (ver estiloQuitar). */
.mv-quitar{border:1px solid transparent;border-radius:9px;padding:6px 11px;flex-shrink:0;transition:background-color .15s,border-color .15s,color .15s;}

.mv-form{border:1px solid ${GRAY_200};border-radius:12px;padding:16px;background:${GRAY_50};margin-bottom:14px;}
.mv-form-t{font-size:13.5px;font-weight:800;color:${NAVY_900};margin:0 0 12px;}
.mv-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:640px){.mv-grid{grid-template-columns:1fr;}}
.mv-label{display:block;font-size:12px;font-weight:600;color:${NAVY_900};margin-bottom:5px;}
.mv-hint{font-weight:400;color:${GRAY_500};}
.mv-input{width:100%;padding:9px 11px;border-radius:9px;border:1.5px solid ${GRAY_200};font-size:13.5px;outline:none;box-sizing:border-box;color:${NAVY_900};font-family:inherit;background:#fff;}
.mv-input:focus{border-color:${NAVY_900};}
.mv-form-actions{display:flex;gap:8px;margin-top:13px;}
`;

// ─── Estilos de botón, inline a propósito ─────────────────────────────────────
// index.css:106 tiene `.app button { font: inherit; color: inherit; }`, que por
// especificidad (0-1-1) le gana a las clases .mv-btn / .mv-quitar (0-1-0) y les
// roba el color, el peso y el tamaño. Inline es lo único que una regla global no
// puede pisar. Por lo mismo el hover va en estado de React: un :hover de CSS
// tampoco pisa un estilo inline.
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

// Primario: naranja sólido. Atenuado cuando está deshabilitado de verdad.
const estiloPrimario = (activo, hover) => ({
  ...FUENTE_BTN,
  cursor: activo ? 'pointer' : 'not-allowed',
  ...(activo
    ? {
        backgroundColor: hover ? ORANGE_600 : ORANGE_500,
        borderColor:     hover ? ORANGE_600 : ORANGE_500,
        color: '#fff',
      }
    : APAGADO),
});

// Destructivo: contorno rojo en reposo y rojo sólido al pasar el cursor. En
// reposo va en contorno para no gritar en cada fila de la lista.
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

// Botón Sí/No de la pregunta inicial: activo naranja sólido con texto blanco,
// inactivo blanco con borde gris. Todo inline: .app button pisa las clases.
const estiloToggle = (activo) => ({
  ...FUENTE_BTN,
  padding: '8px 20px',
  borderRadius: 9,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: activo ? ORANGE_500 : GRAY_BORDE,
  backgroundColor: activo ? ORANGE_500 : '#fff',
  color: activo ? '#fff' : NAVY_900,
  cursor: 'pointer',
});

// Chip de ministerio: usa el color del ministerio en el borde y el punto.
const estiloChip = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 999,
  border: `1px solid ${color || GRAY_200}`,
  background: '#fff',
  fontSize: 12,
  fontWeight: 600,
  color: NAVY_900,
});

const inicial = (n) => (n || '?').trim().charAt(0).toUpperCase();

function fechaCorta(d) {
  if (!d) return null;
  // La fecha llega como 'YYYY-MM-DD' o ISO; nos quedamos con la parte de fecha
  // y la formateamos a mano para no desfasarla por zona horaria.
  const s = String(d).slice(0, 10);
  const [a, m, dia] = s.split('-');
  if (!a || !m || !dia) return null;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(dia)} ${MESES[Number(m) - 1] ?? ''}`;
}

const VACIO = { nombre: '', whatsapp: '', cumpleanos: '', apodo: '' };

export default function MisVoluntarios() {
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [abierto,  setAbierto]  = useState(false);
  const [form,     setForm]     = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando]  = useState(null);
  const [flash,    setFlash]    = useState(null);
  // Hover en estado: los colores van inline y un :hover de CSS no los pisa.
  // hoverQuitar guarda el cuenta_id de la fila señalada, no un booleano.
  const [hoverGuardar, setHoverGuardar] = useState(false);
  const [hoverAgregar, setHoverAgregar] = useState(false);
  const [hoverQuitar,  setHoverQuitar]  = useState(null);
  // Flujo "ya sirve en otro ministerio": null = aún no elige; false = alta
  // normal; true = buscar a la persona por su WhatsApp.
  const [yaSirve,   setYaSirve]   = useState(null);
  const [buscando,  setBuscando]  = useState(false);
  const [resultado, setResultado] = useState(null); // respuesta de buscar-por-whatsapp
  const [agregando, setAgregando] = useState(false);
  const [hoverAgregarMin, setHoverAgregarMin] = useState(false);

  // Carga inicial. Se cancela si el componente se desmonta antes de responder.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await liderVoluntariosApi.getAll();
        if (vivo) setLista(Array.isArray(data) ? data : []);
      } catch (err) {
        if (vivo) setError(err.response?.data?.error || 'No se pudo cargar tu lista de voluntarios');
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const set = (campo) => (e) => {
    setForm(f => ({ ...f, [campo]: e.target.value }));
    setError('');
  };

  const listo = form.nombre.trim() && form.whatsapp.trim() && form.apodo.trim();

  const guardarActivo = Boolean(listo) && !guardando;

  // Recarga la lista desde el servidor. Se usa tras cada alta (nueva o
  // duplicada) para reflejar el estado real sin adivinar la forma de la
  // respuesta. Si falla, se conserva la lista previa: el alta ya quedó guardada.
  async function recargar() {
    try {
      const { data } = await liderVoluntariosApi.getAll();
      setLista(Array.isArray(data) ? data : []);
    } catch { /* la lista previa se queda tal cual */ }
  }

  // Cierra el formulario y deja el flujo en su estado inicial (sin elección).
  function cerrarYreset() {
    setAbierto(false);
    setForm(VACIO);
    setYaSirve(null);
    setResultado(null);
    setError('');
  }

  // Busca a la persona por su WhatsApp (flujo "ya sirve en otro ministerio").
  // Solo dispara con 10+ dígitos; con menos, limpia el resultado.
  async function buscar(wa) {
    const digits = String(wa || '').replace(/\D/g, '');
    if (digits.length < 10) { setResultado(null); return; }
    setBuscando(true);
    setError('');
    try {
      const { data } = await liderVoluntariosApi.buscarPorWhatsapp(digits);
      setResultado(data);
    } catch (err) {
      setResultado(null);
      setError(err.response?.data?.error || 'No se pudo buscar ese WhatsApp');
    } finally {
      setBuscando(false);
    }
  }

  // Debounce: al teclear el WhatsApp en el flujo "sí", busca 450ms después de
  // la última tecla (o de inmediato en el onBlur del input).
  useEffect(() => {
    if (yaSirve !== true) return;
    const digits = form.whatsapp.replace(/\D/g, '');
    if (digits.length < 10) { setResultado(null); return; }
    const t = setTimeout(() => { buscar(form.whatsapp); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.whatsapp, yaSirve]);

  // Agrega a mi ministerio a una persona que YA existe. Reutiliza el POST de
  // creación del líder: el backend detecta el duplicado por WhatsApp y SOLO
  // suma el ministerio (no crea cuenta nueva, no regenera clave, no toca el
  // apodo). Mandamos nombre/apodo de la ficha existente solo para pasar la
  // validación del endpoint; el camino duplicado los ignora.
  async function agregarAMiMinisterio() {
    const v = resultado?.voluntario;
    if (!v || agregando) return;
    setAgregando(true);
    setError('');
    try {
      await liderVoluntariosApi.create({
        nombre:   v.nombre,
        apodo:    v.apodo || v.nombre,
        whatsapp: v.whatsapp,
      });
      setFlash({ mensaje: `${v.nombre} agregado a tu ministerio.` });
      cerrarYreset();
      await recargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo agregar a tu ministerio');
    } finally {
      setAgregando(false);
    }
  }

  async function guardar() {
    if (!listo || guardando) return;
    setGuardando(true);
    setError('');
    try {
      const { data } = await liderVoluntariosApi.create({
        nombre:     form.nombre.trim(),
        whatsapp:   form.whatsapp.trim(),
        apodo:      form.apodo.trim(),
        cumpleanos: form.cumpleanos || null,
      });
      if (data?.duplicado) {
        // Ya existía esa persona en el campus: el backend agregó MI ministerio a
        // su ficha, sin crear cuenta nueva ni regenerar su clave.
        setFlash({
          mensaje: data.ya_estaba_en_mi_ministerio
            ? `${data.nombre} ya está en tu equipo.`
            : `${data.nombre} ya estaba registrado. Lo agregamos a tu ministerio.`,
        });
      } else {
        // Alta nueva: se muestra su clave para que el líder se la pase.
        setFlash({ nombre: data.nombre, clave: data.clave });
      }
      setForm(VACIO);
      setAbierto(false);
      await recargar();
    } catch (err) {
      // 400/409 traen el motivo del backend; se muestra sin tumbar la pantalla.
      setError(err.response?.data?.error || 'No se pudo agregar al voluntario');
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(v) {
    if (!window.confirm(`¿Seguro que quieres quitar a ${v.nombre}?`)) return;
    setQuitando(v.cuenta_id);
    setError('');
    try {
      await liderVoluntariosApi.remove(v.cuenta_id);
      setLista(l => l.filter(x => x.cuenta_id !== v.cuenta_id));
      if (flash?.nombre === v.nombre) setFlash(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo quitar al voluntario');
    } finally {
      setQuitando(null);
    }
  }

  return (
    <div>
      <style>{CSS}</style>

      <div className="mv-head">
        <div>
          <h2 className="mv-h2">Mis voluntarios</h2>
          <div className="mv-h2-note">
            Los que has dado de alta. Su clave son los últimos 4 de su WhatsApp.
          </div>
        </div>
        {!abierto && (
          <button
            className="mv-btn"
            style={estiloPrimario(true, hoverAgregar)}
            onMouseEnter={() => setHoverAgregar(true)}
            onMouseLeave={() => setHoverAgregar(false)}
            onClick={() => { setAbierto(true); setError(''); setYaSirve(null); setResultado(null); setForm(VACIO); }}
          >
            + Agregar voluntario
          </button>
        )}
      </div>

      {flash && (
        <div className="mv-flash">
          {flash.clave ? (
            <>
              <span className="mv-flash-txt">Clave de {flash.nombre}:</span>
              <span className="mv-flash-clave">{flash.clave}</span>
              <span className="mv-flash-txt">— pásasela</span>
            </>
          ) : (
            <span className="mv-flash-txt">{flash.mensaje}</span>
          )}
          <button className="mv-flash-x" onClick={() => setFlash(null)} aria-label="Cerrar">✕</button>
        </div>
      )}

      {error && <div className="mv-error">{error}</div>}

      {abierto && (
        <div className="mv-form">
          <p className="mv-form-t">Nuevo voluntario</p>

          {/* Pregunta inicial: decide qué campos se muestran. */}
          <div style={{ marginBottom: yaSirve === null ? 4 : 16 }}>
            <label className="mv-label">¿Ya sirve en otro ministerio?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                style={estiloToggle(yaSirve === true)}
                onClick={() => { setYaSirve(true); setResultado(null); setError(''); }}>
                Sí
              </button>
              <button type="button"
                style={estiloToggle(yaSirve === false)}
                onClick={() => { setYaSirve(false); setResultado(null); setError(''); }}>
                No
              </button>
            </div>
          </div>

          {/* ── NO → formulario completo actual, sin cambios ── */}
          {yaSirve === false && (
            <>
              <div className="mv-grid">
                <div>
                  <label className="mv-label" htmlFor="mv-nombre">Nombre completo</label>
                  <input id="mv-nombre" className="mv-input" type="text" value={form.nombre}
                    onChange={set('nombre')} placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="mv-label" htmlFor="mv-wa">
                    WhatsApp <span className="mv-hint">(de aquí sale su clave)</span>
                  </label>
                  <input id="mv-wa" className="mv-input" type="tel" inputMode="numeric" value={form.whatsapp}
                    onChange={set('whatsapp')} placeholder="4491234567" />
                </div>
                <div>
                  <label className="mv-label" htmlFor="mv-cumple">
                    Cumpleaños <span className="mv-hint">(opcional)</span>
                  </label>
                  <input id="mv-cumple" className="mv-input" type="date" value={form.cumpleanos}
                    onChange={set('cumpleanos')} />
                </div>
                <div>
                  <label className="mv-label" htmlFor="mv-apodo">
                    Nombre de acceso <span className="mv-hint">(con esto entra)</span>
                  </label>
                  <input id="mv-apodo" className="mv-input" type="text" value={form.apodo}
                    onChange={set('apodo')} placeholder="juanito" />
                </div>
              </div>
              <div className="mv-form-actions">
                <button
                  className="mv-btn"
                  style={estiloPrimario(guardarActivo, hoverGuardar)}
                  onMouseEnter={() => setHoverGuardar(true)}
                  onMouseLeave={() => setHoverGuardar(false)}
                  onClick={guardar}
                  disabled={!listo || guardando}
                >
                  {guardando ? 'Guardando…' : 'Guardar voluntario'}
                </button>
                <button className="mv-btn mv-btn-ghost" onClick={cerrarYreset}>
                  Cancelar
                </button>
              </div>
            </>
          )}

          {/* ── SÍ → solo WhatsApp + búsqueda de la persona ── */}
          {yaSirve === true && (
            <>
              <div>
                <label className="mv-label" htmlFor="mv-wa-busca">WhatsApp de la persona</label>
                <input id="mv-wa-busca" className="mv-input" type="tel" inputMode="numeric"
                  value={form.whatsapp} onChange={set('whatsapp')}
                  onBlur={() => buscar(form.whatsapp)} placeholder="4491234567" autoFocus />
              </div>

              {buscando && (
                <div style={{ fontSize: 12.5, color: GRAY_500, marginTop: 10 }}>Buscando…</div>
              )}

              {/* No existe: ofrecer registrarlo como nuevo (conserva el whatsapp). */}
              {!buscando && resultado && !resultado.existe && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12.5, color: GRAY_500 }}>
                    No encontramos a nadie con ese WhatsApp. Regístralo como nuevo.
                  </div>
                  <button type="button"
                    className="mv-btn"
                    style={{ ...estiloPrimario(true, false), marginTop: 10 }}
                    onClick={() => { setYaSirve(false); setResultado(null); }}>
                    Registrar como nuevo
                  </button>
                </div>
              )}

              {/* Existe y NO está en mi ministerio: datos solo lectura + agregar. */}
              {!buscando && resultado?.existe && resultado.voluntario && !resultado.voluntario.ya_en_mi_ministerio && (
                <div style={{ marginTop: 12 }}>
                  <div className="mv-grid">
                    <div>
                      <label className="mv-label">Nombre completo</label>
                      <input className="mv-input" readOnly style={{ backgroundColor: READONLY_BG, color: GRAY_500 }}
                        value={resultado.voluntario.nombre || ''} />
                    </div>
                    <div>
                      <label className="mv-label">Cumpleaños</label>
                      <input className="mv-input" readOnly style={{ backgroundColor: READONLY_BG, color: GRAY_500 }}
                        value={fechaCorta(resultado.voluntario.cumpleanos) || '—'} />
                    </div>
                    <div>
                      <label className="mv-label">Nombre de acceso</label>
                      <input className="mv-input" readOnly style={{ backgroundColor: READONLY_BG, color: GRAY_500 }}
                        value={resultado.voluntario.apodo || '—'} />
                    </div>
                    <div>
                      <label className="mv-label">Clave de ingreso</label>
                      <input className="mv-input" readOnly style={{ backgroundColor: READONLY_BG, color: GRAY_500 }}
                        value={resultado.voluntario.clave || '—'} />
                    </div>
                  </div>

                  {resultado.voluntario.ministerios?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {resultado.voluntario.ministerios.map((m) => (
                        <span key={m.id} style={estiloChip(m.color)}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color || GRAY_500 }} />
                          {m.nombre}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{
                    marginTop: 12, padding: '10px 12px', borderRadius: 10,
                    background: ORANGE_50, border: '1px solid #FFD9C7',
                    fontSize: 13, fontWeight: 700, color: ORANGE_600,
                  }}>
                    También es voluntario en este ministerio
                  </div>

                  <div className="mv-form-actions">
                    <button
                      className="mv-btn"
                      style={estiloPrimario(!agregando, hoverAgregarMin)}
                      onMouseEnter={() => setHoverAgregarMin(true)}
                      onMouseLeave={() => setHoverAgregarMin(false)}
                      onClick={agregarAMiMinisterio}
                      disabled={agregando}
                    >
                      {agregando ? 'Agregando…' : 'Agregar a mi ministerio'}
                    </button>
                    <button className="mv-btn mv-btn-ghost" onClick={cerrarYreset}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Existe y YA está en mi ministerio: aviso + guardar deshabilitado. */}
              {!buscando && resultado?.existe && resultado.voluntario?.ya_en_mi_ministerio && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY_900 }}>
                    {resultado.voluntario.nombre} ya está en tu equipo.
                  </div>
                  <div className="mv-form-actions">
                    <button className="mv-btn" style={estiloPrimario(false, false)} disabled>
                      Agregar a mi ministerio
                    </button>
                    <button className="mv-btn mv-btn-ghost" onClick={cerrarYreset}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Aún sin resultado accionable: solo cancelar. */}
              {!(resultado?.existe) && (
                <div className="mv-form-actions">
                  <button className="mv-btn mv-btn-ghost" onClick={cerrarYreset}>
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}

          {/* Aún sin elegir Sí/No: solo cancelar. */}
          {yaSirve === null && (
            <div className="mv-form-actions">
              <button className="mv-btn mv-btn-ghost" onClick={cerrarYreset}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {cargando ? (
        <div className="mv-loading">Cargando…</div>
      ) : lista.length === 0 ? (
        <div className="mv-empty">
          <div className="mv-empty-t">Todavía no tienes voluntarios</div>
          <div className="mv-empty-s">Agrega al primero y aquí aparecerá su clave de acceso.</div>
        </div>
      ) : (
        <div className="mv-list">
          {lista.map((v) => {
            const cumple = fechaCorta(v.cumpleanos);
            return (
              <div key={v.cuenta_id} className="mv-row">
                <div className="mv-avatar">{inicial(v.nombre)}</div>
                <div className="mv-info">
                  <div className="mv-nombre">{v.nombre}</div>
                  <div className="mv-meta">
                    <span>Nombre de acceso: <strong>{v.apodo}</strong></span>
                    {v.whatsapp && <span>{v.whatsapp}</span>}
                    {cumple && <span>🎂 {cumple}</span>}
                  </div>
                </div>
                <div className="mv-clave-box">
                  <span className="mv-clave-lbl">Clave</span>
                  <span className="mv-clave-val">{v.clave}</span>
                </div>
                <button
                  className="mv-quitar"
                  style={estiloQuitar(quitando !== v.cuenta_id, hoverQuitar === v.cuenta_id)}
                  onMouseEnter={() => setHoverQuitar(v.cuenta_id)}
                  onMouseLeave={() => setHoverQuitar(null)}
                  onClick={() => quitar(v)}
                  disabled={quitando === v.cuenta_id}
                >
                  {quitando === v.cuenta_id ? '…' : 'Quitar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
