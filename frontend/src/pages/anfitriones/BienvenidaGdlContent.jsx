import { fmtFechaShort } from '../../utils/fecha';
import { I } from '../../components/Icons';
import useBienvenidaData from './useBienvenidaData';
import VisitanteModal from './VisitanteModal';

const MINT = '#0E9E8C', MINT_SOFT = 'rgba(14,158,140,.12)';
const CORAL = '#D2674A', CORAL_SOFT = 'rgba(210,103,74,.16)', CORAL_TXT = '#B0502F';
const INK = '#16161A', INK3 = '#7C7C7C', INK5 = '#9A9A9A';
const BORDER = '#E4E4E4', SURF = '#FFFFFF', SURF2 = '#FAFAFA', SURF3 = '#F0F0F0';
const GREEN_600 = '#15915A', GREEN_50 = '#E6F5EC';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function initials(nombre) {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function relInfo(relacion) {
  if (relacion === 'Me interesa seguir')   return { cls: 'bgc-rel-seguir', txt: 'Me interesa seguir' };
  if (relacion === 'Solo vengo de visita') return { cls: 'bgc-rel-visita', txt: 'Solo vengo de visita' };
  return { cls: 'bgc-rel-visita', txt: 'Sin definir' };
}

const WaIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 9.5c0 3 2 5 5 5l1.2-.8-1.2-1.5-1.3.6c-1-.5-1.8-1.3-2.3-2.3l.6-1.3-1.5-1.2z" fill="currentColor" stroke="none"/></svg>;

const CSS = `
.bgc-wrap{display:flex;flex-direction:column;gap:14px;font-family:"DM Sans",-apple-system,system-ui,sans-serif;color:${INK};}
.bgc-welcome{background:linear-gradient(135deg,#14141A,#0C0C0E);border:1px solid ${BORDER};border-radius:16px;padding:22px 26px;color:#fff;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.bgc-welcome::after{content:"";position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:220px;height:220px;border-radius:50%;border:1px solid rgba(14,158,140,.18);pointer-events:none;}
.bgc-welcome::before{content:"";position:absolute;right:40px;top:50%;transform:translateY(-50%);width:150px;height:150px;border-radius:50%;border:1px solid rgba(210,103,74,.18);pointer-events:none;}
.bgc-w-txt{position:relative;z-index:1;}
.bgc-w-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MINT};margin-bottom:8px;}
.bgc-w-h{font-size:24px;font-weight:800;letter-spacing:-.03em;margin:0 0 6px;color:#fff;}
.bgc-w-p{font-size:13px;color:#C2C2C2;margin:0;}
.bgc-w-cta{position:relative;z-index:1;}
.bgc-btn{display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13px;font-weight:700;padding:11px 18px;border-radius:10px;border:0;cursor:pointer;background:${MINT};color:#06231F;}
.bgc-btn:hover{background:#0B8A7A;}
.bgc-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.bgc-kpi{background:${SURF};border:1px solid ${BORDER};border-radius:14px;padding:16px 18px;}
.bgc-kpi-label{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${INK3};margin-bottom:9px;}
.bgc-kpi-val{font-size:28px;font-weight:800;letter-spacing:-.04em;line-height:1;color:${INK};font-variant-numeric:tabular-nums;}
.bgc-kpi-val.coral{color:${CORAL};}
.bgc-kpi-val.mint{color:${MINT};}
.bgc-kpi-foot{margin-top:9px;font-size:11.5px;color:${INK3};}
.bgc-card{background:${SURF};border:1px solid ${BORDER};border-radius:16px;padding:18px 20px;}
.bgc-card-sub{font-size:13px;color:${INK3};margin:0 0 16px;}
.bgc-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.bgc-search{flex:1;min-width:220px;}
.bgc-search input{width:100%;padding:10px 12px;border:1px solid ${BORDER};border-radius:9px;background:${SURF2};color:${INK};font:inherit;font-size:13.5px;box-sizing:border-box;}
.bgc-search input:focus{outline:2px solid ${MINT};outline-offset:-1px;}
.bgc-search input::placeholder{color:${INK5};}
.bgc-chip{font-size:12.5px;font-weight:600;padding:8px 13px;border-radius:8px;border:1px solid ${BORDER};background:${SURF2};color:${INK3};cursor:pointer;font-family:inherit;}
.bgc-chip:hover{background:${SURF3};color:${INK};}
.bgc-chip.active{background:${MINT};color:#06231F;border-color:${MINT};}
.bgc-tbl-shell{border:1px solid ${BORDER};border-radius:10px;overflow:auto;}
.bgc-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:1080px;}
.bgc-tbl th{text-align:left;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:${INK3};font-weight:700;padding:12px 14px;background:${SURF2};border-bottom:1px solid ${BORDER};white-space:nowrap;position:sticky;top:0;}
.bgc-tbl td{padding:12px 14px;border-bottom:1px solid ${BORDER};color:${INK};vertical-align:middle;}
.bgc-tbl tbody tr:last-child td{border-bottom:0;}
.bgc-tbl tbody tr:hover td{background:${SURF2};}
.bgc-tbl tbody tr.contactado td{background:#F0FDF4;}
.bgc-num{color:${INK3};font-weight:700;font-variant-numeric:tabular-nums;width:34px;}
.bgc-fecha{color:${INK3};font-size:12px;white-space:nowrap;}
.bgc-person{display:flex;align-items:center;gap:10px;}
.bgc-av{width:32px;height:32px;border-radius:50%;background:${SURF3};color:${INK};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;}
.bgc-av.coral{background:${CORAL};color:#fff;}
.bgc-name{font-weight:700;color:${INK};font-size:13px;white-space:nowrap;}
.bgc-edad{font-size:11px;color:${INK3};}
.bgc-rel{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:999px;white-space:nowrap;}
.bgc-rel-seguir{background:${CORAL_SOFT};color:${CORAL_TXT};}
.bgc-rel-visita{background:${SURF3};color:${INK3};}
.bgc-rel .d{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;}
.bgc-fe{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:6px;white-space:nowrap;}
.bgc-fe.nuevo{background:${MINT_SOFT};color:${MINT};}
.bgc-fe.cristiano{background:${SURF3};color:${INK3};}
.bgc-wa{font-family:"JetBrains Mono",monospace;font-size:12px;color:${INK3};display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
.bgc-wa svg{width:14px;height:14px;color:${MINT};flex-shrink:0;}
.bgc-empty{color:#C2C2C2;}
.bgc-acts{white-space:nowrap;text-align:right;}
.bgc-mini{width:30px;height:30px;border-radius:7px;border:1px solid ${BORDER};background:${SURF2};color:${INK3};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-left:5px;font-family:inherit;}
.bgc-mini svg{width:15px;height:15px;}
.bgc-mini:hover{color:${INK};background:${SURF3};}
.bgc-mini.wa:hover{color:${MINT};background:${MINT_SOFT};border-color:transparent;}
.bgc-contactado{width:28px;height:28px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-left:5px;font-family:inherit;flex-shrink:0;}
.bgc-pagination{display:flex;align-items:center;justify-content:space-between;padding:14px 0 0;font-size:12.5px;color:${INK3};flex-wrap:wrap;gap:10px;}
.bgc-pgbtn{padding:5px 14px;border-radius:20px;border:1px solid ${BORDER};background:${SURF};font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;color:${INK3};}
.bgc-pgbtn:disabled{color:#D4D4D4;cursor:not-allowed;}
.bgc-pgbtn:not(:disabled):hover{background:${SURF3};}
.bgc-empty-state{padding:48px 20px;text-align:center;color:${INK3};}
.bgc-empty-state-ico{font-size:32px;margin-bottom:12px;opacity:.4;}
.bgc-empty-state h3{font-size:16px;font-weight:700;color:${INK};margin:0 0 6px;}
.bgc-empty-state p{font-size:13px;margin:0;}
@media(max-width:1180px){.bgc-kpis{grid-template-columns:repeat(2,1fr);}}
`;

export default function BienvenidaGdlContent() {
  const {
    loading, paged, filtered, totalPages, page, setPage,
    search, filtro,
    kpis: { totalPersonas, quierenSeguirPersonas, nuevosFePersonas, esteMesPersonas, quierenPct },
    canWrite, showModal, editing,
    openNew, openEdit, closeModal, onSaved,
    openWa, changeFiltro, changeSearch,
    toggleContactado, PAGE_SIZE,
  } = useBienvenidaData();

  const now = new Date();
  const mesActual = MESES[now.getMonth()];

  return (
    <div className="bgc-wrap">
      <style>{CSS}</style>

      {/* Banner */}
      <div className="bgc-welcome">
        <div className="bgc-w-txt">
          <div className="bgc-w-eyebrow">Registro de visitantes · Origen Guadalajara</div>
          <h2 className="bgc-w-h">
            {totalPersonas > 0
              ? `${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''} nos han visitado`
              : 'Bienvenida a Casa · Guadalajara'}
          </h2>
          <p className="bgc-w-p">
            {quierenSeguirPersonas > 0
              ? `${quierenSeguirPersonas} quieren seguir asistiendo · dales seguimiento esta semana`
              : 'Registra las visitas de este campus para dar seguimiento'}
          </p>
        </div>
        {canWrite && (
          <div className="bgc-w-cta">
            <button className="bgc-btn" onClick={openNew}>+ Registrar visita</button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="bgc-kpis">
        <div className="bgc-kpi">
          <div className="bgc-kpi-label">Visitantes</div>
          <div className="bgc-kpi-val">{totalPersonas}</div>
          <div className="bgc-kpi-foot">todos los registros</div>
        </div>
        <div className="bgc-kpi">
          <div className="bgc-kpi-label">Quieren seguir</div>
          <div className="bgc-kpi-val coral">{quierenSeguirPersonas}</div>
          <div className="bgc-kpi-foot">dar seguimiento · {quierenPct}%</div>
        </div>
        <div className="bgc-kpi">
          <div className="bgc-kpi-label">Nuevos en la fe</div>
          <div className="bgc-kpi-val mint">{nuevosFePersonas}</div>
          <div className="bgc-kpi-foot">soy nuevo</div>
        </div>
        <div className="bgc-kpi">
          <div className="bgc-kpi-label">Este mes</div>
          <div className="bgc-kpi-val">{esteMesPersonas}</div>
          <div className="bgc-kpi-foot">{mesActual}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bgc-card">
        <p className="bgc-card-sub">{filtered.length} visitante{filtered.length !== 1 ? 's' : ''} · Origen Guadalajara</p>

        <div className="bgc-toolbar">
          <div className="bgc-search">
            <input
              placeholder="Buscar por nombre, colonia o quién lo invitó…"
              value={search}
              onChange={e => changeSearch(e.target.value)}
            />
          </div>
          {[
            { key: 'todos',     label: 'Todos' },
            { key: 'seguir',    label: 'Quieren seguir' },
            { key: 'visita',    label: 'Solo visita' },
            { key: 'nuevo',     label: 'Nuevos en la fe' },
            { key: 'cristiano', label: 'Soy cristiano' },
          ].map(c => (
            <button
              key={c.key}
              className={`bgc-chip${filtro === c.key ? ' active' : ''}`}
              onClick={() => changeFiltro(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bgc-empty-state">
            <div className="bgc-empty-state-ico">⏳</div>
            <h3>Cargando visitantes…</h3>
          </div>
        ) : paged.length === 0 ? (
          <div className="bgc-empty-state">
            <div className="bgc-empty-state-ico">🏠</div>
            <h3>{search || filtro !== 'todos' ? 'Sin resultados para este filtro' : 'Aún no hay visitantes registrados'}</h3>
            <p>{search || filtro !== 'todos' ? 'Prueba cambiando el filtro o la búsqueda.' : 'Registra la primera visita usando el botón de arriba.'}</p>
          </div>
        ) : (
          <>
            <div className="bgc-tbl-shell">
              <table className="bgc-tbl">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Fecha</th>
                    <th>Relación con Origen</th>
                    <th>Nombre</th>
                    <th>Estado de fe</th>
                    <th>WhatsApp</th>
                    <th>¿Cómo se enteró?</th>
                    <th>Acompañantes</th>
                    <th>Colonia</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((v, idx) => {
                    const rel  = relInfo(v.relacion_con_origen);
                    const esSeguir = v.relacion_con_origen === 'Me interesa seguir';
                    const n    = (page - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={v.id} className={v.contactado ? 'contactado' : ''}>
                        <td className="bgc-num">{n}</td>
                        <td className="bgc-fecha">{v.fecha ? fmtFechaShort(v.fecha) : '—'}</td>
                        <td>
                          <span className={`bgc-rel ${rel.cls}`}>
                            <span className="d" />{rel.txt}
                          </span>
                        </td>
                        <td>
                          <div className="bgc-person">
                            <div className={`bgc-av${esSeguir ? ' coral' : ''}`}>
                              {initials(v.nombre)}
                            </div>
                            <div>
                              <div className="bgc-name">{v.nombre || '—'}</div>
                              {v.edad && <div className="bgc-edad">{v.edad} años</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          {v.estado_fe ? (
                            <span className={`bgc-fe ${v.estado_fe === 'Soy nuevo' ? 'nuevo' : 'cristiano'}`}>
                              {v.estado_fe}
                            </span>
                          ) : <span className="bgc-empty">—</span>}
                        </td>
                        <td>
                          {v.whatsapp
                            ? <span className="bgc-wa">{WaIcon}{v.whatsapp}</span>
                            : <span className="bgc-empty">—</span>}
                        </td>
                        <td>{v.como_se_entero || <span className="bgc-empty">—</span>}</td>
                        <td className={v.acompanantes ? '' : 'bgc-empty'}>
                          {v.acompanantes || '—'}
                        </td>
                        <td className={v.colonia ? '' : 'bgc-empty'}>
                          {v.colonia || '—'}
                        </td>
                        <td className="bgc-acts">
                          {canWrite && (
                            <button
                              className="bgc-contactado bgc-mini"
                              title={v.contactado ? 'Contactado' : 'Sin contactar'}
                              onClick={() => toggleContactado(v)}
                              style={{
                                border: `2px solid ${v.contactado ? GREEN_600 : BORDER}`,
                                background: v.contactado ? GREEN_600 : SURF,
                                color: v.contactado ? '#fff' : INK3,
                              }}
                            >
                              {v.contactado && <I.check size={12} />}
                            </button>
                          )}
                          {v.whatsapp && (
                            <button className="bgc-mini wa" onClick={() => openWa(v.whatsapp)}>
                              {WaIcon}
                            </button>
                          )}
                          {canWrite && (
                            <button className="bgc-mini" onClick={() => openEdit(v)}>
                              <I.edit size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="bgc-pagination">
                <span>
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="bgc-pgbtn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                  <button className="bgc-pgbtn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <VisitanteModal editing={editing} onClose={closeModal} onSaved={onSaved} />
      )}
    </div>
  );
}
