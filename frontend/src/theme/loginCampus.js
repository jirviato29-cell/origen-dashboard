// Paleta del flujo de login OSCURO (selector de rol + pantalla de clave),
// compartida por los 3 campus. El look es el mismo para todos (tarjetas oscuras,
// estilo "Mérida"); SOLO cambia el color de cada campus.
//
// Los tokens de marca —accent, bg (fondo), accentInk— salen del tema central
// temaCampus(); los matices del diseño oscuro (panel, tarjeta, hovers, glows,
// color del voluntario, etc.) NO existen como tokens del tema, así que se
// guardan por campus aquí.

import { temaCampus } from './campusTema';

const EXTRA = {
  // Aguascalientes — navy + naranja
  ags: {
    panel:'#112540', card:'#1A3354', cardHover:'#244169',
    textSub:'#9CB0CC', textFaint:'#6E82A0',
    volBg:'#FF6B2B', volInk:'#FFFFFF', volSubInk:'rgba(255,255,255,.82)',
    anfitrionTile:'rgba(255,107,43,.2)', anfitrionInk:'#FF8A52',
    glowTr:'rgba(255,107,43,.16)', glowBl:'rgba(48,81,129,.35)',
    btnHover:'#E0561B', btnInk:'#FFFFFF',
  },
  // Guadalajara (matriz) — negro + menta
  gdl: {
    panel:'#16161A', card:'#202024', cardHover:'#2B2B30',
    textSub:'#A3A3A8', textFaint:'#6E6E73',
    volBg:'#2DD4BF', volInk:'#06231F', volSubInk:'rgba(6,35,31,.7)',
    anfitrionTile:'rgba(45,212,191,.18)', anfitrionInk:'#6FE3CE',
    glowTr:'rgba(45,212,191,.12)', glowBl:'rgba(255,255,255,.05)',
    btnHover:'#22B8A4', btnInk:'#06231F',
  },
  // Mérida — turquesa caribe + coral. Único con un 2º color (turquesa) distinto
  // del acento (coral): el acento pinta eyebrow/subrayado/tile de Anfitriones y
  // el turquesa la tarjeta de "Soy voluntario".
  mid: {
    panel:'#0A3A43', card:'#0F4B56', cardHover:'#145E6B',
    textSub:'#8FC2C8', textFaint:'#6FA3AA',
    volBg:'#2FB5A8', volInk:'#052A2A', volSubInk:'rgba(5,42,42,.72)',
    anfitrionTile:'rgba(255,154,94,.2)', anfitrionInk:'#FFB183',
    glowTr:'rgba(255,138,82,.13)', glowBl:'rgba(42,157,166,.32)',
    btnHover:'#F2854A', btnInk:'#062A31',
  },
};

// Nombre del campus para los textos de marca ("Campus …").
const NOMBRE = { ags: 'Aguascalientes', gdl: 'Guadalajara', mid: 'Mérida' };

export function paletaLogin(campus) {
  const t = temaCampus(campus);
  const e = EXTRA[campus] || EXTRA.ags;
  return {
    // marca (del tema central)
    accent:      t.accent,       // naranja ags / menta gdl / coral mid
    bg:          t.primary,      // fondo oscuro del campus
    accentInk:   t.accentInk,
    nombre:      NOMBRE[campus] || t.label || campus,
    // superficies oscuras
    panel:       e.panel,
    card:        e.card,
    cardHover:   e.cardHover,
    cardBorder:      'rgba(255,255,255,.08)',
    cardBorderHover: 'rgba(255,255,255,.16)',
    // textos
    textSub:     e.textSub,
    textFaint:   e.textFaint,
    // tarjeta de voluntario (2º color sólido)
    volBg:       e.volBg,
    volInk:      e.volInk,
    volSubInk:   e.volSubInk,
    // tile de Anfitriones (tinte del acento)
    anfitrionTile: e.anfitrionTile,
    anfitrionInk:  e.anfitrionInk,
    // glows del fondo
    glowTr:      e.glowTr,
    glowBl:      e.glowBl,
    // pantalla de clave
    btnHover:    e.btnHover,
    btnInk:      e.btnInk,
    glow:        e.glowTr,       // glow superior-derecho de la pantalla de clave
  };
}
