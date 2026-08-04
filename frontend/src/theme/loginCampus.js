// Paleta del flujo de login OSCURO (pantallas de roles + clave), compartida por
// los campus que lo usan (hoy Gdl y Mérida). Los tokens de marca —accent, bg
// (fondo), accentInk— salen del tema central temaCampus(); los matices
// hand-tuned del diseño oscuro (panel, tintes de hover, tinta del botón, glow)
// NO existen como tokens del tema, así que se guardan por campus aquí. Para
// 'gdl' son EXACTAMENTE los valores originales de las pantallas, para que su
// resultado visual no cambie ni un pixel.

import { temaCampus } from './campusTema';

const EXTRA = {
  gdl: {
    panel:       '#16161A',            // fondo del panel sobre el negro
    accentSoft:  '#EEFCFA',            // lavado claro del acento (hover de tarjeta)
    accentHover: '#14B8A6',            // acento oscuro (hover del botón sólido en roles)
    btnHover:    '#22B8A4',            // hover del botón "Entrar" (pantalla de clave)
    btnInk:      '#06231F',            // texto sobre el botón de acento (clave)
    glow:        'rgba(45,212,191,.12)', // glow superior = acento al 12%
  },
  mid: {
    panel:       '#241E1A',            // café un tono sobre el fondo #1A1512
    accentSoft:  '#F5EFE8',            // lavado claro de la arena
    accentHover: '#A9835F',            // arena más oscura para hovers
    btnHover:    '#A9835F',
    btnInk:      '#1A1512',            // tinta oscura sobre la arena
    glow:        'rgba(194,158,124,.12)',
  },
};

// Nombre del campus para los textos de marca ("Campus …"). Se mantiene local en
// vez de CAMPUS_TEMA.label porque ahí 'gdl' es 'Matriz · Guadalajara' y estas
// pantallas dicen solo 'Guadalajara' (hay que conservarlo idéntico).
const NOMBRE = { gdl: 'Guadalajara', mid: 'Mérida' };

export function paletaLogin(campus) {
  const t = temaCampus(campus);
  const e = EXTRA[campus] || EXTRA.gdl;
  return {
    accent:      t.accent,       // MINT en gdl / arena en mid — del tema central
    bg:          t.primary,      // #0A0A0A gdl / #1A1512 mid
    accentInk:   t.accentInk,
    panel:       e.panel,
    accentSoft:  e.accentSoft,
    accentHover: e.accentHover,
    btnHover:    e.btnHover,
    btnInk:      e.btnInk,
    glow:        e.glow,
    nombre:      NOMBRE[campus] || t.label || campus,
  };
}
