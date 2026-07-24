import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { equiposApi } from '../../services/api';

// "Líderes y equipos" (stewardship): vista global de SOLO LECTURA. Una tarjeta
// por ministerio del campus con su(s) líder(es) y sus voluntarios CON CUENTA.
// NO es el "Directorio de voluntarios" viejo (fichas históricas sin cuenta): esta
// pantalla es del sistema nuevo de cuentas. Aquí no se crea ni edita nada; para
// asignar un líder hay un enlace a Configuración. El backend filtra por campus.

const NAVY_900   = '#112540';
const ORANGE_600 = '#E0561B';
const VERDE      = '#15915A';
const ROJO       = '#D23B36';
const AMBAR_50   = '#FFF7E6';
const AMBAR_700  = '#8A5A0B';
const GRAY_600   = '#5B6675';
const GRAY_500   = '#7A8699';
const GRAY_300   = '#CBD2DC';
const GRAY_200   = '#E2E6EC';
const GRAY_100   = '#EEF1F5';
const GRAY_50    = '#F6F7F9';

const CSS = `
.eq-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;width:100%;}
.eq-head{margin-bottom:14px;}
.eq-h2{font-size:16px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};margin:0;}
.eq-h2-note{font-size:12.5px;color:${GRAY_500};margin-top:3px;line-height:1.5;}
.eq-h2-note a{color:${ORANGE_600};font-weight:700;text-decoration:none;}

.eq-summary{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 18px;}
.eq-stat{flex:1;min-width:150px;border:1px solid ${GRAY_200};border-radius:12px;background:#fff;padding:12px 14px;}
.eq-stat-n{font-size:22px;font-weight:800;letter-spacing:-.03em;color:${NAVY_900};line-height:1;font-variant-numeric:tabular-nums;}
.eq-stat-l{font-size:11.5px;color:${GRAY_500};font-weight:600;margin-top:5px;}

.eq-error{margin:12px 0;padding:12px 14px;border-radius:12px;background:#FCEBEA;border:1px solid #F3CBC9;color:${ROJO};font-size:13px;font-weight:600;}
.eq-loading{padding:26px;text-align:center;font-size:13px;color:${GRAY_500};}
.eq-empty{padding:30px 20px;text-align:center;border:1px dashed ${GRAY_200};border-radius:14px;background:${GRAY_50};}
.eq-empty-t{font-size:14px;font-weight:800;color:${NAVY_900};}
.eq-empty-s{font-size:12.5px;color:${GRAY_500};margin-top:6px;}

.eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;align-items:start;}
.eq-card{border:1px solid ${GRAY_200};border-radius:16px;background:#fff;padding:0;overflow:hidden;display:flex;flex-direction:column;min-width:0;}
.eq-card-h{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid ${GRAY_100};}
.eq-bar{width:5px;align-self:stretch;border-radius:3px;flex-shrink:0;min-height:26px;}
.eq-min-nombre{font-size:15px;font-weight:800;letter-spacing:-.02em;color:${NAVY_900};flex:1;min-width:0;overflow-wrap:anywhere;}
.eq-count{flex-shrink:0;font-size:11px;font-weight:800;color:${GRAY_600};background:${GRAY_100};border-radius:999px;padding:3px 10px;font-variant-numeric:tabular-nums;}

.eq-body{padding:12px 16px 16px;display:flex;flex-direction:column;gap:12px;}
.eq-lider-box{}
.eq-sec-lbl{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${GRAY_500};margin-bottom:6px;}
.eq-lider{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:${NAVY_900};}
.eq-lider-dot{width:7px;height:7px;border-radius:50%;background:${VERDE};flex-shrink:0;}
.eq-lider + .eq-lider{margin-top:5px;}
.eq-nolider{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:700;color:${AMBAR_700};background:${AMBAR_50};border:1px solid #FCE7C3;border-radius:10px;padding:8px 11px;}
.eq-nolider a{color:${ORANGE_600};font-weight:700;text-decoration:none;}

.eq-vols{display:flex;flex-direction:column;gap:6px;}
.eq-vol{display:flex;align-items:baseline;gap:8px;min-width:0;}
.eq-vol-nombre{font-size:13px;font-weight:600;color:${NAVY_900};overflow-wrap:anywhere;}
.eq-vol-apodo{font-size:11.5px;color:${GRAY_500};font-weight:500;}
.eq-inactivo{font-size:9.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:${GRAY_500};background:${GRAY_100};border-radius:5px;padding:1px 6px;flex-shrink:0;}
.eq-vol.eq-off .eq-vol-nombre{color:${GRAY_500};}
.eq-novols{font-size:12px;color:${GRAY_500};font-style:italic;}
`;

