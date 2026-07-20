// Panel del líder de ministerio.
// "Mis voluntarios" da de alta al equipo; "Asignar posiciones" (PASO 5) ve la
// disponibilidad y reparte posiciones por fecha.
import MisVoluntarios from './MisVoluntarios';
import PosicionesMinisterio from './PosicionesMinisterio';
import AsignarPosiciones from './AsignarPosiciones';

const NAVY_900 = '#112540';
const ORANGE_500 = '#FF6B2B';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';

const CSS = `
.pl-root{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;max-width:720px;}
.pl-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ORANGE_500};margin-bottom:7px;}
.pl-title{font-size:25px;font-weight:800;letter-spacing:-.03em;color:${NAVY_900};margin:0;}
.pl-sub{font-size:13px;color:${GRAY_500};margin-top:6px;}
.pl-card{margin-top:22px;background:#fff;border:1px solid ${GRAY_200};border-radius:16px;padding:24px;}
`;

export default function PanelLider() {
  return (
    <div className="pl-root">
      <style>{CSS}</style>

      <div className="pl-eyebrow">Ministerio</div>
      <h1 className="pl-title">Panel de líder de ministerio</h1>
      <div className="pl-sub">
        Este es tu espacio: da de alta a tu equipo, mira quién puede servir y reparte posiciones.
      </div>

      <div className="pl-card">
        <MisVoluntarios />
      </div>

      <div className="pl-card">
        <PosicionesMinisterio />
      </div>

      <div className="pl-card">
        <AsignarPosiciones />
      </div>
    </div>
  );
}
