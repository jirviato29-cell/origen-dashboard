// Panel del líder de ministerio.
// "Mis voluntarios" ya es funcional; Disponibilidad y Asignar posiciones
// siguen pendientes y se listan como placeholder.
import MisVoluntarios from './MisVoluntarios';

const NAVY_900 = '#112540';
const NAVY_300 = '#9CB0CC';
const ORANGE_500 = '#FF6B2B';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';

const CSS = `
.pl-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;max-width:720px;}
.pl-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ORANGE_500};margin-bottom:7px;}
.pl-title{font-size:25px;font-weight:800;letter-spacing:-.03em;color:${NAVY_900};margin:0;}
.pl-sub{font-size:13px;color:${GRAY_500};margin-top:6px;}
.pl-card{margin-top:22px;background:#fff;border:1px solid ${GRAY_200};border-radius:16px;padding:24px;}
.pl-card-title{font-size:13px;font-weight:700;color:${NAVY_900};margin:0 0 4px;}
.pl-card-note{font-size:12.5px;color:${GRAY_500};margin:0 0 18px;line-height:1.5;}
.pl-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
.pl-item{display:flex;align-items:center;gap:10px;padding:13px 15px;border:1px solid ${GRAY_200};border-radius:11px;background:#F6F7F9;}
.pl-dot{width:7px;height:7px;border-radius:50%;background:${NAVY_300};flex-shrink:0;}
.pl-item-label{font-size:13.5px;font-weight:600;color:${NAVY_900};}
.pl-badge{margin-left:auto;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${GRAY_500};}
`;

const SECCIONES = ['Disponibilidad', 'Asignar posiciones'];

export default function PanelLider() {
  return (
    <div className="pl-root">
      <style>{CSS}</style>

      <div className="pl-eyebrow">Ministerio</div>
      <h1 className="pl-title">Panel de líder de ministerio</h1>
      <div className="pl-sub">
        Este es tu espacio: da de alta a tu equipo y pásales su clave.
      </div>

      <div className="pl-card">
        <MisVoluntarios />
      </div>

      <div className="pl-card">
        <p className="pl-card-title">Secciones en camino</p>
        <p className="pl-card-note">
          Estas herramientas se habilitarán aquí próximamente. Por ahora el panel
          no muestra información.
        </p>
        <ul className="pl-list">
          {SECCIONES.map((s) => (
            <li key={s} className="pl-item">
              <span className="pl-dot" />
              <span className="pl-item-label">{s}</span>
              <span className="pl-badge">Pronto</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