export default function EquiposPage() {
  const [ministerios, setMinisterios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data } = await equiposApi.getAll();
        if (vivo) { setMinisterios(Array.isArray(data.ministerios) ? data.ministerios : []); setError(''); }
      } catch (err) {
        if (vivo) { setError(err.response?.data?.error || 'No se pudieron cargar los equipos'); setMinisterios([]); }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const resumen = useMemo(() => {
    const conLider = ministerios.filter(m => m.lideres.length > 0).length;
    const totalVol = ministerios.reduce((n, m) => n + (m.total_voluntarios || 0), 0);
    return { total: ministerios.length, conLider, totalVol };
  }, [ministerios]);

  return (
    <div className="eq-root">
      <style>{CSS}</style>

      <div className="eq-head">
        <h2 className="eq-h2">Líderes y equipos</h2>
        <div className="eq-h2-note">
          Cómo está organizado cada ministerio del campus: su líder y sus voluntarios con cuenta.
          Solo lectura — los líderes se asignan en <Link to="/stewardship/configuracion">Configuración</Link>.
        </div>
      </div>

      {!cargando && !error && ministerios.length > 0 && (
        <div className="eq-summary">
          <div className="eq-stat"><div className="eq-stat-n">{resumen.total}</div><div className="eq-stat-l">Ministerios</div></div>
          <div className="eq-stat"><div className="eq-stat-n">{resumen.conLider}</div><div className="eq-stat-l">Con líder asignado</div></div>
          <div className="eq-stat"><div className="eq-stat-n">{resumen.totalVol}</div><div className="eq-stat-l">Voluntarios con cuenta</div></div>
        </div>
      )}

      {error && <div className="eq-error">{error}</div>}

      {cargando ? (
        <div className="eq-loading">Cargando equipos…</div>
      ) : ministerios.length === 0 && !error ? (
        <div className="eq-empty">
          <div className="eq-empty-t">Aún no hay ministerios en este campus</div>
          <div className="eq-empty-s">Créalos en Configuración para empezar a armar los equipos.</div>
        </div>
      ) : (
        <div className="eq-grid">
          {ministerios.map((m) => {
            const acento = m.color || GRAY_300;
            return (
              <div key={m.id} className="eq-card">
                <div className="eq-card-h">
                  <span className="eq-bar" style={{ background: acento }} />
                  <span className="eq-min-nombre">{m.nombre}</span>
                  <span className="eq-count">{m.total_voluntarios} {m.total_voluntarios === 1 ? 'voluntario' : 'voluntarios'}</span>
                </div>

                <div className="eq-body">
                  {/* Líder(es) */}
                  <div className="eq-lider-box">
                    <div className="eq-sec-lbl">{m.lideres.length > 1 ? 'Líderes' : 'Líder'}</div>
                    {m.lideres.length === 0 ? (
                      <div className="eq-nolider">
                        ⚠ Sin líder asignado
                        <Link to="/stewardship/configuracion">Asignar</Link>
                      </div>
                    ) : (
                      m.lideres.map((l) => (
                        <div key={l.id} className={`eq-lider ${l.activo === false ? 'eq-off' : ''}`}>
                          <span className="eq-lider-dot" style={{ background: l.activo === false ? GRAY_300 : VERDE }} />
                          <span>{l.nombre}</span>
                          {l.activo === false && <span className="eq-inactivo">Inactivo</span>}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Voluntarios */}
                  <div>
                    <div className="eq-sec-lbl">Voluntarios</div>
                    {m.voluntarios.length === 0 ? (
                      <div className="eq-novols">Sin voluntarios todavía</div>
                    ) : (
                      <div className="eq-vols">
                        {m.voluntarios.map((v) => (
                          <div key={v.id} className={`eq-vol ${v.activo === false ? 'eq-off' : ''}`}>
                            <span className="eq-vol-nombre">{v.nombre}</span>
                            {v.apodo && <span className="eq-vol-apodo">· {v.apodo}</span>}
                            {v.activo === false && <span className="eq-inactivo">Inactivo</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
