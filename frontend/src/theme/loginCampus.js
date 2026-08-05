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
    // Identidad turquesa caribe + coral (opción 3 del SPEC). El fondo (#062A31)
    // y el acento (coral #FF9A5E) salen del tema central; aquí van los matices
    // del panel/botón oscuros de la pantalla de clave.
    panel:       '#0A3A43',            // panel turquesa un tono sobre el fondo
    accentSoft:  '#0F4B56',            // (sin uso directo en mid: usa RolesMeridaScreen)
    accentHover: '#F2854A',            // coral más oscuro para hovers
    btnHover:    '#F2854A',            // hover del botón "Entrar" (pantalla de clave)
    btnInk:      '#062A31',            // tinta oscura sobre el coral
    glow:        'rgba(255,138,82,.13)', // glow coral (arriba-derecha), igual que opción 3
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
    accent:      t.accent,       // MINT en gdl / coral en mid — del tema central
    bg:          t.primary,      // #0A0A0A gdl / #062A31 mid
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
