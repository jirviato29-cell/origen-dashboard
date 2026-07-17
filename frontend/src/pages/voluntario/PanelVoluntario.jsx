import { useEffect, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../../services/api';

// Calendario de disponibilidad del voluntario: marca por domingo y por evento.
// El bloqueo (2 días antes) y el campus los decide el backend; aquí solo se
// pintan. Nunca se confía en el `bloqueado` local para autorizar: el POST se
// revalida en el servidor.

const NAVY_900 = '#112540';
const NAVY_300 = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';
const VERDE = '#15915A';
const VERDE_50 = '#E8F5EF';
const ROJO = '#D23B36';
const ROJO_50 = '#FCEBEA';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50 = '#F6F7F9';

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CSS = `
.cv-wrap{max-width:560px;margin:0 auto;padding:0 20px;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.cv-card{background:#fff;border-radius:18px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);border:1px solid ${GRAY_200};}

.cv-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;}
.cv-mes{font-size:16px;font-weight:800;color:${NAVY_900};letter-spacing:-.02em;text-transform:capitalize;}
.cv-mes-sub{font-size:11px;color:${GRAY_500};margin-top:1px;}
.cv-flecha{width:32px;height:32px;border-radius:9px;border:1px solid ${GRAY_200};background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

.cv-sem{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:5px;}
.cv-sem-d{text-align:center;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${GRAY_500};padding:3px 0;}
.cv-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
.cv-celda{aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;font-size:13px;}
.cv-vacia{background:transparent;}
.cv-apagado{color:${NAVY_300};background:${GRAY_50};}
.cv-num{font-weight:700;line-height:1;}
.cv-punto{position:absolute;bottom:6px;width:5px;height:5px;border-radius:50%;background:${ORANGE_500};}
.cv-candado{position:absolute;top:3px;right:4px;font-size:8px;opacity:.75;}

.cv-leyenda{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:12px;padding-top:11px;border-top:1px solid ${GRAY_100};}
.cv-leyenda-i{display:flex;align-items:center;gap:5px;font-size:10.5px;color:${GRAY_500};font-weight:600;}
.cv-leyenda-c{width:9px;height:9px;border-radius:3px;flex-shrink:0;}

.cv-panel{margin-top:14px;background:#fff;border-radius:18px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);border:1px solid ${GRAY_200};}
.cv-panel-f{font-size:14px;font-weight:800;color:${NAVY_900};letter-spacing:-.02em;text-transform:capitalize;}
.cv-item{border-top:1px solid ${GRAY_100};padding-top:12px;margin-top:12px;}
.cv-item:first-of-type{border-top:0;padding-top:0;margin-top:12px;}
.cv-item-n{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:${NAVY_900};margin-bottom:9px;}
.cv-chip{font-size:9.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;padding:2px 6px;border-radius:5px;background:#FFF4EE;color:#E0561B;}
.cv-acciones{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.cv-accion{padding:12px;border-radius:11px;border:1.5px solid;}
.cv-aviso{margin-top:10px;padding:10px 12px;border-radius:10px;background:${GRAY_50};border:1px solid ${GRAY_200};font-size:12px;color:${GRAY_500};font-weight:600;}
.cv-error{margin-top:12px;padding:11px 13px;border-radius:10px;background:${ROJO_50};border:1px solid #F3CBC9;color:${ROJO};font-size:12.5px;font-weight:600;}
.cv-estado{margin-top:10px;text-align:center;font-size:12px;color:${GRAY_500};}
.cv-vacio{padding:26px 10px;text-align:center;font-size:12.5px;color:${GRAY_500};}
`;

// index.css:106 tiene `.app button { font: inherit; color: inherit; }`. Los
// colores de los botones van inline para que una regla global no los pise.
const FUENTE_BTN = {
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 13,
};

const estiloAccion = (activo, color, colorSuave, habilitado) => ({
  ...FUENTE_BTN,
  fontSize: 14,
  cursor: habilitado ? 'pointer' : 'not-allowed',
  backgroundColor: activo ? color : (habilitado ? '#fff' : GRAY_100),
  borderColor:     activo ? color : (habilitado ? colorSuave : GRAY_200),
  color:           activo ? '#fff' : (habilitado ? color : GRAY_500),
});

const estiloFlecha = (habilitada) => ({
  ...FUENTE_BTN,
  fontSize: 15,
  color: habilitada ? NAVY_900 : GRAY_200,
  cursor: habilitada ? 'pointer' : 'not-allowed',
});

// ── Helpers de mes ───────────────────────────────────────────────────────────
// Aritmética sobre 'YYYY-MM' en UTC: nunca construimos fechas locales, que se
// correrían de día según la zona del navegador.
const mesDeHoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};
const sumaMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const tituloMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
};
const diaDeISO = (iso) => Number(iso.slice(8, 10));

