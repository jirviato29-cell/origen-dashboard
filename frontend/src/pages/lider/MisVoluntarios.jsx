import { useEffect, useState } from 'react';
import { liderVoluntariosApi } from '../../services/api';

// "Mis voluntarios": el líder da de alta voluntarios nuevos y el backend les
// crea ficha + cuenta. La clave son los últimos 4 de su WhatsApp y se muestra
// en claro aquí para que el líder se la pase.

const NAVY_900 = '#112540';
const NAVY_300 = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';
const ORANGE_600 = '#E0561B';
const ORANGE_50 = '#FFF4EE';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50 = '#F6F7F9';
const RED = '#EF4444';
const GREEN_50 = '#ECFDF5';
const GREEN_700 = '#047857';

const CSS = `
.mv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.mv-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.mv-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;}
.mv-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;border:none;background:${NAVY_900};color:#fff;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s;}
.mv-btn:hover{background:#1B3A63;}
.mv-btn:disabled{background:${GRAY_100};color:${GRAY_500};cursor:not-allowed;}
.mv-btn-accent{background:${ORANGE_500};}
.mv-btn-accent:hover{background:${ORANGE_600};}
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
.mv-quitar{background:none;border:0;color:${NAVY_300};cursor:pointer;font-size:12px;font-weight:600;padding:6px;flex-shrink:0;font-family:inherit;}
.mv-quitar:hover{color:${RED};}
.mv-quitar:disabled{opacity:.5;cursor:not-allowed;}

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
      setLista(l => [...l, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setFlash({ nombre: data.nombre, clave: data.clave });
      setForm(VACIO);
      setAbierto(false);
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
          <button className="mv-btn mv-btn-accent" onClick={() => { setAbierto(true); setError(''); }}>
            + Agregar voluntario
          </button>
        )}
      </div>

      {flash && (
        <div className="mv-flash">
          <span className="mv-flash-txt">Clave de {flash.nombre}:</span>
          <span className="mv-flash-clave">{flash.clave}</span>
          <span className="mv-flash-txt">— pásasela</span>
          <button className="mv-flash-x" onClick={() => setFlash(null)} aria-label="Cerrar">✕</button>
        </div>
      )}

      {error && <div className="mv-error">{error}</div>}

      {abierto && (
        <div className="mv-form">
          <p className="mv-form-t">Nuevo voluntario</p>
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
                Apodo <span className="mv-hint">(con esto entra)</span>
              </label>
              <input id="mv-apodo" className="mv-input" type="text" value={form.apodo}
                onChange={set('apodo')} placeholder="juanito" />
            </div>
          </div>
          <div className="mv-form-actions">
            <button className="mv-btn" onClick={guardar} disabled={!listo || guardando}>
              {guardando ? 'Guardando…' : 'Guardar voluntario'}
            </button>
            <button className="mv-btn mv-btn-ghost"
              onClick={() => { setAbierto(false); setForm(VACIO); setError(''); }}>
              Cancelar
            </button>
          </div>
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
                    <span>Apodo: <strong>{v.apodo}</strong></span>
                    {v.whatsapp && <span>{v.whatsapp}</span>}
                    {cumple && <span>🎂 {cumple}</span>}
                  </div>
                </div>
                <div className="mv-clave-box">
                  <span className="mv-clave-lbl">Clave</span>
                  <span className="mv-clave-val">{v.clave}</span>
                </div>
                <button className="mv-quitar" onClick={() => quitar(v)} disabled={quitando === v.cuenta_id}>
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