export default function PanelVoluntario() {
  const [mes,      setMes]      = useState(mesDeHoy);
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [sel,      setSel]      = useState(null);   // fecha 'YYYY-MM-DD'
  const [aviso,    setAviso]    = useState('');
  const [enviando, setEnviando] = useState(null);   // clave del día que se envía
  const [recarga,  setRecarga]  = useState(0);      // fuerza refetch del mes actual

  // La carga vive dentro del efecto y todos los setState ocurren después del
  // await: llamarlos de forma síncrona desde un efecto encadena renders.
  // El "cargando" lo enciende quien dispara la acción (ver irAMes).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: d } = await voluntarioDisponibilidadApi.getMes(mes);
        if (vivo) { setData(d); setError(''); }
      } catch (err) {
        if (vivo) {
          setError(err.response?.data?.error || 'No se pudo cargar tu calendario');
          setData(null);
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [mes, recarga]);

  // El día seleccionado se limpia aquí y no en el efecto: cambiar de mes es lo
  // único que lo invalida, y así el efecto solo se ocupa de cargar.
  const irAMes = (n) => {
    setCargando(true);
    setMes(m => sumaMes(m, n));
    setSel(null);
    setAviso('');
  };

  // Los días marcables de cada fecha (un domingo con evento tiene dos).
  const marcablesDe = (fecha) => (data?.dias ?? []).filter(d => d.fecha === fecha);

  function tocarDia(fecha) {
    const ms = marcablesDe(fecha);
    if (ms.length === 0) return;
    if (ms.every(m => m.bloqueado)) {
      setSel(fecha);
      setAviso(ms[0].tipo === 'domingo'
        ? 'Ya cerró el cambio para este domingo'
        : 'Ya cerró el cambio para esta fecha');
      return;
    }
    setAviso('');
    setSel(fecha);
  }

  async function marcar(dia, estado) {
    const clave = `${dia.fecha}-${dia.evento_id ?? 'dom'}`;
    setEnviando(clave);
    setError('');
    try {
      await voluntarioDisponibilidadApi.marcar({
        fecha: dia.fecha,
        evento_id: dia.evento_id,
        estado,
      });
      // Refleja el cambio sin recargar todo el mes.
      setData(d => ({
        ...d,
        dias: d.dias.map(x =>
          x.fecha === dia.fecha && x.evento_id === dia.evento_id ? { ...x, estado } : x
        ),
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar tu respuesta');
      // Si el servidor dice que ya cerró, el mes local está viejo: recárgalo.
      if (err.response?.status === 403) { setCargando(true); setRecarga(n => n + 1); }
    } finally {
      setEnviando(null);
    }
  }

  // ── Celdas del grid ────────────────────────────────────────────────────────
  const celdas = [];
  if (data) {
    for (let i = 0; i < data.diaSemanaPrimero; i++) celdas.push(null);
    for (let d = 1; d <= data.diasEnMes; d++) {
      celdas.push(`${data.mes}-${String(d).padStart(2, '0')}`);
    }
  }

  const estiloCelda = (ms) => {
    // El color lo manda el domingo si lo hay; si no, el evento.
    const principal = ms.find(m => m.tipo === 'domingo') ?? ms[0];
    const bloqueado = ms.every(m => m.bloqueado);
    const base = { cursor: bloqueado ? 'default' : 'pointer', border: '1.5px solid' };
    if (principal.estado === 'disponible') {
      return { ...base, backgroundColor: bloqueado ? VERDE_50 : VERDE, borderColor: VERDE,
               color: bloqueado ? VERDE : '#fff', opacity: bloqueado ? .65 : 1 };
    }
    if (principal.estado === 'no_disponible') {
      return { ...base, backgroundColor: bloqueado ? ROJO_50 : ROJO, borderColor: ROJO,
               color: bloqueado ? ROJO : '#fff', opacity: bloqueado ? .65 : 1 };
    }
    return { ...base, backgroundColor: '#fff', borderColor: bloqueado ? GRAY_200 : NAVY_900,
             color: NAVY_900, opacity: bloqueado ? .5 : 1 };
  };

  const seleccionados = sel ? marcablesDe(sel) : [];

  return (
    <>
      <style>{CSS}</style>

      <div className="cv-wrap">
        <div className="cv-card">
          <div className="cv-nav">
            <button className="cv-flecha" style={estiloFlecha(true)}
              onClick={() => irAMes(-1)} aria-label="Mes anterior">‹</button>
            <div style={{ textAlign: 'center' }}>
              <div className="cv-mes">{tituloMes(mes)}</div>
              <div className="cv-mes-sub">Marca los domingos y eventos</div>
            </div>
            <button className="cv-flecha" style={estiloFlecha(true)}
              onClick={() => irAMes(1)} aria-label="Mes siguiente">›</button>
          </div>

          <div className="cv-sem">
            {DIAS_SEM.map(d => <div key={d} className="cv-sem-d">{d}</div>)}
          </div>

          {cargando ? (
            <div className="cv-vacio">Cargando tu calendario…</div>
          ) : !data ? (
            <div className="cv-vacio">Sin datos de este mes.</div>
          ) : (
            <div className="cv-grid">
              {celdas.map((fecha, i) => {
                if (!fecha) return <div key={`v${i}`} className="cv-celda cv-vacia" />;
                const ms = marcablesDe(fecha);
                const num = diaDeISO(fecha);

                if (ms.length === 0) {
                  return (
                    <div key={fecha} className="cv-celda cv-apagado">
                      <span className="cv-num">{num}</span>
                    </div>
                  );
                }

                const bloqueado = ms.every(m => m.bloqueado);
                const hayEvento = ms.some(m => m.tipo === 'evento');
                const esSel = sel === fecha;
                const st = estiloCelda(ms);

                return (
                  <button
                    key={fecha}
                    className="cv-celda"
                    style={{
                      ...FUENTE_BTN,
                      ...st,
                      boxShadow: esSel ? `0 0 0 2px ${ORANGE_500}` : 'none',
                    }}
                    onClick={() => tocarDia(fecha)}
                    title={ms.map(m => m.nombre).join(' · ')}
                  >
                    <span className="cv-num">{num}</span>
                    {bloqueado && <span className="cv-candado">🔒</span>}
                    {hayEvento && <span className="cv-punto" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="cv-leyenda">
            <span className="cv-leyenda-i">
              <span className="cv-leyenda-c" style={{ background: VERDE }} />Sí sirvo</span>
            <span className="cv-leyenda-i">
              <span className="cv-leyenda-c" style={{ background: ROJO }} />No puedo</span>
            <span className="cv-leyenda-i">
              <span className="cv-leyenda-c" style={{ background: '#fff', border: `1.5px solid ${NAVY_900}` }} />Sin responder</span>
            <span className="cv-leyenda-i">
              <span className="cv-leyenda-c" style={{ background: ORANGE_500, borderRadius: '50%' }} />Evento</span>
            <span className="cv-leyenda-i">🔒 Ya cerró</span>
          </div>
        </div>

        {error && <div className="cv-error">{error}</div>}

        {sel && seleccionados.length > 0 && (
          <div className="cv-panel">
            <div className="cv-panel-f">
              {DIAS_SEM[(data.diaSemanaPrimero + diaDeISO(sel) - 1) % 7]} {diaDeISO(sel)} de {tituloMes(mes)}
            </div>

            {seleccionados.map((dia) => {
              const clave = `${dia.fecha}-${dia.evento_id ?? 'dom'}`;
              const ocupado = enviando === clave;
              const habilitado = !dia.bloqueado && !ocupado;
              return (
                <div key={clave} className="cv-item">
                  <div className="cv-item-n">
                    {dia.tipo === 'evento' && <span className="cv-chip">Evento</span>}
                    {dia.nombre}
                    {dia.bloqueado && <span style={{ color: GRAY_500, fontWeight: 600 }}>· 🔒 ya cerró</span>}
                  </div>
                  <div className="cv-acciones">
                    <button
                      className="cv-accion"
                      style={estiloAccion(dia.estado === 'disponible', VERDE, '#A7D9C2', habilitado)}
                      onClick={() => marcar(dia, 'disponible')}
                      disabled={!habilitado}
                    >
                      {ocupado ? '…' : 'Sí sirvo'}
                    </button>
                    <button
                      className="cv-accion"
                      style={estiloAccion(dia.estado === 'no_disponible', ROJO, '#F3CBC9', habilitado)}
                      onClick={() => marcar(dia, 'no_disponible')}
                      disabled={!habilitado}
                    >
                      {ocupado ? '…' : 'No puedo'}
                    </button>
                  </div>
                </div>
              );
            })}

            {aviso && <div className="cv-aviso">🔒 {aviso}</div>}
          </div>
        )}

        {sel && seleccionados.length === 0 && aviso && (
          <div className="cv-panel"><div className="cv-aviso">🔒 {aviso}</div></div>
        )}

        {!cargando && data && (
          <div className="cv-estado">
            Los cambios cierran 2 días antes de cada fecha.
          </div>
        )}
      </div>
    </>
  );
}
